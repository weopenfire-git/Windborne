# 模块 01 · 数据库

> 状态：代码已完成，待测试  
> 依赖：无（基础模块）  
> 测试前需先完成 Supabase 项目创建（见 `docs/05-Supabase注册指导.md`）

---

## 1. 模块概述

本模块定义 Windborne 的全部数据库结构，包括 9 张表、索引、行级权限（RLS）、触发器、视图和种子数据。这是整个项目的基础设施层，所有其他模块都依赖它。

### 设计目标

- 完整复刻纸质飞行日志的字段结构
- 通过 RLS 实现严格的数据隔离（用户只能改自己的数据）
- 通过触发器自动维护数据一致性（计数、时间戳、距离计算）
- 预填机场和机型数据，支持后续知识库功能

---

## 2. 前置条件

### 2.1 环境要求

- 一个可用的 Supabase 项目（区域：Singapore）
- Supabase Dashboard 的 SQL Editor 访问权限
- 以下环境变量（测试时填入 `.env` 或直接在 SQL Editor 执行）：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`（仅服务端测试用）

### 2.2 执行迁移

按顺序在 Supabase SQL Editor 执行以下文件（位于 `migrations/` 目录）：

```
001_init_tables.sql      → 创建 9 张表
002_init_indexes.sql     → 创建索引
003_init_rls.sql         → 启用 RLS + 策略
004_init_triggers.sql    → 创建触发器
005_init_views.sql       → 创建视图
006_seed_airports.sql    → 预填 47 个机场
007_seed_aircraft.sql    → 预填 49 个机型
```

**每个文件执行后应该看到一条成功提示**（如 `001_init_tables: 9 tables created`）。

---

## 3. 数据模型

### 3.1 表清单

| # | 表名 | 用途 | RLS | P0 用 |
|---|------|------|-----|-------|
| 1 | `users` | 用户资料 | ✅ | ✅ |
| 2 | `airports` | 机场百科 | ✅ 只读 | ✅ |
| 3 | `aircraft` | 机型百科 | ✅ 只读 | ✅ |
| 4 | `flights` | 飞行日志主表 | ✅ | ✅ |
| 5 | `flight_tickets` | 机票图片 | ✅ | ✅ |
| 6 | `posts` | 帖子 | ✅ | ⏳ P1 |
| 7 | `comments` | 评论 | ✅ | ⏳ P1 |
| 8 | `follows` | 关注关系 | ✅ | ⏳ P2 |
| 9 | `likes` | 点赞 | ✅ | ⏳ P1 |

### 3.2 核心表字段速查

#### users

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，关联 auth.users |
| email | TEXT | 邮箱 |
| username | TEXT | 用户名（唯一） |
| nickname | TEXT | 显示昵称 |
| avatar_url | TEXT | 头像 URL |
| bio | TEXT | 个人简介 |
| role | TEXT | member / verified_aviator / admin |
| created_at | TIMESTAMPTZ | 注册时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### flights（关键字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 所有者 |
| date | DATE | 飞行日期 |
| flight_no | TEXT | 航班号（如 ZH9507） |
| airline | TEXT | 航司名 |
| aircraft | TEXT | 机型（如 A350-900） |
| registration | TEXT | 注册号（如 B-304J） |
| dep_icao | TEXT | 出发机场 ICAO |
| arr_icao | TEXT | 到达机场 ICAO |
| is_public | BOOLEAN | 是否公开 |
| distance_km | INTEGER | 自动计算的距离 |
| flight_duration | INTEGER | 飞行时长（分钟） |

完整字段见 `docs/03-数据模型设计.md`。

---

## 4. RLS 权限策略

### 4.1 策略总览

| 表 | 匿名读 | 登录读 | 插入 | 更新 | 删除 |
|----|--------|--------|------|------|------|
| users | ✅ | ✅ | 仅自己 | 仅自己 | - |
| flights | 仅公开 | 公开+自己 | 仅自己 | 仅自己 | 仅自己 |
| flight_tickets | 关联公开/自己 | 同左 | 仅 flight 所有者 | 同左 | 同左 |
| posts | ✅ | ✅ | 仅自己 | 仅自己 | 仅自己 |
| comments | ✅ | ✅ | 仅自己 | - | 仅自己 |
| likes | ✅ | ✅ | 仅自己 | - | 仅自己 |
| follows | ✅ | ✅ | 仅 follower | - | 仅 follower |
| airports | ✅ | ✅ | - | - | - |
| aircraft | ✅ | ✅ | - | - | - |

### 4.2 关键安全点

- **flights.is_public**：控制单条日志是否对外可见
- **flight_tickets**：跟随关联 flight 的可见性，不独立设公开
- **users**：email 默认不公开查询（通过 API 层过滤），但数据库层存有

---

## 5. 触发器

| 触发器 | 时机 | 作用 |
|--------|------|------|
| `on_auth_user_created` | auth.users 插入后 | 自动创建 users 记录 |
| `flights_updated_at` | flights 更新前 | 自动更新 updated_at |
| `users_updated_at` | users 更新前 | 自动更新 updated_at |
| `flights_calculate_metrics` | flights 插入/更新前 | 自动计算 distance_km |
| `on_like_change` | likes 插入/删除后 | 同步 posts.likes_count |
| `on_comment_change` | comments 插入/删除后 | 同步 posts.comments_count |

---

## 6. 视图

| 视图 | 用途 |
|------|------|
| `user_stats` | 用户飞行统计（次数/时长/距离/机场数） |
| `public_feed` | 公开广场信息流 |
| `airport_stats` | 机场热度统计 |
| `aircraft_stats` | 机型热度统计 |

---

## 7. 测试用例

### 7.1 准备工作

在 Supabase Dashboard 创建 2 个测试用户：

1. **用户 A**：通过 Authentication → Users → Add user 创建
   - 邮箱：`test-a@windborne.test`
   - 密码：`Test1234!`
2. **用户 B**：同上
   - 邮箱：`test-b@windborne.test`
   - 密码：`Test1234!`

创建后，检查 `users` 表是否自动插入了对应记录（触发器是否生效）。

### 7.2 正常流程测试

#### TC-001 · 表创建验证

```sql
-- 预期：返回 9
SELECT count(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users','airports','aircraft','flights','flight_tickets','posts','comments','follows','likes');
```
**预期**：count = 9

#### TC-002 · 种子数据验证 - 机场

```sql
SELECT count(*) FROM airports;
```
**预期**：count ≥ 40

#### TC-003 · 种子数据验证 - 机型

```sql
SELECT count(*) FROM aircraft;
```
**预期**：count ≥ 45

#### TC-004 · 新用户触发器验证

在 Authentication 创建测试用户后：
```sql
SELECT id, email, username, nickname FROM users WHERE email LIKE 'test-%@windborne.test';
```
**预期**：返回 2 条记录，username 自动生成（邮箱前缀 + _ + UUID 前 4 位）

#### TC-005 · 插入飞行日志

以用户 A 身份（用 anon key + A 的 JWT）：
```sql
-- 需要通过 API 或 SQL Editor (用 service_role key) 执行
INSERT INTO flights (
  user_id, date, flight_no, airline, aircraft, 
  dep_icao, arr_icao, dep_city, arr_city, is_public
) VALUES (
  (SELECT id FROM users WHERE email = 'test-a@windborne.test'),
  '2026-07-30', 'ZH9507', '深圳航空', 'A350-900',
  'ZGSZ', 'ZSSS', '深圳', '上海', false
);
```
**预期**：插入成功，返回 id

#### TC-006 · 距离自动计算

承接 TC-005：
```sql
SELECT distance_km FROM flights WHERE flight_no = 'ZH9507';
```
**预期**：distance_km 非空（深圳→上海约 1200-1300km）

#### TC-007 · updated_at 自动更新

```sql
UPDATE flights SET seat = '40L' WHERE flight_no = 'ZH9507';
SELECT updated_at, created_at FROM flights WHERE flight_no = 'ZH9507';
```
**预期**：updated_at > created_at

#### TC-008 · 视图查询 - user_stats

```sql
SELECT * FROM user_stats WHERE username LIKE 'test-a%';
```
**预期**：total_flights = 1, total_distance_km > 0

#### TC-009 · 视图查询 - public_feed（空）

```sql
SELECT count(*) FROM public_feed;
```
**预期**：count = 0（因为 TC-005 的 is_public=false）

#### TC-010 · 公开日志出现在广场

```sql
UPDATE flights SET is_public = true WHERE flight_no = 'ZH9507';
SELECT count(*) FROM public_feed;
```
**预期**：count = 1

### 7.3 边界测试

#### TC-101 · 空用户统计

```sql
-- 用户 B 还没添加任何飞行日志
SELECT total_flights, total_distance_km FROM user_stats 
WHERE username LIKE 'test-b%';
```
**预期**：total_flights = 0, total_distance_km = 0

#### TC-102 · 未知机场的距离计算

```sql
-- 用一个 airports 表里不存在的 ICAO 代码
INSERT INTO flights (
  user_id, date, flight_no, dep_icao, arr_icao
) VALUES (
  (SELECT id FROM users WHERE email = 'test-a@windborne.test'),
  '2026-08-01', 'XX123', 'ZZZZ', 'YYYY'
);
SELECT distance_km FROM flights WHERE flight_no = 'XX123';
```
**预期**：distance_km 为 NULL（不报错）

#### TC-103 · 重复 username

```sql
UPDATE users SET username = 'duplicate' WHERE email = 'test-a@windborne.test';
UPDATE users SET username = 'duplicate' WHERE email = 'test-b@windborne.test';
```
**预期**：第二次 UPDATE 失败（唯一约束）

#### TC-104 · 自关注

```sql
INSERT INTO follows (follower_id, followed_id)
SELECT id, id FROM users WHERE email = 'test-a@windborne.test';
```
**预期**：插入失败（CHECK 约束 follower_id != followed_id）

### 7.4 异常测试

#### TC-201 · 不存在的 user_id

```sql
INSERT INTO flights (user_id, date, flight_no, dep_icao, arr_icao)
VALUES ('00000000-0000-0000-0000-000000000000', '2026-01-01', 'XX', 'ZGSZ', 'ZSSS');
```
**预期**：外键约束失败

#### TC-202 · 缺少必填字段

```sql
INSERT INTO flights (user_id) VALUES (gen_random_uuid());
```
**预期**：NOT NULL 约束失败（date, flight_no, dep_icao, arr_icao 必填）

#### TC-203 · 非法 role 值

```sql
UPDATE users SET role = 'superadmin' WHERE email = 'test-a@windborne.test';
```
**预期**：CHECK 约束失败

#### TC-204 · 非法 likes.target_type

```sql
INSERT INTO likes (user_id, target_type, target_id)
SELECT id, 'invalid_type', gen_random_uuid() FROM users WHERE email = 'test-a@windborne.test';
```
**预期**：CHECK 约束失败

### 7.5 安全测试（RLS）

> 以下测试需要用 Supabase JS Client 或 API 调用，模拟不同身份访问。  
> 在 SQL Editor 用 service_role key 执行会绕过 RLS，**必须用 anon key + JWT 测试**。

#### TC-301 · 未登录用户不能查看私有 flights

用 anon key（不带 JWT）查询：
```javascript
const { data, error } = await supabase
  .from('flights')
  .select('*')
  .eq('flight_no', 'ZH9507');
```
**预期**：如果该 flight 是私有的，data 为空数组

#### TC-302 · 用户 A 不能修改用户 B 的 flight

用用户 A 的 JWT：
```javascript
// 假设 flight 属于用户 B
const { error } = await supabase
  .from('flights')
  .update({ seat: '99A' })
  .eq('id', '<用户B的flight_id>');
```
**预期**：返回错误或 0 行受影响（RLS 拒绝）

#### TC-303 · 用户 A 不能查看用户 B 的私有 flight

```javascript
const { data } = await supabase
  .from('flights')
  .select('*')
  .eq('user_id', '<用户B的id>')
  .eq('is_public', false);
```
**预期**：data 为空数组

#### TC-304 · 用户 A 不能给用户 B 的 flight 上传 ticket

```javascript
const { error } = await supabase
  .from('flight_tickets')
  .insert({
    flight_id: '<用户B的flight_id>',
    user_id: '<用户A的id>',
    image_url: 'https://example.com/test.jpg'
  });
```
**预期**：插入失败（RLS 拒绝，因为 flight 所有者不是 A）

#### TC-305 · 匿名用户可以查看公开 flights

```javascript
const { data } = await supabase
  .from('flights')
  .select('*')
  .eq('is_public', true);
```
**预期**：返回所有公开的 flights

#### TC-306 · 匿名用户可以查看 airports / aircraft

```javascript
const { data } = await supabase.from('airports').select('*');
const { data: ac } = await supabase.from('aircraft').select('*');
```
**预期**：都能返回数据

#### TC-307 · 匿名用户不能插入 flights

```javascript
const { error } = await supabase
  .from('flights')
  .insert({ user_id: 'xxx', date: '2026-01-01', flight_no: 'XX', dep_icao: 'ZGSZ', arr_icao: 'ZSSS' });
```
**预期**：插入失败（RLS 拒绝）

### 7.6 视图测试

#### TC-401 · public_feed 只含公开记录

```sql
SELECT count(*) FROM public_feed;
SELECT count(*) FROM flights WHERE is_public = true;
```
**预期**：两个 count 相等

#### TC-402 · public_feed 包含用户信息

```sql
SELECT nickname, flight_no FROM public_feed LIMIT 1;
```
**预期**：返回的 nickname 来自 users 表，flight_no 来自 flights 表

#### TC-403 · airport_stats 机场统计

```sql
SELECT * FROM airport_stats WHERE flight_count > 0 LIMIT 5;
```
**预期**：至少 ZGSZ 和 ZSSS 出现（因为测试数据有深圳→上海的 flight）

### 7.7 索引验证

#### TC-501 · 索引存在性

```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY indexname;
```
**预期**：返回至少 15 个索引

---

## 8. 验收标准

### 必须通过

- [ ] TC-001 表创建（9 张表）
- [ ] TC-002 机场种子数据（≥40）
- [ ] TC-003 机型种子数据（≥45）
- [ ] TC-004 新用户触发器
- [ ] TC-005 插入飞行日志
- [ ] TC-006 距离自动计算
- [ ] TC-301 未登录不能看私有
- [ ] TC-302 不能改别人的数据
- [ ] TC-303 不能看别人的私有
- [ ] TC-304 不能给别人上传 ticket
- [ ] TC-305 匿名可看公开
- [ ] TC-307 匿名不能插入

### 建议通过

- [ ] TC-007 updated_at 自动更新
- [ ] TC-101 空用户统计
- [ ] TC-102 未知机场不报错
- [ ] TC-401 public_feed 一致性
- [ ] TC-501 索引存在

### 可选（P1 模块相关）

- [ ] TC-201~204 异常输入约束
- [ ] TC-103 重复 username
- [ ] TC-104 自关注

---

## 9. 已知限制

1. **flight_duration 暂未自动计算**：时间字段是字符串格式（"17:05"），需要应用层解析后写入，触发器暂不处理
2. **airports 表数据非完整**：只预填了 47 个中国主要机场，海外机场待后续补充
3. **aircraft 表 COMAC 代码**：ARJ21 和 C919 没有正式 ICAO 代码，使用自定义代码
4. **users.email 可见性**：数据库层 email 字段可被查询，API 层需过滤不返回给其他用户

---

## 10. 测试报告模板

测试完成后，按以下格式输出报告：

```markdown
## 测试报告 · 模块 01 数据库

### 测试环境
- Supabase URL: https://xxx.supabase.co
- 测试时间: 2026-07-xx
- 测试人: xxx

### 测试结果汇总
| 分类 | 通过 | 失败 | 跳过 |
|------|------|------|------|
| 正常 (TC-001~010) | x | x | x |
| 边界 (TC-101~104) | x | x | x |
| 异常 (TC-201~204) | x | x | x |
| 安全 (TC-301~307) | x | x | x |
| 视图 (TC-401~403) | x | x | x |
| 索引 (TC-501) | x | x | x |

### 失败用例详情
（每个 FAIL 用例写明：复现步骤、预期、实际）

### 结论
- 通过率: x/x
- 阻塞问题: x 个
- 建议: xxx
```

---

_测试完成后请把报告发给项目负责人。_
