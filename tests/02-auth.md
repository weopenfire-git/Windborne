# 模块 02 · 认证（Auth）

> 版本：v1.0  
> 日期：2026-07-19  
> 测试目标：验证用户注册、登录、登出、会话查询功能

---

## 1. 模块概述

基于 Supabase Auth 实现邮箱密码认证，提供注册、登录、登出、获取当前用户 4 个 API 接口。注册时通过数据库触发器自动创建 `public.users` 资料记录，session 通过 `@supabase/ssr` 以 cookie 方式管理，支持 SSR。

---

## 2. 前置条件

### 2.1 依赖模块
- **模块 01 数据库**：必须已完成。`users` 表、`handle_new_user` 触发器、RLS 策略必须就绪。

### 2.2 环境变量
在 `web/.env.local` 中配置以下变量（从 Supabase Dashboard → Project Settings → API 获取）：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # 仅测试数据清理时用
```

### 2.3 Supabase Auth 配置
测试前需在 Supabase Dashboard → Authentication → Sign In / Providers → Email 确认：

| 配置项 | 测试阶段建议 | 说明 |
|--------|-------------|------|
| Confirm email | **关闭**（开发）或 **开启**（完整测试） | 关闭后注册即登录；开启后需邮箱验证码 |
| Allow new users to sign up | 开启 | 允许注册 |

> 建议第一轮测试关闭邮箱验证，验证核心流程；第二轮开启邮箱验证，测试验证码流程。

### 2.4 启动开发服务器

```bash
cd web
npm install
npm run dev
# 服务运行在 http://localhost:3000
```

### 2.5 测试账号准备
测试前准备以下账号（注册接口会自动创建，或用已有账号）：

| 用途 | 邮箱 | 密码 |
|------|------|------|
| 正常用户 A | test-a@example.com | Test1234 |
| 正常用户 B | test-b@example.com | Test1234 |
| 越权测试 | test-evil@example.com | Test1234 |

> 如需清理测试数据：在 Supabase Dashboard → Authentication → Users 删除测试用户，或用 service_role key 调用 Admin API。

---

## 3. 数据模型

### 3.1 auth.users（Supabase 内置）
认证用户表，由 Supabase 管理，不直接操作。

### 3.2 public.users（业务用户资料表）
注册时由触发器 `handle_new_user` 自动创建：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | = auth.users.id |
| email | TEXT | 注册邮箱 |
| username | TEXT | 自动生成：`email前缀_uuid前4位` |
| nickname | TEXT | 注册时传入，或 email 前缀 |
| avatar_url | TEXT? | 头像 URL |
| bio | TEXT | 简介，默认空 |
| role | TEXT | 角色：member / verified_aviator / admin |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### 3.3 认证流程

```
注册请求
  ↓
supabase.auth.signUp(email, password, { data: { nickname } })
  ↓
auth.users 创建记录
  ↓
触发器 on_auth_user_created → handle_new_user()
  ↓
public.users 创建记录（username 自动生成）
  ↓
返回 user + profile（session 取决于邮箱验证设置）
```

---

## 4. 接口清单

### 4.1 注册

- **端点**: `POST /api/auth/register`
- **认证**: 不需要
- **Content-Type**: `application/json`

**请求参数**:

| 字段 | 类型 | 必填 | 规则 | 说明 |
|------|------|------|------|------|
| email | string | 是 | 合法邮箱格式，≤255 字符 | 注册邮箱 |
| password | string | 是 | 8-72 位，含字母和数字 | 密码 |
| nickname | string | 否 | 1-30 字符 | 昵称，不传则用邮箱前缀 |

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-a@example.com",
    "password": "Test1234",
    "nickname": "测试飞友A"
  }'
```

