# plan.md - 011 南向 OpenCode 连接器实施计划

> 模块: 南向 OpenCode 连接器
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 开发顺序

### 1.1 阶段一：类型定义（0.5 天）

1. 定义 IConnector 接口
2. 定义 ServerConfig 类型
3. 定义 ConnectorStatus 类型
4. 定义 HealthInfo 类型
5. 定义 ProxyRequest/ProxyResponse 类型

### 1.2 阶段二：LocalConnector（1 天）

1. 实现 connect/disconnect
2. 实现 healthCheck
3. 实现 proxy（GET/POST/PUT/DELETE/PATCH）
4. 实现 subscribeEvents（SSE）
5. 测试本地连接

### 1.3 阶段三：RemoteConnector（1 天）

1. 实现 HTTP Basic Auth
2. 实现 connect/disconnect
3. 实现 healthCheck（带认证）
4. 实现 proxy（带认证）
5. 实现 subscribeEvents（带认证）
6. 测试远程连接

### 1.4 阶段四：ConnectorManager（1 天）

1. 实现 initialize
2. 实现 get/getAll/getPrimary/getConnected
3. 实现负载均衡轮询
4. 实现 start/stop
5. 测试多后端管理

### 1.5 阶段五：健康检查机制（0.5 天）

1. 实现定时健康检查
2. 实现失败计数
3. 实现隔离逻辑
4. 实现恢复逻辑
5. 测试健康检查流程

## 2. 关键实现

### 2.1 连接器基类

```typescript
// src/connector/base.ts
import { IConnector, ServerConfig, ConnectorStatus, HealthInfo, ProxyRequest, ProxyResponse } from './types'

export abstract class BaseConnector implements IConnector {
  protected _status: ConnectorStatus = {
    connected: false,
    isolated: false,
    failureCount: 0,
    lastCheck: 0,
  }
  
  constructor(public readonly config: ServerConfig) {}
  
  get id() { return this.config.name }
  abstract get baseUrl(): string
  get status() { return this._status }
  
  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  
  async dispose(): Promise<void> {
    await this.disconnect()
    this._status.connected = false
  }
  
  async healthCheck(): Promise<HealthInfo> {
    const start = Date.now()
    try {
      const response = await fetch(`${this.baseUrl}/global/health`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(5000),
      })
      const data = await response.json()
      return {
        healthy: response.ok && data.healthy,
        version: data.version || 'unknown',
        responseTime: Date.now() - start,
      }
    } catch (err) {
      return {
        healthy: false,
        version: 'unknown',
        responseTime: Date.now() - start,
      }
    }
  }
  
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.config.username && this.config.password) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')
      headers['Authorization'] = `Basic ${auth}`
    }
    return headers
  }
  
  async proxy(request: ProxyRequest): Promise<ProxyResponse> {
    const url = new URL(request.path, this.baseUrl)
    if (request.query) {
      Object.entries(request.query).forEach(([k, v]) => url.searchParams.set(k, v))
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...request.headers,
    }
    
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: request.body && !['GET', 'DELETE'].includes(request.method) 
        ? JSON.stringify(request.body) 
        : undefined,
    })
    
    const body = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text()
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    }
  }
  
  subscribeEvents(callback: (event: any) => void): () => void {
    let aborted = false
    let reconnectCount = 0
    const maxReconnect = 3
    
    const connectSSE = async () => {
      if (aborted) return
      
      try {
        const response = await fetch(`${this.baseUrl}/event`, {
          headers: this.getAuthHeaders(),
        })
        
        if (!response.body) return
        
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        
        while (!aborted) {
          const { done, value } = await reader.read()
          if (done) {
            if (reconnectCount < maxReconnect && !aborted) {
              reconnectCount++
              setTimeout(connectSSE, 1000)
            }
            return
          }
          
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
        }
      } catch {
        if (reconnectCount < maxReconnect && !aborted) {
          reconnectCount++
          setTimeout(connectSSE, 1000)
        }
      }
    }
    
    connectSSE()
    
    return () => {
      aborted = true
    }
  }
}
```

### 2.2 LocalConnector

```typescript
// src/connector/local.ts
import { BaseConnector, ServerConfig } from './base'

export class LocalConnector extends BaseConnector {
  constructor(config: ServerConfig) {
    super({ ...config, type: 'local', host: '127.0.0.1', port: 4096 })
  }
  
  get baseUrl() { return `http://127.0.0.1:${this.config.port || 4096}` }
  
  async connect(): Promise<void> {
    const health = await this.healthCheck()
    if (!health.healthy) {
      throw new Error(`Local opencode not healthy: ${this.baseUrl}`)
    }
    this._status.connected = true
    this._status.lastCheck = Date.now()
  }
  
  async disconnect(): Promise<void> {
    this._status.connected = false
  }
}
```

### 2.3 RemoteConnector

```typescript
// src/connector/remote.ts
import { BaseConnector, ServerConfig } from './base'

export class RemoteConnector extends BaseConnector {
  constructor(config: ServerConfig) {
    if (!config.project) {
      throw new Error('Remote connector requires project path')
    }
    super(config)
  }
  
  get baseUrl() { return `http://${this.config.host}:${this.config.port}` }
  
  async connect(): Promise<void> {
    const health = await this.healthCheck()
    if (!health.healthy) {
      throw new Error(`Remote opencode not healthy: ${this.baseUrl}`)
    }
    this._status.connected = true
    this._status.lastCheck = Date.now()
  }
  
  async disconnect(): Promise<void> {
    this._status.connected = false
  }
}
```

### 2.4 ConnectorManager

```typescript
// src/connector/manager.ts
import { IConnector, AppConfig, NoAvailableBackendError } from './types'
import { LocalConnector } from './local'
import { RemoteConnector } from './remote'
import { HealthCheckManager } from './health-check'

