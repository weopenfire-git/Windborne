# 模块 04 · 飞行日志 CRUD

> 状态：待测试  
> 依赖：模块 01（数据库）+ 模块 02（认证）  
> 交付物：Flights CRUD API + 机票上传 + 测试用例

---

## 1. 模块概述

提供飞行日志的完整增删改查能力，包括：
- 列表查询（分页 + 按公开/私密筛选）
- 创建飞行日志（30+ 字段，含专业飞行参数）
- 查看详情（含关联机票）
- 修改飞行日志
- 删除飞行日志
- 机票图片上传

所有操作受 RLS 保护：用户只能操作自己的飞行日志。

---

## 2. 前置条件

- 模块 01、02 已完成并通过测试
- Supabase Storage `flight-tickets` 桶已创建（模块 03 完成）
- 至少注册 2 个测试用户

### 环境变量

```
NEXT_PUBLIC_SUPABASE_URL=https://cjdjtapzkjambtawbfiz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_llk6lUQBQhXP7RCe3miwcw_hzdO69i_
```

---

## 3. 数据模型

### 3.1 flights 表字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | UUID | 自动 | 主键 |
| `user_id` | UUID | 自动填充 | 关联 users.id |
| `date` | DATE | **是** | 飞行日期 YYYY-MM-DD |
| `flight_no` | TEXT | **是** | 航班号，如 CA1234 |
| `dep_icao` | TEXT(4) | **是** | 出发机场 ICAO，如 ZBAA |
| `arr_icao` | TEXT(4) | **是** | 到达机场 ICAO，如 ZGGG |
| `airline` | TEXT | 否 | 航司名称 |
| `airline_icao` | TEXT | 否 | 航司 ICAO 代码 |
| `aircraft` | TEXT | 否 | 机型，如 B738 |
| `registration` | TEXT | 否 | 注册号，如 B-1234 |
| `seat` | TEXT | 否 | 座位号 |
| `cabin_class` | TEXT | 否 | 舱位：economy/premium_economy/business/first |
| `dep_city` | TEXT | 否 | 出发城市（触发器自动填充） |
| `arr_city` | TEXT | 否 | 到达城市（触发器自动填充） |
| `via` | TEXT | 否 | 经停 |
| `dep_time_scheduled` | TEXT | 否 | 计划起飞 HH:MM |
| `dep_time_actual` | TEXT | 否 | 实际起飞 HH:MM |
| `arr_time_scheduled` | TEXT | 否 | 计划到达 HH:MM |
| `arr_time_actual` | TEXT | 否 | 实际到达 HH:MM |
| `v1_vr_v2` | TEXT | 否 | 起飞速度 |
| `cruise_alt` | TEXT | 否 | 巡航高度 |
| `cruise_mach` | TEXT | 否 | 巡航马赫 |
| `cruise_cas` | TEXT | 否 | 巡航 CAS |
| `route` | TEXT | 否 | 航路 |
| `sid` | TEXT | 否 | 离场程序 |
| `star` | TEXT | 否 | 进场程序 |
| `approach` | TEXT | 否 | 进近方式 |
| `weather_dep` | TEXT | 否 | 出发天气 |
| `weather_arr` | TEXT | 否 | 到达天气 |
| `remarks_passenger` | TEXT | 否 | 旅客备注 |
| `remarks_captain` | TEXT | 否 | 机长留言 |
| `remarks_fo` | TEXT | 否 | 副驾驶留言 |
| `remarks_purser` | TEXT | 否 | 乘务长留言 |
| `is_public` | BOOLEAN | 否 | 是否公开，默认 false |
| `distance_km` | NUMERIC | 否 | 飞行距离（km） |
| `flight_duration` | INT | 否 | 飞行时长（分钟） |

---

## 4. 接口清单

### 4.1 GET /api/flights — 飞行日志列表

- **认证**：需要
- **查询参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码 |
| `pageSize` | int | 20 | 每页条数（最大 50） |
| `is_public` | string | - | 筛选：`true`/`false` |

- **成功响应 200**：

```json
{
  "success": true,
  "data": {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "date": "2026-07-15",
        "flight_no": "CA1234",
        "airline": "中国国际航空",
        "aircraft": "B738",
        "registration": "B-1234",
        "dep_icao": "ZBAA",
        "dep_city": "北京",
        "arr_icao": "ZGGG",
        "arr_city": "广州",
        "is_public": false,
        "distance_km": 1967,
        "flight_duration": 180,
        "created_at": "2026-07-19T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "hasMore": false
    }
  }
}
```

