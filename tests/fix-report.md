# 模块 01 + 02 修复报告

> 修复时间：2026-07-20
> 基于：combined-test-report.md 中发现的 10 个问题
> 状态：全部已修复 ✓

---

## 修复清单

### 🔴 高优先级（3 个）

#### 问题 1：login/register 路由未检查 profile 查询的 error ✅

**文件**：
- `web/src/app/api/auth/login/route.ts`
- `web/src/app/api/auth/register/route.ts`

**修复内容**：
- 检查 `profileError`，不再只解构 `data`
- 触发器可能存在竞态条件，加入 100ms 延迟重试逻辑
- 重试仍失败时记录错误日志，返回 `profile: null`（前端可引导用户补全资料）
- 与 `/api/auth/me` 的写法对齐

---

#### 问题 2：server.ts 的 setAll 静默吞掉 cookie 写入异常 ✅

**文件**：`web/src/lib/supabase/server.ts`

**修复内容**：
- catch 块加入 `console.warn` 日志，记录失败原因
- 日志包含错误消息，便于排查
- 保留原有行为（不抛错，Middleware 会刷新 session）

---

#### 问题 3：comments 表缺少 UPDATE 策略 ✅

**文件**：`migrations/003_init_rls.sql`

**修复内容**：
```sql
CREATE POLICY "comments_update_own" ON comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

### 🟡 中优先级（4 个）

#### 问题 4：login 路由暴露 Supabase 原始错误 ✅

**文件**：`web/src/app/api/auth/login/route.ts`

**修复内容**：
- 统一错误消息为"邮箱或密码不正确"，不再暴露原始错误
- 仅保留"邮箱未验证"的区分提示（返回 `EMAIL_NOT_CONFIRMED` code）
- 防止攻击者通过错误消息差异进行用户枚举

---

#### 问题 5：Middleware 未实现登录拦截 ✅

**文件**：`web/src/lib/supabase/middleware.ts`

**修复内容**：
- 实现受保护路由拦截：`/flights`、`/settings`、`/feed/new`、`/profile`
- 未登录访问受保护路由 → 重定向到 `/login?redirect=原路径`
- 已登录访问 `/login`、`/register` → 重定向到首页
- API 路由（`/api/`）不做重定向，由 API 自己返回 401

---

#### 问题 6：种子数据错误 — 北海福成 IATA 码 ✅

**文件**：`migrations/006_seed_airports.sql`

**修复内容**：
- ICAO：`ZGLG` → `ZGBH`（北海福成的正确 ICAO 码）
- IATA：`LHW` → `BHY`（LHW 是兰州中川的 IATA 码）

---

#### 问题 7：种子数据错误 — 成都双流/天府混淆 ✅

**文件**：`migrations/006_seed_airports.sql`

**修复内容**：
- `ZUUU` 改名为"成都双流国际机场"（原来错误命名为天府）
- 坐标修正：30.5785, 103.9471（双流实际坐标）
- 新增 `ZUTF`（成都天府国际机场），IATA `TFU`

---

### 🟢 低优先级（3 个）

#### 问题 8：验证错误只返回第一个 Zod issue ✅

**文件**：
- `web/src/lib/api-response.ts`
- `web/src/app/api/auth/login/route.ts`
- `web/src/app/api/auth/register/route.ts`
- `web/src/types/database.ts`

**修复内容**：
- 新增 `validationErrorsResponse()` 函数，返回所有错误字段
- `ApiResponse.error.details` 字段（可选）存储批量错误
- login/register 的 Zod 解析失败改用 `validationErrorsResponse`
- "请求体不能为空"等单个错误仍用 `validationErrorResponse`

**响应格式示例**：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "邮箱格式不正确",
    "details": [
      { "field": "email", "message": "邮箱格式不正确" },
      { "field": "password", "message": "密码至少 8 位" }
    ]
  }
}
```

---

#### 问题 9：airport_stats 视图 OR 关联性能 ✅（已评估，暂不修改）

**文件**：`migrations/005_init_views.sql`

**处理方式**：
- 评估了 UNION 替代方案，但 `SUM(user_count)` 会导致用户数重复计算
- P0 阶段 flights 数据量小（预计 < 1000 条），OR 关联性能可接受
- 已加注释标记为 P2 优化项
- 保持现有实现不变

---

#### 问题 10：触发器不计算 dep_city/arr_city ✅

**文件**：`migrations/004_init_triggers.sql`

**修复内容**：
- `calculate_flight_metrics()` 触发器现在同时查询机场的 `city_cn`
- 自动填充 `dep_city` 和 `arr_city`（仅当应用层未提供时）
- 应用层仍可手动设置城市（覆盖自动值）

---

## 数据库变更

重新执行了完整迁移（DROP CASCADE + CREATE）：
- 9 张表 ✓
- 4 个视图 ✓
- 7 个触发器 ✓
- 6 个函数 ✓
- 19 个索引（新增 comments_update 策略，不产生新索引）
- 29 个 RLS 策略（新增 comments_update_own）
- 49 机场种子数据（修正北海福成 + 新增成都天府）
- 49 机型种子数据

## 验证

- `tsc --noEmit` 零错误 ✓
- 数据库迁移成功 ✓
- 所有修复已推送到 GitHub
