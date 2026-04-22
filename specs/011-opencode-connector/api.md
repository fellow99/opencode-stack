# api.md - 011 南向 OpenCode 连接器内部接口

> 模块: 南向 OpenCode 连接器
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 内部接口概览

连接器模块提供以下内部接口供上层 API 模块调用：

| 接口 | 说明 |
|------|------|
| ConnectorManager.initialize() | 初始化所有连接器 |
| ConnectorManager.get(id) | 获取指定连接器 |
| ConnectorManager.getAll() | 获取所有连接器 |
| ConnectorManager.getPrimary() | 获取主连接器 |
| ConnectorManager.getConnected() | 获取已连接连接器 |
| ConnectorManager.selectForNewSession() | 选择后端创建新会话 |
| Connector.healthCheck() | 健康检查 |
| Connector.proxy() | 代理 HTTP 请求 |
| Connector.subscribeEvents() | 订阅 SSE 事件 |

## 2. ConnectorManager 接口

### 2.1 initialize()

初始化所有连接器。

```typescript
async initialize(): Promise<void>
```

**流程**：
1. 遍历配置中的 servers
2. 根据 type 创建对应 Connector
3. 调用 connector.connect()
4. 存储到内部 Map
5. 标记 primary 连接器

**错误**：
- 配置无效时抛出错误
- 连接失败时记录日志，不阻止其他连接器初始化

### 2.2 get(id)

获取指定连接器。

```typescript
get(id: string): IConnector | undefined
```

**返回**：
- 存在时返回 IConnector
- 不存在时返回 undefined

### 2.3 getAll()

获取所有连接器。

```typescript
getAll(): IConnector[]
```

**返回**：所有创建的连接器（包括未连接、隔离状态）

### 2.4 getPrimary()

获取主连接器。

```typescript
getPrimary(): IConnector | undefined
```

**返回**：
- 配置了 primary=true 的连接器
- 未配置时返回 undefined

### 2.5 getConnected()

获取已连接且未隔离的连接器。

```typescript
getConnected(): IConnector[]
```

**筛选条件**：
- status.connected === true
- status.isolated === false
- config.enabled === true

### 2.6 selectForNewSession()

为新会话选择后端。

```typescript
selectForNewSession(): IConnector
```

**策略**：轮询

**流程**：
1. 获取 getConnected() 列表
2. 按 routeIndex 轮询选择
3. routeIndex = (routeIndex + 1) % length
4. 返回选中的连接器

**错误**：
- 无可用连接器时抛出 NoAvailableBackendError

### 2.7 start()

启动健康检查。

```typescript
async start(): Promise<void>
```

**流程**：
1. 创建 HealthCheckManager
2. 对每个连接器启动定时健康检查

### 2.8 stop()

停止所有连接器。

```typescript
async stop(): Promise<void>
```

**流程**：
1. 停止健康检查定时器
2. 对每个连接器调用 disconnect()

## 3. IConnector 接口

### 3.1 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| id | string | 连接器唯一标识（= config.name） |
| config | ServerConfig | 连接配置 |
| status | ConnectorStatus | 运行状态 |
| baseUrl | string | 后端基础 URL |

### 3.2 connect()

建立连接。

```typescript
async connect(): Promise<void>
```

**流程**：
1. 调用 healthCheck()
2. 检查返回的 healthy
3. 设置 status.connected = true

**错误**：
- 健康检查失败时抛出错误

### 3.3 disconnect()

断开连接。

```typescript
async disconnect(): Promise<void>
```

**流程**：
1. 清理 SSE 连接
2. 设置 status.connected = false

### 3.4 dispose()

销毁连接器。

```typescript
async dispose(): Promise<void>
```

**流程**：
1. 调用 disconnect()
2. 清理所有资源

### 3.5 healthCheck()

执行健康检查。

```typescript
async healthCheck(): Promise<HealthInfo>
```

**流程**：
1. GET `${baseUrl}/global/health`
2. 解析响应
3. 返回 HealthInfo

**返回**：
```typescript
{
  healthy: boolean,
  version: string,
  responseTime: number
}
```

### 3.6 proxy()

代理 HTTP 请求。

```typescript
async proxy(request: ProxyRequest): Promise<ProxyResponse>
```

**流程**：
1. 构建完整 URL（baseUrl + path + query）
2. 设置请求头（含认证）
3. 发送请求
4. 返回响应

**请求参数**：
```typescript
{
  method: string,       // GET/POST/PUT/DELETE/PATCH
  path: string,         // /session, /session/:id/message 等
  query?: Record<string, string>,
  headers?: Record<string, string>,
  body?: any
}
```

**响应**：
```typescript
{
  status: number,
  headers: Record<string, string>,
  body: any
}
```

### 3.7 subscribeEvents()

订阅 SSE 事件。

```typescript
subscribeEvents(callback: (event: any) => void): Unsubscribe
```

**流程**：
1. 连接 `${baseUrl}/event`
2. 解析 SSE 数据行
3. 解析 JSON 事件
4. 调用 callback(event)

**返回**：取消订阅函数

**重连策略**：
- 断连时自动重连
- 最大重连次数：sseReconnectMax（默认 3）

## 4. 使用示例

### 4.1 初始化

```typescript
const config = await loadConfig()
const manager = new ConnectorManager(config)
await manager.initialize()
await manager.start()
```

### 4.2 创建新会话

```typescript
const connector = manager.selectForNewSession()
const response = await connector.proxy({
  method: 'POST',
  path: '/session',
  body: { title: 'New Session' }
})
const sessionID = response.body.id
sessionRouteTable.register(sessionID, connector.id)
```

### 4.3 路由到指定会话

```typescript
const connectorId = sessionRouteTable.lookup(sessionID)
if (!connectorId) {
  throw new SessionNotFoundError(sessionID)
}
const connector = manager.get(connectorId)
if (!connector || !connector.status.connected) {
  throw new BackendUnreachableError(connectorId)
}
const response = await connector.proxy({
  method: 'GET',
  path: `/session/${sessionID}/message`
})
```

### 4.4 聚合请求

```typescript
const connectors = manager.getConnected()
const results = await Promise.all(
  connectors.map(c => c.proxy({ method: 'GET', path: '/session' }))
)
const sessions = results.flatMap(r => r.body)
```

### 4.5 SSE 事件聚合

```typescript
const eventQueue = new EventQueue()
const unsubscribes: Unsubscribe[] = []

for (const connector of manager.getConnected()) {
  const unsub = connector.subscribeEvents((event) => {
    eventQueue.push({
      ...event,
      directory: connector.config.name
    })
  })
  unsubscribes.push(unsub)
}

// 推送到客户端 SSE
// ...
```

## 5. 错误处理

### 5.1 连接器错误

| 错误 | 场景 | 处理 |
|------|------|------|
| ConnectionFailedError | connect() 失败 | 记录日志，继续初始化其他 |
| HealthCheckFailedError | healthCheck() 失败 | 计入 failureCount |
| IsolatedError | 选择隔离连接器 | 抛出错误 |
| NoAvailableBackendError | 无可用连接器 | 抛出 503 |

### 5.2 代理错误

| 错误 | 场景 | 处理 |
|------|------|------|
| BackendUnreachableError | proxy() 网络错误 | 返回 502 |
| BackendTimeoutError | proxy() 超时 | 返回 504 |