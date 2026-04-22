# constitution.md - 宪法原则

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 接口兼容原则

**北向接口必须与 opencode 服务器接口完全兼容。**

- 所有 API 路径、方法、请求参数、响应格式必须与 opencode OpenAPI 3.1 规范一致
- 客户端无需修改即可连接 opencode-stack 替代单个 opencode 实例
- 新增扩展接口必须以 `/x/` 前缀区分，不得与 opencode 原生接口冲突
- SSE 事件流格式必须与 opencode 原生格式一致

### API 兼容性要求

| 端点组 | 兼容要求 | 说明 |
|--------|---------|------|
| /global/* | 完全兼容 | 健康检查、事件流、全局配置 |
| /project/* | 完全兼容 | 项目列表、当前项目 |
| /session/* | 完全兼容 | 会话 CRUD、消息、命令 |
| /provider/* | 完全兼容 | 提供商列表、OAuth |
| /file/* | 完全兼容 | 文件搜索、内容读取 |
| /config/* | 完全兼容 | 配置查询、更新 |
| /agent | 完全兼容 | 代理列表 |
| /command | 完全兼容 | 命令列表 |
| /lsp | 完全兼容 | LSP 状态 |
| /formatter | 完全兼容 | 格式化器状态 |
| /mcp/* | 完全兼容 | MCP 服务器管理 |
| /event | 完全兼容 | 实例事件流 (SSE) |
| /instance/* | 完全兼容 | 实例销毁 |
| /path | 完全兼容 | 路径信息 |
| /vcs/* | 完全兼容 | VCS 信息和 diff |
| /skill | 完全兼容 | 技能列表 |
| /log | 完全兼容 | 日志写入 |
| /auth/* | 完全兼容 | 认证设置 |
| /doc | 完全兼容 | OpenAPI 文档 |
| /tui/* | 完全兼容 | TUI 控制 |
| /experimental/* | 完全兼容 | 实验性工具 |
| /pty/* | 完全兼容 | PTY 会话管理 |

## 2. 透明代理原则

**聚合层对客户端透明。**

- 请求路由、会话管理、状态同步对客户端不可见
- 错误响应格式与 opencode 原生一致
- SSE 事件流格式与 opencode 原生一致
- 客户端不应感知后端实例的存在

### 透明性要求

| 场景 | 处理方式 |
|------|---------|
| 单后端请求 | 直接转发，无修改 |
| 多后端聚合 | 合并结果，保持格式一致 |
| 后端故障 | 返回标准 HTTP 错误码 |
| 认证失败 | 透传 401 Unauthorized |

## 3. 连接隔离原则

**每个后端 opencode 实例独立管理，故障不扩散。**

- 单个后端故障不影响其他后端和聚合服务本身
- 健康检查失败自动隔离，恢复后自动重新接入
- 连接池独立，不共享状态
- SSE 连接独立管理

### 隔离策略

| 隔离场景 | 策略 |
|---------|------|
| 连接失败 | 标记为未连接，继续服务其他后端 |
| 健康检查失败 | 连续 3 次失败后隔离 |
| SSE 断连 | 自动重连，最多 3 次 |
| 隔离恢复 | 每 60s 重试，成功后重新接入 |

## 4. 类型安全原则

**全链路 TypeScript 类型安全。**

- 所有 API 请求/响应使用 zod 校验
- 禁止使用 `as any`、`@ts-ignore`、`@ts-expect-error`
- 类型定义集中管理，复用 opencode SDK 类型
- 配置文件使用 zod schema 校验

### 类型定义策略

- 复用 opencode SDK 的 types.gen.ts 类型定义
- 新增类型定义放在 `src/types/` 目录
- 所有接口必须有 TypeScript 类型定义

## 5. 配置驱动原则

**所有运行时行为通过配置控制。**

- 后端服务器配置通过 JSON/YAML 文件管理
- 环境变量仅用于敏感信息（密码、密钥）
- 配置变更无需重启服务（热加载）
- 默认配置提供合理默认值

### 配置结构

```json
{
  "servers": [
    {
      "name": "<服务器名称>",
      "type": "<服务器类型>",
      "host": "<服务主机>",
      "port": <服务端口>,
      "project": "<项目路径>",
      "username": "<用户名>",
      "password": "<密码>",
      "enabled": true,
      "primary": false
    }
  ],
  "settings": {
    "healthCheckInterval": 30000,
    "healthCheckTimeout": 5000,
    "isolationThreshold": 3,
    "recoveryInterval": 60000
  }
}
```

## 6. 最小依赖原则

**仅引入必要的第三方依赖。**

- 优先使用 Node.js 原生模块
- 新依赖需评估：必要性、维护状态、安全记录
- 避免功能重叠的依赖（如同时使用多个 HTTP 客户端）
- 当前依赖清单：express, dotenv, yaml, jsonc-parser, zod

## 7. 可观测性原则

**所有关键操作可追踪、可诊断。**

- 请求日志包含：时间、方法、路径、状态码、耗时、目标后端
- 错误日志包含：堆栈、上下文、关联的后端实例
- 健康检查暴露服务状态和连接状态
- SSE 连接状态可查询

### 日志格式

```json
{
  "timestamp": "ISO8601",
  "level": "DEBUG|INFO|WARN|ERROR",
  "service": "opencode-stack",
  "operation": "request|healthcheck|sse",
  "method": "GET|POST|PUT|DELETE|PATCH",
  "path": "/session/xxx",
  "status": 200,
  "duration": 45,
  "backend": "local|remote-xxx",
  "error": "optional error message"
}
```

## 8. 会话一致性原则

**会话必须绑定到特定后端实例。**

- 会话创建后绑定到创建它的后端
- 会话的所有操作都路由到同一后端
- 会话的 SSE 事件来自同一后端
- 后端隔离时，绑定到该后端的会话返回错误

### 会话路由策略

| 操作 | 路由策略 |
|------|---------|
| POST /session | 负载均衡选择后端 |
| GET /session/:id | 根据路由表定位后端 |
| POST /session/:id/message | 路由到绑定后端 |
| GET /session/:id/message | 路由到绑定后端 |
| DELETE /session/:id | 路由到绑定后端 |
| SSE /event | 合并所有后端事件 |

## 9. 扩展预留原则

**为未来功能预留设计空间。**

- Docker 连接器预留接口和配置结构
- K8s 连接器预留接口和配置结构
- 用户鉴权预留中间件位置
- CLI 工具预留配置管理接口

### 预留连接器类型

| 类型 | 状态 | 说明 |
|------|------|------|
| local | 实现 | 本机 opencode 实例 |
| remote | 实现 | 远程 opencode 实例 |
| docker | 预留 | Docker 容器部署 |
| k8s | 预留 | Kubernetes 部署 |

## 10. 错误处理原则

**错误响应必须符合 HTTP 标准。**

| 场景 | HTTP 状态码 | 错误格式 |
|------|------------|---------|
| 后端不可达 | 502 Bad Gateway | `{ error: { message, code } }` |
| 后端超时 | 504 Gateway Timeout | `{ error: { message, code } }` |
| 无可用后端 | 503 Service Unavailable | `{ error: { message, code } }` |
| 会话未找到 | 404 Not Found | `{ error: { message, code } }` |
| 认证失败 | 401 Unauthorized | 透传后端响应 |
| 参数错误 | 400 Bad Request | 透传后端响应 |