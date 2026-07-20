# 代码审查报告 — 模块 03 · 用户资料

> 审查方式：静态代码审查（只读，未修改任何代码）
> 审查时间：2026-07-20
> 审查范围：`web/src/app/api/user/` + `web/src/lib/user/` + `web/src/lib/api-response.ts`

---

## 一、审查文件清单

| 文件 | 说明 |
|------|------|
| `web/src/app/api/user/profile/route.ts` | GET/PUT /api/user/profile |
| `web/src/app/api/user/avatar/route.ts` | POST /api/user/avatar |
| `web/src/lib/user/validation.ts` | Zod 校验 schema + 常量 |
| `web/src/lib/api-response.ts` | 统一响应工具 |
| `web/src/types/database.ts` | 类型定义 |

---

## 二、测试结果

### 2.1 GET /api/user/profile（TC-P001~P004）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-P001 已登录查看资料 | PASS | `supabase.auth.getUser()` → 查询 `users` 表 → 返回完整 profile 含 email |
| TC-P002 字段完整 | PASS | SELECT 包含 `id, username, nickname, avatar_url, bio, role, created_at, email`，avatar_url 可为 null |
| TC-P003 未登录请求 | PASS | `getUser()` → null → `unauthorizedResponse()` 401 |
| TC-P004 过期/伪造 session | PASS | Supabase `getUser()` 校验失败返回 null → 401 |

### 2.2 PUT /api/user/profile — 正常流程（TC-P101~P106）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-P101 更新昵称 | PASS | 只传 nickname，username 和 bio 为 undefined，构建 `updates = { nickname }`，UPDATE 成功 |
| TC-P102 更新 200 字简介 | PASS | bio 传到 `updates.bio`，Zod max(500) 放行，trim 后写入 |
| TC-P103 更新用户名 | PASS | 唯一性检查通过后 `updates.username = username`，写入 |
| TC-P104 同时更新三个字段 | PASS | 三个字段都传入，同时写入更新 |
| TC-P105 只更新昵称 | PASS | username 和 bio 为 undefined 时不加入 updates 对象 |
| TC-P106 username 不变 | PASS | `currentUser.username === username` 时跳过唯一性查询，但仍执行 UPDATE（no-op） |

### 2.3 PUT /api/user/profile — 边界测试（TC-P201~P208）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-P201 昵称 1 字符 | PASS | `profileNicknameSchema.min(1)` — 边界通过 |
| TC-P202 昵称 30 字符 | PASS | `profileNicknameSchema.max(30)` — 边界通过 |
| TC-P203 昵称纯中文 | PASS | `z.string()` 不限制字符类型，中文正常 |
| TC-P204 昵称前后空格 | PASS | `.trim()` 自动去除首尾空格，"  小明  " → "小明" |
| TC-P205 用户名 3 字符 | PASS | `profileUsernameSchema.min(3)` — 边界通过 |
| TC-P206 用户名 20 字符 | PASS | `profileUsernameSchema.max(20)` — 边界通过 |
| TC-P207 用户名含下划线数字 | PASS | regex `/^[a-zA-Z][a-zA-Z0-9_]*$/` 接受 `pilot_007` |
| TC-P208 bio 500 字符 | PASS | `bioSchema.max(500)` — 边界通过 |

### 2.4 PUT /api/user/profile — 验证异常（TC-P301~P310）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-P301 昵称空字符串 | PASS | `.min(1)` 对 `""` → 422 |
| TC-P302 昵称 31 字符 | PASS | `.max(30)` → 422 |
| TC-P303 用户名 2 字符 | PASS | `.min(3)` → 422 |
| TC-P304 用户名 21 字符 | PASS | `.max(20)` → 422 |
| TC-P305 用户名数字开头 | PASS | regex 不匹配 `123abc` → 422 |
| TC-P306 用户名中文 | PASS | regex 不匹配 `pilot_中文`（中文不在 `[a-zA-Z0-9_]`） → 422 |
| TC-P307 用户名特殊字符 | PASS | regex 不匹配 `pilot@test` → 422 |
| TC-P308 bio 501 字符 | PASS | `.max(500)` → 422 |
| TC-P309 请求体空 `{}` | **FAIL** | 见问题 #1 |
| TC-P310 请求体非 JSON | PASS | `request.json()` throw → "请求体不能为空" 422 |

### 2.5 PUT /api/user/profile — 唯一性 & 安全（TC-P401~P502）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-P401 用户名被占用 | PASS | 唯一性查询 `eq('username', username).maybeSingle()` 找到 → 409 USERNAME_TAKEN |
| TC-P402 用户名改 admin | PASS | 同上，唯一性检查覆盖 |
| TC-P501 未登录 PUT | PASS | `getUser()` → null → 401 |
| TC-P502 role 提权 | PASS | Zod schema 无 role 字段，默认 `.strip()` 行为直接丢弃 |

