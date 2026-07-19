# Windborne Web · Next.js 14 应用

> Windborne v2 飞行日志社区的 Web 前端 + API 层

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 框架 | Next.js 14 (App Router) | 14.2.15 |
| 语言 | TypeScript | 5.6.2 |
| 样式 | Tailwind CSS | 3.4.13 |
| 后端 | Supabase (Auth + Postgres + Storage) | - |
| SSR 认证 | @supabase/ssr | 0.5.2 |
| 校验 | Zod | 3.23.8 |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入 Supabase 的 3 个值

# 3. 启动开发服务器
npm run dev
# → http://localhost:3000

# 4. 类型检查
npm run type-check

# 5. 构建
npm run build
```

## 目录结构

```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局（字体 + 元数据）
│   │   ├── page.tsx            # 首页（占位）
│   │   ├── globals.css         # 全局样式（HUD 主题）
│   │   └── api/
│   │       └── auth/           # 模块 02 认证 API
│   │           ├── register/route.ts
│   │           ├── login/route.ts
│   │           ├── logout/route.ts
│   │           └── me/route.ts
│   ├── components/             # 复用组件（待开发）
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # 浏览器端客户端
│   │   │   ├── server.ts       # 服务端客户端（SSR + service）
│   │   │   └── middleware.ts   # session 刷新助手
│   │   ├── auth/
│   │   │   └── validation.ts   # Zod 验证 schema
│   │   └── api-response.ts     # 统一 API 响应工具
│   ├── types/
│   │   └── database.ts         # 数据库类型 + DTO
│   └── middleware.ts           # Next.js 中间件入口
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
└── .env.local.example
```

## 模块对应关系

| 模块 | 目录 | 状态 |
|------|------|------|
| 02 认证 | `src/app/api/auth/` | ✅ |
| 03 用户资料 | `src/app/api/user/` | 待开发 |
| 04 飞行日志 | `src/app/api/flights/` | 待开发 |
| 05 统计 | `src/app/api/stats/` | 待开发 |
| 06 公开广场 | `src/app/api/feed/` | 待开发 |
| 07 数据迁移 | `src/app/api/import/` | 待开发 |
| 08 前端页面 | `src/app/(app)/` | 待开发 |

## 设计规范

- **背景**：`#0B0B10`（OLED 深色）
- **主色**：`#3B82F6`（科技蓝 CTA）
- **字体**：Orbitron（标题）+ Exo 2（正文）+ Roboto Mono（数据）+ Noto Sans SC（中文）
- Tailwind 主题色前缀：`hud-*`（如 `bg-hud-bg`、`text-hud-blue`）

## 环境变量

| 变量 | 用途 | 可见性 |
|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 浏览器 + 服务端 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 匿名公钥 | 浏览器 + 服务端 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥（绕过 RLS） | 仅服务端 |