- **错误响应**：
  - 401：未登录

**curl 示例**：

```bash
# 获取第一页（需替换真实 cookie）
curl -s $BASE/api/flights \
  -H "Cookie: $COOKIE" | jq

# 仅获取公开的
curl -s "$BASE/api/flights?is_public=true" \
  -H "Cookie: $COOKIE" | jq
```

---

### 4.2 POST /api/flights — 创建飞行日志

- **认证**：需要
- **请求体** (JSON)：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | **是** | YYYY-MM-DD |
| `flight_no` | string | **是** | 航班号 2-3字母 + 数字，如 CA1234 |
| `dep_icao` | string | **是** | 4 位大写 ICAO，如 ZBAA |
| `arr_icao` | string | **是** | 4 位大写 ICAO，如 ZGGG |
| `is_public` | boolean | 否 | 默认 false |
| 其余字段 | - | 否 | 见数据模型，不传则为空字符串 |

- **成功响应 201**：返回完整 flight 对象

**curl 示例**：

```bash
curl -s -X POST $BASE/api/flights \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{
    "date": "2026-07-15",
    "flight_no": "CA1234",
    "dep_icao": "ZBAA",
    "arr_icao": "ZGGG",
    "airline": "中国国际航空",
    "aircraft": "B738",
    "cabin_class": "economy",
    "is_public": true
  }' | jq
```

---

### 4.3 GET /api/flights/{id} — 飞行日志详情

- **认证**：公开的无需登录，私有的需登录且为所有者
- **成功响应 200**：返回完整 flight + tickets 数组

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "...": "...",
    "tickets": [
      {
        "id": "uuid",
        "image_url": "https://...",
        "caption": "登机牌",
        "sort_order": 0
      }
    ]
  }
}
```

**curl 示例**：

```bash
curl -s $BASE/api/flights/<flight_id> \
  -H "Cookie: $COOKIE" | jq
```

---

### 4.4 PUT /api/flights/{id} — 修改飞行日志

- **认证**：需要（只能修改自己的）
- **请求体** (JSON)：所有字段可选，只传要修改的

**curl 示例**：

```bash
curl -s -X PUT $BASE/api/flights/<flight_id> \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"seat": "12A", "is_public": false}' | jq
```

---

### 4.5 DELETE /api/flights/{id} — 删除飞行日志

- **认证**：需要（只能删除自己的）
- **成功响应 200**：`{ "success": true, "data": { "deleted": true } }`

**curl 示例**：

```bash
curl -s -X DELETE $BASE/api/flights/<flight_id> \
  -H "Cookie: $COOKIE" | jq
```

---

### 4.6 POST /api/flights/{id}/tickets — 上传机票

- **认证**：需要（只能给自己的 flight 上传）
- **请求**：`multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ticket` | File | **是** | 图片文件 JPEG/PNG/WebP/GIF ≤5MB |
| `caption` | string | 否 | 图片说明 ≤500 字符 |

- **成功响应 201**：

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "image_url": "https://cjdjtapzkjambtawbfiz.supabase.co/storage/v1/object/public/flight-tickets/...",
    "caption": "登机牌",
    "sort_order": 0
  }
}
```

- **错误响应**：
  - 400/422：文件类型不支持 / 文件过大 / 文件为空 / 缺少 ticket 字段
  - 401：未登录
  - 403：不是 flight 所有者
  - 404：flight 不存在

**curl 示例**：

```bash
# 生成测试图片
convert -size 100x100 xc:white test_ticket.jpg

# 上传
curl -s -X POST $BASE/api/flights/<flight_id>/tickets \
  -H "Cookie: $COOKIE" \
  -F "ticket=@test_ticket.jpg" \
  -F "caption=登机牌正面" | jq
```

---

## 5. 测试用例

### 5.1 正常流程（16 用例）

**创建飞行日志：**

- [ ] **TC-F001**：创建一条最小飞行日志（仅必填字段） | 预期：201，返回完整 flight，is_public=false
- [ ] **TC-F002**：创建一条完整飞行日志（填满所有可选字段） | 预期：201，返回所有字段值正确
- [ ] **TC-F003**：创建公开日志 `is_public: true` | 预期：201，is_public=true
- [ ] **TC-F004**：创建含专业字段的日志（v1_vr_v2/cruise_alt/sid/star 等） | 预期：201，专业字段正确
- [ ] **TC-F005**：创建含备注的日志（4 种 remarks） | 预期：201，备注字段正确

**查询列表：**

