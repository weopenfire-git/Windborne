# Windborne 代码审查报告 — 模块 01 + 02

> 审查方式：静态代码审查（只读，未修改任何代码）
> 审查时间：2026-07-20
> 审查范围：`migrations/` + `web/src/`

---

## 一、审查文件清单

| 文件 | 模块 |
|------|------|
| `migrations/001_init_tables.sql` | 01 数据库 |
| `migrations/002_init_indexes.sql` | 01 数据库 |
| `migrations/003_init_rls.sql` | 01 数据库 |
| `migrations/004_init_triggers.sql` | 01 数据库 |
| `migrations/005_init_views.sql` | 01 数据库 |
| `migrations/006_seed_airports.sql` | 01 数据库 |
| `migrations/007_seed_aircraft.sql` | 01 数据库 |
| `web/src/app/api/auth/register/route.ts` | 02 认证 |
| `web/src/app/api/auth/login/route.ts` | 02 认证 |
| `web/src/app/api/auth/logout/route.ts` | 02 认证 |
| `web/src/app/api/auth/me/route.ts` | 02 认证 |
| `web/src/lib/auth/validation.ts` | 02 认证 |
| `web/src/lib/supabase/server.ts` | 02 认证 |
| `web/src/lib/supabase/middleware.ts` | 02 认证 |
| `web/src/middleware.ts` | 02 认证 |
| `web/src/lib/api-response.ts` | 02 认证 |
| `web/src/types/database.ts` | 01/02 |

---

## 二、模块 01 · 数据库测试结果

### 2.1 正常流程（TC-001 ~ TC-010）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-001 9张表 | PASS | `001_init_tables.sql` 创建了 users/airports/aircraft/flights/flight_tickets/posts/comments/follows/likes 共 9 张表 |
| TC-002 机场 ≥ 40 | PASS | 种子数据含 48 个机场 |
| TC-003 机型 ≥ 45 | PASS | 种子数据含 49 个机型 |
| TC-004 新用户触发器 | PASS | `handle_new_user` 触发器在 auth.users INSERT 后自动创建 public.users 记录，username=邮箱前缀_UUID前4位 |
| TC-005 插入飞行日志 | PASS | 表结构正确，必填字段 date/flight_no/dep_icao/arr_icao 均已定义 |
| TC-006 距离自动计算 | PASS | `calculate_flight_metrics` 触发器在 INSERT/UPDATE 前用机场坐标计算 distance_km（Haversine 公式） |
| TC-007 updated_at 自动更新 | PASS | `flights_updated_at` 触发器在 UPDATE 前执行 `NEW.updated_at = now()` |
| TC-008 user_stats 视图 | PASS | `user_stats` LEFT JOIN flights 按 user_id 聚合，统计 flights/distance 等 |
| TC-009 public_feed 空 | PASS | is_public=false 的 flight 不会出现在 `public_feed`（WHERE is_public=true） |
| TC-010 公开日志出现 | PASS | 设置 is_public=true 后立即出现在 `public_feed` 中 |

### 2.2 边界测试（TC-101 ~ TC-104）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-101 空用户统计 | PASS | `user_stats` 用 `COALESCE(SUM(...), 0)`，无 flight 的用户显示 0 |
| TC-102 未知机场 | PASS | `calculate_flight_metrics` 在未匹配到机场时 distance_km 保持 NULL，不报错 |
| TC-103 重复 username | PASS | `username TEXT UNIQUE NOT NULL` 约束生效 |
| TC-104 自关注 | PASS | `CHECK (follower_id != followed_id)` 约束生效 |

### 2.3 异常测试（TC-201 ~ TC-204）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-201 不存在 user_id | PASS | `REFERENCES users(id)` 外键约束生效 |
| TC-202 缺少必填字段 | PASS | date/flight_no/dep_icao/arr_icao 有 NOT NULL 约束 |
| TC-203 非法 role | PASS | `CHECK (role IN ('member', 'verified_aviator', 'admin'))` 约束生效 |
| TC-204 非法 target_type | PASS | `CHECK (target_type IN ('post', 'flight', 'comment'))` 约束生效 |

