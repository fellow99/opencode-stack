# TECH.md - 技术选型

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 核心技术栈

### 1.1 开发语言与运行时

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | ^5.7.3 | 开发语言，严格模式 |
| Node.js | >= 20 | 运行时环境 |

### 1.2 Web 框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Express | ^4.21.2 | HTTP 服务器框架 |

### 1.3 开发工具

| 技术 | 版本 | 用途 |
|------|------|------|
| ts-node | ^10.9.2 | TypeScript 直接执行 |
| nodemon | ^3.1.9 | 热重载开发 |
| tsc | ^5.7.3 | 生产构建 |

### 1.4 配置解析

| 技术 | 版本 | 用途 |
|------|------|------|
| yaml | ^2.7.0 | YAML 配置文件解析 |
| jsonc-parser | ^3.3.1 | JSON/JSONC 配置解析 |
| dotenv | ^16.4.7 | 环境变量加载 |

### 1.5 数据校验

| 技术 | 版本 | 用途 |
|------|------|------|
| zod | ^3.24.2 | 类型安全校验，Schema 定义 |

### 1.6 日志系统

| 技术 | 版本 | 用途 |
|------|------|------|
| log4js | latest | 分级日志，支持 console + 文件输出 |

## 2. 类型系统

### 2.1 复用 opencode SDK 类型

从 opencode SDK (`@opencode/sdk-js`) 复用以下类型：

| 类型 | 来源 | 用途 |
|------|------|------|
| Session | types.gen.ts | 会话信息 |
| Message | types.gen.ts | 消息信息 |
| Part | types.gen.ts | 消息部分 |
| Project | types.gen.ts | 项目信息 |
| Config | types.gen.ts | 配置信息 |
| Provider | types.gen.ts | 提供商信息 |
| Agent | types.gen.ts | 代理信息 |
| Command | types.gen.ts | 命令信息 |
| Event | types.gen.ts | SSE 事件 |
| FileNode | types.gen.ts | 文件节点 |
| FileContent | types.gen.ts | 文件内容 |
| FileDiff | types.gen.ts | 文件差异 |
| Todo | types.gen.ts | 待办事项 |
| Permission | types.gen.ts | 权限请求 |
| Pty | types.gen.ts | PTY 会话 |
| McpStatus | types.gen.ts | MCP 状态 |
| LspStatus | types.gen.ts | LSP 状态 |
| FormatterStatus | types.gen.ts | 格式化器状态 |
| Auth | types.gen.ts | 认证信息 |

### 2.2 自定义类型

新增类型定义在 `src/types/` 目录：

| 类型 | 文件 | 用途 |
|------|------|------|
| ServerConfig | connector.ts | 后端服务器配置 |
| ConnectorStatus | connector.ts | 连接器状态 |
| HealthInfo | connector.ts | 健康检查结果 |
| ProxyRequest | proxy.ts | 代理请求 |
| ProxyResponse | proxy.ts | 代理响应 |
| SessionRoute | session.ts | 会话路由映射 |

## 3. 构建与部署

### 3.1 构建流程

```bash
# 开发模式
npm run dev    # nodemon + ts-node

# 生产构建
npm run build  # tsc 编译
npm run start  # node dist/app.js
```

### 3.2 目录结构

| 目录 | 用途 |
|------|------|
| src/ | TypeScript 源代码 |
| dist/ | tsc 编译输出 |
| specs/ | 规范文档 |

## 4. HTTP 客户端选择

### 4.1 内置 HTTP 客户端

使用 Node.js 原生 `fetch` API（Node.js >= 18 内置）：

- 无需额外依赖
- 支持 Promise 异步
- 支持流式响应（SSE）
- 兼容标准 Fetch API

### 4.2 SSE 处理

使用原生 `ReadableStream` 处理 SSE：

```typescript
const response = await fetch(url)
const reader = response.body?.getReader()
// 逐行解析 SSE 事件
```

## 5. 配置文件格式

### 5.1 支持格式

| 格式 | 扩展名 | 解析器 |
|------|--------|--------|
| JSON | .json | 原生 JSON.parse |
| JSONC | .jsonc | jsonc-parser |
| YAML | .yaml, .yml | yaml 库 |

### 5.2 配置文件位置

| 配置 | 位置 | 格式 |
|------|------|------|
| 聚合服务配置 | ./config.yaml (server) | YAML |
| 后端服务器配置 | ./config.yaml (opencodes) | YAML |
| 环境变量 | ./.env | dotenv |
| TypeScript 配置 | ./tsconfig.json | JSON |

## 6. 日志系统

### 6.1 日志库

使用 `log4js` 作为日志框架，提供分级日志、多输出目标、日志轮转等能力。

### 6.2 日志级别

| 级别 | 用途 |
|------|------|
| DEBUG | 详细调试信息 |
| INFO | 正常操作记录 |
| WARN | 警告信息 |
| ERROR | 错误信息 |

### 6.3 日志输出

| 类别 | 输出目标 | 说明 |
|------|---------|------|
| 默认日志 | console + `logs/app.log` | 按日期轮转，保留 30 天 |
| 错误日志 | console + `logs/error.log` | 仅 ERROR 级别，按日期轮转 |
| 请求日志 | console + `logs/request.log` | 每个北向请求的 JSON 格式日志 |

### 6.4 请求日志格式

```json
{
  "timestamp": "2026-04-22T10:00:00.000Z",
  "method": "POST",
  "path": "/session",
  "status": 200,
  "duration": "45ms",
  "ip": "127.0.0.1"
}
```

### 6.5 开发/生产模式

- 开发模式：console + 文件，日志级别 `debug`
- 生产模式：console + 文件，日志级别 `info`

## 7. 安全考虑

### 7.1 认证透传

- 不存储用户密码
- 透传 HTTP Basic Auth 到后端
- 不拦截 401 响应

### 7.2 配置安全

- 密码存储在环境变量或配置文件
- 配置文件权限限制
- .env 文件不提交到 Git

## 8. 性能考虑

### 8.1 连接池

- 每个后端独立 HTTP 连接
- 无共享连接池
- SSE 连接独立管理

### 8.2 代理延迟

目标：代理延迟 < 10ms（不含后端响应时间）

优化策略：
- 最小化请求解析
- 直接转发请求体
- 流式响应处理

## 9. 未来技术扩展

### 9.1 Docker 支持（预留）

| 技术 | 用途 |
|------|------|
| dockerode | Docker API 客户端 |

### 9.2 Kubernetes 支持（预留）

| 技术 | 用途 |
|------|------|
| @kubernetes/client-node | Kubernetes API 客户端 |

### 9.3 数据库支持（预留）

| 技术 | 用途 |
|------|------|
| SQLite / PostgreSQL | 配置持久化 |

## 10. 依赖决策记录

### 10.1 为什么选择 Express？

- 成熟稳定，社区活跃
- 中间件生态丰富
- TypeScript 类型支持完善
- 学习成本低

### 10.2 为什么选择 Zod？

- TypeScript-first 类型校验
- 运行时校验 + 类型推断
- 与 opencode SDK 一致
- 错误信息清晰

### 10.3 为什么不用 Axios？

- Node.js >= 18 内置 fetch
- 减少依赖
- fetch API 标准化
- SSE 支持更好

### 10.4 为什么选择 YAML 配置？

- 可读性好
- 支持注释
- 复杂结构友好
- 服务器配置常用格式