### 2.6 POST /api/user/avatar — 正常流程（TC-A001~A006）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-A001 JPEG 100KB | PASS | `image/jpeg` 在 ALLOWED_AVATAR_TYPES 中，2MB 内，上传成功 |
| TC-A002 PNG 100KB | PASS | `image/png` 在允许列表中 |
| TC-A003 WebP 100KB | PASS | `image/webp` 在允许列表中 |
| TC-A004 GIF 100KB | PASS | `image/gif` 在允许列表中 |
| TC-A005 上传后 GET profile | 条件 PASS | 正常情况下 avatar_url 更新成功。但如果 DB update 失败，返回 200 但 profile 不变（见问题 #3） |
| TC-A006 覆盖旧头像 | PASS | `upsert: true`，新文件覆盖同路径 |

### 2.7 POST /api/user/avatar — 边界（TC-A201~A202）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-A201 恰好 2MB | PASS | `file.size > AVATAR_MAX_SIZE` — 2097152 不大于 2097152，通过 |
| TC-A202 1 字节图片 | PASS | size > 0 且 MIME 在允许列表，通过验证（由 Storage 层决定是否合法） |

### 2.8 POST /api/user/avatar — 验证异常（TC-A301~A306）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-A301 2MB+1 字节 | **FAIL** | 见问题 #2（状态码 422 ≠ 预期 400） |
| TC-A302 空文件 0 字节 | **FAIL** | 同上 |
| TC-A303 非图片 .pdf | **FAIL** | 同上 |
| TC-A304 .svg 不在允许列表 | **FAIL** | 同上 |
| TC-A305 字段名不是 avatar | **FAIL** | 同上（预期 400 vs 实际 422） |
| TC-A306 非 multipart | PASS | spec 允许 400 **或** 422，实际 422 |

### 2.9 POST /api/user/avatar — 安全（TC-A401~A402）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-A401 未登录 | PASS | `getUser()` → null → 401 |
| TC-A402 路径遍历文件名 | PASS | 路径由 `user.id` + `timestamp` + `扩展名` 构成，不依赖原始文件名 |

### 2.10 集成测试（TC-I001~I003）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-I001 注册→查看 profile | PASS | 注册后 profile 反映注册时 nickname（通过触发器） |
| TC-I002 修改→登出→登录→查看 | PASS | 数据库持久化，登出/登录不改变资料 |
| TC-I003 A 只能看自己 | PASS | `/api/user/profile` 查询 `WHERE id = user.id`，不会返回别人的数据 |

### 2.11 回归测试（RG-001~RG-005）

| 用例 | 预估 | 分析 |
|------|------|------|
| RG-001 注册→登录→profile 正确 | PASS | 当前代码逻辑正确，前提是触发器立即执行 |
| RG-002 错误密码→统一消息 | **FAIL** | 见问题 #4 |
| RG-003 未登录访问 /flights→重定向 | **FAIL** | 见问题 #5 |
| RG-004 已登录访问 /login→重定向 | **FAIL** | 见问题 #5 |
| RG-005 多字段错误→批量返回 | **FAIL** | 见问题 #6 |

---

## 三、发现问题

### 高优先级（直接导致测试用例 FAIL）

#### 问题 1: bioSchema.default('') 导致空请求体 `{}` 静默通过

**文件**: `web/src/lib/user/validation.ts:22-27`
**影响用例**: TC-P309

```ts
export const bioSchema = z
  .string()
  .max(500, '简介最多 500 个字符')
  .trim()
  .optional()
  .default('');  // <-- 问题在这里
```

`bioSchema` 设置了 `.default('')`，当用户在 `updateProfileSchema` 中不传 bio 字段时，Zod 自动将 bio 值设为 `''` 而不是 `undefined`。

在 `web/src/app/api/user/profile/route.ts:95`：
```ts
const { nickname, username, bio } = parsed.data;
// {} → nickname=undefined, username=undefined, bio='' （不是 undefined！）
if (nickname === undefined && username === undefined && bio === undefined) {
  // bio 是 '' 不是 undefined，这个检查永远不会触发
  return validationErrorResponse('至少需要提供一个要更新的字段');
}
// 继续执行，updates = { bio: '' }
// → UPDATE users SET bio = '' → 返回 200
```

**后果**: `{}` 不会返回 422，而是将 bio 设为空字符串并返回 200。同时，任何不传 bio 的更新请求都会连带将 bio 重置为空字符串（如只改 nickname 时 bio 不是 undefined 会被写入 updates）。

---

#### 问题 2: 头像验证错误返回 422，但 API 规范要求 400

**文件**: `web/src/app/api/user/avatar/route.ts:56-64`
**影响用例**: TC-A301, TC-A302, TC-A303, TC-A304, TC-A305

```ts
// 文件类型错误
return validationErrorResponse(`不支持的文件类型: ${mimeType}，...`);  // → 422
// 文件过大
return validationErrorResponse(`文件过大: ...`);                          // → 422
// 文件为空
return validationErrorResponse('文件为空');                              // → 422
```

