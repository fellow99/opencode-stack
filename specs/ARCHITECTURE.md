# ARCHITECTURE.md - 整体架构

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 系统架构图

```
                          客户端 (Client)
                              |
                              v
                    +---------------------+
                    |   opencode-stack    |  <-- 北向接口（端口 4099）
                    |                     |
                    |  +---------------+  |
                    |  |  Express App  |  |  <-- HTTP 服务器
                    |  +---------------+  |
                    |         |           |
                    |  +---------------+  |
                    |  |  API Router   |  |  <-- 路由层（100% 兼容 opencode）
                    |  +---------------+  |
                    |         |           |
                    |  +---------------+  |
                    |  |  Proxy Layer  |  |  <-- 代理转发层
                    |  +---------------+  |
                    |         |           |
                    |  +---------------+  |
                    |  | ConnectorMgr  |  |  <-- 连接器管理器
                    |  +---------------+  |
                    |         |           |
                    |  +-------+-------+  |
                    |  | SessionRouter |  |  <-- 会话路由表
                    |  +---------------+  |
                    |         |           |
                    +---------+-----------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
  +-----------+         +-----------+         +-----------+
  | Connector |         | Connector |         | Connector |
  |   Local   |         |  Remote-1 |         |  Remote-2 |
  +-----------+         +-----------+         +-----------+
        |                     |                     |
        v                     v                     v
  +-----------+         +-----------+         +-----------+
  | opencode  |         | opencode  |         | opencode  |
  |  :4096    |         |  host:1   |         |  host:2   |
  +-----------+         +-----------+         +-----------+
```

## 2. 模块划分

### 2.1 模块编号规则

| 编号前缀 | 模块类型 | 说明 |
|---------|---------|------|
| 001-099 | 基础框架 | 应用初始化、配置、日志 |
| 011-099 | 南向连接器 | 后端服务器连接管理 |
| 101-199 | 北向 API | 对外服务接口 |
| 201-299 | 扩展功能 | 用户管理、鉴权、CLI |
| 301-399 | 动态部署 | Docker/K8s 连接器 |

### 2.2 当前模块

| 模块编号 | 模块名称 | 职责 |
|---------|---------|------|
| 001-framework | 整体框架 | Express 初始化、中间件、全局错误处理 |
| 011-opencode-connector | 南向连接器 | 管理多个 opencode 实例连接 |
| 101-opencode-api | 北向 API | 实现 opencode 兼容接口 |

## 3. 核心组件

### 3.1 Express App (001-framework)

```
src/app.ts
├── Express 实例创建
├── 中间件注册
│   ├── express.json()     # JSON 请求体解析
│   ├── express.urlencoded # URL 编码解析
│   └── CORS（可选）
├── 路由注册
│   ├── /health            # 健康检查
│   ├── /                  # 根路由
│   └── /xxx               # opencode API 路由
├── 错误处理
│   ├── 404 Not Found
│   └── 500 Error Handler
└── 服务启动
```

### 3.2 Connector Manager (011-opencode-connector)

```
src/connector/
├── ConnectorManager.ts
│   ├── initialize()       # 初始化所有连接器
│   ├── get(id)            # 获取指定连接器
│   ├── getAll()           # 获取所有连接器
│   ├── getPrimary()       # 获取主连接器
│   ├── getConnected()     # 获取已连接的连接器
│   ├── selectForNewSession() # 选择后端创建新会话
│   ├── start()            # 启动健康检查
│   └── stop()             # 停止所有连接器
├── types.ts
│   ├── IConnector         # 连接器接口
│   ├── ServerConfig       # 服务器配置
│   ├── ConnectorStatus    # 连接状态
│   └── HealthInfo         # 健康信息
├── LocalConnector.ts
│   ├── connect()          # 连接本地 opencode
│   ├── disconnect()       # 断开连接
│   ├── healthCheck()      # 健康检查
│   └── proxy()            # 代理请求
│   └── subscribeEvents()  # SSE 事件订阅
├── RemoteConnector.ts
│   ├── connect()          # 连接远程 opencode
│   ├── disconnect()       # 断开连接
│   ├── healthCheck()      # 健康检查
│   ├── proxy()            # 代理请求（带认证）
│   └── subscribeEvents()  # SSE 事件订阅
├── DockerConnector.ts     # 预留
├── K8sConnector.ts        # 预留
└── health-check.ts
    ├── startPeriodicCheck() # 定时健康检查
    ├── handleFailure()      # 失败处理
    └── handleRecovery()     # 恢复处理
```

### 3.3 API Router (101-opencode-api)

```
src/api/
├── router.ts
│   ├── 路由注册（按端点组）
│   └── 路由策略映射
├── routes/
│   ├── global.ts          # /global/* 端点
│   ├── project.ts         # /project/* 端点
│   ├── session.ts         # /session/* 端点
│   ├── message.ts         # /session/:id/message/* 端点
│   ├── provider.ts        # /provider/* 端点
│   ├── file.ts            # /file/* 端点
│   ├── config.ts          # /config/* 端点
│   ├── agent.ts           # /agent 端点
│   ├── command.ts         # /command 端点
│   ├── lsp.ts             # /lsp 端点
│   ├── formatter.ts       # /formatter 端点
│   ├── mcp.ts             # /mcp/* 端点
│   ├── event.ts           # /event 端点（SSE）
│   ├── instance.ts        # /instance/* 端点
│   ├── path.ts            # /path 端点
│   ├── vcs.ts             # /vcs/* 端点
│   ├── skill.ts           # /skill 端点
│   ├── log.ts             # /log 端点
│   ├── auth.ts            # /auth/* 端点
│   ├── doc.ts             # /doc 端点
│   ├── tui.ts             # /tui/* 端点
│   ├── experimental.ts    # /experimental/* 端点
│   └── pty.ts             # /pty/* 端点
├── proxy/
│   ├── request.ts         # 请求代理逻辑
│   ├── response.ts        # 响应处理逻辑
│   └── sse.ts             # SSE 聚合逻辑
├── session/
│   ├── route-table.ts     # 会话路由表
│   ├── create.ts          # 会话创建逻辑
│   └── lookup.ts          # 会话路由查找
├── aggregate/
│   ├── session-list.ts    # 会话列表聚合
│   ├── provider-list.ts   # 提供商列表聚合
│   ├── agent-list.ts      # 代理列表聚合
│   └── command-list.ts    # 命令列表聚合
└── types/
    ├── proxy-request.ts   # 代理请求类型
    ├── proxy-response.ts  # 代理响应类型
    └── route-strategy.ts  # 路由策略类型
```

