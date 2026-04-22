# spec.md - 011 南向 OpenCode 连接器规范

> 模块: 南向 OpenCode 连接器
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 模块概述

南向连接器模块负责管理与多个 opencode 服务器实例的连接。每种连接类型（local、remote、docker、k8s）实现统一的连接器接口，上层通过抽象接口与后端交互，无需关心具体连接方式。

## 2. 连接器接口

### 2.1 IConnector

所有连接器必须实现的统一接口：

```typescript
// src/connector/types.ts
export interface IConnector {
  // 属性
  readonly id: string              // 连接器唯一标识
  readonly config: ServerConfig    // 连接配置
  readonly status: ConnectorStatus // 连接状态
  readonly baseUrl: string         // 后端基础 URL
  
  // 生命周期
  connect(): Promise<void>         // 建立连接
  disconnect(): Promise<void>      // 断开连接
  dispose(): Promise<void>         // 销毁连接器
  
  // 健康检查
  healthCheck(): Promise<HealthInfo> // 执行健康检查
  
  // HTTP 代理
  proxy(request: ProxyRequest): Promise<ProxyResponse>
  
  // SSE 连接
  subscribeEvents(callback: (event: Event) => void): Unsubscribe
}

export type Unsubscribe = () => void
```

### 2.2 ServerConfig

```typescript
export interface ServerConfig {
  name: string                     // 连接器名称（唯一）
  type: 'local' | 'remote' | 'docker' | 'k8s'
  host: string                     // 服务器主机
  port: number                     // 服务器端口
  project?: string                 // 项目路径（remote 必填）
  username?: string                // 认证用户名（默认 opencode）
  password?: string                // 认证密码
  enabled?: boolean                // 是否启用（默认 true）
  primary?: boolean                // 是否为主后端（默认 false）
}
```

### 2.3 ConnectorStatus

```typescript
export interface ConnectorStatus {
  connected: boolean               // 是否已连接
  isolated: boolean                // 是否被隔离
  failureCount: number             // 连续失败次数
  lastError?: string               // 最后错误信息
  lastCheck?: number               // 最后健康检查时间
}
```

### 2.4 HealthInfo

```typescript
export interface HealthInfo {
  healthy: boolean                 // 是否健康
  version: string                  // opencode 版本
  responseTime: number             // 响应时间（ms）
}
```

### 2.5 ProxyRequest / ProxyResponse

```typescript
export interface ProxyRequest {
  method: string                   // HTTP 方法
  path: string                     // 请求路径
  query?: Record<string, string>   // 查询参数
  headers?: Record<string, string> // 请求头
  body?: any                       // 请求体
}

export interface ProxyResponse {
  status: number                   // HTTP 状态码
  headers: Record<string, string>  // 响应头
  body: any                        // 响应体
}
```

## 3. LocalConnector

### 3.1 说明

连接本机运行的 opencode 实例。

### 3.2 配置

| 字段 | 值 | 说明 |
|------|-----|------|
| type | `local` | 固定值 |
| host | `127.0.0.1` | 固定值 |
| port | `4096` | opencode 默认端口 |
| project | 可选 | 项目路径 |

### 3.3 行为

| 操作 | 实现 |
|------|------|
| connect | 调用 `/global/health` 验证连接 |
| disconnect | 清理 SSE 连接 |
| healthCheck | GET `/global/health` |
| proxy | 直接 HTTP 请求到 `http://127.0.0.1:4096` |
| subscribeEvents | 连接 `/event` SSE |

### 3.4 实现示例

