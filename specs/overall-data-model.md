# overall-data-model.md - 数据模型

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22
> 参考: opencode SDK types.gen.ts

## 1. 核心数据模型

### 1.1 Session

```typescript
interface Session {
  id: string                    // 会话 ID
  projectID: string             // 项目 ID
  directory: string             // 项目目录
  parentID?: string             // 父会话 ID
  summary?: {
    additions: number           // 新增行数
    deletions: number           // 删除行数
    files: number               // 变更文件数
    diffs?: FileDiff[]          // 文件差异
  }
  share?: {
    url: string                 // 分享 URL
  }
  title: string                 // 会话标题
  version: string               // 版本号
  time: {
    created: number             // 创建时间戳
    updated: number             // 更新时间戳
    compacting?: number         // 压缩时间
  }
  revert?: {
    messageID: string           // 回退消息 ID
    partID?: string             // 回退部分 ID
    snapshot?: string           // 快照
    diff?: string               // 差异
  }
}
```

### 1.2 Message

```typescript
type Message = UserMessage | AssistantMessage

interface UserMessage {
  id: string
  sessionID: string
  role: "user"
  time: {
    created: number
  }
  summary?: {
    title?: string
    body?: string
    diffs: FileDiff[]
  }
  agent: string                 // 代理名称
  model: {
    providerID: string
    modelID: string
  }
  system?: string               // 系统提示
  tools?: {
    [key: string]: boolean      // 工具启用
  }
}

interface AssistantMessage {
  id: string
  sessionID: string
  role: "assistant"
  time: {
    created: number
    completed?: number
  }
  error?: ProviderAuthError | UnknownError | MessageOutputLengthError | MessageAbortedError | ApiError
  parentID: string
  modelID: string
  providerID: string
  mode: string
  path: {
    cwd: string
    root: string
  }
  summary?: boolean
  cost: number                  // 消费金额
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: {
      read: number
      write: number
    }
  }
  finish?: string               // 完成原因
}
```

### 1.3 Part（消息部分）

```typescript
type Part = 
  | TextPart
  | ReasoningPart
  | FilePart
  | ToolPart
  | StepStartPart
  | StepFinishPart
  | SnapshotPart
  | PatchPart
  | AgentPart
  | RetryPart
  | CompactionPart
  | SubtaskPart

interface TextPart {
  id: string
  sessionID: string
  messageID: string
  type: "text"
  text: string
  synthetic?: boolean
  ignored?: boolean
  time?: { start: number, end?: number }
  metadata?: Record<string, unknown>
}

interface ReasoningPart {
  id: string
  sessionID: string
  messageID: string
  type: "reasoning"
  text: string
  metadata?: Record<string, unknown>
  time: { start: number, end?: number }
}

interface ToolPart {
  id: string
  sessionID: string
  messageID: string
  type: "tool"
  callID: string
  tool: string
  state: ToolState
  metadata?: Record<string, unknown>
}

type ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError

interface ToolStatePending {
  status: "pending"
  input: Record<string, unknown>
  raw: string
}

interface ToolStateRunning {
  status: "running"
  input: Record<string, unknown>
  title?: string
  metadata?: Record<string, unknown>
  time: { start: number }
}

interface ToolStateCompleted {
  status: "completed"
  input: Record<string, unknown>
  output: string
  title: string
  metadata: Record<string, unknown>
  time: { start: number, end: number, compacted?: number }
  attachments?: FilePart[]
}

interface ToolStateError {
  status: "error"
  input: Record<string, unknown>
  error: string
  metadata?: Record<string, unknown>
  time: { start: number, end: number }
}
```

### 1.4 Provider

```typescript
interface Provider {
  id: string
  name: string
  source: "env" | "config" | "custom" | "api"
  env: string[]                 // 环境变量列表
  key?: string                  // API Key
  options: Record<string, unknown>
  models: {
    [modelID: string]: Model
  }
}

interface Model {
  id: string
  providerID: string
  api: {
    id: string
    url: string
    npm: string
  }
  name: string
  capabilities: {
    temperature: boolean
    reasoning: boolean
    attachment: boolean
    toolcall: boolean
    input: { text, audio, image, video, pdf: boolean }
    output: { text, audio, image, video, pdf: boolean }
  }
  cost: {
    input: number
    output: number
    cache: { read: number, write: number }
  }
  limit: {
    context: number
    output: number
  }
  status: "alpha" | "beta" | "deprecated" | "active"
  options: Record<string, unknown>
  headers: Record<string, string>
}
```

