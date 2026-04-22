# API.md - 全局 API 清单

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22
> 参考: opencode OpenAPI 3.1 规范

## 1. API 端点统计

| 端点组 | 端点数 | 说明 |
|--------|--------|------|
| Global Routes | 6 | 全局健康、事件、配置、升级 |
| Control Plane | 4 | 认证、文档、日志 |
| Project Routes | 4 | 项目列表、当前、Git |
| PTY Routes | 7 | PTY 会话管理 |
| Config Routes | 3 | 配置管理 |
| Session Routes | 26 | 会话 CRUD、消息、命令 |
| Message Routes | 7 | 消息管理 |
| Permission Routes | 4 | 权限请求管理 |
| Question Routes | 3 | 问题管理 |
| Provider Routes | 4 | 提供商、OAuth |
| File Routes | 6 | 文件搜索、读取 |
| MCP Routes | 9 | MCP 服务器管理 |
| Event Routes | 2 | SSE 事件订阅 |
| Instance Routes | 8 | 实例、路径、VCS、命令等 |
| TUI Routes | 12 | TUI 控制 |
| Experimental Routes | 9 | 实验性功能 |
| Sync Routes | 3 | 同步管理 |
| Extension Routes | 4 | opencode-stack 扩展 |
| **总计** | **91** | |

## 2. Global Routes (`/global`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/global/health` | global.health | 健康检查 |
| GET | `/global/event` | global.event | SSE 全局事件 |
| GET | `/global/config` | global.config.get | 获取全局配置 |
| PATCH | `/global/config` | global.config.update | 更新全局配置 |
| POST | `/global/dispose` | global.dispose | 销毁所有实例 |
| POST | `/global/upgrade` | global.upgrade | 升级版本 |

## 3. Control Plane Routes

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| PUT | `/auth/:providerID` | auth.set | 设置认证 |
| DELETE | `/auth/:providerID` | auth.remove | 移除认证 |
| GET | `/doc` | - | OpenAPI 文档 |
| POST | `/log` | app.log | 写日志 |

## 4. Project Routes (`/project`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/project` | project.list | 项目列表 |
| GET | `/project/current` | project.current | 当前项目 |
| POST | `/project/git/init` | project.initGit | 初始化 Git |
| PATCH | `/project/:projectID` | project.update | 更新项目 |

## 5. PTY Routes (`/pty`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/pty` | pty.list | PTY 列表 |
| POST | `/pty` | pty.create | 创建 PTY |
| GET | `/pty/:ptyID` | pty.get | PTY 详情 |
| PUT | `/pty/:ptyID` | pty.update | 更新 PTY |
| DELETE | `/pty/:ptyID` | pty.remove | 删除 PTY |
| GET | `/pty/:ptyID/connect` | pty.connect | WebSocket 连接 |

## 6. Config Routes (`/config`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/config` | config.get | 获取配置 |
| PATCH | `/config` | config.update | 更新配置 |
| GET | `/config/providers` | config.providers | 提供商列表 |

## 7. Session Routes (`/session`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/session` | session.list | 会话列表 |
| GET | `/session/status` | session.status | 会话状态 |
| POST | `/session` | session.create | 创建会话 |
| GET | `/session/:sessionID` | session.get | 会话详情 |
| PATCH | `/session/:sessionID` | session.update | 更新会话 |
| DELETE | `/session/:sessionID` | session.delete | 删除会话 |
| GET | `/session/:sessionID/children` | session.children | 子会话 |
| GET | `/session/:sessionID/todo` | session.todo | Todo 列表 |
| POST | `/session/:sessionID/init` | session.init | 初始化 |
| POST | `/session/:sessionID/fork` | session.fork | 分叉会话 |
| POST | `/session/:sessionID/abort` | session.abort | 中止会话 |
| POST | `/session/:sessionID/share` | session.share | 分享会话 |
| DELETE | `/session/:sessionID/share` | session.unshare | 取消分享 |
| GET | `/session/:sessionID/diff` | session.diff | 会话差异 |
| POST | `/session/:sessionID/summarize` | session.summarize | 摘要会话 |
| POST | `/session/:sessionID/revert` | session.revert | 回退消息 |
| POST | `/session/:sessionID/unrevert` | session.unrevert | 恢复回退 |
| POST | `/session/:id/permissions/:permissionID` | permission.respond | 响应权限 |

## 8. Message Routes (`/session/:id/message`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/session/:sessionID/message` | session.messages | 消息列表 |
| POST | `/session/:sessionID/message` | session.prompt | 发送消息 |
| GET | `/session/:sessionID/message/:messageID` | session.message | 消息详情 |
| DELETE | `/session/:sessionID/message/:messageID` | session.deleteMessage | 删除消息 |
| DELETE | `/session/:id/message/:messageID/part/:partID` | part.delete | 删除 Part |
| PATCH | `/session/:id/message/:messageID/part/:partID` | part.update | 更新 Part |
| POST | `/session/:sessionID/prompt_async` | session.prompt_async | 异步发送 |
| POST | `/session/:sessionID/command` | session.command | 发送命令 |
| POST | `/session/:sessionID/shell` | session.shell | 执行 Shell |

## 9. Permission Routes (`/permission`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/permission` | permission.list | 权限列表 |
| POST | `/permission/:requestID/reply` | permission.reply | 回复权限 |

## 10. Question Routes (`/question`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/question` | question.list | 问题列表 |
| POST | `/question/:requestID/reply` | question.reply | 回复问题 |
| POST | `/question/:requestID/reject` | question.reject | 拒绝问题 |

