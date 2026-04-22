# spec.md - 101 北向 OpenCode API 规范

> 模块: 北向 OpenCode API
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 模块概述

北向 API 模块完整实现 opencode 服务器的 OpenAPI 3.1 规范，对外提供与 opencode 完全兼容的 HTTP 接口。所有请求通过连接器代理到后端 opencode 实例。

**核心要求**：北向 API 必须 100% 兼容 opencode OpenAPI 3.1 规范。

## 2. 路由策略

### 2.1 策略类型

| 策略 | 说明 | 适用端点 |
|------|------|---------|
| local | 本地处理，不转发 | /health, /doc |
| session | 根据会话 ID 路由到特定后端 | /session/:id/* |
| aggregate | 从所有后端获取数据后合并 | /session (list), /provider, /agent |
| broadcast | 广播到所有后端，取任意成功 | /log |
| primary | 路由到主后端 | /project/current, /config |
| current | 路由到当前项目后端（默认第一个可用） | /file/*, /lsp, /mcp/* |

### 2.2 策略映射表

| 端点组 | 策略 |
|--------|------|
| /global/health | aggregate（合并所有后端状态） |
| /global/event | aggregate（合并 SSE） |
| /global/config | primary |
| /project | aggregate |
| /project/current | primary |
| /session (list) | aggregate |
| /session/status | aggregate |
| /session/:id/* | session |
| /provider | aggregate |
| /provider/auth | aggregate |
| /provider/:id/oauth/* | primary |
| /file/* | current |
| /config | primary |
| /config/providers | primary |
| /agent | aggregate |
| /command | aggregate |
| /skill | aggregate |
| /lsp | current |
| /formatter | current |
| /mcp/* | current |
| /event | aggregate（SSE 聚合） |
| /instance/dispose | current |
| /path | primary |
| /vcs/* | current |
| /pty/* | current |
| /tui/* | current |
| /experimental/* | current |
| /permission/* | current |
| /question/* | current |
| /sync/* | current |
| /auth/:providerID | broadcast |
| /log | broadcast |
| /doc | local |
| /health | local |

## 3. 会话路由

### 3.1 SessionRouteTable

会话与后端的映射表。

```typescript
// src/api/session/route-table.ts
export class SessionRouteTable {
  private routes: Map<string, SessionRoute>
  
  register(sessionID: string, connectorID: string): void {
    this.routes.set(sessionID, {
      sessionID,
      connectorID,
      createdAt: Date.now(),
    })
  }
  
  lookup(sessionID: string): string | undefined {
    return this.routes.get(sessionID)?.connectorID
  }
  
  clear(sessionID: string): void {
    this.routes.delete(sessionID)
  }
  
  getAll(): SessionRoute[] {
    return Array.from(this.routes.values())
  }
}

interface SessionRoute {
  sessionID: string
  connectorID: string
  createdAt: number
}
```

### 3.2 会话创建流程

```
POST /session
    │
    v
ConnectorManager.selectForNewSession()
    │
    v
proxy 请求到选中后端
    │
    v
后端返回 Session（含 sessionID）
    │
    v
SessionRouteTable.register(sessionID, connectorID)
    │
    v
返回 Session 给客户端
```

### 3.3 会话路由流程

```
请求 /session/:sessionID/*
    │
    v
SessionRouteTable.lookup(sessionID)
    │
    ├── 找到 connectorID
    │   │
    │   v
    │   ConnectorManager.get(connectorID)
    │   │
    │   ├── 存在且已连接
    │   │   │
    │   │   v
    │   │   proxy 请求到该连接器
    │   │   │
    │   │   v
    │   │   返回响应
    │   │
    │   └── 不存在或未连接
    │       │
    │       v
    │       502 Backend Unreachable
    │
    └── 未找到
        │
        v
        404 Session Not Found
```

## 4. SSE 聚合

### 4.1 聚合架构

```
客户端连接 /event
    │
    v
创建 SSE Manager
    │
    v
订阅所有已连接后端
    ├── Connector A /event ──┐
    ├── Connector B /event ──│── 合并队列
    └── Connector C /event ──┘
    │
    v
事件合并（添加 directory 标识）
    │
    v
推送到客户端 SSE 流
```

### 4.2 SSE Manager

```typescript
// src/api/aggregate/sse-events.ts
export class SSEAggregator {
  private clients: Set<SSEClient> = new Set()
  private backendSubscriptions: Map<string, Unsubscribe> = new Map()
  private eventQueue: EventQueue
  
  addClient(client: SSEClient): void {
    this.clients.add(client)
    if (this.clients.size === 1) {
      this.connectAllBackends()
    }
  }
  
  removeClient(client: SSEClient): void {
    this.clients.delete(client)
    if (this.clients.size === 0) {
      this.scheduleDisconnect()
    }
  }
  
  connectAllBackends(): void {
    for (const connector of connectorManager.getConnected()) {
      const unsub = connector.subscribeEvents((event) => {
        this.eventQueue.push({
          ...event,
          directory: connector.config.name,
        })
        this.broadcastToClients()
      })
      this.backendSubscriptions.set(connector.id, unsub)
    }
  }
  
  broadcastToClients(): void {
    const events = this.eventQueue.flush()
    for (const client of this.clients) {
      for (const event of events) {
        client.send(event)
      }
    }
  }
}
```

### 4.3 连接管理

| 场景 | 处理 |
|------|------|
| 首个客户端连接 | 建立到所有后端的 SSE |
| 所有客户端断开 | 延迟 30s 关闭后端 SSE |
| 后端 SSE 断连 | 自动重连（最多 3 次） |
| 后端被隔离 | 断开对应 SSE，停止订阅 |

## 5. 聚合策略实现

### 5.1 会话列表聚合

```typescript
// GET /session
async function aggregateSessions(): Promise<Session[]> {
  const connectors = connectorManager.getConnected()
  const results = await Promise.allSettled(
    connectors.map(c => c.proxy({ method: 'GET', path: '/session' }))
  )
  
  const sessions: Session[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      sessions.push(...result.value.body)
    }
  }
  
  return sessions
}
```

### 5.2 提供商列表聚合

```typescript
// GET /provider
async function aggregateProviders(): Promise<ProviderListResult> {
  const connectors = connectorManager.getConnected()
  const results = await Promise.all(
    connectors.map(c => c.proxy({ method: 'GET', path: '/provider' }))
  )
  
  const allProviders: Provider[] = []
  const defaultModels: Record<string, string> = {}
  const connected: string[] = []
  
  for (const result of results) {
    const body = result.body
    allProviders.push(...body.all)
    Object.assign(defaultModels, body.default)
    connected.push(...body.connected)
  }
  
  // 去重
  const uniqueProviders = deduplicateProviders(allProviders)
  const uniqueConnected = [...new Set(connected)]
  
  return {
    all: uniqueProviders,
    default: defaultModels,
    connected: uniqueConnected,
  }
}
```

### 5.3 状态聚合

```typescript
// GET /session/status
async function aggregateSessionStatus(): Promise<Record<string, SessionStatus>> {
  const connectors = connectorManager.getConnected()
  const results = await Promise.all(
    connectors.map(c => c.proxy({ method: 'GET', path: '/session/status' }))
  )
  
  const status: Record<string, SessionStatus> = {}
  for (const result of results) {
    Object.assign(status, result.body)
  }
  
  return status
}
```

## 6. 广播策略实现

### 6.1 日志广播

```typescript
// POST /log
async function broadcastLog(body: LogInput): Promise<boolean> {
  const connectors = connectorManager.getConnected()
  const results = await Promise.allSettled(
    connectors.map(c => c.proxy({ method: 'POST', path: '/log', body }))
  )
  
  // 至少一个成功即返回 true
  return results.some(r => r.status === 'fulfilled' && r.value.body === true)
}
```

### 6.2 认证广播

```typescript
// PUT /auth/:providerID
async function broadcastAuth(providerID: string, body: AuthInfo): Promise<boolean> {
  const connectors = connectorManager.getConnected()
  const results = await Promise.allSettled(
    connectors.map(c => c.proxy({
      method: 'PUT',
      path: `/auth/${providerID}`,
      body,
    }))
  )
  
  return results.every(r => r.status === 'fulfilled')
}
```

## 7. 错误处理

### 7.1 HTTP 状态码

| 场景 | 状态码 | 错误码 |
|------|--------|--------|
| 后端不可达 | 502 | BACKEND_UNREACHABLE |
| 后端超时 | 504 | BACKEND_TIMEOUT |
| 无可用后端 | 503 | NO_AVAILABLE_BACKEND |
| 会话未找到 | 404 | SESSION_NOT_FOUND |
| 认证失败 | 401 | 透传后端响应 |
| 参数错误 | 400 | 透传后端响应 |
| 内部错误 | 500 | INTERNAL_ERROR |

### 7.2 错误响应格式

```json
{
  "error": {
    "message": "Backend server unreachable",
    "code": "BACKEND_UNREACHABLE",
    "backend": "remote-1"
  }
}
```

## 8. 认证透传

### 8.1 透传规则

- 请求头 `Authorization` 原样转发到后端
- 后端返回 401 时原样返回客户端
- opencode-stack 不处理认证逻辑

### 8.2 实现

```typescript
function getAuthHeaders(req: express.Request): Record<string, string> {
  const auth = req.headers.authorization
  if (auth) {
    return { Authorization: auth }
  }
  return {}
}
```

## 9. 扩展端点

### 9.1 GET /x/backends

返回所有后端状态。

```typescript
async function getBackends(): Promise<BackendStatus[]> {
  return connectorManager.getAll().map(c => ({
    name: c.id,
    type: c.config.type,
    status: c.status,
    health: {
      healthy: c.status.connected && !c.status.isolated,
    },
  }))
}
```

### 9.2 GET /x/routes

返回会话路由表。

```typescript
async function getRoutes(): Promise<SessionRoute[]> {
  return sessionRouteTable.getAll()
}
```

### 9.3 GET /x/sse

返回 SSE 连接状态。

```typescript
async function getSSEStatus(): Promise<SSEStatus> {
  return {
    clients: sseAggregator.clientCount,
    backends: sseAggregator.connectedBackends,
  }
}
```

## 10. 端点实现结构

```
src/api/
├── router.ts               # 路由注册
├── routes/                 # 端点实现
│   ├── global.ts           # /global/* 端点
│   ├── project.ts          # /project/* 端点
│   ├── session.ts          # /session/* 端点（不含 message）
│   ├── message.ts          # /session/:id/message/* 端点
│   ├── provider.ts         # /provider/* 端点
│   ├── file.ts             # /file/* 端点
│   ├── config.ts           # /config/* 端点
│   ├── agent.ts            # /agent 端点
│   ├── command.ts          # /command 端点
│   ├── skill.ts            # /skill 端点
│   ├── lsp.ts              # /lsp 端点
│   ├── formatter.ts        # /formatter 端点
│   ├── mcp.ts              # /mcp/* 端点
│   ├── event.ts            # /event 端点（SSE）
│   ├── instance.ts         # /instance/* 端点
│   ├── path.ts             # /path 端点
│   ├── vcs.ts              # /vcs/* 端点
│   ├── pty.ts              # /pty/* 端点
│   ├── tui.ts              # /tui/* 端点
│   ├── experimental.ts     # /experimental/* 端点
│   ├── permission.ts       # /permission/* 端点
│   ├── question.ts         # /question/* 端点
│   ├── sync.ts             # /sync/* 端点
│   ├── auth.ts             # /auth/* 端点
│   ├── log.ts              # /log 端点
│   ├── doc.ts              # /doc 端点
│   └── extend.ts           # /x/* 扩展端点
├── session/
│   ├── route-table.ts      # 会话路由表
│   ├── create.ts           # 会话创建逻辑
│   └── lookup.ts           # 会话路由查找
├── aggregate/
│   ├── session-list.ts     # 会话聚合
│   ├── provider-list.ts    # 提供商聚合
│   ├── agent-list.ts       # 代理聚合
│   ├── command-list.ts     # 命令聚合
│   └── sse-events.ts       # SSE 聚合
├── strategy/
│   ├── types.ts            # 策略类型定义
│   ├── local.ts            # local 策略
│   ├── session.ts          # session 策略
│   ├── aggregate.ts        # aggregate 策略
│   ├── broadcast.ts        # broadcast 策略
│   ├── primary.ts          # primary 策略
│   └── current.ts          # current 策略
└── proxy/
    ├── request.ts          # 请求代理
    ├── response.ts         # 响应处理
    └── sse.ts              # SSE 处理
```