### 2.4 安全测试 · RLS（TC-301 ~ TC-307）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-301 未登录不能看私有 | PASS | `flights_select_anon`: `is_public=true`，私有 flight 不可见 |
| TC-302 不能改别人的 flight | PASS | `flights_update_own`: `auth.uid() = user_id` |
| TC-303 不能看别人的私有 | PASS | `flights_select_authenticated`: `is_public=true OR user_id=auth.uid()` |
| TC-304 不能给别人上传 ticket | PASS | `tickets_insert_own`: 子查询检查 flight 所有者为 `auth.uid()` |
| TC-305 匿名可看公开 | PASS | `flights_select_anon` 对所有公开 flight 可读 |
| TC-306 匿名可看 airport/aircraft | PASS | `airports_select_all` / `aircraft_select_all` 对所有人开放 |
| TC-307 匿名不能插入 flight | PASS | flights 表仅有 `flights_insert_own` 策略，仅限 authenticated |

### 2.5 视图 / 索引（TC-401~403, TC-501）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-401 public_feed 一致性 | PASS | `SELECT count(*) FROM public_feed` = `SELECT count(*) FROM flights WHERE is_public=true` |
| TC-402 public_feed 含用户信息 | PASS | 视图中 JOIN users 并 SELECT u.nickname 等字段 |
| TC-403 airport_stats | PASS | LEFT JOIN flights ON dep_icao OR arr_icao，ZGSZ/ZSSS 会出现 |
| TC-501 索引 ≥ 15 | PASS | 共 17 个索引 |

---

## 三、模块 02 · 认证测试结果

### 3.1 正常流程（TC-001 ~ TC-008）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-001 注册（含 nickname） | PASS | `registerSchema` 接受 nickname 可选字段，传给 `signUp({ options: { data: { nickname } } })` |
| TC-002 注册（不含 nickname） | PASS | `nickname` 为 undefined 时不传 options.data，触发器用 email 前缀填充 nickname |
| TC-003 登录 | PASS | `signInWithPassword` 返回 user + session，cookie 由 `@supabase/ssr` 自动设置 |
| TC-004 获取当前用户 | PASS | `/api/auth/me` 调用 `supabase.auth.getUser()` 从 cookie 读取 session |
| TC-005 登出 | PASS | `supabase.auth.signOut()` 清除 session，`@supabase/ssr` 自动清除 cookie |
| TC-006 登出后访问 | PASS | 旧 cookie 对应 session 已失效，`getUser()` 返回 null → 401 |
| TC-007 username 唯一 | PASS | 触发器生成 `邮箱前缀_UUID前4位`，UUID 全局唯一 |
| TC-008 触发器创建 users 记录 | PASS | `handle_new_user` 触发器 SECURITY DEFINER 绕过 RLS |

### 3.2 边界测试（TC-101 ~ TC-105）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-101 密码恰好 8 位 | PASS | `passwordSchema.min(8)` — Test1234 正好 8 位，含字母+数字 |
| TC-102 密码恰好 72 位 | PASS | `passwordSchema.max(72)` — 边界值通过 |
| TC-103 nickname 恰好 30 字符 | PASS | `nicknameSchema.max(30)` — 边界值通过 |
| TC-104 plus addressing 邮箱 | PASS | `z.string().email()` Zod 验证接受 `test+a@example.com`，Supabase 视为独立用户 |
| TC-105 连续注册 username 不重复 | PASS | UUID 前缀随机性保证不重复 |

### 3.3 异常测试（TC-201 ~ TC-212）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-201 邮箱为空 | PASS | `emailSchema.min(1, '邮箱不能为空')` → 422 |
| TC-202 邮箱格式错 | PASS | `emailSchema.email('邮箱格式不正确')` → 422 |
| TC-203 密码 7 位 | PASS | `passwordSchema.min(8)` → 422，message 包含"至少 8 位" |
| TC-204 密码无数字 | PASS | `.regex(/[0-9]/, '密码须包含数字')` → 422 |
| TC-205 密码无字母 | PASS | `.regex(/[a-zA-Z]/, '密码须包含字母')` → 422 |
| TC-206 nickname 超长 31 | PASS | `nicknameSchema.max(30)` → 422 |
| TC-207 重复注册 | PASS | Supabase `signUp` 返回 error，返回 `AUTH_ERROR` 400 |
| TC-208 密码错误 | PASS | Supabase 返回 error → 401 |
| TC-209 不存在邮箱 | PASS | 同上，Supabase 返回 "Invalid login credentials" → 401 |
| TC-210 非 JSON body | PASS | `request.json().catch(() => null)` 返回 null → "请求体不能为空" 422 |
| TC-211 缺少字段 | PASS | `loginSchema` 要求 password，缺失 → Zod 解析失败 → 422 |
| TC-212 未登录访问 /me | PASS | `getUser()` 返回 null → 401 |

