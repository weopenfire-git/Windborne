# 代码审查报告 — 模块 04 · 飞行日志 CRUD

> 审查方式：静态代码审查（只读，未修改任何代码）
> 审查时间：2026-07-20
> 审查范围：`web/src/app/api/flights/` + `web/src/lib/flights/`

---

## 一、审查文件清单

| 文件 | 说明 |
|------|------|
| `web/src/app/api/flights/route.ts` | GET（列表）/ POST（创建） |
| `web/src/app/api/flights/[id]/route.ts` | GET（详情）/ PUT / DELETE |
| `web/src/app/api/flights/[id]/tickets/route.ts` | POST 上传机票 |
| `web/src/lib/flights/validation.ts` | Zod schema（createFlight + updateFlight） |

---

## 二、测试结果

### 5.1 正常流程（TC-F001~F016）- 16/16 PASS

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-F001 最小字段创建 | PASS | 4 个必填字段通过 Zod，is_public 默认 false，其余 default('') |
| TC-F002 完整字段创建 | PASS | 30+ 字段通过，`.default('')` 未传字段自动填充空串 |
| TC-F003 公开日志 | PASS | `is_public: true` → Zod boolean → DB 正确写入 |
| TC-F004 专业字段 | PASS | v1_vr_v2/cruise_alt/sid/star 等通过 Zod，写入 DB |
| TC-F005 备注字段 | PASS | 4 种 remarks 各 max(1000)，正确写入 |
| TC-F006 列表查询默认分页 | PASS | page=1, pageSize=20，返回 pagination |
| TC-F007 第二页 | PASS | offset=(2-1)*20=20，range(20,39)，hasMore 正确 |
| TC-F008 筛选 is_public=true | PASS | `.eq('is_public', true)` 过过滤 |
| TC-F009 筛选 is_public=false | PASS | `.eq('is_public', false)` |
| TC-F010 空列表 | PASS | 新用户 0 条 → data=[], total=0, hasMore=false |
| TC-F011 查看私有日志详情 | PASS | GET [id]：RLS 通过 → 所有者身份验证通过 → 返回详情 |
| TC-F012 公开日志匿名查看 | PASS | `flight.is_public` → 跳过 user 检查 + RLS `flights_select_anon` 放行 |
| TC-F013 含机票详情 | PASS | LEFT JOIN flight_tickets → tickets 数组 |
| TC-F014 修改单个字段 | PASS | PUT `{ seat: "12A" }` → updateFlightSchema 解析 → UPDATE |
| TC-F015 修改多个字段 | PASS | `{ airline, is_public }` → 两个字段同时更新 |
| TC-F016 私有转公开 | PASS | `{ is_public: true }` → updateFlightSchema → DB 更新 |

### 5.2 边界测试（TC-F101~F120）- 19/20 PASS

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-F101 flight_no=CA1 | PASS | `CA1`: `[A-Z0-9]{2,3}`="CA", `\d{1,4}`="1" → 通过 |
| TC-F102 flight_no=CA9999 | PASS | `[A-Z0-9]{2,3}`="CA", `\d{1,4}`="9999" → 6字符，max(8)OK |
| TC-F103 flight_no=CA1234A | PASS | `[A-Z0-9]{2,3}`="CA", `\d{1,4}`="1234", `[A-Z]?`="A" → 通过 |
| TC-F104 flight_no 小写 | PASS | `"ca1234"` → `[A-Z0-9]` 不匹配小写 `c` → 422 |
| TC-F105 flight_no 含中文 | PASS | 中文不在 `[A-Z0-9]` → 422 |
| **TC-F106** flight_no 纯数字 "12345" | **FAIL** | 见问题 #1 |
| TC-F107 dep_icao 小写 | PASS | `/^[A-Z]{4}$/` 不匹配小写 → 422 |
| TC-F108 dep_icao 3位 | PASS | `.length(4)` → 422 |
| TC-F109 dep_icao 5位 | PASS | `.length(4)` → 422 |
| TC-F110 dep_icao 含数字 | PASS | `/^[A-Z]{4}$/` 不匹配数字 → 422 |
| TC-F111 date YYYY-MM-DD | PASS | `/^\d{4}-\d{2}-\d{2}$/` 匹配 |
| TC-F112 date YYYY/MM/DD | PASS | 正则不匹配 `/` → 422 |
| TC-F113 date MM-DD-YYYY | PASS | 正则不匹配 → 422 |
| TC-F114 airline 100字符 | PASS | `.max(100)` 边界值通过 |
| TC-F115 remarks 1000字符 | PASS | `.max(1000)` 边界值通过 |
| TC-F116 pageSize=1 | PASS | `Math.min(50, Math.max(1, 1))` = 1 |
| TC-F117 pageSize=50 | PASS | `Math.min(50, 50)` = 50 |
| TC-F118 page=999 | PASS | offset=19960，range 空 → data=[], total 不变 |
| TC-F119 page=0 | PASS | `Math.max(1, 0)` → page=1 |
| TC-F120 dep==arr 同机场 | PASS | `.refine` dep_icao !== arr_icao → 422 |

