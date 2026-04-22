# overall-spec.md - 整体规格文档

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 项目概述

opencode-stack 是 opencode 服务器的聚合服务程序。它南向聚合连接多个 opencode 服务器实例，北向提供与 opencode 服务接口完全兼容的统一服务接口。

### 1.1 核心价值

- **统一接入点**：客户端只需连接一个地址，无需管理多个 opencode 实例
- **负载均衡**：新会话自动分发到不同后端实例
- **故障隔离**：单个后端故障不影响整体服务
- **透明代理**：客户端无感知，完全兼容现有 SDK

### 1.2 目标

- 为团队提供统一的 opencode 接入点，无需为每个实例单独配置客户端
- 支持多 opencode 实例的会话管理和负载均衡
- 保持与 opencode 原生接口 100% 兼容

### 1.3 非目标（v0.1）

- 用户管理和鉴权系统（后续版本）
- 配置持久化到数据库（后续版本）
- CLI 管理工具（后续版本）
- Docker/K8s 动态部署（预留接口，后续实现）

## 2. 系统边界

### 2.1 上游依赖

- 一个或多个运行中的 opencode 服务器实例（`opencode serve`）
- 每个实例提供标准 OpenAPI 3.1 接口
- 支持的连接类型：
  - `local`: 本机 127.0.0.1:4096
  - `remote`: 远程主机任意端口

### 2.2 下游客户端

- opencode CLI（通过 `--hostname` / `--port` 连接）
- opencode SDK 生成的客户端（JavaScript/TypeScript）
- 任何兼容 opencode API 的 HTTP 客户端
- TUI 客户端（通过 SSE 获取事件）

## 3. 功能规格

### 3.1 南向连接 (011-opencode-connector)

| 功能 | 说明 | 优先级 |
|------|------|--------|
| Local 连接器 | 连接本机 opencode（127.0.0.1:4096） | P0 |
| Remote 连接器 | 连接远程 opencode 实例 | P0 |
| 连接器健康检查 | 定时调用 `/global/health` | P0 |
| 故障自动隔离 | 连续失败后自动隔离 | P0 |
| 自动恢复 | 隔离后定时重试恢复 | P0 |
| 负载均衡 | 新会话轮询分配后端 | P0 |
| SSE 事件订阅 | 订阅后端 SSE 事件流 | P0 |
| Docker 连接器 | 预留接口 | P2 |
| K8s 连接器 | 预留接口 | P2 |

### 3.2 北向 API (101-opencode-api)

完整实现 opencode OpenAPI 3.1 规范的所有端点：