### 3.4 安全测试（TC-301 ~ TC-307）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-301 HttpOnly cookie | PASS | Supabase SSR 默认设置 HttpOnly |
| TC-302 密码不出现在响应中 | PASS | 所有响应只返回 `user.id` + `user.email`，不包含 password |
| TC-303 用户 A 不能操作用户 B 数据 | PASS | RLS 策略 `users_update_own` 限制 `auth.uid() = id` |
| TC-304 用户 A 不能修改用户 B profile | PASS | 同上 |
| TC-305 密码特殊字符 | PASS | passwordSchema 只检查长度+字母+数字，不限制特殊字符 |
| TC-306 SQL 注入 | PASS | Zod email() 格式验证先拦截；Supabase 使用参数化查询 |
| TC-307 session 过期 | PASS | `getUser()` 返回 null → 401 |

### 3.5 邮箱验证流程（TC-401 ~ TC-403）

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-401 注册后 session 为空 | PASS | `data.sessionEstablished = !data.session`，验证开启时为 false |
| TC-402 未验证登录 | PASS | Supabase 返回 error（"Email not confirmed"），返回 401 |
| TC-403 验证后登录 | PASS | 确认后 `signInWithPassword` 正常返回 session |

---

## 四、发现问题

### 🔴 高优先级（影响功能正确性）

#### 问题 1: login / register 路由未检查 profile 查询的 error

**文件**: `web/src/app/api/auth/login/route.ts:52-56`、`web/src/app/api/auth/register/route.ts:56-60`

```ts
const { data: profile } = await supabase
  .from('users')
  .select('id, username, nickname, avatar_url, bio, role, created_at')
  .eq('id', data.user.id)
  .single();
```

只解构了 `data: profile`，**未检查 `error`**。`.single()` 在查询到 0 行或查询错误时，`error` 字段非空但不会 throw。如果数据库触发器 `handle_new_user` 未执行（或存在竞态条件），`profile` 变成 `null`，API 会静默返回 `profile: null`，前端收到后可能崩溃。

**影响用例**: TC-003、TC-004、TC-008

**对比**: `/api/auth/me` 中是正确的写法（`if (error || !profile)`）。

---

#### 问题 2: server.ts 的 setAll 静默吞掉所有 cookie 写入异常

**文件**: `web/src/lib/supabase/server.ts:34-43`

```ts
setAll(cookiesToSet) {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    );
  } catch {
    // 在 Server Component 中调用 set 会抛错（只读）
    // 可忽略，Middleware 会刷新 session
  }
},
```

catch 块没有任何日志。虽然在 Route Handler 中 `cookieStore.set` 通常不会报错，但如果因任何原因失败（如响应已发送、cookie store 状态异常），session cookie 会静默丢失，导致：
- 登录后浏览器收不到 `Set-Cookie`，`/api/auth/me` 返回 401
- 登出后 cookie 未被清除，用户仍处于"登录"状态

**影响用例**: TC-003、TC-005、TC-006、TC-301

---

#### 问题 3: comments 表缺少 UPDATE 策略

**文件**: `migrations/003_init_rls.sql:138-149`

comments 表有 SELECT/INSERT/DELETE 策略，但**没有 UPDATE 策略**。用户无法编辑自己的评论。

**影响用例**: 不在当前测试范围内，但影响 P1 模块。

---

### 🟡 中优先级（安全 / 隐患）

#### 问题 4: login 路由将 Supabase 原始错误直接暴露给客户端

**文件**: `web/src/app/api/auth/login/route.ts:44`

```ts
return unauthorizedResponse(error.message);
```

Supabase 对不同场景返回不同错误消息："Invalid login credentials" vs "Email not confirmed"。攻击者可以通过错误消息差异判断某个邮箱是否已注册（用户枚举）。

**影响用例**: TC-208、TC-209、TC-402

---

#### 问题 5: Middleware 声称保护路由但实际未实现

**文件**: `web/src/middleware.ts:4-6`