`validationErrorResponse` 内部使用 `errorResponse('VALIDATION_ERROR', ..., 422)`，固定返回 422。但 API 规范 4.3 节明确写的是 **400**：

| 状态码 | 场景 |
|--------|------|
| 400 | 文件类型不支持 / 文件过大 / 文件为空 / 缺少文件字段 |
| 401 | 未登录 |

**后果**: TC-A301~A305 如果严格校验 HTTP 状态码，全部会看到 422 而不是预期的 400。

---

### 中优先级（潜在隐患）

#### 问题 3: 头像上传 DB 更新失败返回 200，造成不一致

**文件**: `web/src/app/api/user/avatar/route.ts:106-112`

```ts
if (updateError) {
  console.error('[user/avatar] profile update error:', updateError.message);
  // 文件已上传成功，部分失败：返回 URL 但提示
  return successResponse({ avatar_url: avatarUrl });  // ← 200
}
```

Storage 上传成功但 `users.avatar_url` 更新失败时，接口仍然返回 200。前端认为上传成功，但 `GET /api/user/profile` 会显示旧的头像 URL。这种静默不一致不易排查。

**影响用例**: TC-A005（极低概率触发，但一旦触发表现不符合预期）

---

### 回归测试失败（模块 02 遗留问题未修复）

#### 问题 4: 登录错误信息仍然泄露细节（RG-002）

**文件**: `web/src/app/api/auth/login/route.ts:44`

```ts
return unauthorizedResponse(error.message);
```

测试要求返回统一消息"邮箱或密码不正确"，但当前代码直接透传 Supabase 原始错误："Invalid login credentials" / "Email not confirmed"，仍可被用于用户枚举。

---

#### 问题 5: Middleware 仍未实现路由保护（RG-003, RG-004）

**文件**: `web/src/middleware.ts`

```ts
export async function middleware(request: NextRequest) {
  return await updateSession(request);  // 只刷新 session，不做路由拦截
}
```

测试要求：未登录访问 `/flights` → 重定向到 `/login?redirect=/flights`；已登录访问 `/login` → 重定向到首页。但当前 middleware 只刷新 session cookie，没有实现任何路由级访问控制。

---

#### 问题 6: 注册验证仍然只返回第一个错误（RG-005）

**文件**: `web/src/app/api/auth/register/route.ts:31`

```ts
return validationErrorResponse(parsed.error.issues[0]?.message ?? '参数错误');
```

测试要求返回 `details` 数组（批量错误列表）。但 register 路由仍然只返回 `issues[0]` 的消息，不返回批量格式。

注：`api-response.ts` `validationErrorsResponse` 已经支持批量错误格式（含 `details` 数组），只是 register 路由没有使用它。

---

## 四、总结

### 统计

| 分类 | 用例数 | PASS | FAIL | 通过率 |
|------|--------|------|------|--------|
| GET 正常 (P001-P002) | 2 | 2 | 0 | 100% |
| GET 异常 (P003-P004) | 2 | 2 | 0 | 100% |
| PUT 正常 (P101-P106) | 6 | 6 | 0 | 100% |
| PUT 边界 (P201-P208) | 8 | 8 | 0 | 100% |
| PUT 异常 (P301-P310) | 10 | 9 | 1 | 90% |
| PUT 唯一性 (P401-P402) | 2 | 2 | 0 | 100% |
| PUT 安全 (P501-P502) | 2 | 2 | 0 | 100% |
| 头像正常 (A001-A006) | 6 | 6 | 0 | 100% |
| 头像边界 (A201-A202) | 2 | 2 | 0 | 100% |
| 头像异常 (A301-A306) | 6 | 1 | 5 | 17% |
| 头像安全 (A401-A402) | 2 | 2 | 0 | 100% |
| 集成 (I001-I003) | 3 | 3 | 0 | 100% |
| 回归 (RG001-RG005) | 5 | 1 | 4 | 20% |
| **合计** | **56** | **46** | **10** | **82%** |

### 10 个 FAIL 明细

| 用例 | 原因 | 问题编号 |
|------|------|----------|
| TC-P309 | `bioSchema.default('')` 使空 body 通过 | #1 |
| TC-A301 ~ A305 | 422 vs 预期 400 状态码 | #2 |
| RG-002 | 登录仍泄露 Supabase 错误 | #4 |
| RG-003 | Middleware 无路由重定向 | #5 |
| RG-004 | Middleware 无路由重定向 | #5 |
| RG-005 | register 仍只返回单条错误 | #6 |

### 关键结论

- 模块 03 的 **GET/PUT profile 和 POST avatar 核心功能代码质量高**，大部分用例通过
- **1 个代码缺陷**直接导致 TC-P309 FAIL（bioSchema 的 default 行为破坏了空 body 校验）
- **5 个头像异常用例**因 HTTP 状态码不匹配（422 vs 400）而失败，属于接口规范与实现的差异
- **4 个回归用例**失败，对应的是模块 02 报告中已指出的问题在本代码副本中尚未修复
