# 模块 05 · 统计 API

> 状态：待测试  
> 依赖：模块 01（数据库）+ 模块 02（认证）+ 模块 04（飞行日志）  
> 交付物：`GET /api/stats` + `tests/05-stats.md`

---

## 1. 模块概述

提供当前用户的飞行数据聚合统计，用于仪表盘展示，包括：
- 总飞行次数、总里程、总时长
- 独特出发/到达机场数
- 独特机型数、航司数
- 首次/最近飞行日期

数据来源：数据库 `user_stats` 视图（对 `flights` 表实时聚合，含私有日志）。

---

## 2. 前置条件

- 模块 01、02、04 已完成
- 数据库中至少有一个用户的飞行日志（用于非空验证）

---

## 3. 接口清单

### 3.1 GET /api/stats — 当前用户飞行统计

- **认证**：需要
- **请求参数**：无
- **成功响应 200**（有飞行记录）：

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "nickname": "测试A",
    "username": "test_a",
    "total_flights": 5,
    "unique_dep_airports": 3,
    "unique_arr_airports": 4,
    "total_distance_km": 8500,
    "total_flight_minutes": 720,
    "unique_aircraft_types": 3,
    "unique_airlines": 2,
    "first_flight_date": "2026-01-15",
    "last_flight_date": "2026-07-19"
  }
}
```

- **成功响应 200**（无飞行记录）—— 返回全 0：

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "nickname": "",
    "username": "",
    "total_flights": 0,
    "unique_dep_airports": 0,
    "unique_arr_airports": 0,
    "total_distance_km": 0,
    "total_flight_minutes": 0,
    "unique_aircraft_types": 0,
    "unique_airlines": 0,
    "first_flight_date": null,
    "last_flight_date": null
  }
}
```

- **错误响应**：
  - 401：未登录

**curl 示例**：

```bash
curl -s $BASE/api/stats -H "Cookie: $COOKIE" | jq
```

---

## 4. 测试用例

### 4.1 正常流程（4 用例）

- [ ] **TC-S001**：有飞行记录的用户查询统计 | 预期：200，total_flights > 0，各聚合字段正确
- [ ] **TC-S002**：验证统计字段完整性（所有 11 个字段都存在） | 预期：200，无缺失字段
- [ ] **TC-S003**：验证数据准确性：创建 3 条日志（2 不同机场 + 2 不同机型）→ 检查计数 | 预期：total_flights=3, unique_dep_airports≥2, unique_aircraft_types≥2
- [ ] **TC-S004**：空用户（注册但未创建任何日志）查询统计 | 预期：200，全部为 0 或 null

### 4.2 边界测试（3 用例）

- [ ] **TC-S005**：只有 1 条日志 | 预期：total_flights=1，所有 unique_*=1
- [ ] **TC-S006**：distance_km 全为 NULL 的日志 | 预期：total_distance_km=0（COALESCE 兜底）
- [ ] **TC-S007**：flight_duration 全为 NULL 的日志 | 预期：total_flight_minutes=0

### 4.3 数据准确测试（5 用例）

- [ ] **TC-S008**：dep_icao 去重正确：3 条日志 2 个不同出发机场 | 预期：unique_dep_airports=2
- [ ] **TC-S009**：arr_icao 去重正确：3 条日志 3 个不同到达机场 | 预期：unique_arr_airports=3
- [ ] **TC-S010**：aircraft 去重正确（含空字符串） | 预期：空字符串不计入 unique_aircraft_types
- [ ] **TC-S011**：airline 去重正确 | 预期：unique_airlines 与 airline COUNT(DISTINCT) 一致
- [ ] **TC-S012**：first/last flight_date 正确 | 预期：MIN/MAX 与最早/最晚日志日期一致

### 4.4 安全测试（3 用例）

- [ ] **TC-S013**：未登录请求 | 预期：401
- [ ] **TC-S014**：用户 A 不能看到用户 B 的统计 | 预期：只返回自己的数据（user_id 匹配）
- [ ] **TC-S015**：私有日志计入统计（统计不含公开筛选） | 预期：total_flights 包含 is_public=false 的日志

### 4.5 集成测试（2 用例）

- [ ] **TC-S016**：创建日志 → 查询统计 → 删除日志 → 再次查询 → 统计减少 | 预期：实时反映变化
- [ ] **TC-S017**：两用户独立统计互不干扰 | 预期：A 和 B 的 total_flights 各不相同

---

## 5. 测试准备

```bash
BASE=http://localhost:3000

# 使用模块 2 注册的用户 A，获取 COOKIE
# 使用模块 4 创建几条飞行日志作为测试数据

# 创建几条不同机场/机型的日志
curl -s -X POST $BASE/api/flights \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_A" \
  -d '{"date":"2026-06-01","flight_no":"CA1234","dep_icao":"ZBAA","arr_icao":"ZGGG","aircraft":"B738","airline":"中国国际航空","distance_km":1967,"flight_duration":180}' | jq

curl -s -X POST $BASE/api/flights \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_A" \
  -d '{"date":"2026-06-15","flight_no":"MU5678","dep_icao":"ZGGG","arr_icao":"ZSPD","aircraft":"A320","airline":"中国东方航空","distance_km":1208,"flight_duration":130}' | jq

curl -s -X POST $BASE/api/flights \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_A" \
  -d '{"date":"2026-07-01","flight_no":"CA9999","dep_icao":"ZBAA","arr_icao":"ZUCK","aircraft":"B738","airline":"中国国际航空","distance_km":1460,"flight_duration":150}' | jq

# 查询统计
curl -s $BASE/api/stats -H "Cookie: $COOKIE_A" | jq
```

---

## 6. 验收标准

- [ ] 所有正常流程 PASS（4/4）
- [ ] 所有边界测试 PASS（3/3）
- [ ] 所有数据准确测试 PASS（5/5）
- [ ] 所有安全测试 PASS（3/3）
- [ ] 所有集成测试 PASS（2/2）
- [ ] 无控制台错误或 500

**总用例数：17**
