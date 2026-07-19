# Windborne 飞行日志社区 · 技术架构设计文档（TDD）

> 版本：v1.0  
> 日期：2026-07-19  
> 作者：王英明 / 小扶  
> 状态：规划中

---

## 1. 技术栈选型

### 1.1 选型决策

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 前端框架 | Next.js | 14+ (App Router) | SSR + API Routes 一体化，SEO 友好，与 Synaptic House 技术栈一致 |
| 语言 | TypeScript | 5.x | 类型安全，降低运行时错误 |
| UI 库 | 自研组件 + Tailwind CSS | 3.x | 延续 flight-log 的 HUD 风格，Tailwind 提升开发效率 |
| 后端 BaaS | Supabase | 免费档 | Postgres + Auth + Storage 一体化，RLS 权限完善 |
| 数据库 | PostgreSQL | 15 (Supabase) | 支持 JSONB、pgvector、行级权限 |
| 文件存储 | Supabase Storage | 免费档 1GB | 与数据库同源，权限统一管理 |
| 认证 | Supabase Auth | - | 邮箱+OAuth，JWT token，开箱即用 |
| 部署 | Cloudflare Pages | 免费档 | 全球 CDN，国内访问优于 Vercel |
| 包管理 | pnpm | 9.x | 快、省磁盘空间 |
| 版本控制 | Git + GitHub | - | 已有 weopenfire-git/Windborne 仓库 |

### 1.2 备选方案对比

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| Next.js + Supabase + Vercel | 与 Synaptic House 一致 | 国内访问不稳定 | ❌ 放弃 |
| Next.js + Supabase + Cloudflare Pages | 免费、国内访问较好 | 需适配 Edge Runtime | ✅ 采用 |
| Next.js + MemFire Cloud | 国内访问稳定 | 需实名认证、生态较小 | ⏸ P1 备选迁移方案 |
| Discourse + 静态站 | 论坛功能开箱即用 | 重量级、风格不统一、需 VPS | ❌ 放弃 |
| Vue + Firebase | 国内访问差 | - | ❌ 放弃 |

### 1.3 不选 Vercel 的原因

Vercel 免费档国内访问不稳定，部分地区 DNS 污染严重。Cloudflare Pages 走全球 Anycast 网络，国内访问虽偶有波动但整体优于 Vercel，且免费档无流量限制。

---

## 2. 系统架构

### 2.1 整体架构图

```
┌──────────────────────────────────────────────────────┐
│                     用户浏览器                         │
│              (桌面 / 移动端 PWA)                       │
└──────────────────┬───────────────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────────────┐
│              Cloudflare Pages (CDN)                   │
│         全球 Anycast 节点 · 免费 · 不备案              │
│                                                      │
│   ┌────────────────────────────────────────────┐    │
│   │          Next.js 14 应用                    │    │
│   │  ┌────────────┐  ┌────────────────────┐   │    │
│   │  │  SSR 页面  │  │  API Routes (Edge) │   │    │
│   │  │  (React)   │  │  后端业务逻辑       │   │    │
│   │  └────────────┘  └────────────────────┘   │    │
│   └────────────────────────────────────────────┘    │
└──────┬───────────────┬───────────────┬───────────────┘
       │               │               │
       ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Supabase   │  │ Supabase   │  │ Supabase   │
│ Postgres   │  │ Auth       │  │ Storage    │
│            │  │            │  │            │
│ - users    │  │ - 邮箱登录  │  │ - 机票图片  │
│ - flights  │  │ - GitHub   │  │ - 拍机作品  │
│ - posts    │  │   OAuth    │  │ - 头像      │
│ - comments │  │ - JWT      │  │ - 附件      │
│ - follows  │  │            │  │            │
│            │  │            │  │            │
│ RLS 行级   │  │            │  │ 公开/私有   │
│ 权限控制    │  │            │  │ Bucket     │
└────────────┘  └────────────┘  └────────────┘
   免费档          免费档          免费档 1GB
   500MB                         可迁 R2
```

### 2.2 数据流

#### 2.2.1 页面渲染流（SSR）

```
用户请求 → Cloudflare CDN 缓存命中?
  ├─ 是 → 直接返回静态内容
  └─ 否 → Next.js SSR
          ├─ 公开页面 → 查询 Supabase (anon key) → 渲染 HTML
          └─ 私有页面 → 验证 JWT → 查询 Supabase (user key) → 渲染 HTML
```