```typescript
// src/connector/local.ts
export class LocalConnector implements IConnector {
  constructor(public readonly config: ServerConfig) {}
  
  get id() { return this.config.name }
  get baseUrl() { return `http://${this.config.host}:${this.config.port}` }
  
  async connect(): Promise<void> {
    const health = await this.healthCheck()
    if (!health.healthy) {
      throw new Error('Local opencode not healthy')
    }
    this.status.connected = true
  }
  
  async healthCheck(): Promise<HealthInfo> {
    const start = Date.now()
    const response = await fetch(`${this.baseUrl}/global/health`)
    const data = await response.json()
    return {
      healthy: response.ok && data.healthy,
      version: data.version,
      responseTime: Date.now() - start,
    }
  }
  
  async proxy(request: ProxyRequest): Promise<ProxyResponse> {
    const url = new URL(request.path, this.baseUrl)
    if (request.query) {
      Object.entries(request.query).forEach(([k, v]) => url.searchParams.set(k, v))
    }
    
    const response = await fetch(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    })
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.json(),
    }
  }
}
```

## 4. RemoteConnector

### 4.1 说明

连接远程主机上运行的 opencode 实例。

### 4.2 配置

| 字段 | 值 | 说明 |
|------|-----|------|
| type | `remote` | 固定值 |
| host | 任意 | 远程主机地址 |
| port | 任意 | 远程端口 |
| project | 必填 | 远程项目路径 |
| username | 可选 | 认证用户名 |
| password | 可选 | 认证密码 |

### 4.3 行为

| 操作 | 实现 |
|------|------|
| connect | 调用 `/global/health` 验证连接 |
| disconnect | 清理 SSE 连接 |
| healthCheck | GET `/global/health`（带认证） |
| proxy | HTTP 请求带 Basic Auth |
| subscribeEvents | SSE 连接带认证 |

### 4.4 认证

如果配置了 username/password，使用 HTTP Basic Auth：

```typescript
const headers = {
  ...request.headers,
  Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
}
```

## 5. DockerConnector（预留）

### 5.1 说明

动态创建和管理 Docker 容器中的 opencode 实例。

### 5.2 预留接口

```typescript
interface DockerConnectorConfig extends ServerConfig {
  type: 'docker'
  image: string                    // Docker 镜像
  containerName?: string           // 容器名称
  volumes?: string[]               // 挂载卷
  env?: Record<string, string>     // 环境变量
}
```

### 5.3 预留行为

| 操作 | 实现 |
|------|------|
| connect | `docker run` 创建容器 |
| disconnect | `docker stop` 停止容器 |
| dispose | `docker rm` 删除容器 |
| healthCheck | 容器状态 + `/global/health` |

## 6. K8sConnector（预留）

### 6.1 说明

在 Kubernetes 集群中动态部署和管理 opencode 实例。

### 6.2 预留接口

```typescript
interface K8sConnectorConfig extends ServerConfig {
  type: 'k8s'
  namespace: string                // Kubernetes 命名空间
  image: string                    // 容器镜像
  replicas?: number                // 副本数
  resources?: ResourceRequirements // 资源限制
}
```

### 6.3 预留行为

| 操作 | 实现 |
|------|------|
| connect | 创建 Deployment + Service |
| disconnect | 删除 Deployment |
| dispose | 删除所有资源 |
| healthCheck | Pod 状态 + `/global/health` |

## 7. ConnectorManager

### 7.1 说明

管理所有连接器的生命周期，提供负载均衡选择。

### 7.2 接口

```typescript
// src/connector/manager.ts
export class ConnectorManager {
  constructor(config: AppConfig)
  
  // 初始化
  async initialize(): Promise<void>
  
  // 连接器访问
  get(id: string): IConnector | undefined
  getAll(): IConnector[]
  getPrimary(): IConnector | undefined
  getConnected(): IConnector[]
  
  // 负载均衡
  selectForNewSession(): IConnector
  
  // 生命周期
  async start(): Promise<void>
  async stop(): Promise<void>
}
```

### 7.3 初始化流程

```
initialize()
    │
    v
遍历 servers 配置
    │
    v
根据 type 创建对应 Connector
    │
    v
调用 connect()
    │
    v
存储到 connectors Map
    │
    v