- [ ] **TC-F006**：获取飞行日志列表（默认分页） | 预期：200，data 为数组，pagination 完整
- [ ] **TC-F007**：第二页查询 | 预期：200，pagination.hasMore 正确
- [ ] **TC-F008**：按 `is_public=true` 筛选 | 预期：200，只返回公开的日志
- [ ] **TC-F009**：按 `is_public=false` 筛选 | 预期：200，只返回私有的日志
- [ ] **TC-F010**：空列表（新用户无日志） | 预期：200，data=[], total=0

**查看详情：**

- [ ] **TC-F011**：查看自己私有日志详情 | 预期：200，含完整字段 + tickets=[]
- [ ] **TC-F012**：查看自己公开日志详情（匿名） | 预期：200，无需登录
- [ ] **TC-F013**：查看带机票的日志详情 | 预期：200，tickets 数组非空，含 image_url

**修改日志：**

- [ ] **TC-F014**：修改单个字段（seat） | 预期：200，seat 已更新
- [ ] **TC-F015**：修改多个字段（airline + is_public） | 预期：200，全部更新
- [ ] **TC-F016**：将私有改为公开 | 预期：200，is_public 变为 true

---

### 5.2 边界测试（20 用例）

**航班号格式：**

- [ ] **TC-F101**：flight_no 最小长度（如 CA1） | 预期：201
- [ ] **TC-F102**：flight_no 最大长度（如 CA9999） | 预期：201
- [ ] **TC-F103**：flight_no 含字母后缀（如 CA1234A） | 预期：201
- [ ] **TC-F104**：flight_no 小写字母 | 预期：422，必须大写
- [ ] **TC-F105**：flight_no 含中文 | 预期：422，格式错误
- [ ] **TC-F106**：flight_no 纯数字 | 预期：422，格式错误

**ICAO 代码格式：**

- [ ] **TC-F107**：dep_icao 小写字母 | 预期：422，必须大写
- [ ] **TC-F108**：dep_icao 3 位字母 | 预期：422，必须 4 位
- [ ] **TC-F109**：dep_icao 5 位字母 | 预期：422，必须 4 位
- [ ] **TC-F110**：dep_icao 含数字 | 预期：422，必须纯字母

**日期格式：**

- [ ] **TC-F111**：date 为 YYYY-MM-DD | 预期：201
- [ ] **TC-F112**：date 为 YYYY/MM/DD | 预期：422，格式错误
- [ ] **TC-F113**：date 为 MM-DD-YYYY | 预期：422，格式错误

**字段长度：**

- [ ] **TC-F114**：airline 恰好 100 字符 | 预期：201
- [ ] **TC-F115**：remarks_passenger 恰好 1000 字符 | 预期：201

**分页边界：**

- [ ] **TC-F116**：pageSize=1（最小） | 预期：200，返回 1 条
- [ ] **TC-F117**：pageSize=50（最大） | 预期：200
- [ ] **TC-F118**：page=999（远超数据量） | 预期：200，data=[], total 不变
- [ ] **TC-F119**：page=0（非法） | 预期：200，自动修正为 page=1

**同机场校验：**

- [ ] **TC-F120**：dep_icao == arr_icao | 预期：422，提示不能相同

---

### 5.3 异常测试（12 用例）

- [ ] **TC-F201**：POST 缺少必填字段 date | 预期：422
- [ ] **TC-F202**：POST 缺少必填字段 flight_no | 预期：422
- [ ] **TC-F203**：POST 缺少必填字段 dep_icao | 预期：422
- [ ] **TC-F204**：POST 缺少必填字段 arr_icao | 预期：422
- [ ] **TC-F205**：POST 空 JSON 请求体 | 预期：422
- [ ] **TC-F206**：POST 非 JSON 请求体（纯文本） | 预期：422 或 400
- [ ] **TC-F207**：PUT 空 JSON 请求体 | 预期：422
- [ ] **TC-F208**：GET 不存在的 flight ID | 预期：404
- [ ] **TC-F209**：PUT 不存在的 flight ID | 预期：404
- [ ] **TC-F210**：DELETE 不存在的 flight ID | 预期：404
- [ ] **TC-F211**：POST is_public 为非布尔值（如字符串 "yes"） | 预期：422
- [ ] **TC-F212**：PUT 不传任何有效字段 | 预期：422，至少需要一个

---

### 5.4 安全测试（14 用例）

**认证：**

