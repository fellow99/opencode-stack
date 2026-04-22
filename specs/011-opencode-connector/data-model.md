# data-model.md - 011 南向 OpenCode 连接器数据模型

> 模块: 南向 OpenCode 连接器
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 核心数据模型

### 1.1 ServerConfig

后端服务器配置。

```typescript
interface ServerConfig {
  name: string                     // 连接器唯一名称
  type: 'local' | 'remote' | 'docker' | 'k8s' // 连接类型
  host: string                     // 服务器主机地址
  port: number                     // 服务器端口
  project?: string                 // 项目路径（remote 必填）
  username?: string                // 认证用户名（默认 opencode）
  password?: string                // 认证密码
  enabled?: boolean                // 是否启用（默认 true）
  primary?: boolean                // 是否为主后端（默认 false）
}
```

### 1.2 ConnectorStatus

连接器运行状态。

```typescript
interface ConnectorStatus {
  connected: boolean               // 是否已连接
  isolated: boolean                // 是否被隔离（故障隔离）
  failureCount: number             // 连续健康检查失败次数
  lastError?: string               // 最后错误信息
  lastCheck?: number               // 最后健康检查时间戳
}
```

### 1.3 HealthInfo

健康检查结果。

```typescript
interface HealthInfo {
  healthy: boolean                 // 是否健康
  version: string                  // opencode 版本
  responseTime: number             // 响应时间（毫秒）
}
```

### 1.4 ProxyRequest

代理请求参数。

```typescript
interface ProxyRequest {
  method: string                   // HTTP 方法（GET/POST/PUT/DELETE/PATCH）
  path: string                     // 请求路径（不含 baseUrl）
  query?: Record<string, string>   // 查询参数
  headers?: Record<string, string> // 请求头（可选覆盖）
  body?: any                       // 请求体
}
```

### 1.5 ProxyResponse

代理响应结果。

```typescript
interface ProxyResponse {
  status: number                   // HTTP 状态码
  headers: Record<string, string>  // 响应头
  body: any                        // 响应体
}
```

## 2. 配置数据模型

### 2.1 AppConfig

应用完整配置。

```typescript
interface AppConfig {
  servers: ServerConfig[]          // 服务器配置列表
  settings?: SettingsConfig        // 运行时设置
}
```

### 2.2 SettingsConfig

运行时设置。

```typescript
interface SettingsConfig {
  healthCheckInterval?: number     // 健康检查间隔（ms，默认 30000）
  healthCheckTimeout?: number      // 健康检查超时（ms，默认 5000）
  isolationThreshold?: number      // 隔离阈值（默认 3 次）
  recoveryInterval?: number        // 恢复重试间隔（ms，默认 60000）
  sseReconnectMax?: number         // SSE 重连次数（默认 3）
  sseGracefulShutdownDelay?: number// SSE 关闭延迟（ms，默认 30000）
}
```

## 3. 扩展数据模型

### 3.1 DockerConnectorConfig（预留）

Docker 连接器配置。

```typescript
interface DockerConnectorConfig extends ServerConfig {
  type: 'docker'
  image: string                    // Docker 镜像名称
  containerName?: string           // 容器名称
  volumes?: string[]               // 挂载卷（host:container 格式）
  env?: Record<string, string>     // 环境变量
  network?: string                 // Docker 网络
}
```

### 3.2 K8sConnectorConfig（预留）

Kubernetes 连接器配置。

```typescript
interface K8sConnectorConfig extends ServerConfig {
  type: 'k8s'
  namespace: string                // Kubernetes 命名空间
  image: string                    // 容器镜像
  replicas?: number                // 副本数
  resources?: {
    limits?: {
      cpu?: string
      memory?: string
    }
    requests?: {
      cpu?: string
      memory?: string
    }
  }
  serviceType?: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
}
```

## 4. Zod Schema 定义

### 4.1 ServerConfigSchema