标记 primary 连接器
```

### 7.4 负载均衡策略

v0.1 使用简单轮询策略：

```typescript
selectForNewSession(): IConnector {
  const connected = this.getConnected()
  if (connected.length === 0) {
    throw new NoAvailableBackendError()
  }
  
  // 轮询选择
  this.routeIndex = (this.routeIndex + 1) % connected.length
  return connected[this.routeIndex]
}

getConnected(): IConnector[] {
  return this.getAll()
    .filter(c => c.status.connected && !c.status.isolated)
    .filter(c => c.config.enabled)
}
```

## 8. 健康检查机制

### 8.1 配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| healthCheckInterval | 30000 | 检查间隔（ms） |
| healthCheckTimeout | 5000 | 单次超时（ms） |
| isolationThreshold | 3 | 连续失败阈值 |
| recoveryInterval | 60000 | 恢复重试间隔（ms） |

### 8.2 检查流程

```
定时器触发（每 30s）
    │
    v
对每个连接器调用 healthCheck()
    │
    ├── 成功 → status.connected = true
    │         status.isolated = false
    │         status.failureCount = 0
    │
    └── 失败 → failureCount++
              if failureCount >= 3:
                status.isolated = true
                停止对该连接器的健康检查
                启动恢复检查（每 60s）
```

### 8.3 恢复流程

```
隔离的连接器
    │
    v
恢复定时器（每 60s）
    │
    v
调用 healthCheck()
    │
    ├── 成功 → 解除隔离
    │         恢复正常健康检查
    │
    └── 失败 → 继续等待下一次恢复检查
```

### 8.4 实现示例

```typescript
// src/connector/health-check.ts
export class HealthCheckManager {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private recoveryTimers: Map<string, NodeJS.Timeout> = new Map()
  
  start(connector: IConnector): void {
    const timer = setInterval(async () => {
      try {
        const health = await connector.healthCheck()
        connector.status.connected = health.healthy
        connector.status.isolated = false
        connector.status.failureCount = 0
        connector.status.lastCheck = Date.now()
      } catch (err) {
        connector.status.failureCount++
        connector.status.lastError = err.message
        
        if (connector.status.failureCount >= this.threshold) {
          this.isolate(connector)
        }
      }
    }, this.interval)
    
    this.timers.set(connector.id, timer)
  }
  
  isolate(connector: IConnector): void {
    connector.status.isolated = true
    this.stop(connector)
    this.startRecovery(connector)
  }
  
  startRecovery(connector: IConnector): void {
    const timer = setInterval(async () => {
      try {
        const health = await connector.healthCheck()
        if (health.healthy) {
          connector.status.isolated = false
          connector.status.failureCount = 0
          this.stopRecovery(connector)
          this.start(connector)
        }
      } catch {}
    }, this.recoveryInterval)
    
    this.recoveryTimers.set(connector.id, timer)
  }
}
```

## 9. SSE 事件订阅

### 9.1 接口

```typescript
subscribeEvents(callback: (event: Event) => void): Unsubscribe
```

### 9.2 实现

```typescript
async subscribeEvents(callback: (event: Event) => void): Unsubscribe {
  const url = `${this.baseUrl}/event`
  const response = await fetch(url, {
    headers: this.getAuthHeaders(),
  })
  
  const reader = response.body?.getReader()
  if (!reader) return () => {}
  
  const decoder = new TextDecoder()
  let buffer = ''
  
  const pump = async (): Promise<void> => {
    const { done, value } = await reader.read()
    if (done) return
    
    buffer += decoder.decode(value)
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const event = JSON.parse(line.slice(5))
          callback(event)
        } catch {}
      }
    }
    
    return pump()
  }
  
  pump()
  
  return () => {
    reader.cancel()
  }
}
```

## 10. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 连接失败 | 记录日志，标记 status.connected = false |
| 健康检查超时 | 计入 failureCount |
| 代理请求失败 | 抛出 BackendUnreachableError |
| SSE 断连 | 自动重连（最多 sseReconnectMax 次） |