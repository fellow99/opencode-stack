# spec.md - 001 整体框架规范

> 模块: 整体框架
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 模块概述

整体框架模块负责 opencode-stack 应用的初始化和基础设施搭建，包括 Express 应用创建、中间件配置、路由注册、全局错误处理、配置文件加载等。

## 2. 配置模块

### 2.1 配置文件格式

支持 YAML、JSON、JSONC 三种格式：

| 格式 | 扩展名 | 解析器 |
|------|--------|--------|
| YAML | .yaml, .yml | yaml 库 |
| JSON | .json | 原生 JSON.parse |
| JSONC | .jsonc | jsonc-parser |

### 2.2 配置文件位置

按优先级搜索：

1. `./servers.yaml`
2. `./servers.yml`
3. `./servers.json`
4. `./servers.jsonc`

### 2.3 配置 Schema

```typescript
// src/config/schema.ts
import { z } from 'zod'

export const ServerConfigSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['local', 'remote', 'docker', 'k8s']),
  host: z.string().min(1),
  port: z.number().int().positive().default(4096),
  project: z.string().optional(),
  username: z.string().default('opencode'),
  password: z.string().optional(),
  enabled: z.boolean().default(true),
  primary: z.boolean().default(false),
})

export const SettingsConfigSchema = z.object({
  healthCheckInterval: z.number().int().positive().default(30000),
  healthCheckTimeout: z.number().int().positive().default(5000),
  isolationThreshold: z.number().int().positive().default(3),
  recoveryInterval: z.number().int().positive().default(60000),
  sseReconnectMax: z.number().int().positive().default(3),
  sseGracefulShutdownDelay: z.number().int().positive().default(30000),
})

export const AppConfigSchema = z.object({
  servers: z.array(ServerConfigSchema).min(1),
  settings: SettingsConfigSchema.optional(),
})
```

### 2.4 配置加载器

```typescript
// src/config/loader.ts
export async function loadConfig(): Promise<AppConfig> {
  // 1. 搜索配置文件
  const configFile = await findConfigFile()
  if (!configFile) {
    throw new Error('Configuration file not found')
  }
  
  // 2. 解析配置文件
  const content = await parseConfigFile(configFile)
  
  // 3. 环境变量替换
  const resolved = resolveEnvVariables(content)
  
  // 4. Schema 校验
  return AppConfigSchema.parse(resolved)
}
```

### 2.5 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 6904 | 服务端口 |
| NODE_ENV | development | 运行环境 |
| OPENCODE_STACK_CONFIG | - | 配置文件路径（可选） |

## 3. Express 应用

### 3.1 应用初始化

```typescript
// src/app.ts
import express from 'express'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()

// 中间件
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(requestLoggerMiddleware)

// 路由
app.use('/', rootRouter)
app.use('/health', healthRouter)
app.use('/global', globalRouter)
app.use('/project', projectRouter)
app.use('/session', sessionRouter)
// ... 其他路由

// 错误处理
app.use(notFoundHandler)
app.use(errorHandler)

// 启动
const PORT = process.env.PORT || 6904
app.listen(PORT, () => {
  console.log(`opencode-stack listening on http://localhost:${PORT}`)
})
```

### 3.2 中间件链

| 顺序 | 中间件 | 说明 |
|------|--------|------|
| 1 | express.json() | JSON 请求体解析 |
| 2 | express.urlencoded() | URL 编码解析 |
| 3 | requestLoggerMiddleware | 请求日志 |
| 4 | corsMiddleware（可选） | CORS 处理 |
| 5 | 路由处理器 | 业务路由 |
| 6 | notFoundHandler | 404 处理 |
| 7 | errorHandler | 错误处理 |

### 3.3 请求日志中间件

```typescript
// src/util/logger.ts
export function requestLoggerMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      backend: req.headers['x-backend-name'] || 'unknown',
    }
    console.log(JSON.stringify(log))
  })
  
  next()
}
```

### 3.4 错误处理中间件

```typescript
// src/app.ts
export function notFoundHandler(
  req: express.Request,
  res: express.Response
) {
  res.status(404).json({
    error: {
      message: 'Not Found',
      code: 'NOT_FOUND',
    }
  })
}

export function errorHandler(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  console.error('[Error]', err.message, err.stack)
  
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR',
    }
  })
}
```

## 4. 健康检查端点

### 4.1 GET /health

返回聚合服务自身健康状态：

```json
{
  "status": "ok",
  "timestamp": "2026-04-22T10:00:00.000Z",
  "version": "0.1.0"
}
```

## 5. 日志系统

### 5.1 日志级别

| 级别 | 说明 |
|------|------|
| DEBUG | 详细调试信息 |
| INFO | 正常操作记录 |
| WARN | 警告信息 |
| ERROR | 错误信息 |

### 5.2 日志格式

```json
{
  "timestamp": "2026-04-22T10:00:00.000Z",
  "level": "INFO",
  "service": "opencode-stack",
  "operation": "request",
  "method": "POST",
  "path": "/session",
  "status": 200,
  "duration": 45,
  "backend": "local"
}
```

## 6. 服务启动流程

```
启动流程
    │
    v
加载环境变量 (.env)
    │
    v
加载配置文件 (servers.yaml)
    │
    v
校验配置 (zod schema)
    │
    v
创建 Express 应用
    │
    v
注册中间件链
    │
    v
初始化 ConnectorManager
    │
    v
注册业务路由
    │
    v
注册错误处理
    │
    v
启动 HTTP 服务
    │
    v
等待请求
```

## 7. 环境变量处理

### 7.1 .env 文件

```bash
# .env.example
PORT=6904
NODE_ENV=development

# 后端密码（可选）
REMOTE_PASSWORD=your-password
```

### 7.2 环境变量替换

配置文件中可以使用 `${VAR_NAME}` 引用环境变量：

```yaml
servers:
  - name: remote-1
    password: ${REMOTE_PASSWORD}
```

替换逻辑：

```typescript
function resolveEnvVariables(content: string): any {
  // 匹配 ${VAR} 或 ${VAR:-default}
  return content.replace(/\$\{([^}:]+)(:-([^}]+))?\}/g, (_, name, _, defaultVal) => {
    return process.env[name] || defaultVal || ''
  })
}
```

## 8. 开发与生产配置

### 8.1 开发模式

- ts-node 直接运行 TypeScript
- nodemon 热重载
- 详细日志输出

### 8.2 生产模式

- tsc 编译到 dist/
- node 运行编译后的代码
- 精简日志输出

## 9. 错误类型定义

```typescript
// src/types/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class BackendUnreachableError extends AppError {
  constructor(backend: string) {
    super(`Backend ${backend} unreachable`, 'BACKEND_UNREACHABLE', 502)
  }
}

export class BackendTimeoutError extends AppError {
  constructor(backend: string) {
    super(`Backend ${backend} timeout`, 'BACKEND_TIMEOUT', 504)
  }
}

export class NoAvailableBackendError extends AppError {
  constructor() {
    super('No available backend', 'NO_AVAILABLE_BACKEND', 503)
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionID: string) {
    super(`Session ${sessionID} not found`, 'SESSION_NOT_FOUND', 404)
  }
}
```

## 10. 导出结构

```typescript
// src/index.ts
export { app, startServer } from './app'
export { loadConfig, AppConfigSchema } from './config'
export { ConnectorManager } from './connector'
export { SessionRouteTable } from './api/session'
export { AppError, BackendUnreachableError, ... } from './types/errors'
```