```ts
// 保护需要登录的路由（/flights, /settings 等）
```

注释说会保护 `/flights`、`/settings` 等路由，但代码只调用了 `updateSession(request)`（仅刷新 session cookie），**没有任何登录拦截逻辑**。未登录用户可以访问所有页面。

**影响用例**: 不影响 Auth API 测试，但影响后续模块。

---

#### 问题 6: 种子数据错误 — ZGLG 北海福成 IATA 码错误

**文件**: `migrations/006_seed_airports.sql:48`

```sql
('ZGLG', 'LHW', '北海福成国际机场', ...)
```

北海福成的正确 IATA 码是 **BHY**，而 LHW 是兰州中川 (ZLLL) 的 IATA 码。现在两个机场共享同一个 IATA 码 `LHW`，虽然 IATA 不是唯一键不会导致 SQL 报错，但数据层面是错误的。

**影响用例**: TC-002（不直接失败，但是脏数据）

---

#### 问题 7: 种子数据错误 — ZUUU 机场名称错误

**文件**: `migrations/006_seed_airports.sql:51`

```sql
('ZUUU', 'CTU', '成都天府国际机场', ...)
```

ZUUU 是 **成都双流国际机场** (Shuangliu)，不是天府。成都天府国际机场的正确 ICAO 码是 **ZUTF**。

**影响用例**: TC-002（不直接失败，但是脏数据）

---

### 🟢 低优先级（体验 / 技术债）

#### 问题 8: 验证错误只返回第一个 Zod issue

**文件**: `web/src/app/api/auth/register/route.ts:31`、`web/src/app/api/auth/login/route.ts:31`

```ts
return validationErrorResponse(parsed.error.issues[0]?.message ?? '参数错误');
```

如果请求有多个字段无效（如邮箱格式错 AND 密码太短），只返回第一个错误。用户需提交多次才能修复所有问题。

**影响用例**: 不直接影响单字段测试用例，但用户体验不佳。

---

#### 问题 9: airport_stats 视图使用 OR 关联，不可利用索引

**文件**: `migrations/005_init_views.sql:69-79`

```sql
LEFT JOIN flights f ON f.dep_icao = a.icao_code OR f.arr_icao = a.icao_code
```

OR 条件使 PostgreSQL 无法高效使用索引，在 flights 数据量大时性能差。建议拆分为 UNION。

**影响用例**: TC-403（功能正确，但性能随数据量下降）

---

#### 问题 10: 触发器只自动计算 distance_km，不计算 dep_city/arr_city

**文件**: `migrations/004_init_triggers.sql:59-82`

`calculate_flight_metrics` 触发器只计算了 `distance_km`，但未自动填充 `dep_city` 和 `arr_city`。这两个字段需要通过应用层手动填充。

**影响用例**: 不直接失败，但依赖这两个字段的功能可能异常。

---

## 五、总结

### 统计

| 模块 | 用例数 | 预估 PASS | 预估 FAIL | 阻断问题 |
|------|--------|-----------|-----------|----------|
| 01 数据库（正常） | 10 | 10 | 0 | 0 |
| 01 数据库（边界） | 4 | 4 | 0 | 0 |
| 01 数据库（异常） | 4 | 4 | 0 | 0 |
| 01 数据库（安全） | 7 | 7 | 0 | 0 |
| 01 数据库（视图/索引） | 4 | 4 | 0 | 0 |
| 02 认证（正常） | 8 | 8 | 0 | 0 |
| 02 认证（边界） | 5 | 5 | 0 | 0 |
| 02 认证（异常） | 12 | 12 | 0 | 0 |
| 02 认证（安全） | 7 | 7 | 0 | 0 |
| 02 认证（邮箱验证） | 3 | 3 | 0 | 0 |
| **合计** | **64** | **64** | **0** | **0** |

### 关键结论

- **所有 64 个测试用例预估全部 PASS** — SQL schema 完整、Zod 验证正确、RLS 策略到位、API 路由逻辑正确
- **无阻断性问题** — 没有会导致测试用例 FAIL 的代码缺陷
- **发现 10 个代码问题** — 2 个高优（profile 检查缺失、cookie 静默失败）、5 个中优（安全问题/种子数据）、3 个低优
- **最需要关注的是问题 1 和问题 2**：它们在生产环境中可能导致静默故障，建议优先修复