```typescript
import { z } from 'zod'

const ServerConfigSchema = z.object({
  name: z.string().min(1, 'name is required'),
  type: z.enum(['local', 'remote', 'docker', 'k8s']),
  host: z.string().min(1, 'host is required'),
  port: z.number().int().positive().default(4096),
  project: z.string().optional(),
  username: z.string().default('opencode'),
  password: z.string().optional(),
  enabled: z.boolean().default(true),
  primary: z.boolean().default(false),
}).refine(
  (data) => data.type !== 'remote' || data.project,
  { message: 'project is required for remote type' }
)
```

### 4.2 SettingsConfigSchema

```typescript
const SettingsConfigSchema = z.object({
  healthCheckInterval: z.number().int().positive().default(30000),
  healthCheckTimeout: z.number().int().positive().default(5000),
  isolationThreshold: z.number().int().positive().default(3),
  recoveryInterval: z.number().int().positive().default(60000),
  sseReconnectMax: z.number().int().positive().default(3),
  sseGracefulShutdownDelay: z.number().int().positive().default(30000),
})
```

### 4.3 AppConfigSchema

```typescript
const AppConfigSchema = z.object({
  servers: z.array(ServerConfigSchema).min(1, 'at least one server required'),
  settings: SettingsConfigSchema.optional(),
})
```

## 5. 示例配置

### 5.1 YAML 格式

```yaml
servers:
  - name: local
    type: local
    host: 127.0.0.1
    port: 4096
    enabled: true
    primary: true
    
  - name: remote-dev
    type: remote
    host: 192.168.1.100
    port: 4096
    project: /home/user/project
    username: opencode
    password: ${REMOTE_PASSWORD}
    enabled: true
    primary: false

settings:
  healthCheckInterval: 30000
  healthCheckTimeout: 5000
  isolationThreshold: 3
  recoveryInterval: 60000
```

### 5.2 JSON 格式

```json
{
  "servers": [
    {
      "name": "local",
      "type": "local",
      "host": "127.0.0.1",
      "port": 4096,
      "enabled": true,
      "primary": true
    }
  ],
  "settings": {
    "healthCheckInterval": 30000
  }
}
```

## 6. 状态转换图

```
连接器状态转换
    │
    v
[初始化] ─────> [连接中]
    │               │
    │               ├── 成功 ──> [已连接]
    │               │              │
    │               │              ├── 健康检查成功 ──> 保持
    │               │              │
    │               │              ├── 健康检查失败 ──> [隔离]
    │               │              │                          │
    │               │              │                          └── 恢复成功 ──> [已连接]
    │               │              │                          │
    │               │              │                          └── 恢复失败 ──> 保持隔离
    │               │              │
    │               └── 失败 ──> [未连接]
```

## 7. 接口类型

### 7.1 IConnector

```typescript
interface IConnector {
  readonly id: string
  readonly config: ServerConfig
  readonly status: ConnectorStatus
  readonly baseUrl: string
  
  connect(): Promise<void>
  disconnect(): Promise<void>
  dispose(): Promise<void>
  healthCheck(): Promise<HealthInfo>
  proxy(request: ProxyRequest): Promise<ProxyResponse>
  subscribeEvents(callback: (event: any) => void): Unsubscribe
}

type Unsubscribe = () => void
```

### 7.2 ConnectorManager 接口

```typescript
interface ConnectorManagerInterface {
  initialize(): Promise<void>
  get(id: string): IConnector | undefined
  getAll(): IConnector[]
  getPrimary(): IConnector | undefined
  getConnected(): IConnector[]
  selectForNewSession(): IConnector
  start(): Promise<void>
  stop(): Promise<void>
}
```

## 8. 错误类型

### 8.1 连接器错误

```typescript
class ConnectorError extends Error {
  constructor(
    message: string,
    public connectorId: string,
    public code: string
  ) {
    super(message)
  }
}

class ConnectionFailedError extends ConnectorError {
  constructor(connectorId: string, reason: string) {
    super(`Connection failed: ${reason}`, connectorId, 'CONNECTION_FAILED')
  }
}

class HealthCheckFailedError extends ConnectorError {
  constructor(connectorId: string) {
    super('Health check failed', connectorId, 'HEALTH_CHECK_FAILED')
  }
}

class IsolatedError extends ConnectorError {
  constructor(connectorId: string) {
    super('Connector is isolated', connectorId, 'ISOLATED')
  }
}
```