**成功响应** (HTTP 201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "test-a@example.com"
    },
    "profile": {
      "id": "a1b2c3d4-...",
      "username": "test-a_a1b2",
      "nickname": "测试飞友A",
      "avatar_url": null,
      "bio": "",
      "role": "member",
      "created_at": "2026-07-19T..."
    },
    "sessionEstablished": true,
    "emailConfirmationRequired": false
  }
}
```

**错误响应**:
| HTTP | code | 场景 |
|------|------|------|
| 422 | VALIDATION_ERROR | 邮箱格式错/密码不合规/nickname 超长 |
| 400 | AUTH_ERROR | 邮箱已注册 |

---

### 4.2 登录

- **端点**: `POST /api/auth/login`
- **认证**: 不需要
- **Content-Type**: `application/json`

**请求参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 注册邮箱 |
| password | string | 是 | 密码 |

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-a@example.com",
    "password": "Test1234"
  }'
```

**成功响应** (HTTP 200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "test-a@example.com"
    },
    "profile": {
      "id": "a1b2c3d4-...",
      "username": "test-a_a1b2",
      "nickname": "测试飞友A",
      "avatar_url": null,
      "bio": "",
      "role": "member",
      "created_at": "2026-07-19T..."
    }
  }
}
```

> 登录成功后，响应会自动设置 `sb-xxx-auth-token` cookie，后续请求需携带此 cookie。

**错误响应**:
| HTTP | code | 场景 |
|------|------|------|
| 422 | VALIDATION_ERROR | 参数缺失/格式错 |
| 401 | UNAUTHORIZED | 邮箱未验证/密码错误/用户不存在 |

---

### 4.3 登出

- **端点**: `POST /api/auth/logout`
- **认证**: 需要（但未登录也不报错）
- **Content-Type**: 无（空 body 即可）

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: sb-xxx-auth-token=..."
```

**成功响应** (HTTP 200):
```json
{
  "success": true,
  "data": {
    "loggedOut": true
  }
}
```

> 登出后 cookie 被清除。

---

### 4.4 获取当前用户

- **端点**: `GET /api/auth/me`
- **认证**: 需要

**请求示例**:
```bash
curl http://localhost:3000/api/auth/me \
  -H "Cookie: sb-xxx-auth-token=..."
```