### 1.5 Config

```typescript
interface Config {
  $schema?: string
  theme?: string
  keybinds?: KeybindsConfig
  logLevel?: "DEBUG" | "INFO" | "WARN" | "ERROR"
  tui?: {
    scroll_speed?: number
    scroll_acceleration?: { enabled: boolean }
    diff_style?: "auto" | "stacked"
  }
  command?: Record<string, {
    template: string
    description?: string
    agent?: string
    model?: string
    subtask?: boolean
  }>
  watcher?: { ignore?: string[] }
  plugin?: string[]
  snapshot?: boolean
  share?: "manual" | "auto" | "disabled"
  autoupdate?: boolean | "notify"
  disabled_providers?: string[]
  enabled_providers?: string[]
  model?: string
  small_model?: string
  username?: string
  agent?: Record<string, AgentConfig>
  provider?: Record<string, ProviderConfig>
  mcp?: Record<string, McpLocalConfig | McpRemoteConfig>
  formatter?: false | Record<string, FormatterConfig>
  lsp?: false | Record<string, LspConfig>
  instructions?: string[]
  permission?: PermissionConfig
  tools?: Record<string, boolean>
  enterprise?: { url?: string }
  experimental?: ExperimentalConfig
}
```

### 1.6 Agent

```typescript
interface Agent {
  name: string
  description?: string
  mode: "subagent" | "primary" | "all"
  builtIn: boolean
  topP?: number
  temperature?: number
  color?: string
  permission: {
    edit: "ask" | "allow" | "deny"
    bash: Record<string, "ask" | "allow" | "deny">
    webfetch?: "ask" | "allow" | "deny"
    doom_loop?: "ask" | "allow" | "deny"
    external_directory?: "ask" | "allow" | "deny"
  }
  model?: { modelID: string, providerID: string }
  prompt?: string
  tools: Record<string, boolean>
  options: Record<string, unknown>
  maxSteps?: number
}
```

### 1.7 Project

```typescript
interface Project {
  id: string
  worktree: string              // Worktree 路径
  vcsDir?: string               // VCS 目录
  vcs?: "git"
  time: {
    created: number
    initialized?: number
  }
}
```

### 1.8 Permission

```typescript
interface Permission {
  id: string
  type: string
  pattern?: string | string[]
  sessionID: string
  messageID: string
  callID?: string
  title: string
  metadata: Record<string, unknown>
  time: {
    created: number
  }
}
```

### 1.9 Todo

```typescript
interface Todo {
  id: string
  content: string               // 任务描述
  status: string                // pending | in_progress | completed | cancelled
  priority: string              // high | medium | low
}
```

### 1.10 FileDiff

```typescript
interface FileDiff {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}
```

### 1.11 Pty

```typescript
interface Pty {
  id: string
  title: string
  command: string
  args: string[]
  cwd: string
  status: "running" | "exited"
  pid: number
}
```

### 1.12 SessionStatus

```typescript
type SessionStatus = 
  | { type: "idle" }
  | { type: "retry", attempt: number, message: string, next: number }
  | { type: "busy" }
```

## 2. 输入数据模型

### 2.1 PromptInput

```typescript
interface PromptInput {
  sessionID: string
  messageID?: string
  model?: string
  agent?: string
  noReply?: boolean
  tools?: Record<string, boolean>
  format?: OutputFormat
  system?: string
  variant?: string
  parts: PartInput[]
}

type PartInput = TextPartInput | FilePartInput | AgentPartInput | SubtaskPartInput
```

### 2.2 CommandInput

```typescript
interface CommandInput {
  sessionID: string
  messageID?: string
  agent?: string
  model?: string
  command: string
  arguments: string
  variant?: string
  parts?: PartInput[]
}
```

### 2.3 ShellInput

```typescript
interface ShellInput {
  sessionID: string
  messageID?: string
  agent?: string
  model?: string
  command: string
}
```

## 3. 错误数据模型

### 3.1 ApiError

```typescript
interface ApiError {
  name: "APIError"
  data: {
    message: string
    statusCode?: number
    isRetryable: boolean
    responseHeaders?: Record<string, string>
    responseBody?: string
  }
}
```

### 3.2 ProviderAuthError

```typescript
interface ProviderAuthError {
  name: "ProviderAuthError"
  data: {
    providerID: string
    message: string
  }
}
```

### 3.3 MessageAbortedError