#### 2.2.2 数据写入流

```
用户操作 → 客户端验证 → Supabase JS Client
  ├─ 带 JWT → RLS 校验 → 写入 Postgres
  └─ 无 JWT → RLS 拒绝 → 返回 401
```

#### 2.2.3 图片上传流

```
用户选图 → 客户端压缩（≤ 1MB）→ Supabase Storage
  ├─ 上传成功 → 返回 public URL → 写入 flights.tickets
  └─ 上传失败 → 提示重试
```

---

## 3. 前端架构

### 3.1 目录结构

```
windborne/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx               # 根布局（导航、星空背景）
│   ├── page.tsx                 # 首页（未登录=介绍页，已登录=仪表盘）
│   ├── (auth)/                  # 认证路由组
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (app)/                   # 主应用路由组（需登录）
│   │   ├── flights/
│   │   │   ├── page.tsx         # 我的飞行日志列表
│   │   │   ├── new/page.tsx     # 新增航程
│   │   │   ├── [id]/page.tsx    # 航程详情
│   │   │   └── [id]/edit/page.tsx
│   │   ├── feed/
│   │   │   └── page.tsx         # 公开广场
│   │   ├── map/
│   │   │   └── page.tsx         # 飞行地图
│   │   ├── stats/
│   │   │   └── page.tsx         # 数据统计
│   │   └── settings/
│   │       └── page.tsx         # 设置（头像/昵称/数据导入）
│   ├── u/[username]/            # 用户公开主页（P1）
│   └── api/                     # API Routes
│       ├── auth/
│       ├── flights/
│       └── upload/
├── components/
│   ├── ui/                      # 基础组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   ├── flight/                  # 飞行日志组件
│   │   ├── FlightCard.tsx       # 航程卡片（登机牌样式）
│   │   ├── FlightForm.tsx       # 航程表单
│   │   ├── TicketUploader.tsx   # 机票上传
│   │   └── StatsPanel.tsx       # 统计仪表盘
│   ├── feed/                    # 广场组件
│   │   ├── FeedList.tsx
│   │   └── FeedItem.tsx
│   └── layout/                  # 布局组件
│       ├── Navbar.tsx
│       ├── StarfieldBg.tsx      # 星空背景
│       └── HudFrame.tsx         # HUD 边框
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # 浏览器端 client
│   │   ├── server.ts            # 服务端 client
│   │   └── middleware.ts        # Auth middleware
│   ├── utils/
│   │   ├── distance.ts          # 机场距离计算
│   │   ├── image.ts             # 图片压缩
│   │   └── icao.ts              # ICAO 代码工具
│   └── constants/
│       ├── airlines.ts          # 航司代码表
│       └── aircraft.ts          # 机型代码表
├── types/
│   ├── database.ts              # Supabase 生成的类型
│   └── flight.ts                # 业务类型
├── migrations/                  # SQL 迁移文件
│   ├── 001_init.sql
│   ├── 002_rls.sql
│   └── 003_indexes.sql
├── public/
│   ├── fonts/                   # Orbitron, Exo, Roboto Mono
│   └── images/
├── styles/
│   └── globals.css              # 全局样式 + CSS 变量
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### 3.2 设计系统

延续 flight-log 的 HUD 驾驶舱风格：

```css
:root {
  /* 色彩 */
  --bg-primary: #0B0B10;         /* OLED 深色背景 */
  --bg-secondary: #14141F;       /* 卡片背景 */
  --bg-tertiary: #1C1C2A;        /* 悬浮层 */
  --accent-blue: #3B82F6;        /* 科技蓝 CTA */
  --accent-cyan: #06B6D4;        /* 数据高亮 */
  --accent-amber: #F59E0B;       /* 警示/重要 */
  --text-primary: #F8FAFC;       /* 主文本 */
  --text-secondary: #94A3B8;     /* 次文本 */
  --text-tertiary: #64748B;      /* 提示文本 */
  --border-glow: rgba(59, 130, 246, 0.3);
  
  /* 字体 */
  --font-display: 'Orbitron', sans-serif;      /* 标题 */
  --font-body: 'Exo 2', sans-serif;            /* 正文 */
  --font-mono: 'Roboto Mono', monospace;       /* 数据 */
  --font-cn: 'Noto Sans SC', sans-serif;       /* 中文 */
  
  /* 圆角 */
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

### 3.3 关键组件设计

#### 3.3.1 FlightCard（航程卡片）

登机牌样式，展示：
- 航班号 + 航司 logo
- 出发 → 到达（ICAO + 城市名）
- 起飞/到达时间
- 机型 + 注册号
- 座位号 + 舱位
- 公开/私有标识

#### 3.3.2 StatsPanel（统计仪表盘）

四个 HUD 仪表：
- 飞行次数（数字 + 进度条）
- 飞行时长（小时:分钟）
- 飞行距离（公里）
- 到访机场数（数字 + 地图缩略图）

#### 3.3.3 StarfieldBg（星空背景）

Canvas 粒子动画，200 颗星星缓慢移动，性能优化：
- requestAnimationFrame
- 离屏 Canvas
- 可见性检测（非可见时暂停）

---

## 4. 后端架构

### 4.1 Supabase 配置

#### 4.1.1 项目配置

- **Region**: 新加坡（ap-southeast-1，离中国最近）
- **Database**: PostgreSQL 15
- **Auth**: 邮箱 + GitHub OAuth
- **Storage**: 2 个 bucket
  - `avatars`：公开读，登录写
  - `tickets`：私有读（需登录），登录写

#### 4.1.2 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # 仅服务端
```

### 4.2 认证流程

```
注册:
  用户输入邮箱+密码 → Supabase Auth.signUp
  → 发送确认邮件 → 用户点击确认链接
  → 自动登录 → 创建 users 记录 → 跳转首页

登录:
  用户输入邮箱+密码 → Supabase Auth.signInWithPassword
  → 返回 JWT → 存入 httpOnly cookie
  → 中间件校验 JWT → 渲染页面

登出:
  Auth.signOut → 清除 cookie → 跳转首页
```

#### 4.2.1 Middleware 实现

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => response.cookies.set(name, value, options),
        remove: (name) => response.cookies.delete(name),
      },
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // 保护 /(app) 路由
  if (!session && request.nextUrl.pathname.startsWith('/flights')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return response
}
```

### 4.3 API 设计

P0 阶段主要用 Supabase JS Client 直接操作（RLS 保护），少量复杂逻辑走 API Routes：

| 端点 | 方法 | 功能 | 认证 |
|------|------|------|------|
| `/api/flights` | GET | 获取我的飞行日志 | 必须 |
| `/api/flights` | POST | 新增飞行日志 | 必须 |
| `/api/flights/[id]` | PUT | 更新飞行日志 | 必须+所有者 |
| `/api/flights/[id]` | DELETE | 删除飞行日志 | 必须+所有者 |
| `/api/feed` | GET | 获取公开广场信息流 | 可选 |
| `/api/upload/ticket` | POST | 上传机票图片 | 必须 |
| `/api/import` | POST | 从 localStorage 导入数据 | 必须 |
| `/api/stats` | GET | 获取统计数据 | 必须 |

---

## 5. 文件存储设计

### 5.1 Bucket 规划

| Bucket | 访问权限 | 用途 | 限制 |
|--------|----------|------|------|
| `avatars` | 公开读 / 登录写 | 用户头像 | ≤ 500KB, jpg/png/webp |
| `tickets` | 登录读 / 所有者写 | 机票照片 | ≤ 5MB, jpg/png/webp |
| `posts` (P1) | 公开读 / 登录写 | 帖子图片 | ≤ 5MB, jpg/png/webp |

### 5.2 文件命名规范

```
avatars/{user_id}.webp
tickets/{user_id}/{flight_id}/{timestamp}.webp
posts/{user_id}/{post_id}/{timestamp}.webp
```

### 5.3 图片处理

客户端上传前压缩：
- 头像：裁剪为 256x256，转 webp，≤ 100KB
- 机票：长边 ≤ 1920px，转 webp，≤ 500KB
- 帖子图：长边 ≤ 2048px，转 webp，≤ 800KB

使用 `browser-image-compression` 库。

---

## 6. 部署方案

### 6.1 部署架构

```
开发流程:
  本地开发 → git push origin main
  → Cloudflare Pages 自动构建
  → 部署到全球 CDN
  → 用户访问

Supabase:
  数据库 + Auth + Storage 在 Supabase 云端
  免费档，无需维护
```

### 6.2 Cloudflare Pages 配置

```toml
# .cloudflare/pages.toml
name = "windborne"
compatibility_date = "2024-09-01"
pages_build_output_dir = ".next/static"

[build]
command = "pnpm build"
cwd = "."

[vars]
NEXT_PUBLIC_SUPABASE_URL = "https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJxxx"
```

### 6.3 环境策略

| 环境 | 用途 | URL |
|------|------|-----|
| 本地 | 开发调试 | localhost:3000 |
| Preview | 功能测试 | windborne-preview.pages.dev |
| Production | 线上 | windborne.pages.dev |

### 6.4 CI/CD

- `main` 分支 push → 自动部署 Production
- 其他分支 push → 自动部署 Preview
- PR 自动生成预览链接

### 6.5 域名规划

- **P0**: 使用 `windborne.pages.dev`（Cloudflare 默认）
- **P1+**: 绑定自定义域名（如 `windborne.fly` 或 `flylog.cn`）
- **正式运营**: 国内备案后绑定 `.cn` 域名 + 国内 CDN

---

## 7. 性能优化

### 7.1 前端优化

- Next.js Image 组件自动优化图片
- 路由级代码分割
- 关键 CSS 内联
- 字体使用 `next/font` 自托管（避免 Google Fonts 国内访问问题）
- 静态生成（SSG）用于公开页面

### 7.2 数据库优化

- 索引：user_id, flight_no, is_public, created_at
- 查询限制：分页（每页 20 条）
- 聚合视图：统计数据用物化视图
- 连接池：Supabase 默认 PgBouncer

### 7.3 CDN 缓存策略

| 资源 | 缓存时间 | 策略 |
|------|----------|------|
| 静态资源（JS/CSS/字体） | 1 年 | 内容哈希命名 |
| 公开页面 | 5 分钟 | ISR 重新验证 |
| 用户私有页面 | 不缓存 | 实时渲染 |
| 图片 | 30 天 | immutable |

---

## 8. 安全设计

### 8.1 RLS 行级权限

所有表启用 RLS，策略见数据模型文档。

### 8.2 输入校验

- 前端：zod schema 校验
- 后端：API Routes 二次校验
- 数据库：CHECK 约束

### 8.3 防滥用

- 注册后 24 小时内限发 5 帖
- 单用户每日上传图片 ≤ 50 张
- API 速率限制：100 次/分钟/用户

### 8.4 敏感数据

- 密码：Supabase Auth bcrypt（不存数据库）
- Service Role Key：仅服务端环境变量，不暴露客户端
- 用户邮箱：默认不公开

---

## 9. 监控与日志

### 9.1 错误监控

- Sentry（免费档 5000 错误/月）
- 前端 JS 错误自动上报
- API Routes 错误日志

### 9.2 分析

- Cloudflare Analytics：流量、性能
- Supabase Dashboard：数据库、存储使用量
- 自建：用户行为埋点（PostHog 自托管，P1 引入）

### 9.3 告警

- Supabase 数据库使用量 ≥ 80% 告警
- Cloudflare Pages 构建失败告警
- Sentry 关键错误告警

---

## 10. 迁移路径

### 10.1 从 flight-log 迁移

现有 flight-log 是纯前端 + localStorage，迁移步骤：

1. 用户在旧站导出 JSON（设置页已有功能）
2. 在 Windborne 注册登录
3. 设置页点击「导入旧数据」
4. 上传 JSON 文件
5. 后端解析并写入 Supabase
6. 机票图片：JSON 中的 base64 转存到 Storage

### 10.2 从 Cloudflare 迁移到国内云（如需）

触发条件：
- 国内用户占比 > 70% 且访问投诉多
- 日活 > 50

迁移目标：腾讯云 CloudBase 或阿里云 Serverless

迁移工作量：
- 前端：改部署配置，约 1 天
- 后端：Supabase → MemFire Cloud（API 兼容），约 2 天
- 域名：备案 + 绑定，约 2-3 周

---

_本文档随开发进度持续更新，重大架构变更需同步更新此文档。_
