# 模块 03 · 用户资料（User Profile）

> 版本：v1.0  
> 日期：2026-07-20  
> 测试目标：验证用户资料查看、修改、头像上传功能

---

## 1. 模块概述

提供当前登录用户资料的查看和修改能力，包含 3 个 API：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/user/profile` | GET | 获取当前用户完整资料 |
| `/api/user/profile` | PUT | 修改昵称/用户名/简介 |
| `/api/user/avatar` | POST | 上传头像图片 |

头像上传至 Supabase Storage `avatars` 公开桶，最大 2MB，支持 JPEG/PNG/WebP/GIF。

---

## 2. 前置条件

### 2.1 依赖模块
- **模块 01 数据库**：`users` 表、RLS 策略必须就绪
- **模块 02 认证**：注册/登录接口可用，session cookie 机制正常

### 2.2 存储桶
- `avatars` 桶已创建（公开读取），RLS 策略：用户只能上传到自己的 `{uid}/` 目录

### 2.3 环境变量

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cjdjtapzkjambtawbfiz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_llk6lUQBQhXP7RCe3miwcw_hzdO69i_
```

### 2.4 启动开发服务器

```bash
cd web
npm run dev
# http://localhost:3000
```

### 2.5 测试账号

测试前先注册并登录至少 2 个不同用户：
- **用户 A**（主测账号）：email 带唯一后缀，如 `test_profile_A_xxx@example.com`
- **用户 B**（抢占用户名用）：`test_profile_B_xxx@example.com`

> 建议在前置步骤中创建，确保 token/session 有效。

---

## 3. 数据模型

### 3.1 users 表（相关字段）

| 字段 | 类型 | 说明 | 修改权限 |
|------|------|------|----------|
| id | UUID | PK，关联 auth.users | 不可修改 |
| email | TEXT | 邮箱 | 不可通过本模块修改 |
| username | TEXT UNIQUE | 用户名，3-20 字符，字母开头 | 可修改，需唯一 |
| nickname | TEXT | 昵称，1-30 字符 | 可修改 |
| avatar_url | TEXT | 头像 URL | 通过上传接口修改 |
| bio | TEXT | 简介，最多 500 字符 | 可修改 |
| role | TEXT | 角色 member/verified_aviator/admin | 不可通过本模块修改 |
| created_at | TIMESTAMPTZ | 注册时间 | 只读 |
| updated_at | TIMESTAMPTZ | 最后更新时间 | 触发器自动 |

### 3.2 RLS 策略

| 策略 | 操作 | 规则 |
|------|------|------|
| users_select_authenticated | SELECT | 所有登录用户可查看 |
| users_update_own | UPDATE | 仅可修改自己的记录 |
| users_insert_own | INSERT | 仅可插入自己的记录 |

### 3.3 avatars 存储桶

| 项 | 值 |
|----|-----|
| 桶名 | avatars |
| 公开 | 是 |
| 大小上限 | 2MB |
| 允许类型 | image/jpeg, image/png, image/webp, image/gif |
| 上传路径 | `{user_id}/{timestamp}.{ext}` |

---

## 4. 接口清单

### 4.1 GET /api/user/profile — 获取当前用户资料

