# specs/ - 规范文档索引

> 项目: opencode-stack
> 版本: v0.1.0
> 日期: 2026-04-22

## 1. 文档介绍

本目录包含 opencode-stack 项目的完整规范文档，涵盖架构设计、API 规范、数据模型、技术方案等。

**核心目标**：为 opencode 服务器聚合服务提供完整的开发规范，确保北向接口与 opencode 100% 兼容。

## 2. 文档结构

### 2.1 根目录文档

| 文件 | 说明 | 状态 |
|------|------|------|
| [README.md](README.md) | 本文档，规范文档索引 | ✅ |
| [SPECS_CHECKLIST.md](SPECS_CHECKLIST.md) | 功能模块规格完成情况检查清单 | ✅ |
| [STRUCTURE.md](STRUCTURE.md) | 项目目录文件结构 | ✅ |
| [API.md](API.md) | 全局 API 清单（91 个端点） | ✅ |
| [TECH.md](TECH.md) | 技术选型 | ✅ |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 整体架构（三层设计） | ✅ |
| [constitution.md](constitution.md) | 宪法原则（10 条） | ✅ |
| [overall-spec.md](overall-spec.md) | 整体规格文档 | ✅ |
| [overall-plan.md](overall-plan.md) | 整体技术方案 | ✅ |
| [overall-data-model.md](overall-data-model.md) | 数据模型 | ✅ |
| [overall-api.md](overall-api.md) | 对外接口模型 | ✅ |

### 2.2 模块规范

| 目录 | 模块名称 | 包含文件 | 状态 |
|------|---------|---------|------|
| [001-framework](001-framework/) | 整体框架 | spec.md, plan.md | ⏳ |
| [011-opencode-connector](011-opencode-connector/) | 南向 OpenCode 连接器 | spec.md, plan.md, data-model.md, api.md | ⏳ |
| [101-opencode-api](101-opencode-api/) | 北向 OpenCode API | spec.md, plan.md, api.md | ⏳ |

## 3. 阅读顺序

建议按以下顺序阅读：

1. **[constitution.md](constitution.md)** - 了解项目原则（接口兼容、透明代理、连接隔离等）
2. **[overall-spec.md](overall-spec.md)** - 了解整体规格（功能模块、约束条件）
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - 了解系统架构（三层设计）
4. **[TECH.md](TECH.md)** - 了解技术选型（TypeScript、Express、Zod）
5. **[overall-api.md](overall-api.md)** - 了解对外接口模型（路由策略）
6. **[overall-data-model.md](overall-data-model.md)** - 了解数据模型（Session、Message、Provider）
7. **[API.md](API.md)** - 查看 API 端点清单
8. **[overall-plan.md](overall-plan.md)** - 了解实施计划
9. **[STRUCTURE.md](STRUCTURE.md)** - 了解目录结构
10. **各模块 spec.md** - 了解模块详细规格
11. **各模块 plan.md** - 了解模块实施计划

## 4. 项目概述

### 4.1 什么是 opencode-stack？

opencode-stack 是 **opencode 服务器的聚合服务程序**：

- **南向**：聚合连接多个 opencode 服务器实例（Local、Remote、Docker、K8s）
- **北向**：提供与 opencode 完全兼容的统一服务接口

### 4.2 核心价值

| 价值 | 说明 |
|------|------|
| 统一接入点 | 客户端只需连接一个地址，无需管理多个 opencode 实例 |
| 负载均衡 | 新会话自动分发到不同后端实例 |
| 故障隔离 | 单个后端故障不影响整体服务 |
| 透明代理 | 客户端无感知，完全兼容现有 SDK |

### 4.3 架构图

```
客户端 (Client)
    |
    v
+--------------------------+
|    opencode-stack        |  <-- 北向接口（端口 4099）
|                          |
|  [认证] [路由] [代理]    |
|  [会话管理] [健康检查]   |
+------------+-------------+
             |
    +--------+--------+--------+
    |        |        |        |
    v        v        v        v
+------+ +------+ +------+ +------+
| OC-1 | | OC-2 | | OC-3 | | OC-N |  <-- 南向连接（多个 opencode 实例）
+------+ +------+ +------+ +------+
```

## 5. 功能模块

### 5.1 当前版本设计模块

| 模块 | 说明 |
|------|------|
| 001-framework | Express 初始化、中间件、配置加载 |
| 011-opencode-connector | 连接器接口、Local/Remote 实现、健康检查 |
| 101-opencode-api | 路由策略、端点实现、SSE 聚合 |

### 5.2 后续版本规划模块

| 模块 | 版本 | 说明 |
|------|------|------|
| Docker Connector | v0.2+ | Docker 容器部署 |
| K8s Connector | v0.3+ | Kubernetes 部署 |
| 用户管理 | v0.3+ | 用户注册、登录 |
| 用户鉴权 | v0.3+ | 统一认证 |
| CLI 工具 | v0.2+ | 命令行管理 |

## 6. API 兼容性

### 6.1 opencode 端点兼容情况

| 端点组 | 端点数 | 兼容状态 |
|--------|--------|---------|
| Global Routes | 6 | ✅ |
| Project Routes | 4 | ✅ |
| Session Routes | 26 | ✅ |
| Provider Routes | 4 | ✅ |
| File Routes | 6 | ✅ |
| Config Routes | 3 | ✅ |
| MCP Routes | 9 | ✅ |
| TUI Routes | 12 | ✅ |
| Experimental Routes | 9 | ✅ |
| PTY Routes | 7 | ✅ |
| Instance Routes | 9 | ✅ |
| **总计** | **91** | **100% 兼容** |

### 6.2 opencode-stack 扩展端点

| 端点 | 说明 |
|------|------|
| GET /x/backends | 所有后端状态 |
| GET /x/routes | 会话路由表 |
| GET /x/sse | SSE 连接状态 |
| GET /health | 聚合服务健康 |

## 7. 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | ^5.7.3 | 开发语言，严格模式 |
| Node.js | >= 20 | 运行时环境 |
| Express | ^4.21.2 | Web 框架 |
| Zod | ^3.24.2 | 数据校验 |
| YAML | ^2.7.0 | 配置解析 |

## 8. 配置文件格式

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
```

## 9. 快速开始

### 9.1 安装依赖

```bash
npm install
```

### 9.2 开发模式

```bash
npm run dev
# 访问 http://localhost:4099
```

### 9.3 构建

```bash
npm run build
npm run start
```

## 10. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1.0 | 2026-04-22 | 初始版本，完成规范文档 |