# SPECS_CHECKLIST.md - 规格检查清单

> 项目: opencode-stack
> 更新时间: 2026-04-22
> 规范文档目录: specs/

## 1. 根目录文档完成情况

| 文档 | 状态 | 说明 |
|------|------|------|
| README.md | ✅ 已完成 | 文档索引 |
| SPECS_CHECKLIST.md | ✅ 已完成 | 本文件 |
| STRUCTURE.md | ✅ 已完成 | 目录结构 |
| API.md | ✅ 已完成 | API 清单（91 个端点） |
| TECH.md | ✅ 已完成 | 技术选型 |
| ARCHITECTURE.md | ✅ 已完成 | 整体架构 |
| constitution.md | ✅ 已完成 | 宪法原则（10 条） |
| overall-spec.md | ✅ 已完成 | 整体规格 |
| overall-plan.md | ✅ 已完成 | 整体技术方案 |
| overall-data-model.md | ✅ 已完成 | 数据模型 |
| overall-api.md | ✅ 已完成 | 对外接口模型 |

## 2. 功能模块规格完成情况

| 模块编号 | 模块名称 | spec.md | plan.md | data-model.md | api.md | 状态 |
|---------|---------|---------|---------|--------------|--------|------|
| 001 | 整体框架 | 待创建 | 待创建 | - | - | 待完成 |
| 011 | 南向 OpenCode 连接器 | 待创建 | 待创建 | 待创建 | 待创建 | 待完成 |
| 101 | 北向 OpenCode API | 待创建 | 待创建 | - | 待创建 | 待完成 |

## 3. 模块文档结构

### 3.1 001-framework（整体框架）

| 文档 | 状态 | 内容 |
|------|------|------|
| spec.md | ⏳ | Express 初始化、中间件、配置加载 |
| plan.md | ⏳ | 开发顺序、关键实现、测试计划 |

### 3.2 011-opencode-connector（南向连接器）

| 文档 | 状态 | 内容 |
|------|------|------|
| spec.md | ⏳ | 连接器接口、Local/Remote 实现、健康检查 |
| plan.md | ⏳ | 开发顺序、关键实现 |
| data-model.md | ⏳ | ServerConfig、ConnectorStatus、HealthInfo |
| api.md | ⏳ | 内部接口定义 |

### 3.3 101-opencode-api（北向 API）

| 文档 | 状态 | 内容 |
|------|------|------|
| spec.md | ⏳ | 路由策略、端点实现、SSE 聚合 |
| plan.md | ⏳ | 开发顺序、关键实现、测试计划 |
| api.md | ⏳ | 端点详细规格 |

## 4. README.md 提及但未设计的功能模块

以下模块在 README.md 功能清单中提及，但当前版本暂不设计：

| 功能模块 | 状态 | 备注 |
|---------|------|------|
| 用户管理 | 暂不设计 | 后续版本规划（v0.3+） |
| 用户鉴权 | 暂不设计 | 后续版本规划（v0.3+） |
| 配置持久化 | 暂不设计 | 后续版本规划（v0.2+） |
| 日志与监控 | 暂不设计 | 后续版本规划 |
| CLI 命令行工具 | 暂不设计 | 后续版本规划（v0.2+） |
| Docker/K8s 扩缩容 | 预留设计 | connector 模块中预留接口 |

## 5. API 兼容性检查清单

### 5.1 opencode 原生端点兼容性

| 端点组 | 端点数 | 兼容状态 | 说明 |
|--------|--------|---------|------|
| /global/* | 6 | ✅ 规划完成 | 广播/聚合策略 |
| /project/* | 4 | ✅ 规划完成 | 聚合/主后端策略 |
| /session/* | 26 | ✅ 规划完成 | 会话路由策略 |
| /provider/* | 4 | ✅ 规划完成 | 聚合策略 |
| /file/* | 6 | ✅ 规划完成 | 当前项目策略 |
| /config/* | 3 | ✅ 规划完成 | 主后端策略 |
| /agent | 1 | ✅ 规划完成 | 聚合策略 |
| /command | 1 | ✅ 规划完成 | 聚合策略 |
| /lsp | 1 | ✅ 规划完成 | 当前项目策略 |
| /formatter | 1 | ✅ 规划完成 | 当前项目策略 |
| /mcp/* | 9 | ✅ 规划完成 | 当前项目策略 |
| /event | 1 | ✅ 规划完成 | SSE 聚合策略 |
| /instance/* | 9 | ✅ 规划完成 | 当前项目策略 |
| /pty/* | 7 | ✅ 规划完成 | 当前项目策略 |
| /tui/* | 12 | ✅ 规划完成 | 当前项目策略 |
| /experimental/* | 9 | ✅ 规划完成 | 当前项目策略 |
| /permission/* | 4 | ✅ 规划完成 | 当前项目策略 |
| /question/* | 3 | ✅ 规划完成 | 当前项目策略 |
| /sync/* | 3 | ✅ 规划完成 | 当前项目策略 |

### 5.2 扩展端点（/x/*）

| 端点 | 状态 | 说明 |
|------|------|------|
| GET /x/backends | ✅ 规划完成 | 所有后端状态 |
| GET /x/routes | ✅ 规划完成 | 会话路由表 |
| GET /x/sse | ✅ 规划完成 | SSE 连接状态 |
| GET /health | ✅ 规划完成 | 聚合服务健康 |

## 6. 数据模型完成情况

| 类型 | 状态 | 来源 |
|------|------|------|
| Session | ✅ 已定义 | 复用 opencode SDK |
| Message | ✅ 已定义 | 复用 opencode SDK |
| Part | ✅ 已定义 | 复用 opencode SDK |
| Provider | ✅ 已定义 | 复用 opencode SDK |
| Config | ✅ 已定义 | 复用 opencode SDK |
| Agent | ✅ 已定义 | 复用 opencode SDK |
| Project | ✅ 已定义 | 复用 opencode SDK |
| Permission | ✅ 已定义 | 复用 opencode SDK |
| Todo | ✅ 已定义 | 复用 opencode SDK |
| Pty | ✅ 已定义 | 复用 opencode SDK |
| McpStatus | ✅ 已定义 | 复用 opencode SDK |
| ServerConfig | ✅ 已定义 | opencode-stack 自定义 |
| ConnectorStatus | ✅ 已定义 | opencode-stack 自定义 |
| HealthInfo | ✅ 已定义 | opencode-stack 自定义 |
| SessionRoute | ✅ 已定义 | opencode-stack 自定义 |
| BackendStatus | ✅ 已定义 | opencode-stack 自定义 |

## 7. 实施进度追踪

### 7.1 当前进度

| 阶段 | 状态 | 完成时间 |
|------|------|---------|
| 规范文档创建 | ✅ 已完成 | 2026-04-22 |
| 源代码骨架 | ✅ 已完成 | - |
| 模块实现 | ⏳ 待开始 | - |

### 7.2 下一步工作

| 任务 | 优先级 | 预计工时 |
|------|--------|---------|
| 创建 001-framework 模块规范 | P1 | 0.5 天 |
| 创建 011-opencode-connector 模块规范 | P0 | 1 天 |
| 创建 101-opencode-api 模块规范 | P0 | 1 天 |
| 实现 001-framework | P0 | 2 天 |
| 实现 011-opencode-connector | P0 | 4 天 |
| 实现 101-opencode-api | P0 | 5 天 |

## 8. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1.0 | 2026-04-22 | 初始规范文档创建完成 |