# overall-api.md - 对外接口模型

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22
> 参考: opencode OpenAPI 3.1 规范

## 1. 接口兼容性声明

opencode-stack 北向接口与 opencode 服务器接口 **100% 兼容**。所有端点的路径、方法、请求参数、响应格式均与 opencode OpenAPI 3.1 规范一致。

## 2. 路由策略映射

| 端点组 | 策略 | 说明 |
|--------|------|------|
| /health, /doc | local | 本地处理，不转发 |
| /global/health, /global/event | broadcast | 广播所有后端，合并状态 |
| /global/dispose, /global/upgrade | broadcast | 广播所有后端 |
| /session (list), /session/status | aggregate | 聚合所有后端数据 |
| /session/:id/* | session | 路由到绑定后端 |
| /provider, /agent, /command, /skill | aggregate | 聚合所有后端数据 |
| /project (list) | aggregate | 聚合所有项目 |
| /project/current | primary | 路由到主后端 |
| /file/*, /config/*, /lsp, /formatter | current | 路由到当前项目后端 |
| /mcp/* | current | 路由到当前项目后端 |
| /event | aggregate | SSE 事件聚合 |
| /pty/* | current | 路由到当前项目后端 |
| /tui/* | current | 路由到当前项目后端 |
| /log | broadcast | 广播所有后端 |
| /auth/:providerID | broadcast | 设置所有后端认证 |
| /experimental/* | current | 路由到当前项目后端 |

## 3. Global Routes (`/global`)

### 3.1 GET /global/health

获取聚合服务健康状态。

| 项目 | 说明 |
|------|------|
| operationId | global.health |
| 响应 | `{ healthy: true, version: string, backends: BackendStatus[] }` |

**聚合逻辑**：
- 检查聚合服务自身状态
- 收集所有后端健康状态

### 3.2 GET /global/event (SSE)

全局事件流。

| 项目 | 说明 |
|------|------|
| operationId | global.event |
| 响应 | SSE `GlobalEvent` |

**聚合逻辑**：
- 合并所有后端 `/global/event` SSE 流
- 添加 `directory` 字段标识来源

### 3.3 GET /global/config

获取全局配置。

| 项目 | 说明 |
|------|------|
| operationId | global.config.get |
| 路由策略 | primary |
| 响应 | `Config.Info` |

### 3.4 PATCH /global/config

更新全局配置。

| 项目 | 说明 |
|------|------|
| operationId | global.config.update |
| 路由策略 | primary |
| 请求体 | `Config.Info` |
| 响应 | `Config.Info` |

### 3.5 POST /global/dispose

销毁所有实例。

| 项目 | 说明 |
|------|------|
| operationId | global.dispose |
| 路由策略 | broadcast |
| 响应 | `boolean` |

### 3.6 POST /global/upgrade

升级 opencode-stack。

| 项目 | 说明 |
|------|------|
| operationId | global.upgrade |
| 路由策略 | local |
| 请求体 | `{ target?: string }` |
| 响应 | `{ success, version? }` 或 `{ success: false, error }` |

## 4. Control Plane Routes

### 4.1 PUT /auth/:providerID

设置认证凭据。

| 项目 | 说明 |
|------|------|
| operationId | auth.set |
| 路由策略 | broadcast |
| 请求体 | `Auth.Info` |
| 响应 | `boolean` |

### 4.2 DELETE /auth/:providerID

移除认证凭据。

| 项目 | 说明 |
|------|------|
| operationId | auth.remove |
| 路由策略 | broadcast |
| 响应 | `boolean` |

### 4.3 GET /doc

OpenAPI 文档。

| 项目 | 说明 |
|------|------|
| 路由策略 | local |
| 响应 | OpenAPI JSON |

### 4.4 POST /log

写入日志。

| 项目 | 说明 |
|------|------|
| operationId | app.log |
| 路由策略 | broadcast |
| 请求体 | `{ service, level, message, extra? }` |
| 响应 | `boolean` |

## 5. Instance Routes

### 5.1 Project (`/project`)

#### GET /project

列出所有项目。

| 项目 | 说明 |
|------|------|
| operationId | project.list |
| 路由策略 | aggregate |
| 响应 | `Project.Info[]` |

#### GET /project/current

获取当前项目。

| 项目 | 说明 |
|------|------|
| operationId | project.current |
| 路由策略 | primary |
| 响应 | `Project.Info` |

### 5.2 Session (`/session`)

#### GET /session

列出所有会话。

| 项目 | 说明 |
|------|------|
| operationId | session.list |
| 路由策略 | aggregate |
| Query | `directory?, roots?, start?, search?, limit?` |
| 响应 | `Session.Info[]` |

**聚合逻辑**：
- 收集所有后端的会话列表
- 合并去重

#### GET /session/status

获取所有会话状态。

| 项目 | 说明 |
|------|------|
| operationId | session.status |
| 路由策略 | aggregate |
| 响应 | `Record<string, SessionStatus.Info>` |

#### POST /session

创建新会话。

| 项目 | 说明 |
|------|------|
| operationId | session.create |
| 路由策略 | load_balance |
| 请求体 | `Session.CreateInput` |
| 响应 | `Session.Info` |

**特殊逻辑**：
- ConnectorManager.selectForNewSession() 选择后端
- 注册 SessionRoute 到路由表

#### GET /session/:sessionID

获取会话详情。

| 项目 | 说明 |
|------|------|
| operationId | session.get |
| 路由策略 | session |
| 响应 | `Session.Info` |

#### PATCH /session/:sessionID

更新会话。

| 项目 | 说明 |
|------|------|
| operationId | session.update |
| 路由策略 | session |
| 请求体 | `{ title?, permission?, time? }` |
| 响应 | `Session.Info` |

#### DELETE /session/:sessionID

删除会话。

| 项目 | 说明 |
|------|------|
| operationId | session.delete |
| 路由策略 | session |
| 响应 | `boolean` |

**特殊逻辑**：
- 删除后清除 SessionRoute

#### Session 子路由（全部使用 session 策略）

| 端点 | operationId | 说明 |
|------|-------------|------|
| GET /session/:id/children | session.children | 子会话列表 |
| GET /session/:id/todo | session.todo | Todo 列表 |
| POST /session/:id/init | session.init | 初始化 AGENTS.md |
| POST /session/:id/fork | session.fork | 分叉会话 |
| POST /session/:id/abort | session.abort | 中止会话 |
| POST /session/:id/share | session.share | 分享会话 |
| DELETE /session/:id/share | session.unshare | 取消分享 |
| GET /session/:id/diff | session.diff | 获取 diff |
| POST /session/:id/summarize | session.summarize | 摘要会话 |
| POST /session/:id/revert | session.revert | 回退消息 |
| POST /session/:id/unrevert | session.unrevert | 恢复回退 |

### 5.3 Message (`/session/:id/message`)

#### GET /session/:sessionID/message

获取消息列表。

| 项目 | 说明 |
|------|------|
| operationId | session.messages |
| 路由策略 | session |
| Query | `limit?, before?` |
| 响应 | `MessageV2.WithParts[]` |

#### POST /session/:sessionID/message

发送消息（流式）。

| 项目 | 说明 |
|------|------|
| operationId | session.prompt |
| 路由策略 | session |
| 请求体 | `PromptInput` |
| 响应 | `MessageV2.WithParts` |

#### GET /session/:sessionID/message/:messageID

获取单条消息。

| 项目 | 说明 |
|------|------|
| operationId | session.message |
| 路由策略 | session |
| 响应 | `{ info, parts }` |

#### DELETE /session/:sessionID/message/:messageID

删除消息。

| 项目 | 说明 |
|------|------|
| operationId | session.deleteMessage |
| 路由策略 | session |
| 响应 | `boolean` |

#### POST /session/:sessionID/prompt_async

异步发送消息。

| 项目 | 说明 |
|------|------|
| operationId | session.prompt_async |
| 路由策略 | session |
| 请求体 | `PromptInput` |
| 响应 | 204 No Content |

#### POST /session/:sessionID/command

发送命令。

| 项目 | 说明 |
|------|------|
| operationId | session.command |
| 路由策略 | session |
| 请求体 | `CommandInput` |
| 响应 | `MessageV2.WithParts` |

#### POST /session/:sessionID/shell

执行 shell。

| 项目 | 说明 |
|------|------|
| operationId | session.shell |
| 路由策略 | session |
| 请求体 | `ShellInput` |
| 响应 | `MessageV2.WithParts` |

### 5.4 Permission (`/permission`, `/session/:id/permissions`)

#### GET /permission

列出待处理权限。

| 项目 | 说明 |
|------|------|
| operationId | permission.list |
| 路由策略 | current |
| 响应 | `Permission.Request[]` |

#### POST /permission/:requestID/reply

回复权限。

| 项目 | 说明 |
|------|------|
| operationId | permission.reply |
| 路由策略 | current |
| 请求体 | `{ reply, message? }` |
| 响应 | `boolean` |

#### POST /session/:id/permissions/:permissionID

响应权限（已废弃）。

| 项目 | 说明 |
|------|------|
| operationId | permission.respond |
| 路由策略 | session |
| 请求体 | `{ response, remember? }` |
| 响应 | `boolean` |

### 5.5 Question (`/question`)

#### GET /question

列出待处理问题。

| 项目 | 说明 |
|------|------|
| operationId | question.list |
| 路由策略 | current |
| 响应 | `Question.Request[]` |

#### POST /question/:requestID/reply

回复问题。

| 项目 | 说明 |
|------|------|
| operationId | question.reply |
| 路由策略 | current |
| 请求体 | `{ answers[] }` |
| 响应 | `boolean` |

#### POST /question/:requestID/reject

拒绝问题。

| 项目 | 说明 |
|------|------|
| operationId | question.reject |
| 路由策略 | current |
| 响应 | `boolean` |

### 5.6 Provider (`/provider`)

#### GET /provider

列出所有提供商。

| 项目 | 说明 |
|------|------|
| operationId | provider.list |
| 路由策略 | aggregate |
| 响应 | `Provider.ListResult` |

**聚合逻辑**：
- 合并所有后端的 provider
- 合并 default 配置
- 合并 connected 列表

#### GET /provider/auth

获取认证方法。

| 项目 | 说明 |
|------|------|
| operationId | provider.auth |
| 路由策略 | aggregate |
| 响应 | `ProviderAuth.Methods` |

#### POST /provider/:providerID/oauth/authorize

OAuth 授权。

| 项目 | 说明 |
|------|------|
| operationId | provider.oauth.authorize |
| 路由策略 | primary |
| 请求体 | `ProviderAuth.AuthorizeInput` |
| 响应 | `ProviderAuth.Authorization?` |

#### POST /provider/:providerID/oauth/callback

OAuth 回调。

| 项目 | 说明 |
|------|------|
| operationId | provider.oauth.callback |
| 路由策略 | primary |
| 请求体 | `ProviderAuth.CallbackInput` |
| 响应 | `boolean` |

### 5.7 File (`/find`, `/file`)

全部使用 current 策略。

| 端点 | operationId | 说明 |
|------|-------------|------|
| GET /find?pattern= | find.text | 全文搜索 |
| GET /find/file?query= | find.files | 文件搜索 |
| GET /find/symbol?query= | find.symbols | 符号搜索 |
| GET /file?path= | file.list | 列出文件 |
| GET /file/content?path= | file.read | 读取文件 |
| GET /file/status | file.status | Git 状态 |

### 5.8 Config (`/config`)

#### GET /config

获取配置。

| 项目 | 说明 |
|------|------|
| operationId | config.get |
| 路由策略 | primary |
| 响应 | `Config.Info` |

#### PATCH /config

更新配置。

| 项目 | 说明 |
|------|------|
| operationId | config.update |
| 路由策略 | primary |
| 请求体 | `Config.Info` |
| 响应 | `Config.Info` |

#### GET /config/providers

列出 providers。

| 项目 | 说明 |
|------|------|
| operationId | config.providers |
| 路由策略 | primary |
| 响应 | `{ providers, default }` |

### 5.9 MCP (`/mcp`)

全部使用 current 策略。

| 端点 | operationId | 说明 |
|------|-------------|------|
| GET /mcp | mcp.status | MCP 状态 |
| POST /mcp | mcp.add | 添加 MCP |
| POST /mcp/:name/auth | mcp.auth.start | 开始 OAuth |
| POST /mcp/:name/auth/callback | mcp.auth.callback | OAuth 回调 |
| POST /mcp/:name/auth/authenticate | mcp.auth.authenticate | 完整 OAuth |
| DELETE /mcp/:name/auth | mcp.auth.remove | 移除 OAuth |
| POST /mcp/:name/connect | mcp.connect | 连接 MCP |
| POST /mcp/:name/disconnect | mcp.disconnect | 断开 MCP |

### 5.10 Event (`/event`)

#### GET /event (SSE)

实例事件流。

| 项目 | 说明 |
|------|------|
| operationId | event.subscribe |
| 路由策略 | aggregate |
| 响应 | SSE `Event` |

**聚合逻辑**：
- 合并所有后端 `/event` SSE 流
- 添加 `directory` 字段标识来源

### 5.11 Instance 直接路由

| 端点 | operationId | 策略 | 说明 |
|------|-------------|------|------|
| POST /instance/dispose | instance.dispose | current | 销毁实例 |
| GET /path | path.get | primary | 获取路径 |
| GET /vcs | vcs.get | current | VCS 信息 |
| GET /vcs/diff | vcs.diff | current | VCS diff |
| GET /command | command.list | aggregate | 命令列表 |
| GET /agent | app.agents | aggregate | 代理列表 |
| GET /skill | app.skills | aggregate | 技能列表 |
| GET /lsp | lsp.status | current | LSP 状态 |
| GET /formatter | formatter.status | current | 格式化器状态 |

### 5.12 PTY (`/pty`)

全部使用 current 策略。

| 端点 | operationId | 说明 |
|------|-------------|------|
| GET /pty | pty.list | PTY 会话列表 |
| POST /pty | pty.create | 创建 PTY |
| GET /pty/:ptyID | pty.get | PTY 详情 |
| PUT /pty/:ptyID | pty.update | 更新 PTY |
| DELETE /pty/:ptyID | pty.remove | 删除 PTY |
| GET /pty/:ptyID/connect | pty.connect | WebSocket |

### 5.13 TUI (`/tui`)

全部使用 current 策略。

| 端点 | operationId | 说明 |
|------|-------------|------|
| POST /tui/append-prompt | tui.appendPrompt | 追加 prompt |
| POST /tui/open-help | tui.openHelp | 打开帮助 |
| POST /tui/open-sessions | tui.openSessions | 会话列表 |
| POST /tui/open-themes | tui.openThemes | 主题 |
| POST /tui/open-models | tui.openModels | 模型 |
| POST /tui/submit-prompt | tui.submitPrompt | 提交 |
| POST /tui/clear-prompt | tui.clearPrompt | 清除 |
| POST /tui/execute-command | tui.executeCommand | 执行命令 |
| POST /tui/show-toast | tui.showToast | Toast |
| POST /tui/publish | tui.publish | 发布事件 |
| GET /tui/control/next | tui.control.next | 获取请求 |
| POST /tui/control/response | tui.control.response | 提交响应 |

### 5.14 Experimental (`/experimental`)

全部使用 current 策略。

| 端点 | operationId | 说明 |
|------|-------------|------|
| GET /experimental/tool/ids | tool.ids | 工具 ID |
| GET /experimental/tool | tool.list | 工具列表 |
| POST /experimental/worktree | worktree.create | 创建 worktree |
| GET /experimental/worktree | worktree.list | worktree 列表 |
| DELETE /experimental/worktree | worktree.remove | 删除 worktree |
| POST /experimental/worktree/reset | worktree.reset | 重置 worktree |
| GET /experimental/session | experimental.session.list | 全局会话 |
| GET /experimental/resource | experimental.resource.list | MCP 资源 |

### 5.15 Sync (`/sync`)

全部使用 current 策略。

| 端点 | operationId | 说明 |
|------|-------------|------|
| POST /sync/start | sync.start | 启动同步 |
| POST /sync/replay | sync.replay | 重放事件 |
| POST /sync/history | sync.history.list | 同步历史 |

## 6. SSE 事件类型

### 6.1 GlobalEvent

```typescript
interface GlobalEvent {
  directory: string
  payload: Event
}
```

### 6.2 Event 类型

| 类型 | 说明 |
|------|------|
| server.connected | 服务连接 |
| server.heartbeat | 心跳 |
| server.instance.disposed | 实例销毁 |
| installation.updated | 安装更新 |
| installation.update-available | 更新可用 |
| session.created | 会话创建 |
| session.updated | 会话更新 |
| session.deleted | 会话删除 |
| session.status | 会话状态 |
| session.idle | 会话空闲 |
| session.compacted | 会话压缩 |
| session.error | 会话错误 |
| session.diff | 会话差异 |
| message.updated | 消息更新 |
| message.removed | 消息删除 |
| message.part.updated | Part 更新 |
| message.part.removed | Part 删除 |
| permission.updated | 权限请求 |
| permission.replied | 权限回复 |
| todo.updated | Todo 更新 |
| command.executed | 命令执行 |
| file.edited | 文件编辑 |
| file.watcher.updated | 文件变更 |
| vcs.branch.updated | 分支变更 |
| lsp.updated | LSP 更新 |
| lsp.client.diagnostics | LSP 诊断 |
| pty.created | PTY 创建 |
| pty.updated | PTY 更新 |
| pty.exited | PTY 退出 |
| pty.deleted | PTY 删除 |
| tui.prompt.append | TUI prompt |
| tui.command.execute | TUI 命令 |
| tui.toast.show | TUI toast |

## 7. 扩展接口（/x/*）

以下接口为 opencode-stack 扩展，不在 opencode 原生规范中：

| 端点 | 说明 |
|------|------|
| GET /x/backends | 所有后端状态 |
| GET /x/routes | 会话路由表 |
| GET /x/sse | SSE 连接状态 |
| GET /health | 聚合服务健康 |