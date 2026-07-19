# Windborne 测试文档总览

> 本文件夹包含 Windborne 各模块的接口说明和测试用例，供独立 AI 测试工程师使用。

---

## 项目背景

**Windborne** 是一个面向飞友（航空爱好者）的飞行日志社区网站，从纯前端 flight-log 升级为全栈应用。

### 一句话定位

「个人飞行日志 + 动态广场 + 知识库」三层结构的飞友社区。

### 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| 后端 | Supabase（Postgres + Auth + Storage） |
| 部署 | Cloudflare Pages |

### 核心用户

飞友（拍机爱好者）、频繁出差旅客、航空从业者。

### 设计风格

HUD 驾驶舱深色风格：背景 `#0B0B10`、主色 `#3B82F6`、字体 Orbitron + Exo + Roboto Mono + Noto Sans SC。

---

## 模块清单

按依赖顺序开发，每个模块独立交付：

| # | 模块 | 依赖 | 接口文档 | 状态 |
|---|------|------|----------|------|
| 01 | 数据库 | - | [01-database.md](./01-database.md) | ✅ 已完成 |
| 02 | 认证 | 01 | [02-auth.md](./02-auth.md) | ✅ 已完成 |
| 03 | 用户资料 | 01, 02 | [03-user-profile.md](./03-user-profile.md) | ⏳ 待开发 |
| 04 | 飞行日志 | 01, 02 | [04-flights.md](./04-flights.md) | ⏳ 待开发 |
| 05 | 统计 | 01, 04 | [05-stats.md](./05-stats.md) | ⏳ 待开发 |
| 06 | 公开广场 | 01, 04 | [06-feed.md](./06-feed.md) | ⏳ 待开发 |
| 07 | 数据迁移 | 01, 02, 04 | [07-import.md](./07-import.md) | ⏳ 待开发 |
| 08 | 前端页面 | 01-07 | [08-frontend.md](./08-frontend.md) | ⏳ 待开发 |

---

## 测试环境准备

### 必要信息

测试前需要以下环境变量（向项目负责人获取）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # 仅服务端测试用
```

### 启动开发服务器（模块 02 起）

模块 02 之后的接口测试需要运行 Next.js 开发服务器：

```bash
cd web
cp .env.local.example .env.local   # 填入环境变量
npm install
npm run dev                         # http://localhost:3000
```

### 测试账号

P0 阶段需要准备 3 个测试账号：

| 角色 | 邮箱 | 用途 |
|------|------|------|
| 用户 A | `test-a@windborne.test` | 主测试账号 |
| 用户 B | `test-b@windborne.test` | 测试权限隔离 |
| 管理员 | `admin@windborne.test` | 管理功能测试 |

### 测试工具

- **API 测试**：curl / Postman / HTTPie
- **数据库测试**：Supabase Dashboard SQL Editor / psql
- **前端测试**：浏览器手动 + Playwright（P1 引入）

---

## 测试约定

### 每个模块的接口文档包含

1. **模块概述**：做什么、为什么
2. **前置条件**：依赖哪些模块、环境变量
3. **接口清单**：端点、方法、参数、返回值、示例
4. **数据模型**：相关表结构
5. **测试用例**：正常流程 + 边界 + 异常
6. **验收标准**：通过条件

### 测试用例分类

| 类型 | 说明 | 示例 |
|------|------|------|
| **正常** | 预期内的操作 | 用户 A 创建一条飞行日志 |
| **边界** | 极限值或空值 | 机票图片上传 0 张 / 50 张 |
| **异常** | 非法操作 | 用户 A 修改用户 B 的数据 |
| **安全** | 越权 / 注入 | 未登录访问 /flights |

### 测试结果记录

每个测试用例记录：

```
- [ ] 用例名 | 状态: PASS/FAIL | 实际结果: xxx
```

---

## 测试流程

1. 项目负责人交付一个模块的代码 + 接口文档
2. 测试 AI 阅读接口文档和项目背景（本 README + 模块文档）
3. 按测试用例逐项执行
4. 记录结果，FAIL 的写明实际表现
5. 反馈给项目负责人修复
6. 修复后回归测试

---

## 联系人

- **项目负责人**：王英明
- **开发**：小扶（AI）
- **测试**：独立 AI（由英明指定）

---

_本文件随模块交付持续更新，新增模块时在「模块清单」表中补充。_