| 端点组 | 端点数 | 说明 | 路由策略 |
|--------|--------|------|---------|
| /global/* | 6 | 健康检查、事件流、配置 | local/broadcast |
| /project/* | 2 | 项目列表、当前项目 | primary/broadcast |
| /session/* | 20+ | 会话 CRUD、消息、命令 | session/broadcast |
| /session/:id/message/* | 4 | 消息发送、获取 | session |
| /provider/* | 4 | 提供商列表、OAuth | aggregate |
| /file/* | 5 | 文件搜索、内容读取 | current |
| /config/* | 3 | 配置查询、更新 | current |
| /agent | 1 | 代理列表 | aggregate |
| /command | 1 | 命令列表 | aggregate |
| /lsp | 1 | LSP 状态 | current |
| /formatter | 1 | 格式化器状态 | current |
| /mcp/* | 7 | MCP 服务器管理 | current |
| /event | 1 | 实例事件流 (SSE) | aggregate |
| /instance/* | 1 | 实例销毁 | current |
| /path | 1 | 路径信息 | current |
| /vcs/* | 2 | VCS 信息和 diff | current |
| /skill | 1 | 技能列表 | aggregate |
| /log | 1 | 日志写入 | broadcast |
| /auth/* | 1 | 认证设置 | current |
| /doc | 1 | OpenAPI 文档 | local |
| /tui/* | 10 | TUI 控制 | current |
| /experimental/* | 2 | 实验性工具 | current |
| /pty/* | 7 | PTY 会话管理 | current |
| /health | 1 | 聚合服务健康 | local |

### 3.3 整体框架 (001-framework)

| 功能 | 说明 | 优先级 |
|------|------|--------|
| Express 应用初始化 | 创建 Express 实例 | P0 |
| 中间件链 | JSON 解析、URL 编码、CORS | P0 |
| 路由注册 | 模块化组织路由 | P0 |
| 全局错误处理 | 404、500 错误处理 | P0 |
| 健康检查端点 | `/health` 端点 | P0 |
| 配置文件加载 | YAML/JSON/JSONC 解析 | P0 |
| 环境变量加载 | dotenv 加载敏感信息 | P0 |

## 4. 约束条件

### 4.1 技术约束

| 约束 | 值 | 说明 |
|------|-----|------|
| 运行端口 | 6904 | 可通过 PORT 环境变量配置 |
| Node.js 版本 | >= 20 | 使用原生 fetch API |
| TypeScript | 严格模式 | 零类型错误 |
| 后端兼容性 | opencode 最新版 | OpenAPI 3.1 规范 |

### 4.2 性能约束

| 约束 | 目标值 | 说明 |
|------|--------|------|
| 代理延迟 | < 10ms | 不含后端响应时间 |
| 并发连接 | >= 100 | SSE 连接数 |
| 健康检查间隔 | 30s | 默认值 |
| 健康检查超时 | 5s | 单次超时 |
| SSE 重连次数 | 3 | 最大重连 |

### 4.3 可靠性约束

| 约束 | 值 | 说明 |
|------|-----|------|
| 故障隔离阈值 | 3 次失败 | 连续健康检查失败 |
| 恢复重试间隔 | 60s | 隔离后重试间隔 |
| 单后端故障影响 | 0 | 不影响其他后端 |

## 5. 路由策略规格

### 5.1 策略类型

| 策略 | 说明 | 适用端点 |
|------|------|---------|
| local | 本地处理，不转发 | /health, /doc |
| broadcast | 广播到所有后端，取任意成功 | /log |
| aggregate | 从所有后端获取数据后合并 | /session (list), /provider, /agent, /command |
| session | 根据会话 ID 路由到特定后端 | /session/:id/* |
| primary | 路由到主后端 | /project/current |
| current | 路由到当前项目后端（默认选择第一个可用） | /file/*, /config/*, /lsp |

### 5.2 会话路由流程

```
请求 /session/:id/*
  │
  v
查 SessionRouteTable
  │
  ├── 找到 connectorId
  │   │
  │   v
  │   转发到对应连接器
  │   │
  │   v
  │   返回响应
  │
  └── 未找到
      │
      v
      404 Session Not Found
```

### 5.3 新建会话流程

```
POST /session
  │
  v
ConnectorManager.selectForNewSession()
  │
  ├── 获取已连接后端列表
  ├── 轮询选择下一个
  └── 返回选中 Connector
  │
  v
转发请求到选中后端
  │
  v
后端创建会话返回 sessionID
  │
  v
SessionRouteTable 注册路由
  │
  v
返回会话信息给客户端
```

## 6. SSE 聚合规格

### 6.1 事件流结构

```
客户端连接 SSE (/event)
  │
  v
创建 SSE Manager
  │
  v
订阅所有已连接后端
  ├── Connector A SSE ── event ──┐
  ├── Connector B SSE ── event ──│── 合并队列
  └── Connector C SSE ── event ──┘
  │
  v
事件合并（添加 directory 标识）
  │
  v
推送到客户端 SSE 流
```

### 6.2 事件格式

保持 opencode 原生格式，添加 directory 字段标识来源：

```json
{
  "directory": "backend-1",
  "payload": {
    "type": "session.created",
    "properties": {
      "info": { ... }
    }
  }
}
```

### 6.3 连接管理

| 场景 | 处理方式 |
|------|---------|
| 首个客户端连接 | 建立到所有后端的 SSE 连接 |
| 所有客户端断开 | 延迟 30s 关闭后端 SSE |
| 后端 SSE 断连 | 自动重连（最多 3 次） |
| 后端被隔离 | 断开对应 SSE，停止订阅 |

## 7. 错误处理规格

### 7.1 HTTP 状态码

| 场景 | 状态码 | 错误码 |
|------|--------|--------|
| 后端不可达 | 502 | BACKEND_UNREACHABLE |
| 后端超时 | 504 | BACKEND_TIMEOUT |
| 无可用后端 | 503 | NO_AVAILABLE_BACKEND |
| 会话未找到 | 404 | SESSION_NOT_FOUND |
| 认证失败 | 401 | 透传后端响应 |
| 参数错误 | 400 | 透传后端响应 |
| 内部错误 | 500 | INTERNAL_ERROR |

### 7.2 错误响应格式

```json
{
  "error": {
    "message": "Backend server unreachable",
    "code": "BACKEND_UNREACHABLE",
    "backend": "remote-1"
  }
}
```

## 8. 配置规格

### 8.1 服务器配置结构

```yaml
servers:
  - name: local
    type: local
    host: 127.0.0.1
    port: 4096
    enabled: true
    primary: true
    
  - name: remote-1
    type: remote
    host: 192.168.1.100
    port: 4096
    project: /path/to/project
    username: opencode
    password: ${REMOTE_PASSWORD}
    enabled: true
    primary: false

settings:
  healthCheckInterval: 30000
  healthCheckTimeout: 5000
  isolationThreshold: 3
  recoveryInterval: 60000
  sseReconnectMax: 3
  sseGracefulShutdownDelay: 30000
```

### 8.2 配置字段说明

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | 是 | - | 连接器唯一名称 |
| type | string | 是 | - | local/remote/docker/k8s |
| host | string | 是 | - | 服务器主机地址 |
| port | number | 是 | 4096 | 服务器端口 |
| project | string | remote必填 | - | 项目路径 |
| username | string | 否 | opencode | 认证用户名 |
| password | string | 否 | - | 认证密码 |
| enabled | boolean | 否 | true | 是否启用 |
| primary | boolean | 否 | false | 是否为主后端 |

## 9. 质量要求

### 9.1 兼容性

- 北向 API 100% 兼容 opencode OpenAPI 3.1 规范
- 所有端点路径、方法、参数、响应格式一致
- SSE 事件格式一致

### 9.2 类型安全

- TypeScript 严格模式
- 零 `as any`、`@ts-ignore`
- 所有接口有类型定义

### 9.3 可靠性

- 单个后端故障不影响服务可用性
- 健康检查自动隔离和恢复
- SSE 断连自动重连

### 9.4 性能

- 请求代理延迟 < 10ms
- 支持 100+ 并发 SSE 连接
- 聚合操作不影响单请求性能