**成功响应** (HTTP 200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "test-a@example.com"
    },
    "profile": {
      "id": "a1b2c3d4-...",
      "username": "test-a_a1b2",
      "nickname": "测试飞友A",
      "avatar_url": null,
      "bio": "",
      "role": "member",
      "created_at": "2026-07-19T..."
    }
  }
}
```

**错误响应**:
| HTTP | code | 场景 |
|------|------|------|
| 401 | UNAUTHORIZED | 未登录/session 过期 |

---

## 5. 测试用例

### 5.1 正常流程

- [ ] **TC-001** 注册新用户（含 nickname）  
  请求: `POST /api/auth/register` `{ email: "test-a@example.com", password: "Test1234", nickname: "测试飞友A" }`  
  预期: HTTP 201，返回 success=true，data.user.id 非空，data.profile.nickname="测试飞友A"，data.profile.role="member"

- [ ] **TC-002** 注册新用户（不含 nickname）  
  请求: `POST /api/auth/register` `{ email: "test-b@example.com", password: "Test1234" }`  
  预期: HTTP 201，data.profile.nickname="test-b"（邮箱前缀）

- [ ] **TC-003** 登录已注册用户  
  请求: `POST /api/auth/login` `{ email: "test-a@example.com", password: "Test1234" }`  
  预期: HTTP 200，返回 success=true，data.profile 非空，响应头包含 Set-Cookie

- [ ] **TC-004** 获取当前登录用户  
  前置: 用 TC-003 返回的 cookie  
  请求: `GET /api/auth/me` 携带 cookie  
  预期: HTTP 200，data.user.email="test-a@example.com"，data.profile 非空

- [ ] **TC-005** 登出  
  前置: 已登录  
  请求: `POST /api/auth/logout` 携带 cookie  
  预期: HTTP 200，data.loggedOut=true，响应头包含清除 cookie 的 Set-Cookie

- [ ] **TC-006** 登出后再获取当前用户  
  前置: TC-005 后  
  请求: `GET /api/auth/me` 携带旧 cookie  
  预期: HTTP 401，success=false，error.code="UNAUTHORIZED"

- [ ] **TC-007** 注册时 username 自动生成且唯一  
  预期: TC-001 和 TC-002 的 profile.username 不同，格式为 `邮箱前缀_4位字符`

- [ ] **TC-008** 数据库触发器创建 public.users 记录  
  预期: 注册后直接查询数据库 `SELECT * FROM public.users WHERE email='test-a@example.com'` 能查到记录

### 5.2 边界测试

- [ ] **TC-101** 密码恰好 8 位（最小长度）  
  请求: password="Test1234"  
  预期: 注册成功 HTTP 201

- [ ] **TC-102** 密码恰好 72 位（最大长度）  
  请求: password="Aa1"+"x"*69  
  预期: 注册成功 HTTP 201

- [ ] **TC-103** nickname 恰好 30 字符  
  预期: 注册成功

- [ ] **TC-104** 邮箱含子地址（plus addressing）  
  请求: email="test+a@example.com"  
  预期: 按 Supabase 默认行为处理（通常视为不同邮箱）

- [ ] **TC-105** 连续注册多个用户，username 均不重复  
  预期: 每个用户的 username 都不同

### 5.3 异常测试

- [ ] **TC-201** 注册时邮箱为空  
  请求: `{ email: "", password: "Test1234" }`  
  预期: HTTP 422，error.code="VALIDATION_ERROR"

- [ ] **TC-202** 注册时邮箱格式错误  
  请求: `{ email: "not-an-email", password: "Test1234" }`  
  预期: HTTP 422，error.code="VALIDATION_ERROR"

- [ ] **TC-203** 注册时密码过短（7 位）  
  请求: password="Test123"  
  预期: HTTP 422，error.message 包含"至少 8 位"

- [ ] **TC-204** 注册时密码无数字  
  请求: password="TestTest"  
  预期: HTTP 422，error.message 包含"数字"

- [ ] **TC-205** 注册时密码无字母  
  请求: password="12345678"  
  预期: HTTP 422，error.message 包含"字母"

- [ ] **TC-206** 注册时 nickname 超长（31 字符）  
  预期: HTTP 422，error.message 包含"30"

- [ ] **TC-207** 重复注册同一邮箱  
  前置: test-a@example.com 已注册  
  请求: 再次注册相同邮箱  
  预期: HTTP 400，error.code="AUTH_ERROR"

- [ ] **TC-208** 登录时密码错误  
  请求: `{ email: "test-a@example.com", password: "WrongPass1" }`  
  预期: HTTP 401，error.code="UNAUTHORIZED"

- [ ] **TC-209** 登录不存在的邮箱  
  请求: `{ email: "nobody@example.com", password: "Test1234" }`  
  预期: HTTP 401

- [ ] **TC-210** 请求体非 JSON  
  请求: Content-Type=text/plain, body="hello"  
  预期: HTTP 422，error.message="请求体不能为空"

- [ ] **TC-211** 请求体缺少字段  
  请求: `{ email: "test-a@example.com" }`（无 password）  
  预期: HTTP 422

- [ ] **TC-212** 未登录访问 /api/auth/me  
  请求: 不携带 cookie  
  预期: HTTP 401

### 5.4 安全测试

- [ ] **TC-301** 登录后 cookie 为 httpOnly  
  预期: 响应的 Set-Cookie 包含 HttpOnly 标志（无法通过 JS 读取）

- [ ] **TC-302** 密码不出现在任何响应中  
  预期: 注册、登录、me 接口的响应均不包含 password 字段

- [ ] **TC-303** 用户 A 的 session 不能操作用户 B 的数据  
  前置: 用户 A 登录  
  操作: 用 A 的 cookie 尝试 `SELECT * FROM flights WHERE user_id=B的id`  
  预期: RLS 阻止，返回空或报错（此测试依赖模块 04，此处仅验证 RLS 对 users 表生效）

- [ ] **TC-304** 用户 A 不能修改用户 B 的 profile  
  前置: 用户 A 登录  
  操作: 用 A 的 cookie 通过 Supabase 客户端尝试 update users where id=B的id  
  预期: RLS 阻止，返回错误或 0 行受影响

- [ ] **TC-305** 密码含特殊字符和空格  
  请求: password="Test 1234!@#"  
  预期: 注册成功（只要满足 8 位+字母+数字）

- [ ] **TC-306** SQL 注入尝试  
  请求: email="test@example.com'; DROP TABLE users;--"  
  预期: HTTP 422（邮箱格式校验拦截）或 Supabase 参数化查询安全处理

- [ ] **TC-307** session 过期后访问受保护接口  
  操作: 用过期 cookie 访问 /api/auth/me  
  预期: HTTP 401

### 5.5 邮箱验证流程（可选，第二轮测试）

> 仅当 Supabase 开启 "Confirm email" 时执行

- [ ] **TC-401** 注册后 session 为空  
  预期: data.sessionEstablished=false，data.emailConfirmationRequired=true

- [ ] **TC-402** 未验证邮箱直接登录  
  预期: HTTP 401，提示需要验证邮箱

- [ ] **TC-403** 验证邮箱后登录  
  操作: 在 Supabase Dashboard 手动确认用户，或通过邮件链接  
  预期: 登录成功 HTTP 200

---

## 6. 验收标准

- [ ] 所有正常用例（TC-001 ~ TC-008）PASS
- [ ] 所有安全用例（TC-301 ~ TC-307）PASS
- [ ] 关键异常用例（TC-201, TC-203, TC-207, TC-208, TC-212）PASS
- [ ] 无控制台错误（服务端 + 客户端）
- [ ] 注册后数据库 public.users 表有对应记录
- [ ] 登录后 cookie 正确设置，登出后 cookie 清除
- [ ] RLS 策略对 users 表生效（用户只能读写自己的记录）

---

## 7. 测试报告格式

测试完成后，按以下格式输出报告：

```markdown
## 测试报告 · 模块 02 认证

