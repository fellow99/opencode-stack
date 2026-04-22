# api.md - 101 北向 OpenCode API 端点详细规格

> 模块: 北向 OpenCode API
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. Global Routes (`/global`)

### 1.1 GET /global/health

| 项目 | 说明 |
|------|------|
| 策略 | aggregate |
| 说明 | 返回聚合服务 + 所有后端健康状态 |
| 响应 | `{ healthy, version, backends }` |

### 1.2 GET /global/event (SSE)

| 项目 | 说明 |
|------|------|
| 策略 | aggregate |
| 说明 | 合并所有后端全局 SSE |
| 响应 | SSE 流 |

### 1.3 GET /global/config

| 项目 | 说明 |
|------|------|
| 策略 | primary |
| 说明 | 获取主后端全局配置 |
| 响应 | `Config.Info` |

### 1.4 PATCH /global/config

| 项目 | 说明 |
|------|------|
| 策略 | primary |
| 说明 | 更新主后端全局配置 |
| 请求体 | `Config.Info` |
| 响应 | `Config.Info` |

### 1.5 POST /global/dispose

| 项目 | 说明 |
|------|------|
| 策略 | broadcast |
| 说明 | 销毁所有后端实例 |
| 响应 | `boolean` |

### 1.6 POST /global/upgrade

| 项目 | 说明 |
|------|------|
| 策略 | local |
| 说明 | 升级 opencode-stack（不升级后端） |
| 请求体 | `{ target?: string }` |
| 响应 | `{ success, version }` |

## 2. Project Routes (`/project`)

### 2.1 GET /project

| 项目 | 说明 |
|------|------|
| 策略 | aggregate |
| 说明 | 合并所有后端项目列表 |
| 响应 | `Project.Info[]` |

### 2.2 GET /project/current

| 项目 | 说明 |
|------|------|
| 策略 | primary |
| 说明 | 获取主后端当前项目 |
| 响应 | `Project.Info` |

## 3. Session Routes (`/session`)

### 3.1 GET /session

| 项目 | 说明 |
|------|------|
| 策略 | aggregate |
| Query | `directory?, roots?, start?, search?, limit?` |
| 说明 | 合并所有后端会话列表 |
| 响应 | `Session.Info[]` |

### 3.2 GET /session/status

| 项目 | 说明 |
|------|------|
| 策略 | aggregate |
| 说明 | 合并所有后端会话状态 |
| 响应 | `Record<string, SessionStatus.Info>` |

### 3.3 POST /session

| 项目 | 说明 |
|------|------|
| 策略 | load_balance |
| 说明 | 选择后端创建会话，注册路由 |
| 请求体 | `Session.CreateInput` |
| 响应 | `Session.Info` |
| 特殊 | 注册 SessionRoute |

### 3.4 GET /session/:sessionID

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 说明 | 路由到绑定后端 |
| 响应 | `Session.Info` |

### 3.5 PATCH /session/:sessionID

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `{ title?, permission?, time? }` |
| 响应 | `Session.Info` |

### 3.6 DELETE /session/:sessionID

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `boolean` |
| 特殊 | 成功后清除 SessionRoute |

### 3.7 GET /session/:sessionID/children

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `Session.Info[]` |

### 3.8 GET /session/:sessionID/todo

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `Todo.Info[]` |

### 3.9 POST /session/:sessionID/init

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `{ messageID?, providerID, modelID }` |
| 响应 | `boolean` |

### 3.10 POST /session/:sessionID/fork

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `{ messageID? }` |
| 响应 | `Session.Info` |

### 3.11 POST /session/:sessionID/abort

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `boolean` |

### 3.12 POST /session/:sessionID/share

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `Session.Info` |

### 3.13 DELETE /session/:sessionID/share

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `Session.Info` |

### 3.14 GET /session/:sessionID/diff

| 项目 | 说明 |
|------|------|
| 策略 | session |
| Query | `messageID?` |
| 响应 | `FileDiff[]` |

### 3.15 POST /session/:sessionID/summarize

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `{ providerID, modelID, auto? }` |
| 响应 | `boolean` |

### 3.16 POST /session/:sessionID/revert

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `{ messageID, partID? }` |
| 响应 | `boolean` |

### 3.17 POST /session/:sessionID/unrevert

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `boolean` |

### 3.18 POST /session/:id/permissions/:permissionID

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `{ response, remember? }` |
| 响应 | `boolean` |

## 4. Message Routes (`/session/:id/message`)

### 4.1 GET /session/:sessionID/message

| 项目 | 说明 |
|------|------|
| 策略 | session |
| Query | `limit?, before?` |
| 响应 | `MessageV2.WithParts[]` |

### 4.2 POST /session/:sessionID/message

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `PromptInput` |
| 响应 | `MessageV2.WithParts` |

### 4.3 GET /session/:sessionID/message/:messageID

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `{ info, parts }` |

### 4.4 DELETE /session/:sessionID/message/:messageID

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 响应 | `boolean` |

### 4.5 POST /session/:sessionID/prompt_async

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `PromptInput` |
| 响应 | 204 No Content |