### 5.3 异常测试（TC-F201~F212）- 12/12 PASS

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-F201 缺少 date | PASS | Zod required → 422 |
| TC-F202 缺少 flight_no | PASS | 同上 |
| TC-F203 缺少 dep_icao | PASS | 同上 |
| TC-F204 缺少 arr_icao | PASS | 同上 |
| TC-F205 空JSON body | PASS | `safeParse({})` 缺失必填字段 → 422 |
| TC-F206 非JSON纯文本 | PASS | `request.json().catch(() => null)` → null → "请求体不能为空" 422 |
| TC-F207 PUT空body | PASS | 同上 |
| TC-F208 GET 不存在ID | PASS | `.single()` 返回0行 → error → notFoundResponse 404 |
| TC-F209 PUT 不存在ID | PASS | fetch `existing` 为空 → 404 |
| TC-F210 DELETE 不存在ID | PASS | 同上 → 404 |
| TC-F211 is_public 非布尔 | PASS | `z.boolean()` 不接受字符串 "yes" → 422 |
| TC-F212 PUT 无有效字段 | PASS | `{}` → `Object.keys({}).length === 0` → 422 |

### 5.4 安全测试（TC-F301~F314）- 14/14 PASS

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-F301~F305 未登录请求 | PASS | `getUser()` → null → `unauthorizedResponse()` 401 |
| TC-F306 A看B私有日志 | PASS | RLS 过滤 → 0行 → 404 |
| TC-F307 A改B日志 | PASS | `existing.user_id !== user.id` → forbiddenResponse 403 |
| TC-F308 A删B日志 | PASS | 同上 → 403 |
| TC-F309 A上传机票到B | PASS | `flight.user_id !== user.id` → forbiddenResponse 403 |
| TC-F310 伪造 user_id | PASS | Zod schema 无 user_id 字段（Zod strip 默认丢弃）+ `insert({ user_id: user.id })` 强制使用 auth.uid() + RLS 二次保障 |
| TC-F311 PUT改user_id | PASS | updateFlightSchema 无 user_id → 丢弃 |
| TC-F312 匿名看公开 | PASS | RLS `flights_select_anon` + 代码跳过 user 检查 |
| TC-F313 匿名看私有 | PASS | RLS 过滤 → 0行 → 404 |
| TC-F314 匿名访问列表 | PASS | `getUser()` → null → 401 |

### 5.5 机票上传（TC-F401~F411）- 11/11 PASS

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-F401~F404 各格式上传 | PASS | `image/jpeg|png|webp|gif` 均在 ALLOWED_TYPES 中 |
| TC-F405 多张机票 | PASS | sort_order 自动递增 |
| TC-F406 恰好5MB | PASS | `5242880 > 5242880` → false，不过大 |
| TC-F407 caption 500字符 | PASS | `.substring(0, 500)` |
| TC-F408 超5MB | PASS | 422（规范允许 400 或 422） |
| TC-F409 非图片PDF | PASS | 422 |
| TC-F410 空文件 | PASS | `file.size === 0` → 422 |
| TC-F411 错字段名 | PASS | `formData.get('ticket')` → null → 422 |

### 5.6 集成测试（TC-F501~F504）- 4/4 PASS

| 用例 | 预估 | 分析 |
|------|------|------|
| TC-F501 完整CRUD流程 | PASS | 创建→列表→详情→修改→删除 链路完整 |
| TC-F502 机票CASCADE删除 | PASS | DB `ON DELETE CASCADE` → 删除flight自动删tickets |
| TC-F503 多用户隔离 | PASS | RLS + `eq('user_id', user.id)` 双重保障 |
| TC-F504 公开流程 | PASS | 匿名可看公开日志，已登录跨用户也可看 |

