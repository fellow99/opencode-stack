# plan.md - 001 整体框架实施计划

> 模块: 整体框架
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 开发顺序

### 1.1 阶段一：配置模块（0.5 天）

1. 创建 zod schema 定义
2. 实现配置文件搜索
3. 实现配置文件解析（YAML/JSON/JSONC）
4. 实现环境变量替换
5. 测试配置加载

### 1.2 阶段二：Express 应用（0.5 天）

1. 创建 Express 应用
2. 配置中间件链
3. 实现请求日志中间件
4. 实现错误处理中间件
5. 配置健康检查端点

### 1.3 阶段三：日志系统（0.5 天）

1. 实现分级日志
2. 实现格式化输出
3. 实现请求日志记录
4. 测试日志输出

### 1.4 阶段四：错误类型（0.5 天）

1. 定义错误类型
2. 实现错误处理
3. 测试错误响应

## 2. 关键实现

### 2.1 配置加载器

```typescript
// src/config/loader.ts
import fs from 'fs/promises'
import path from 'path'
import yaml from 'yaml'
import { parse as parseJSONC } from 'jsonc-parser'
import { AppConfigSchema, AppConfig } from './schema'

const CONFIG_FILES = [
  'servers.yaml',
  'servers.yml',
  'servers.json',
  'servers.jsonc',
]

export async function findConfigFile(): Promise<string | null> {
  const configPath = process.env.OPENCODE_STACK_CONFIG
  
  if (configPath) {
    if (fs.existsSync(configPath)) {
      return configPath
    }
    throw new Error(`Config file not found: ${configPath}`)
  }
  
  for (const file of CONFIG_FILES) {
    const fullPath = path.resolve(file)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
  }
  
  return null
}

export async function parseConfigFile(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf-8')
  const ext = path.extname(filePath)
  
  if (ext === '.yaml' || ext === '.yml') {
    return yaml.parse(content)
  }
  
  if (ext === '.jsonc') {
    return parseJSONC(content)
  }
  
  return JSON.parse(content)
}

export function resolveEnvVariables(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}:]+)(:-([^}]+))?\}/g, (_, name, _, defaultVal) => {
      return process.env[name] || defaultVal || ''
    })
  }
  
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVariables)
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVariables(value)
    }
    return result
  }
  
  return obj
}

export async function loadConfig(): Promise<AppConfig> {
  const configFile = await findConfigFile()
  if (!configFile) {
    throw new Error('Configuration file not found. Create servers.yaml')
  }
  
  const content = await parseConfigFile(configFile)
  const resolved = resolveEnvVariables(content)
  
  return AppConfigSchema.parse(resolved)
}
```

### 2.2 Express 应用

```typescript
// src/app.ts
import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { loadConfig } from './config'
import { ConnectorManager } from './connector'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

export const app = express()

// 中间件
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(requestLoggerMiddleware)

// 路由（后续添加）
// app.use('/', apiRouter)

// 健康检查
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  })
})

// 404
app.use((_req, res) => {
  res.status(404).json({
    error: { message: 'Not Found', code: 'NOT_FOUND' }
  })
})

// 错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message)
  const statusCode = (err as any).statusCode || 500
  res.status(statusCode).json({
    error: { message: err.message, code: (err as any).code || 'INTERNAL_ERROR' }
  })
})

export async function startServer() {
  const config = await loadConfig()
  const connectorManager = new ConnectorManager(config)
  await connectorManager.initialize()
  await connectorManager.start()
  
  const PORT = process.env.PORT || 6904
  app.listen(PORT, () => {
    console.log(`opencode-stack listening on http://localhost:${PORT}`)
  })
}
```

### 2.3 请求日志中间件

```typescript
// src/util/logger.ts
export function requestLoggerMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'WARN' : 'INFO',
      service: 'opencode-stack',
      operation: 'request',
      method: req.method,
      path: req.path,
      query: req.query,
      status: res.statusCode,
      duration,
    }
    console.log(JSON.stringify(logEntry))
  })
  
  next()
}
```

## 3. 测试计划

### 3.1 配置加载测试

| 测试 | 内容 |
|------|------|
| YAML 解析 | 正确解析 servers.yaml |
| JSON 解析 | 正确解析 servers.json |
| JSONC 解析 | 正确解析 servers.jsonc（含注释） |
| 环境变量替换 | ${VAR} 正确替换 |
| Schema 校验 | 无效配置抛出错误 |
| 默认值 | 未指定字段使用默认值 |

### 3.2 Express 应用测试

| 测试 | 内容 |
|------|------|
| 健康检查 | GET /health 返回正确响应 |
| 404 处理 | 未注册路由返回 404 |
| JSON 解析 | 请求体正确解析 |
| 错误处理 | 异常返回正确格式 |

### 3.3 日志测试

| 测试 | 内容 |
|------|------|
| 请求日志 | 每个请求记录日志 |
| 日志格式 | JSON 格式正确 |
| 错误日志 | 错误请求记录 WARN |

## 4. 文件清单

| 文件 | 说明 |
|------|------|
| src/config/loader.ts | 配置加载器 |
| src/config/schema.ts | zod schema |
| src/config/index.ts | 导出 |
| src/util/logger.ts | 日志模块 |
| src/types/errors.ts | 错误类型 |
| src/app.ts | 应用入口 |

## 5. 依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| yaml | ^2.7.0 | YAML 解析 |
| jsonc-parser | ^3.3.1 | JSONC 解析 |
| zod | ^3.24.2 | Schema 校验 |
| dotenv | ^16.4.7 | 环境变量 |
| express | ^4.21.2 | Web 框架 |

## 6. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 配置格式错误 | 服务无法启动 | zod 校验 + 错误提示 |
| 环境变量未设置 | 配置解析失败 | 提供 ${VAR:-default} 默认值 |
| 文件编码问题 | 解析失败 | 强制 UTF-8 |

## 7. 预计工时

| 阶段 | 工时 |
|------|------|
| 配置模块 | 0.5 天 |
| Express 应用 | 0.5 天 |
| 日志系统 | 0.5 天 |
| 错误类型 | 0.5 天 |
| 测试 | 0.5 天 |
| **总计** | **2 天** |