```typescript
interface MessageAbortedError {
  name: "MessageAbortedError"
  data: {
    message: string
  }
}
```

## 4. opencode-stack 扩展数据模型

### 4.1 ServerConfig（聚合服务自身配置）

```typescript
interface ServerConfig {
  host?: string                 // 监听主机（默认 0.0.0.0）
  port?: number                 // 监听端口（默认 6904）
  cors?: string[] | boolean     // 允许的跨域来源，true 表示允许所有
}
```

### 4.2 OpencodeConfig（后端 OpenCode 服务器配置）

```typescript
interface OpencodeConfig {
  name: string                  // 连接器唯一名称
  type: "local" | "remote" | "docker" | "k8s"
  host: string                  // 服务器主机
  port: number                  // 服务器端口
  project?: string              // 项目路径（remote 必填）
  username?: string             // 认证用户名（默认 opencode）
  password?: string             // 认证密码
  enabled?: boolean             // 是否启用（默认 true）
  primary?: boolean             // 是否为主后端（默认 false）
}
```

### 4.3 ConnectorStatus

```typescript
interface ConnectorStatus {
  connected: boolean            // 是否已连接
  isolated: boolean             // 是否被隔离
  error?: string                // 最后错误信息
}
```

### 4.4 HealthInfo

```typescript
interface HealthInfo {
  healthy: boolean              // 是否健康
  version: string               // opencode 版本
}
```

### 4.5 SessionRoute

```typescript
interface SessionRoute {
  sessionID: string             // 会话 ID
  connectorID: string           // 连接器 ID
  createdAt: number             // 创建时间
}
```

### 4.6 BackendStatus

```typescript
interface BackendStatus {
  name: string                  // 连接器名称
  status: ConnectorStatus       // 连接状态
  health?: HealthInfo           // 健康信息
}
```

## 5. 配置数据模型

### 5.1 SettingsConfig

```typescript
interface SettingsConfig {
  healthCheckInterval?: number  // 健康检查间隔（默认 30000ms）
  healthCheckTimeout?: number   // 健康检查超时（默认 5000ms）
  isolationThreshold?: number   // 隔离阈值（默认 3 次）
  recoveryInterval?: number     // 恢复重试间隔（默认 60000ms）
  sseReconnectMax?: number      // SSE 重连次数（默认 3）
  sseGracefulShutdownDelay?: number // SSE 关闭延迟（默认 30000ms）
}
```

### 5.2 AppConfig

```typescript
interface AppConfig {
  server?: ServerConfig
  opencodes: OpencodeConfig[]
  settings?: SettingsConfig
}
```

## 6. MCP 状态模型

```typescript
type McpStatus = 
  | { status: "connected" }
  | { status: "disabled" }
  | { status: "failed", error: string }
  | { status: "needs_auth" }
  | { status: "needs_client_registration", error: string }
```

## 7. LSP/Formatter 状态模型

```typescript
interface LspStatus {
  id: string
  name: string
  root: string
  status: "connected" | "error"
}

interface FormatterStatus {
  name: string
  extensions: string[]
  enabled: boolean
}
```

## 8. 认证数据模型

```typescript
type Auth = OAuth | ApiAuth | WellKnownAuth

interface OAuth {
  type: "oauth"
  refresh: string
  access: string
  expires: number
  enterpriseUrl?: string
}

interface ApiAuth {
  type: "api"
  key: string
}

interface WellKnownAuth {
  type: "wellknown"
  key: string
  token: string
}
```

## 9. 文件数据模型

```typescript
interface FileNode {
  name: string
  path: string
  absolute: string
  type: "file" | "directory"
  ignored: boolean
}

interface FileContent {
  type: "text" | "binary"
  content: string
  diff?: string
  patch?: PatchInfo
  encoding?: "base64"
  mimeType?: string
}

interface File {
  path: string
  added: number
  removed: number
  status: "added" | "deleted" | "modified"
}
```

## 10. 品牌化 ID 类型

以下类型使用品牌化字符串，确保类型安全：

| 类型 | 说明 |
|------|------|
| SessionID | 会话 ID（降序 ULID） |
| MessageID | 消息 ID（升序 ULID） |
| PartID | Part ID（升序 ULID） |
| ProviderID | 提供商 ID |
| ModelID | 模型 ID |
| ProjectID | 项目 ID |
| WorkspaceID | 工作空间 ID |
| PermissionID | 权限 ID |
| QuestionID | 问题 ID |
| PtyID | PTY ID |