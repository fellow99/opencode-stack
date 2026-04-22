# plan.md - 101 北向 OpenCode API 实施计划

> 模块: 北向 OpenCode API
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 开发顺序

### 1.1 阶段一：路由框架（1 天）

1. 创建 Express Router
2. 定义路由策略类型
3. 实现路由策略分发器
4. 实现请求代理层
5. 实现响应处理

### 1.2 阶段二：会话路由（1 天）

1. 实现 SessionRouteTable
2. 实现会话创建流程
3. 实现会话路由查找
4. 实现会话删除清理
5. 测试会话路由

### 1.3 阶段三：SSE 聚合（1 天）

1. 实现 SSEAggregator
2. 实现后端 SSE 订阅管理
3. 实现客户端 SSE 推送
4. 实现连接管理
5. 测试 SSE 聚合

### 1.4 阶段四：聚合端点（1 天）

1. 实现 session 列表聚合
2. 实现 provider 列表聚合
3. 实现 agent 列表聚合
4. 实现 command 列表聚合
5. 实现 session/status 聚合

### 1.5 阶段五：端点实现（2 天）

1. 实现 Global Routes
2. 实现 Session Routes
3. 实现 Message Routes
4. 实现 Provider Routes
5. 实现 File Routes
6. 实现 Config Routes
7. 实现 Instance Routes
8. 实现 MCP/PTY/TUI Routes
9. 实现 Experimental Routes

## 2. 关键实现

### 2.1 路由策略分发器

```typescript
// src/api/strategy/dispatcher.ts
import { ConnectorManager } from '../connector'
import { SessionRouteTable } from '../session/route-table'
import { ProxyRequest, ProxyResponse } from '../connector/types'

export class RouteStrategyDispatcher {
  constructor(
    private connectorManager: ConnectorManager,
    private sessionRouteTable: SessionRouteTable
  ) {}
  
  async dispatch(
    req: express.Request,
    strategy: RouteStrategy
  ): Promise<ProxyResponse> {
    switch (strategy.type) {
      case 'local':
        return this.handleLocal(req)
      
      case 'session':
        return this.handleSession(req, strategy.sessionID)
      
      case 'aggregate':
        return this.handleAggregate(req)
      
      case 'broadcast':
        return this.handleBroadcast(req)
      
      case 'primary':
        return this.handlePrimary(req)
      
      case 'current':
        return this.handleCurrent(req)
      
      default:
        throw new Error(`Unknown strategy: ${strategy.type}`)
    }
  }
  
  async handleSession(req: express.Request, sessionID: string): Promise<ProxyResponse> {
    const connectorID = this.sessionRouteTable.lookup(sessionID)
    if (!connectorID) {
      throw new SessionNotFoundError(sessionID)
    }
    
    const connector = this.connectorManager.get(connectorID)
    if (!connector || !connector.status.connected) {
      throw new BackendUnreachableError(connectorID)
    }
    
    return connector.proxy(this.buildProxyRequest(req))
  }
  
  async handleAggregate(req: express.Request): Promise<ProxyResponse> {
    const connectors = this.connectorManager.getConnected()
    const results = await Promise.allSettled(
      connectors.map(c => c.proxy(this.buildProxyRequest(req)))
    )
    
    // 合并结果
    return this.mergeAggregateResults(results)
  }
  
  async handleBroadcast(req: express.Request): Promise<ProxyResponse> {
    const connectors = this.connectorManager.getConnected()
    const results = await Promise.allSettled(
      connectors.map(c => c.proxy(this.buildProxyRequest(req)))
    )
    
    // 至少一个成功
    const success = results.find(r => r.status === 'fulfilled')
    if (success) {
      return (success as PromiseFulfilledResult<ProxyResponse>).value
    }
    
    throw new NoAvailableBackendError()
  }
  
  async handlePrimary(req: express.Request): Promise<ProxyResponse> {
    const connector = this.connectorManager.getPrimary()
    if (!connector) {
      // 使用第一个可用的
      const connected = this.connectorManager.getConnected()
      if (connected.length === 0) {
        throw new NoAvailableBackendError()
      }
      return connected[0].proxy(this.buildProxyRequest(req))
    }
    
    if (!connector.status.connected) {
      throw new BackendUnreachableError(connector.id)
    }
    
    return connector.proxy(this.buildProxyRequest(req))
  }
  
  async handleCurrent(req: express.Request): Promise<ProxyResponse> {
    // 同 primary，使用第一个可用的连接器
    const connectors = this.connectorManager.getConnected()
    if (connectors.length === 0) {
      throw new NoAvailableBackendError()
    }
    return connectors[0].proxy(this.buildProxyRequest(req))
  }
  
  buildProxyRequest(req: express.Request): ProxyRequest {
    return {
      method: req.method,
      path: req.path,
      query: req.query as Record<string, string>,
      headers: this.filterHeaders(req.headers),
      body: req.body,
    }
  }
  
  filterHeaders(headers: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {}
    const keep = ['authorization', 'content-type', 'accept']
    for (const key of keep) {
      if (headers[key]) {
        result[key] = headers[key]
      }
    }
    return result
  }
}
```