## 11. Provider Routes (`/provider`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/provider` | provider.list | 提供商列表 |
| GET | `/provider/auth` | provider.auth | 认证方法 |
| POST | `/provider/:providerID/oauth/authorize` | provider.oauth.authorize | OAuth 授权 |
| POST | `/provider/:providerID/oauth/callback` | provider.oauth.callback | OAuth 回调 |

## 12. File Routes (`/find`, `/file`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/find?pattern=` | find.text | 全文搜索 |
| GET | `/find/file?query=` | find.files | 文件搜索 |
| GET | `/find/symbol?query=` | find.symbols | 符号搜索 |
| GET | `/file?path=` | file.list | 文件列表 |
| GET | `/file/content?path=` | file.read | 读取文件 |
| GET | `/file/status` | file.status | Git 状态 |

## 13. MCP Routes (`/mcp`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/mcp` | mcp.status | MCP 状态 |
| POST | `/mcp` | mcp.add | 添加 MCP |
| POST | `/mcp/:name/auth` | mcp.auth.start | 开始 OAuth |
| POST | `/mcp/:name/auth/callback` | mcp.auth.callback | OAuth 回调 |
| POST | `/mcp/:name/auth/authenticate` | mcp.auth.authenticate | 完整 OAuth |
| DELETE | `/mcp/:name/auth` | mcp.auth.remove | 移除 OAuth |
| POST | `/mcp/:name/connect` | mcp.connect | 连接 MCP |
| POST | `/mcp/:name/disconnect` | mcp.disconnect | 断开 MCP |

## 14. Event Routes (`/event`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/event` | event.subscribe | SSE 事件订阅 |

## 15. Instance Routes

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| POST | `/instance/dispose` | instance.dispose | 销毁实例 |
| GET | `/path` | path.get | 获取路径 |
| GET | `/vcs` | vcs.get | VCS 信息 |
| GET | `/vcs/diff?mode=` | vcs.diff | VCS Diff |
| GET | `/command` | command.list | 命令列表 |
| GET | `/agent` | app.agents | 代理列表 |
| GET | `/skill` | app.skills | 技能列表 |
| GET | `/lsp` | lsp.status | LSP 状态 |
| GET | `/formatter` | formatter.status | 格式化器状态 |

## 16. TUI Routes (`/tui`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| POST | `/tui/append-prompt` | tui.appendPrompt | 追加 Prompt |
| POST | `/tui/open-help` | tui.openHelp | 打开帮助 |
| POST | `/tui/open-sessions` | tui.openSessions | 打开会话 |
| POST | `/tui/open-themes` | tui.openThemes | 打开主题 |
| POST | `/tui/open-models` | tui.openModels | 打开模型 |
| POST | `/tui/submit-prompt` | tui.submitPrompt | 提交 Prompt |
| POST | `/tui/clear-prompt` | tui.clearPrompt | 清除 Prompt |
| POST | `/tui/execute-command` | tui.executeCommand | 执行命令 |
| POST | `/tui/show-toast` | tui.showToast | 显示 Toast |
| POST | `/tui/publish` | tui.publish | 发布事件 |
| GET | `/tui/control/next` | tui.control.next | 获取请求 |
| POST | `/tui/control/response` | tui.control.response | 提交响应 |

## 17. Experimental Routes (`/experimental`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/experimental/tool/ids` | tool.ids | 工具 ID |
| GET | `/experimental/tool` | tool.list | 工具列表 |
| POST | `/experimental/worktree` | worktree.create | 创建 Worktree |
| GET | `/experimental/worktree` | worktree.list | Worktree 列表 |
| DELETE | `/experimental/worktree` | worktree.remove | 删除 Worktree |
| POST | `/experimental/worktree/reset` | worktree.reset | 重置 Worktree |
| GET | `/experimental/session` | experimental.session.list | 全局会话 |
| GET | `/experimental/resource` | experimental.resource.list | MCP 资源 |

## 18. Sync Routes (`/sync`)

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| POST | `/sync/start` | sync.start | 启动同步 |
| POST | `/sync/replay` | sync.replay | 重放事件 |
| POST | `/sync/history` | sync.history.list | 同步历史 |

## 19. Extension Routes (`/x`)（opencode-stack 扩展）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/x/backends` | 所有后端状态 |
| GET | `/x/routes` | 会话路由表 |
| GET | `/x/sse` | SSE 连接状态 |
| GET | `/health` | 聚合服务健康 |

## 20. SSE/WebSocket 端点

| 路径 | 协议 | 说明 |
|------|------|------|
| `/global/event` | SSE | 全局事件流 |
| `/event` | SSE | 实例事件流 |
| `/pty/:ptyID/connect` | WebSocket | PTY 终端 |

## 21. 条件启用端点

以下端点仅当特定环境变量设置时启用：

| 条件 | 端点 |
|------|------|
| `OPENCODE_EXPERIMENTAL_HTTPAPI=true` | HTTP API 服务端点 |
| `OPENCODE_WORKSPACE_ID` 未设置 | `/experimental/workspace/*` |

## 22. 聚合服务特有端点

| 端点 | 说明 |
|------|------|
| `GET /health` | 聚合服务自身健康状态 |
| `GET /global/health` | 返回聚合状态 + 所有后端状态 |
| `GET /session` | 聚合所有后端会话列表 |
| `GET /session/status` | 聚合所有后端会话状态 |
| `GET /provider` | 聚合所有后端提供商 |
| `GET /agent` | 聚合所有后端代理 |
| `GET /command` | 聚合所有后端命令 |
| `GET /skill` | 聚合所有后端技能 |
| `GET /event` | 聚合所有后端 SSE 事件 |
| `GET /global/event` | 聚合所有后端全局 SSE |