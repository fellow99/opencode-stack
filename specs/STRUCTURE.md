# STRUCTURE.md - 项目目录文件结构

> 生成时间: 2026-04-22
> 项目: opencode-stack
> 版本: v0.1.0

## 1. 完整目录结构

```
opencode-stack/
├── .env.example              # 环境变量模板 (PORT=6904)
├── .gitignore                # Git 忽略规则
├── LICENSE                   # MIT 许可证
├── README.md                 # 项目说明文档
├── package.json              # 项目配置与依赖
├── package-lock.json         # 依赖锁定文件
├── tsconfig.json             # TypeScript 编译配置
├── nodemon.json              # nodemon 热重载配置
│
├── specs/                    # 规范文档目录
│   ├── README.md             # 文档索引
│   ├── SPECS_CHECKLIST.md    # 规格检查清单
│   ├── STRUCTURE.md          # 本文件
│   ├── API.md                # 全局 API 清单
│   ├── TECH.md               # 技术选型
│   ├── ARCHITECTURE.md       # 整体架构
│   ├── constitution.md       # 宪法原则
│   ├── overall-spec.md       # 整体规格
│   ├── overall-plan.md       # 整体技术方案
│   ├── overall-data-model.md # 数据模型
│   ├── overall-api.md        # 对外接口模型
│   ├── 001-framework/        # 整体框架模块
│   ├── 011-opencode-connector/ # 南向连接器模块
│   └── 101-opencode-api/     # 北向 API 模块
│
├── specs/                    # 规范文档目录（旧）
│   └── ...                   # (保留)
│
├── src/                      # 源代码目录
│   ├── app.ts                # 应用入口
│   └── routes/
│       └── index.ts          # 根路由
│
└── dist/                     # 构建输出目录（git 忽略）
```

## 2. 规划中的目录结构

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
│   ├── routes/               # 端点实现（详见整体架构）
│   ├── proxy/                # 代理层
│   ├── session/              # 会话管理
│   ├── aggregate/            # 聚合层
│   ├── strategy/             # 路由策略
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

## 3. 当前源文件说明

### 3.1 src/app.ts（应用入口）

| 职责 | 实现 |
|------|------|
| 环境加载 | `dotenv.config()` 加载 `../.env` |
| 端口配置 | `PORT = process.env.PORT || 6904` |
| 中间件 | `express.json()` + `express.urlencoded()` |
| 路由注册 | 挂载 `indexRouter` 到 `/` |
| 健康检查 | `GET /health` → `{ status: 'ok', timestamp }` |
| 404 处理 | 返回 `{ error: 'Not Found' }` |
| 错误处理 | 500 + `{ error: 'Internal Server Error' }` |
| 服务启动 | `app.listen(PORT)` |

### 3.2 src/routes/index.ts（根路由）

| 职责 | 实现 |
|------|------|
| 根路径 | `GET /` → `{ name, version, description }` |

## 4. 配置文件说明

### 4.1 package.json

| 字段 | 值 | 说明 |
|------|-----|------|
| name | opencode-stack | 项目名称 |
| version | 0.1.0 | 版本号 |
| main | dist/app.js | 入口文件 |
| scripts.dev | nodemon --config nodemon.json src/app.ts | 开发模式 |
| scripts.build | tsc | 构建 |
| scripts.start | node dist/app.js | 生产运行 |

### 4.2 tsconfig.json

| 字段 | 值 | 说明 |
|------|-----|------|
| target | ES2020 | 编译目标 |
| module | commonjs | 模块系统 |
| outDir | ./dist | 输出目录 |
| rootDir | ./src | 源目录 |
| strict | true | 严格模式 |

### 4.3 nodemon.json

| 字段 | 值 | 说明 |
|------|-----|------|
| watch | src, .env | 监听目录 |
| ext | ts, json, env | 文件扩展 |
| exec | ts-node src/app.ts | 执行命令 |

### 4.4 .env.example

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 6904 | 服务端口 |
| NODE_ENV | development | 环境 |

## 5. 规范文档目录说明

### 5.1 specs/ 目录结构

| 目录/文件 | 用途 |
|-----------|------|
| README.md | 文档索引和阅读指南 |
| SPECS_CHECKLIST.md | 模块规格完成情况追踪 |
| STRUCTURE.md | 项目目录结构（本文件） |
| API.md | 全局 API 端点清单 |
| TECH.md | 技术选型决策 |
| ARCHITECTURE.md | 系统架构设计 |
| constitution.md | 项目宪法原则 |
| overall-spec.md | 整体功能规格 |
| overall-plan.md | 整体实施计划 |
| overall-data-model.md | 数据模型定义 |
| overall-api.md | 对外接口模型 |
| 001-framework/ | 框架模块规范 |
| 011-opencode-connector/ | 南向连接器规范 |
| 101-opencode-api/ | 北向 API 规范 |

## 6. 依赖清单

### 6.1 生产依赖

| 包 | 版本 | 用途 |
|----|------|------|
| express | ^4.21.2 | Web 框架 |
| dotenv | ^16.4.7 | 环境变量 |
| yaml | ^2.7.0 | YAML 解析 |
| jsonc-parser | ^3.3.1 | JSONC 解析 |
| zod | ^3.24.2 | 数据校验 |

### 6.2 开发依赖

| 包 | 版本 | 用途 |
|----|------|------|
| typescript | ^5.7.3 | TS 编译 |
| ts-node | ^10.9.2 | TS 运行 |
| nodemon | ^3.1.9 | 热重载 |
| @types/express | ^5.0.6 | Express 类型 |
| @types/node | ^22.19.17 | Node 类型 |

## 7. 前端/路由说明

本项目为纯后端服务，无前端页面。

### 7.1 当前路由配置

| 路由 | 文件 | 说明 |
|------|------|------|
| `/` | src/routes/index.ts | 根路由，返回服务信息 |
| `/health` | src/app.ts | 健康检查端点 |

### 7.2 规划路由配置

| 路由前缀 | 模块 | 说明 |
|---------|------|------|
| `/global` | api/routes/global.ts | 全局端点 |
| `/project` | api/routes/project.ts | 项目端点 |
| `/session` | api/routes/session.ts | 会话端点 |
| `/provider` | api/routes/provider.ts | 提供商端点 |
| `/file` | api/routes/file.ts | 文件端点 |
| `/config` | api/routes/config.ts | 配置端点 |
| `/mcp` | api/routes/mcp.ts | MCP 端点 |
| `/pty` | api/routes/pty.ts | PTY 端点 |
| `/tui` | api/routes/tui.ts | TUI 端点 |
| `/experimental` | api/routes/experimental.ts | 实验端点 |
| `/x` | api/routes/extend.ts | 扩展端点 |

## 8. 构建输出

### 8.1 dist/ 目录结构

```
dist/
├── app.js                    # 编译后的入口
├── app.d.ts                  # 类型声明
└── routes/
    ├── index.js              # 编译后的路由
    └── index.d.ts            # 类型声明
```

## 9. 版本历史

| 版本 | 日期 | 结构变更 |
|------|------|---------|
| v0.1.0 | 2026-04-22 | 初始骨架：app.ts + routes/index.ts |
| 规划中 | - | 完整模块结构实现 |