- [ ] **TC-F301**：未登录 GET /api/flights | 预期：401
- [ ] **TC-F302**：未登录 POST /api/flights | 预期：401
- [ ] **TC-F303**：未登录 PUT /api/flights/{id} | 预期：401
- [ ] **TC-F304**：未登录 DELETE /api/flights/{id} | 预期：401
- [ ] **TC-F305**：未登录 POST /api/flights/{id}/tickets | 预期：401

**跨用户隔离：**

- [ ] **TC-F306**：用户 A 查看用户 B 的私有日志 | 预期：404
- [ ] **TC-F307**：用户 A 修改用户 B 的日志 | 预期：403 或 404
- [ ] **TC-F308**：用户 A 删除用户 B 的日志 | 预期：403 或 404
- [ ] **TC-F309**：用户 A 上传机票到用户 B 的日志 | 预期：403 或 404

**提权 / 篡改：**

- [ ] **TC-F310**：创建时伪造 user_id 为他人 | 预期：RLS 忽略伪造值，自动使用 auth.uid()
- [ ] **TC-F311**：PUT 尝试修改 user_id | 预期：修改被忽略或 200（user_id 不变）

**公开可见性：**

- [ ] **TC-F312**：匿名用户访问公开日志详情 | 预期：200，可查看
- [ ] **TC-F313**：匿名用户访问私有日志详情 | 预期：404
- [ ] **TC-F314**：匿名用户访问 /api/flights 列表 | 预期：401（需要登录）

---

### 5.5 机票上传测试（11 用例）

**正常上传：**

- [ ] **TC-F401**：上传 JPEG 机票图片 | 预期：201，image_url 可访问
- [ ] **TC-F402**：上传 PNG 机票图片 | 预期：201
- [ ] **TC-F403**：上传 WebP 机票图片 | 预期：201
- [ ] **TC-F404**：上传带 caption 的机票 | 预期：201，caption 已保存
- [ ] **TC-F405**：同一 flight 上传多张机票 | 预期：每张都 201，sort_order 递增

**边界：**

- [ ] **TC-F406**：上传恰好 5MB 的图片 | 预期：201
- [ ] **TC-F407**：caption 恰好 500 字符 | 预期：201

**异常：**

- [ ] **TC-F408**：上传超过 5MB 的图片 | 预期：400 或 422
- [ ] **TC-F409**：上传非图片文件（如 PDF） | 预期：400 或 422
- [ ] **TC-F410**：上传空文件（0 字节） | 预期：400 或 422
- [ ] **TC-F411**：表单字段名不是 `ticket` | 预期：400 或 422

---

### 5.6 集成测试（4 用例）

- [ ] **TC-F501**：创建→列表查询→详情→修改→删除 完整流程 | 预期：每步都正确
- [ ] **TC-F502**：创建→上传机票→查看详情（含 tickets）→删除（CASCADE 删除 tickets） | 预期：删除后无残留
- [ ] **TC-F503**：多用户隔离：A 创建 3 条、B 创建 2 条 → A 只能看到自己的 3 条 | 预期：用户隔离正确
- [ ] **TC-F504**：创建公开日志→匿名可查看→登录后其他用户也可查看 | 预期：公开机制正确

---

## 6. 测试准备

```bash
# 假设 BASE 和 Cookie 已在之前注册获取
BASE=http://localhost:3000

# 创建用户 A 和 B，分别登录获取 cookie
# （使用模块 2 的注册/登录 API）

# 创建一条基本日志，保存返回的 ID
FLIGHT_ID=$(curl -s -X POST $BASE/api/flights \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_A" \
  -d '{"date":"2026-07-15","flight_no":"CA1234","dep_icao":"ZBAA","arr_icao":"ZGGG","airline":"中国国际航空"}' \
  | jq -r '.data.id')

echo "Flight ID: $FLIGHT_ID"

# 生成测试图片
printf '\x89PNG\r\n\x1a\n' > /tmp/test_ticket.png  # (简陋但有效的 PNG)

# 上传机票
curl -s -X POST $BASE/api/flights/$FLIGHT_ID/tickets \
  -H "Cookie: $COOKIE_A" \
  -F "ticket=@/tmp/test_ticket.png;type=image/png" \
  -F "caption=登机牌" | jq
```

---

## 7. 验收标准

- [ ] 所有正常流程用例 PASS（16/16）
- [ ] 所有边界测试 PASS（20/20）
- [ ] 所有异常测试 PASS（12/12）
- [ ] 所有安全测试 PASS（14/14）
- [ ] 所有机票上传测试 PASS（11/11）
- [ ] 所有集成测试 PASS（4/4）
- [ ] 无控制台错误或 500

**总用例数：77**