export class ConnectorManager {
  private connectors: Map<string, IConnector> = new Map()
  private primaryId?: string
  private routeIndex: number = 0
  private healthChecker?: HealthCheckManager
  
  constructor(private config: AppConfig) {}
  
  async initialize(): Promise<void> {
    for (const serverConfig of this.config.servers) {
      if (!serverConfig.enabled) continue
      
      let connector: IConnector
      switch (serverConfig.type) {
        case 'local':
          connector = new LocalConnector(serverConfig)
          break
        case 'remote':
          connector = new RemoteConnector(serverConfig)
          break
        case 'docker':
        case 'k8s':
          throw new Error(`${serverConfig.type} connector not implemented yet`)
        default:
          throw new Error(`Unknown connector type: ${serverConfig.type}`)
      }
      
      try {
        await connector.connect()
        this.connectors.set(connector.id, connector)
        
        if (serverConfig.primary) {
          this.primaryId = connector.id
        }
      } catch (err) {
        console.error(`Failed to connect ${serverConfig.name}: ${err.message}`)
      }
    }
  }
  
  get(id: string): IConnector | undefined {
    return this.connectors.get(id)
  }
  
  getAll(): IConnector[] {
    return Array.from(this.connectors.values())
  }
  
  getPrimary(): IConnector | undefined {
    if (!this.primaryId) return undefined
    return this.connectors.get(this.primaryId)
  }
  
  getConnected(): IConnector[] {
    return this.getAll()
      .filter(c => c.status.connected)
      .filter(c => !c.status.isolated)
      .filter(c => c.config.enabled)
  }
  
  selectForNewSession(): IConnector {
    const connected = this.getConnected()
    if (connected.length === 0) {
      throw new NoAvailableBackendError()
    }
    this.routeIndex = (this.routeIndex + 1) % connected.length
    return connected[this.routeIndex]
  }
  
  async start(): Promise<void> {
    const settings = this.config.settings || {}
    this.healthChecker = new HealthCheckManager(
      settings.healthCheckInterval || 30000,
      settings.isolationThreshold || 3,
      settings.recoveryInterval || 60000
    )
    
    for (const connector of this.getAll()) {
      this.healthChecker.start(connector)
    }
  }
  
  async stop(): Promise<void> {
    if (this.healthChecker) {
      this.healthChecker.stopAll()
    }
    
    for (const connector of this.getAll()) {
      await connector.disconnect()
    }
  }
}
```

### 2.5 HealthCheckManager

```typescript
// src/connector/health-check.ts
import { IConnector } from './types'

export class HealthCheckManager {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private recoveryTimers: Map<string, NodeJS.Timeout> = new Map()
  
  constructor(
    private interval: number,
    private threshold: number,
    private recoveryInterval: number
  ) {}
  
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
    console.warn(`Connector ${connector.id} isolated after ${this.threshold} failures`)
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
          console.info(`Connector ${connector.id} recovered`)
        }
      } catch {}
    }, this.recoveryInterval)
    
    this.recoveryTimers.set(connector.id, timer)
  }
  
  stop(connector: IConnector): void {
    const timer = this.timers.get(connector.id)
    if (timer) {
      clearInterval(timer)
      this.timers.delete(connector.id)
    }
  }
  
  stopRecovery(connector: IConnector): void {
    const timer = this.recoveryTimers.get(connector.id)
    if (timer) {
      clearInterval(timer)
      this.recoveryTimers.delete(connector.id)
    }
  }
  
  stopAll(): void {
    for (const timer of this.timers.values()) clearInterval(timer)
    for (const timer of this.recoveryTimers.values()) clearInterval(timer)
    this.timers.clear()
    this.recoveryTimers.clear()
  }
}
```

## 3. 测试计划

### 3.1 LocalConnector 测试

| 测试 | 内容 |
|------|------|
| 连接成功 | 本地 opencode 运行时连接成功 |
| 健康检查 | GET /global/health 返回正确 |
| 代理 GET | GET 请求正确转发 |
| 代理 POST | POST 请求正确转发 |
| SSE 事件 | SSE 事件正确接收 |

### 3.2 RemoteConnector 测试

| 测试 | 内容 |
|------|------|
| 连接成功 | 远程 opencode 运行时连接成功 |
| Basic Auth | 认证头正确发送 |
| 健康检查（带认证） | 认证请求成功 |
| 代理（带认证） | 请求带认证 |
| SSE（带认证） | SSE 连接带认证 |

### 3.3 ConnectorManager 测试

| 测试 | 内容 |
|------|------|
| 初始化 | 所有连接器正确创建 |
| 负载均衡 | 轮询选择正确 |
| 获取连接器 | get/getAll/getPrimary |
| 隔离恢复 | 健康检查隔离恢复 |

## 4. 文件清单

| 文件 | 说明 |
|------|------|
| src/connector/types.ts | 类型定义 |
| src/connector/base.ts | 连接器基类 |
| src/connector/local.ts | Local 连接器 |
| src/connector/remote.ts | Remote 连接器 |
| src/connector/docker.ts | Docker 连接器（预留） |
| src/connector/k8s.ts | K8s 连接器（预留） |
| src/connector/manager.ts | 连接器管理器 |
| src/connector/health-check.ts | 健康检查管理 |
| src/connector/index.ts | 导出 |

## 5. 预计工时

| 阶段 | 工时 |
|------|------|
| 类型定义 | 0.5 天 |
| LocalConnector | 1 天 |
| RemoteConnector | 1 天 |
| ConnectorManager | 1 天 |
| 健康检查 | 0.5 天 |
| 测试 | 0.5 天 |
| **总计** | **4 天** |