- **认证**：需要（Bearer cookie session）
- **请求参数**：无
- **成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "pilot_zhang",
    "nickname": "小张起飞",
    "avatar_url": "https://...",
    "bio": "热爱飞行",
    "role": "member",
    "created_at": "2026-07-19T12:00:00Z"
  }
}
```
- **未登录响应** (401)：
```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "请先登录" }
}
```

### 4.2 PUT /api/user/profile — 修改用户资料

- **认证**：需要
- **Content-Type**：application/json
- **请求参数**（至少提供一个）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称，1-30 字符，自动 trim |
| username | string | 否 | 用户名，3-20 字符，字母开头，字母数字下划线，需唯一 |
| bio | string | 否 | 简介，最多 500 字符，自动 trim |

- **成功响应** (200)：返回更新后的完整 profile（格式同 GET）
- **错误响应**：
  - 422：验证失败（批量字段错误）
  - 409：用户名已被占用
  - 401：未登录

### 4.3 POST /api/user/avatar — 上传头像

- **认证**：需要
- **Content-Type**：multipart/form-data
- **请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| avatar | File | 是 | 图片文件，≤ 2MB，类型: JPEG/PNG/WebP/GIF |

- **成功响应** (200)：
```json
{
  "success": true,
  "data": { "avatar_url": "https://cjdjtapzkjambtawbfiz.supabase.co/storage/v1/object/public/avatars/{uid}/{timestamp}.jpg" }
}
```
- **错误响应**：
  - 400：文件类型不支持 / 文件过大 / 文件为空 / 缺少文件字段
  - 401：未登录

---

## 5. 测试用例

### 5.1 GET /api/user/profile — 查看资料

#### 正常流程

- [ ] **TC-P001**：已登录用户获取自己资料 | 预期：200，返回完整 profile 含 email
- [ ] **TC-P002**：返回字段包含 id / email / username / nickname / avatar_url / bio / role / created_at | 预期：所有字段存在且类型正确（avatar_url 可为 null）

#### 异常测试

- [ ] **TC-P003**：未登录直接请求 | 预期：401，`code: "UNAUTHORIZED"`
- [ ] **TC-P004**：使用过期/伪造的 session cookie | 预期：401

---

### 5.2 PUT /api/user/profile — 修改资料

#### 正常流程

- [ ] **TC-P101**：更新昵称为"专业飞友小张" | 预期：200，nickname 变为 "专业飞友小张"，其他字段不变
- [ ] **TC-P102**：更新简介为 200 字有效文本 | 预期：200，bio 更新成功
- [ ] **TC-P103**：更新用户名为 "pilot_new"（当前用 A 的旧用户名不变） | 预期：200，username 更新成功
- [ ] **TC-P104**：同时更新昵称 + 简介 + 用户名 | 预期：200，三个字段全部更新
- [ ] **TC-P105**：只更新昵称，username 和 bio 不传 | 预期：200，仅昵称变化
- [ ] **TC-P106**：username 改为与当前用户名相同（无变化） | 预期：200，不触发唯一性检查，更新成功

#### 边界测试

- [ ] **TC-P201**：昵称 = 1 个字符（如 "A"） | 预期：200，更新成功
- [ ] **TC-P202**：昵称 = 30 个字符 | 预期：200，更新成功
- [ ] **TC-P203**：昵称 = 纯中文（如 "专业的飞友"） | 预期：200，更新成功
- [ ] **TC-P204**：昵称前后有空格（如 "  小明  "） | 预期：200，trim 后为 "小明"
- [ ] **TC-P205**：用户名 = 3 个字符（如 "abc"） | 预期：200，更新成功
- [ ] **TC-P206**：用户名 = 20 个字符 | 预期：200，更新成功
- [ ] **TC-P207**：用户名包含下划线和数字（如 "pilot_007"） | 预期：200，更新成功
- [ ] **TC-P208**：bio = 500 个字符 | 预期：200，更新成功

#### 验证异常测试

- [ ] **TC-P301**：昵称 = 空字符串 "" | 预期：422，error 提示昵称不能为空
- [ ] **TC-P302**：昵称 = 31 个字符 | 预期：422，error 提示最多 30 个字符
- [ ] **TC-P303**：用户名 = 2 个字符（如 "ab"） | 预期：422，error 提示至少 3 个字符
- [ ] **TC-P304**：用户名 = 21 个字符 | 预期：422，error 提示最多 20 个字符
- [ ] **TC-P305**：用户名以数字开头（如 "123abc"） | 预期：422，error 提示须以字母开头
- [ ] **TC-P306**：用户名包含中文（如 "pilot_中文"） | 预期：422，error 提示只能含字母数字下划线
- [ ] **TC-P307**：用户名包含特殊字符（如 "pilot@test"） | 预期：422，validation error
- [ ] **TC-P308**：bio = 501 个字符 | 预期：422，error 提示最多 500 字符
- [ ] **TC-P309**：请求体为空 JSON `{}` | 预期：422，error 提示至少需要一个字段
- [ ] **TC-P310**：请求体不是 JSON（纯文本） | 预期：422，验证错误

#### 唯一性测试

- [ ] **TC-P401**：用户 A 的用户名改为用户 B 正在使用的用户名 | 预期：409，`code: "USERNAME_TAKEN"`，提示已被占用
- [ ] **TC-P402**：用户 A 的 username 改为"admin"（若已有 admin 用户） | 预期：409，提示被占用

#### 安全测试

- [ ] **TC-P501**：未登录直接 PUT | 预期：401
- [ ] **TC-P502**：请求体包含 role 字段（如 `"role": "admin"`） | 预期：role 字段被忽略，不会提权（Zod 会忽略未定义字段）

---

### 5.3 POST /api/user/avatar — 上传头像

#### 正常流程

- [ ] **TC-A001**：上传 100KB 的 JPEG 图片 | 预期：200，返回 avatar_url，URL 可直接访问显示图片
- [ ] **TC-A002**：上传 100KB 的 PNG 图片 | 预期：200，返回 avatar_url
- [ ] **TC-A003**：上传 100KB 的 WebP 图片 | 预期：200，返回 avatar_url
- [ ] **TC-A004**：上传 100KB 的 GIF 图片 | 预期：200，返回 avatar_url
- [ ] **TC-A005**：上传后 GET /api/user/profile | 预期：avatar_url 已更新为上传的 URL
- [ ] **TC-A006**：再次上传新头像（覆盖旧头像） | 预期：200，avatar_url 更新为新 URL

#### 边界测试

- [ ] **TC-A201**：上传恰好 2MB（2,097,152 字节）的图片 | 预期：200，上传成功
- [ ] **TC-A202**：上传 1 字节的最小有效图片 | 预期：200 或 422（取决于图片解析）

#### 验证异常测试

- [ ] **TC-A301**：上传 2MB+1 字节的图片 | 预期：400，error 提示文件过大
- [ ] **TC-A302**：上传空文件（0 字节） | 预期：400，error 提示文件为空
- [ ] **TC-A303**：上传非图片文件（如 .pdf） | 预期：400，error 提示文件类型不支持
- [ ] **TC-A304**：上传 .svg 文件（不在允许列表） | 预期：400，error 提示不支持文件类型
- [ ] **TC-A305**：表单字段名不是 "avatar"（如叫 "file"） | 预期：400，error 提示缺少 avatar 字段
- [ ] **TC-A306**：Content-Type 不是 multipart/form-data（发送 JSON） | 预期：400 或 422

#### 安全测试

- [ ] **TC-A401**：未登录直接 POST | 预期：401
- [ ] **TC-A402**：上传文件名包含路径遍历（如 `../../../etc/passwd` 内容为合法图片） | 预期：200，但不影响实际路径（路径由后端生成）

---

### 5.4 集成测试

- [ ] **TC-I001**：注册新用户 → 查看 profile → nickname 为注册时设置的值 | 预期：profile 与注册时一致
- [ ] **TC-I002**：更新 nickname → 登出 → A 登录 → 查看 profile | 预期：nickname 保持更新后的值（持久化）
- [ ] **TC-I003**：用 A token 请求 `/api/user/profile` → 得到 A 的资料，不会得到 B 的资料 | 预期：id 与 A 一致

---

### 5.5 模块 02 修复回归验证（回归测试）

以下是用例需重新验证，确保修复未引入新问题：

- [ ] **RG-001**：注册 → 立即登录 → profile 返回正确（验证触发器+重试机制修复）
- [ ] **RG-002**：使用错误密码登录 → 返回统一错误"邮箱或密码不正确"（不暴露具体原因）
- [ ] **RG-003**：未登录访问 `/flights` → 被 Middleware 重定向到 `/login?redirect=/flights`
- [ ] **RG-004**：已登录访问 `/login` → 被 Middleware 重定向到首页
- [ ] **RG-005**：提交包含多个无效字段的注册表单 → 返回批量错误列表（details 数组）

---

## 6. 验收标准

### 功能验收
- [ ] 用户可查看自己的完整资料（含 email）
- [ ] 用户可修改昵称（1-30 字符，支持中文和 trim）
- [ ] 用户可修改用户名（3-20 字符，字母开头，唯一性校验）
- [ ] 用户可修改简介（最多 500 字符，trim）
- [ ] 用户可上传头像（JPEG/PNG/WebP/GIF，≤ 2MB）
- [ ] 上传头像后 avatar_url 已更新
- [ ] 头像 URL 公开可访问

### 安全验收
- [ ] 未登录无法访问任何接口
- [ ] 用户只能修改自己的资料（RLS 保证）
- [ ] 无法通过 profile 接口提权（role 字段不可改）
- [ ] 用户名唯一性在应用层和数据库层双重保障
- [ ] 头像上传仅限允许的文件类型和大小

### 质量验收
- [ ] 所有正常用例 PASS
- [ ] 所有安全用例 PASS
- [ ] 边界测试通过率 ≥ 90%
- [ ] 无控制台错误
- [ ] 回归测试全部 PASS

---

## 7. 测试执行记录

| 用例范围 | 总数 | PASS | FAIL | 通过率 |
|----------|------|------|------|--------|
| GET 正常 | 2 | | | |
| GET 异常 | 2 | | | |
| PUT 正常 | 6 | | | |
| PUT 边界 | 5 | | | |
| PUT 异常 | 8 | | | |
| PUT 唯一性 | 2 | | | |
| PUT 安全 | 2 | | | |
| 头像正常 | 4 | | | |
| 头像边界 | 2 | | | |
| 头像异常 | 6 | | | |
| 头像安全 | 2 | | | |
| 集成测试 | 3 | | | |
| 回归测试 | 5 | | | |
| **合计** | **49** | | | |

---

> **测试 AI 说明**：执行测试时请使用 curl 命令，注意替换 BASE_URL、TOKEN、USERNAME 等变量。建议先注册两个独立用户作为测试账号。发现 FAIL 用例请先在 SUPABASE_AUTO_CONFIRM_EMAIL=false 的环境下复现一次，确认不是环境差异导致。