### 2.2 SessionRouteTable

```typescript
// src/api/session/route-table.ts
import { SessionRoute } from './types'

export class SessionRouteTable {
  private routes: Map<string, SessionRoute> = new Map()
  
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
  
  getByConnector(connectorID: string): SessionRoute[] {
    return this.getAll().filter(r => r.connectorID === connectorID)
  }
  
  clearByConnector(connectorID: string): void {
    for (const route of this.getByConnector(connectorID)) {
      this.routes.delete(route.sessionID)
    }
  }
}
```

### 2.3 SSE Aggregator

```typescript
// src/api/aggregate/sse-events.ts
import { ConnectorManager } from '../../connector'
import express from 'express'

export class SSEAggregator {
  private clients: Map<string, express.Response> = new Map()
  private backendSubscriptions: Map<string, () => void> = new Map()
  private disconnectTimer?: NodeJS.Timeout
  private pendingEvents: any[] = []
  
  constructor(private connectorManager: ConnectorManager) {}
  
  addClient(clientID: string, res: express.Response): void {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    
    // 发送连接事件
    res.write(`data: ${JSON.stringify({
      payload: { type: 'server.connected', properties: {} }
    })}\n\n`)
    
    this.clients.set(clientID, res)
    
    if (this.clients.size === 1) {
      this.connectAllBackends()
    }
    
    // 清除断开计时器
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = undefined
    }
  }
  
  removeClient(clientID: string): void {
    this.clients.delete(clientID)
    
    if (this.clients.size === 0) {
      this.scheduleDisconnect()
    }
  }
  
  connectAllBackends(): void {
    for (const connector of this.connectorManager.getConnected()) {
      if (this.backendSubscriptions.has(connector.id)) continue
      
      const unsub = connector.subscribeEvents((event) => {
        const enrichedEvent = {
          ...event,
          directory: connector.config.name,
        }
        this.broadcast(enrichedEvent)
      })
      
      this.backendSubscriptions.set(connector.id, unsub)
    }
  }
  
  broadcast(event: any): void {
    const data = `data: ${JSON.stringify(event)}\n\n`
    for (const [_, res] of this.clients) {
      try {
        res.write(data)
      } catch {
        // 客户端已断开
      }
    }
  }
  
  scheduleDisconnect(): void {
    this.disconnectTimer = setTimeout(() => {
      for (const unsub of this.backendSubscriptions.values()) {
        unsub()
      }
      this.backendSubscriptions.clear()
    }, 30000)
  }
  
  getClientCount(): number {
    return this.clients.size
  }
  
  getConnectedBackends(): string[] {
    return Array.from(this.backendSubscriptions.keys())
  }
}
```

### 2.4 Session Routes

