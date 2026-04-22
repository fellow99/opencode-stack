# overall-plan.md - 整体技术方案

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 开发计划概览

### 1.1 版本目标

v0.1.0 目标：完成基础框架和核心功能

| 功能模块 | 优先级 | 预计工时 |
|---------|--------|---------|
| 001-framework | P0 | 2 天 |
| 011-opencode-connector | P0 | 4 天 |
| 101-opencode-api | P0 | 5 天 |
| 测试与调试 | P0 | 2 天 |

### 1.2 里程碑

| 里程碑 | 日期 | 目标 |
|--------|------|------|
| M1 | 第 1 周 | 完成框架和 LocalConnector |
| M2 | 第 2 周 | 完成 RemoteConnector 和会话路由 |
| M3 | 第 3 周 | 完成北向 API 全部端点 |
| M4 | 第 4 周 | 完成测试和文档 |

## 2. 模块开发顺序

### 2.1 001-framework（基础框架）

**开发顺序**：

1. 配置加载模块
   - YAML/JSON/JSONC 解析
   - zod schema 校验
   - 环境变量加载

2. Express 应用初始化
   - 中间件链配置
   - CORS 配置
   - 错误处理中间件

3. 日志模块
   - 分级日志
   - 格式化输出
   - 请求日志

**关键实现**：

```typescript
// src/config/loader.ts
export async function loadConfig(): Promise<AppConfig> {
  const file = await findConfigFile()
  const content = await parseConfig(file)
  return AppConfigSchema.parse(content)
}

// src/app.ts
const app = express()
app.use(express.json())
app.use(requestLoggerMiddleware)
app.use(errorHandlerMiddleware)
```

### 2.2 011-opencode-connector（南向连接器）

**开发顺序**：

1. 连接器接口定义
   - IConnector 接口
   - ServerConfig 类型
   - ConnectorStatus 类型

2. LocalConnector 实现
   - 连接到 127.0.0.1:4096
   - 健康检查
   - HTTP 代理
   - SSE 事件订阅

3. RemoteConnector 实现
   - 连接到远程 host:port
   - HTTP Basic Auth 认证
   - 健康检查
   - HTTP 代理
   - SSE 事件订阅

4. ConnectorManager 实现
   - 初始化所有连接器
   - 负载均衡选择
   - 健康检查管理

5. 健康检查机制
   - 定时检查
   - 失败计数
   - 隔离逻辑
   - 恢复逻辑

**关键实现**：

```typescript
// src/connector/types.ts
export interface IConnector {
  readonly id: string
  readonly config: ServerConfig
  readonly status: ConnectorStatus
  readonly baseUrl: string
  
  connect(): Promise<void>
  disconnect(): Promise<void>
  dispose(): Promise<void>
  healthCheck(): Promise<HealthInfo>
  proxy(request: ProxyRequest): Promise<ProxyResponse>
  subscribeEvents(callback: (event: Event) => void): Unsubscribe
}

// src/connector/manager.ts
export class ConnectorManager {
  private connectors: Map<string, IConnector>
  private routeIndex: number = 0
  
  selectForNewSession(): IConnector {
    const connected = this.getConnected()
    if (connected.length === 0) throw new Error('No available backend')
    this.routeIndex = (this.routeIndex + 1) % connected.length
    return connected[this.routeIndex]
  }
}
```

### 2.3 101-opencode-api（北向 API）

**开发顺序**：

1. 路由框架
   - Express Router 创建
   - 路由策略映射
   - 中间件配置

2. 会话路由表
   - SessionRoute 类型定义
   - 创建会话时注册路由
   - 删除会话时清除路由
   - 查找会话对应后端

3. 代理层
   - 请求转发
   - 认证透传
   - 流式响应处理
   - SSE 处理

4. 聚合层
   - 会话列表聚合
   - Provider 聚合
   - Agent 聚合
   - Command 聚合

5. SSE 事件聚合
   - 后端 SSE 订阅管理
   - 事件合并
   - 客户端 SSE 推送

6. 端点实现（按组）
   - Global Routes
   - Session Routes
   - Message Routes
   - Provider Routes
   - File Routes
   - Config Routes
   - 其他 Routes

**关键实现**：

```typescript
// src/api/session/route-table.ts
export class SessionRouteTable {
  private routes: Map<string, SessionRoute>
  
  register(sessionID: string, connectorID: string): void {
    this.routes.set(sessionID, { sessionID, connectorID, createdAt: Date.now() })
  }
  
  lookup(sessionID: string): string | undefined {
    return this.routes.get(sessionID)?.connectorID
  }
  
  clear(sessionID: string): void {
    this.routes.delete(sessionID)
  }
}

// src/api/proxy/request.ts
export async function proxyRequest(
  connector: IConnector,
  req: express.Request
): Promise<express.Response> {
  const proxyReq: ProxyRequest = {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: filterHeaders(req.headers),
    body: req.body
  }
  const proxyRes = await connector.proxy(proxyReq)
  return formatResponse(proxyRes)
}
```

## 3. 目录结构规划