---

## 三、发现问题

### 问题 1 (代码Bug): flight_no 正则 `[A-Z0-9]` 允许纯数字航班号通过

**文件**: `web/src/lib/flights/validation.ts:28`
**影响用例**: TC-F106（纯数字 → 预期 422，实际通过）

```ts
const flightNoPattern = z
  .string()
  .regex(/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/, '航班号格式：如 CA1234 / 3U8825');
```

正则前半段 `[A-Z0-9]{2,3}` 同时接受字母**和数字**。航班号 "12345" 的实际匹配过程：
- `[A-Z0-9]{2,3}`（贪婪，先试3）→ "123"（3个数字，属于 A-Z0-9 范围）
- `\d{1,4}` → "45"
- 整个字符串匹配成功 → **Zod 通过**

**注释写的"2-3位字母 + 1-4位数字"是对的，但正则写错了**。`[A-Z0-9]` 应改为 `[A-Z]`：

```
/^[A-Z]{2,3}\d{1,4}[A-Z]?$/
```

### 问题 2 (结构问题): GET /api/flights 列表响应双重嵌套 success

**文件**: `web/src/app/api/flights/route.ts:73-82`
**影响用例**: 无（功能正确，但结构冗余）

```ts
return successResponse<PaginatedResponse<FlightListItemDTO>>({
  success: true,                    // ← PaginatedResponse 自带 success
  data: (data ?? []) as FlightListItemDTO[],
  pagination: { ... },
});
```

`successResponse()` 包装后追加外层 `{ success: true, data: ... }`，最终响应为：

```json
{
  "success": true,
  "data": {
    "success": true,         ← 冗余
    "data": [...],
    "pagination": { ... }
  }
}
```

与模块其他接口（直接返回 `{ success: true, data: {...} }`）的扁平结构不一致。

### 问题 3 (类型问题): Next.js 14 使用了 Next.js 15 的 params 类型

**文件**: `web/src/app/api/flights/[id]/route.ts:25`、`web/src/app/api/flights/[id]/tickets/route.ts:39`
**影响用例**: 无（运行时不报错，但类型不匹配）

```ts
{ params }: { params: Promise<{ id: string }> }  // Next.js 15 语法
const { id } = await params;
```

项目使用 `next@14.2.15`，params 不是 Promise。`await` 一个普通对象在 JS 中等同于直接返回，所以**运行时不出错**，但类型标注与 Next.js 14 实际传入类型不符。

---

## 四、总结

### 统计

| 分类 | 用例数 | PASS | FAIL | 通过率 |
|------|--------|------|------|--------|
| 正常流程 (F001-F016) | 16 | 16 | 0 | 100% |
| 边界测试 (F101-F120) | 20 | 19 | 1 | 95% |
| 异常测试 (F201-F212) | 12 | 12 | 0 | 100% |
| 安全测试 (F301-F314) | 14 | 14 | 0 | 100% |
| 机票上传 (F401-F411) | 11 | 11 | 0 | 100% |
| 集成测试 (F501-F504) | 4 | 4 | 0 | 100% |
| **合计** | **77** | **76** | **1** | **99%** |

### 唯一 FAIL 用例

| 用例 | 原因 | 问题编号 |
|------|------|----------|
| TC-F106 | flight_no 正则 `[A-Z0-9]{2,3}` 允许纯数字前缀，导致 "12345" 通过验证 | #1 |

### 关键结论

- **代码质量高**：77 个用例中 76 个 PASS（99%），Zod schema 设计严谨，RLS + 应用层双重鉴权，CRUD 完整。
- **唯一代码 bug**：flight_no 正则 `[A-Z0-9]` 写成了 `[A-Z]` 的意图，导致纯数字航班号意外通过。修复只需改一个字符类。
- **安全设计扎实**：user_id 伪造防护（Zod strip + 代码覆盖 + RLS 三重）、跨用户操作全部返回 403/404（不区分是否存在，防信息泄露）、匿名只能看公开。
- **2 个低优问题**：GET 列表响应双重嵌套 + Next.js 14 用了 15 的 params 类型语法。