```typescript
// src/api/routes/session.ts
import express from 'express'
import { RouteStrategyDispatcher } from '../strategy/dispatcher'
import { SessionRouteTable } from '../session/route-table'

const router = express.Router()

export function createSessionRoutes(
  dispatcher: RouteStrategyDispatcher,
  routeTable: SessionRouteTable
): express.Router {
  // GET /session - 聚合所有后端会话
  router.get('/', async (req, res) => {
    try {
      const response = await dispatcher.dispatch(req, { type: 'aggregate' })
      res.json(response.body)
    } catch (err) {
      handleError(res, err)
    }
  })
  
  // POST /session - 创建会话（选择后端）
  router.post('/', async (req, res) => {
    try {
      const connector = dispatcher.connectorManager.selectForNewSession()
      const response = await connector.proxy({
        method: 'POST',
        path: '/session',
        body: req.body,
      })
      
      // 注册路由
      const sessionID = response.body.id
      routeTable.register(sessionID, connector.id)
      
      res.json(response.body)
    } catch (err) {
      handleError(res, err)
    }
  })
  
  // GET /session/:id - 会话路由
  router.get('/:id', async (req, res) => {
    try {
      const response = await dispatcher.dispatch(req, {
        type: 'session',
        sessionID: req.params.id,
      })
      res.json(response.body)
    } catch (err) {
      handleError(res, err)
    }
  })
  
  // DELETE /session/:id - 删除会话并清除路由
  router.delete('/:id', async (req, res) => {
    try {
      const response = await dispatcher.dispatch(req, {
        type: 'session',
        sessionID: req.params.id,
      })
      
      if (response.body === true) {
        routeTable.clear(req.params.id)
      }
      
      res.json(response.body)
    } catch (err) {
      handleError(res, err)
    }
  })
  
  return router
}
```

### 2.5 错误处理

```typescript
// src/api/error-handler.ts
import express from 'express'
import {
  SessionNotFoundError,
  BackendUnreachableError,
  NoAvailableBackendError,
} from '../../types/errors'

export function handleError(res: express.Response, err: any): void {
  if (err instanceof SessionNotFoundError) {
    res.status(404).json({
      error: { message: err.message, code: err.code }
    })
    return
  }
  
  if (err instanceof BackendUnreachableError) {
    res.status(502).json({
      error: { message: err.message, code: err.code, backend: err.backend }
    })
    return
  }
  
  if (err instanceof NoAvailableBackendError) {
    res.status(503).json({
      error: { message: err.message, code: err.code }
    })
    return
  }
  
  // 透传后端错误
  if (err.status && err.body) {
    res.status(err.status).json(err.body)
    return
  }
  
  // 内部错误
  console.error('[Error]', err)
  res.status(500).json({
    error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' }
  })
}
```

## 3. 测试计划

### 3.1 会话路由测试

| 测试 | 内容 |
|------|------|
| 会话创建 | 正确选择后端并注册路由 |
| 会话获取 | 正确路由到绑定后端 |
| 会话删除 | 正确清除路由 |
| 会话不存在 | 返回 404 |
| 后端不可达 | 返回 502 |

### 3.2 SSE 聚合测试

| 测试 | 内容 |
|------|------|
| 首个客户端连接 | 建立后端 SSE |
| 多客户端连接 | 共用后端 SSE |
| 所有客户端断开 | 延迟关闭后端 SSE |
| 后端 SSE 断连 | 自动重连 |
| 事件广播 | 所有客户端收到事件 |

### 3.3 聚合端点测试

| 测试 | 内容 |
|------|------|
| /session 列表 | 合并所有后端会话 |
| /provider 列表 | 合并提供商 |
| /agent 列表 | 合并代理 |
| /session/status | 合并状态 |
| 部分后端失败 | 返回可用后端数据 |

### 3.4 兼容性测试

使用 opencode SDK 测试所有端点。

## 4. 文件清单

| 文件 | 说明 |
|------|------|
| src/api/router.ts | 路由注册 |
| src/api/strategy/dispatcher.ts | 策略分发 |
| src/api/session/route-table.ts | 路由表 |
| src/api/aggregate/sse-events.ts | SSE 聚合 |
| src/api/routes/*.ts | 端点实现 |
| src/api/error-handler.ts | 错误处理 |

## 5. 预计工时

| 阶段 | 工时 |
|------|------|
| 路由框架 | 1 天 |
| 会话路由 | 1 天 |
| SSE 聚合 | 1 天 |
| 聚合端点 | 1 天 |
| 端点实现 | 2 天 |
| 测试 | 0.5 天 |
| **总计** | **5 天** |