```
src/
├── app.ts                    # 应用入口
│
├── config/                   # 配置模块
│   ├── loader.ts             # 配置加载器
│   ├── schema.ts             # zod schema 定义
│   └── index.ts              # 导出
│
├── connector/                # 南向连接器
│   ├── types.ts              # 类型定义
│   ├── base.ts               # 基类
│   ├── local.ts              # Local 连接器
│   ├── remote.ts             # Remote 连接器
│   ├── docker.ts             # Docker 连接器（预留）
│   ├── k8s.ts                # K8s 连接器（预留）
│   ├── manager.ts            # 连接器管理器
│   ├── health-check.ts       # 健康检查
│   └── index.ts              # 导出
│
├── api/                      # 北向 API
│   ├── router.ts             # 路由注册
│   ├── routes/               # 端点实现
│   │   ├── global.ts         # /global/* 端点
│   │   ├── project.ts        # /project/* 端点
│   │   ├── session.ts        # /session/* 端点
│   │   ├── message.ts        # /session/:id/message/* 端点
│   │   ├── provider.ts       # /provider/* 端点
│   │   ├── file.ts           # /file/* 端点
│   │   ├── config.ts         # /config/* 端点
│   │   ├── agent.ts          # /agent 端点
│   │   ├── command.ts        # /command 端点
│   │   ├── lsp.ts            # /lsp 端点
│   │   ├── formatter.ts      # /formatter 端点
│   │   ├── mcp.ts            # /mcp/* 端点
│   │   ├── event.ts          # /event 端点
│   │   ├── instance.ts       # /instance/* 端点
│   │   ├── path.ts           # /path 端点
│   │   ├── vcs.ts            # /vcs/* 端点
│   │   ├── skill.ts          # /skill 端点
│   │   ├── log.ts            # /log 端点
│   │   ├── auth.ts           # /auth/* 端点
│   │   ├── doc.ts            # /doc 端点
│   │   ├── tui.ts            # /tui/* 端点
│   │   ├── experimental.ts   # /experimental/* 端点
│   │   ├── pty.ts            # /pty/* 端点
│   │   ├── permission.ts     # /permission/* 端点
│   │   ├── question.ts       # /question/* 端点
│   │   ├── sync.ts           # /sync/* 端点
│   │   └── index.ts          # 路由导出
│   ├── proxy/                # 代理层
│   │   ├── request.ts        # 请求代理
│   │   ├── response.ts       # 响应处理
│   │   └── sse.ts            # SSE 处理
│   ├── session/              # 会话管理
│   │   ├── route-table.ts    # 路由表
│   │   ├── create.ts         # 创建逻辑
│   │   └── lookup.ts         # 查找逻辑
│   ├── aggregate/            # 聚合层
│   │   ├── session-list.ts   # 会话聚合
│   │   ├── provider-list.ts  # 提供商聚合
│   │   ├── agent-list.ts     # 代理聚合
│   │   ├── command-list.ts   # 命令聚合
│   │   └── sse-events.ts     # SSE 聚合
│   ├── strategy/             # 路由策略
│   │   ├── types.ts          # 策略类型
│   │   ├── local.ts          # 本地处理
│   │   ├── session.ts        # 会话路由
│   │   ├── aggregate.ts      # 聚合处理
│   │   ├── broadcast.ts      # 广播处理
│   │   └── primary.ts        # 主后端处理
│   └── index.ts              # 导出
│
├── routes/                   # Express 路由
│   ├── index.ts              # 根路由
│   └── health.ts             # 健康检查
│
├── types/                    # 共享类型
│   ├── errors.ts             # 错误类型
│   ├── proxy.ts              # 代理类型
│   └── index.ts              # 导出
│
├── util/                     # 工具函数
│   ├── logger.ts             # 日志
│   ├── fetch.ts              # HTTP 客户端
│   └── index.ts              # 导出
│
└── index.ts                  # 模块导出
```

## 4. 测试计划

### 4.1 单元测试

| 测试目标 | 测试内容 |
|---------|---------|
| config/loader.ts | 配置文件解析、校验 |
| connector/local.ts | 连接、健康检查、代理 |
| connector/remote.ts | 连接、认证、代理 |
| connector/manager.ts | 初始化、负载均衡 |
| api/session/route-table.ts | 注册、查找、清除 |
| api/proxy/request.ts | 请求转发 |

### 4.2 集成测试

| 测试场景 | 测试内容 |
|---------|---------|
| 单后端连接 | 所有 API 端点透传 |
| 多后端连接 | 会话创建路由到不同后端 |
| 后端隔离 | 健康检查失败后自动隔离 |
| SSE 事件 | 多后端事件聚合 |
| 错误处理 | 各种错误场景 |

### 4.3 兼容性测试

使用 opencode SDK 测试所有端点兼容性。

## 5. 部署方案

### 5.1 开发环境

```bash
# 启动开发服务器
npm run dev

# 启动本地 opencode 后端
opencode serve --port 4096
```

### 5.2 生产部署

```bash
# 构建
npm run build

# 运行
npm run start

# 或使用 PM2
pm2 start dist/app.js --name opencode-stack
```

### 5.3 Docker 部署（预留）

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 6904
CMD ["node", "dist/app.js"]
```

## 6. 文档计划

### 6.1 开发文档

- API 路由策略说明
- 连接器扩展指南
- 配置文件格式说明

### 6.2 用户文档

- 快速开始指南
- 配置说明
- 常见问题

## 7. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| opencode API 变更 | 兼容性破坏 | 监控 opencode 版本，及时更新 |
| SSE 事件格式变更 | 事件流失效 | 复用 SDK 类型定义 |
| 多后端状态不一致 | 数据冲突 | 会话绑定单一后端 |
| 网络延迟影响体验 | 性能问题 | 最小化代理逻辑 |

## 8. 后续版本规划

### v0.2.0

- Docker Connector 实现
- 配置持久化到文件
- CLI 管理工具

### v0.3.0

- K8s Connector 实现
- 用户管理
- 用户鉴权

### v1.0.0

- 高可用部署
- 监控面板
- 性能优化