## 4. 数据流

### 4.1 请求处理流程

```
客户端请求
    │
    v
Express 中间件（解析请求体）
    │
    v
API Router（匹配路由）
    │
    v
路由策略判断
    ├── local → 本地处理
    ├── broadcast → 广播所有后端
    ├── aggregate → 聚合所有后端
    ├── session → 查路由表定位后端
    ├── primary → 路由到主后端
    └── current → 路由到当前项目后端
    │
    v
Proxy Layer（转发请求）
    │
    v
Connector（发送到后端）
    │
    v
后端 opencode 实例
    │
    v
响应返回（透传或聚合）
    │
    v
客户端响应
```

### 4.2 SSE 事件流

```
客户端连接 SSE (/event)
    │
    v
SSE Manager（创建事件队列）
    │
    v
订阅所有后端 SSE
    ├── Connector A SSE ──┐
    ├── Connector B SSE ──│── 事件队列
    └── Connector C SSE ──┘
    │
    v
事件合并（保持格式）
    │
    v
推送到客户端
```

### 4.3 会话创建流程

```
POST /session
    │
    v
ConnectorManager.selectForNewSession()
    │
    ├── 获取已连接后端列表
    ├── 轮询选择下一个
    └── 返回选中 Connector
    │
    v
Proxy Layer 转发请求
    │
    v
后端创建会话
    │
    v
SessionRouteTable 注册路由
    │
    ├── sessionID → connectorID
    └── 持久化到内存
    │
    v
返回会话信息给客户端
```

## 5. 状态管理

### 5.1 内存状态

| 状态 | 存储位置 | 说明 |
|------|---------|------|
| Connector 状态 | ConnectorManager | 连接、隔离状态 |
| Session 路由表 | SessionRouteTable | sessionID → connectorID |
| SSE 连接状态 | SSE Manager | 客户端和后端连接 |

### 5.2 配置持久化

| 配置 | 存储位置 | 格式 |
|------|---------|------|
| 服务器列表 | servers.yaml | YAML |
| 运行时设置 | servers.yaml | YAML |

## 6. 错误处理架构

### 6.1 错误层级

```
错误发生
    │
    v
错误类型判断
    ├── 网络错误 → 502 Bad Gateway
    ├── 超时错误 → 504 Gateway Timeout
    ├── 无可用后端 → 503 Service Unavailable
    ├── 会话不存在 → 404 Not Found
    ├── 认证失败 → 401 Unauthorized（透传）
    └── 参数错误 → 400 Bad Request（透传）
    │
    v
错误响应格式化
    │
    v
返回客户端
```

### 6.2 错误响应格式

```json
{
  "error": {
    "message": "Backend server unreachable",
    "code": "BACKEND_UNREACHABLE",
    "backend": "remote-1"
  }
}
```

## 7. 扩展架构

### 7.1 Docker Connector（预留）

```
DockerConnector
├── config: DockerConnectorConfig
│   ├── image: string
│   ├── containerName?: string
│   ├── volumes?: string[]
│   └── env?: Record<string, string>
├── connect(): 创建容器
├── disconnect(): 停止容器
├── healthCheck(): 容器状态 + /global/health
└── proxy(): 容器网络代理
```

### 7.2 Kubernetes Connector（预留）

```
K8sConnector
├── config: K8sConnectorConfig
│   ├── namespace: string
│   ├── image: string
│   ├── replicas?: number
│   └── resources?: ResourceRequirements
├── connect(): 创建 Deployment
├── disconnect(): 删除 Deployment
├── healthCheck(): Pod 状态 + /global/health
└── proxy(): Service 网络代理
```

## 8. 部署架构

### 8.1 单实例部署

```
+-------------------+
|   opencode-stack  |
|    (Node.js)      |
+-------------------+
         |
    +----+----+----+
    |         |    |
    v         v    v
+------+ +------+ +------+
| OC-1 | | OC-2 | | OC-3 |
+------+ +------+ +------+
```

### 8.2 高可用部署（预留）

```
          +--------+
          |  LB    |  <-- 负载均衡
          +--------+
              |
     +--------+--------+
     |                 |
     v                 v
+-----------+    +-----------+
| Stack-1   |    | Stack-2   |
+-----------+    +-----------+
     |                 |
     +--------+--------+
              |
         后端 opencode 集群
```

## 9. 监控与诊断

### 9.1 健康检查端点

| 端点 | 响应 | 说明 |
|------|------|------|
| GET /health | `{ status: "ok" }` | 聚合服务健康 |
| GET /global/health | `{ healthy, version, backends }` | 包含后端状态 |

### 9.2 状态查询（预留）

| 端点 | 响应 | 说明 |
|------|------|------|
| GET /x/backends | `{ backends: [...] }` | 所有后端状态 |
| GET /x/routes | `{ routes: [...] }` | 会话路由表 |
| GET /x/sse | `{ connections: [...] }` | SSE 连接状态 |