### 4.6 POST /session/:sessionID/command

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `CommandInput` |
| 响应 | `MessageV2.WithParts` |

### 4.7 POST /session/:sessionID/shell

| 项目 | 说明 |
|------|------|
| 策略 | session |
| 请求体 | `ShellInput` |
| 响应 | `MessageV2.WithParts` |

## 5. Provider Routes (`/provider`)

### 5.1 GET /provider

| 项目 | 说明 |
|------|------|
| 策略 | aggregate |
| 说明 | 合并所有后端提供商，去重 |
| 响应 | `Provider.ListResult` |

### 5.2 GET /provider/auth

| 项目 | 说明 |
|------|------|
| 策略 | aggregate |
| 响应 | `ProviderAuth.Methods` |

### 5.3 POST /provider/:providerID/oauth/authorize

| 项目 | 说明 |
|------|------|
| 策略 | primary |
| 请求体 | `ProviderAuth.AuthorizeInput` |
| 响应 | `ProviderAuth.Authorization?` |

### 5.4 POST /provider/:providerID/oauth/callback

| 项目 | 说明 |
|------|------|
| 策略 | primary |
| 请求体 | `ProviderAuth.CallbackInput` |
| 响应 | `boolean` |

## 6. File Routes (`/find`, `/file`)

全部使用 current 策略。

| 端点 | 说明 |
|------|------|
| GET /find?pattern= | 全文搜索 |
| GET /find/file?query= | 文件搜索 |
| GET /find/symbol?query= | 符号搜索 |
| GET /file?path= | 文件列表 |
| GET /file/content?path= | 读取文件 |
| GET /file/status | Git 状态 |

## 7. Config Routes (`/config`)

全部使用 primary 策略。

| 端点 | 说明 |
|------|------|
| GET /config | 获取配置 |
| PATCH /config | 更新配置 |
| GET /config/providers | 提供商配置 |

## 8. Instance Routes

### 8.1 current 策略

| 端点 | 说明 |
|------|------|
| POST /instance/dispose | 销毁实例 |
| GET /vcs | VCS 信息 |
| GET /vcs/diff?mode= | VCS Diff |
| GET /lsp | LSP 状态 |
| GET /formatter | 格式化器状态 |
| /mcp/* | MCP 管理 |
| /pty/* | PTY 管理 |
| /tui/* | TUI 控制 |
| /experimental/* | 实验端点 |
| /permission/* | 权限管理 |
| /question/* | 问题管理 |
| /sync/* | 同步管理 |

### 8.2 primary 策略

| 端点 | 说明 |
|------|------|
| GET /path | 获取路径 |

### 8.3 aggregate 策略

| 端点 | 说明 |
|------|------|
| GET /agent | 代理列表 |
| GET /command | 命令列表 |
| GET /skill | 技能列表 |

## 9. Event Routes (`/event`)

### 9.1 GET /event (SSE)

| 项目 | 说明 |
|------|------|
| 策略 | aggregate |
| 说明 | 合并所有后端 SSE 事件 |
| 响应 | SSE 流 |

## 10. Auth Routes (`/auth`)

### 10.1 PUT /auth/:providerID

| 项目 | 说明 |
|------|------|
| 策略 | broadcast |
| 说明 | 设置所有后端认证 |
| 请求体 | `Auth.Info` |
| 响应 | `boolean` |

### 10.2 DELETE /auth/:providerID

| 项目 | 说明 |
|------|------|
| 策略 | broadcast |
| 响应 | `boolean` |

## 11. Log Routes (`/log`)

### 11.1 POST /log

| 项目 | 说明 |
|------|------|
| 策略 | broadcast |
| 说明 | 至少一个成功即返回 |
| 请求体 | `{ service, level, message, extra? }` |
| 响应 | `boolean` |

## 12. Doc Routes (`/doc`)

### 12.1 GET /doc

| 项目 | 说明 |
|------|------|
| 策略 | local |
| 说明 | 返回 opencode-stack OpenAPI 文档 |
| 响应 | OpenAPI JSON |

## 13. Extension Routes (`/x`)

### 13.1 GET /x/backends

| 项目 | 说明 |
|------|------|
| 策略 | local |
| 响应 | `BackendStatus[]` |

### 13.2 GET /x/routes

| 项目 | 说明 |
|------|------|
| 策略 | local |
| 响应 | `SessionRoute[]` |

### 13.3 GET /x/sse

| 项目 | 说明 |
|------|------|
| 策略 | local |
| 响应 | `{ clients, backends }` |

### 13.4 GET /health

| 项目 | 说明 |
|------|------|
| 策略 | local |
| 响应 | `{ status, timestamp, version }` |

## 14. 策略实现摘要

| 策略 | 实现要点 |
|------|---------|
| local | 不转发，本地生成响应 |
| session | 查 SessionRouteTable，路由到绑定后端 |
| aggregate | 并行请求所有后端，合并结果 |
| broadcast | 并行请求所有后端，至少一个成功 |
| primary | 路由到主后端或第一个可用 |
| current | 路由到第一个可用后端 |