### 测试环境
- 时间: 2026-07-19 23:xx
- 测试人: 测试AI
- 环境: local (http://localhost:3000)
- Supabase 项目: windborne (Singapore)
- 邮箱验证: 关闭

### 测试结果
| 用例 | 状态 | 实际结果 |
|------|------|----------|
| TC-001 | PASS | - |
| TC-002 | PASS | - |
| TC-003 | FAIL | 实际返回 500，错误信息: xxx |
| ... | ... | ... |

### 问题汇总
1. TC-003: 请求 /api/auth/login 返回 500
   复现步骤: curl -X POST http://localhost:3000/api/auth/login ...
   响应体: {"success":false,"error":{"code":"SERVER_ERROR","message":"服务器内部错误"}}
   服务端日志: [auth/login] error: ...

### 结论
- 通过率: 28/30 (93%)
- 阻塞问题: 1 个
- 建议: 修复 TC-003 后重新测试
```

---

## 8. 相关文件

| 文件 | 说明 |
|------|------|
| `web/src/app/api/auth/register/route.ts` | 注册 API |
| `web/src/app/api/auth/login/route.ts` | 登录 API |
| `web/src/app/api/auth/logout/route.ts` | 登出 API |
| `web/src/app/api/auth/me/route.ts` | 获取当前用户 API |
| `web/src/lib/auth/validation.ts` | Zod 验证 schema |
| `web/src/lib/supabase/server.ts` | 服务端 Supabase 客户端 |
| `web/src/lib/supabase/middleware.ts` | Middleware session 刷新 |
| `web/src/middleware.ts` | Next.js Middleware 入口 |
| `web/src/types/database.ts` | 类型定义 |
| `migrations/004_init_triggers.sql` | handle_new_user 触发器 |
| `migrations/003_init_rls.sql` | RLS 策略 |

---

_本文档是模块 02 的接口契约和测试规范，测试 AI 照此执行即可。_
