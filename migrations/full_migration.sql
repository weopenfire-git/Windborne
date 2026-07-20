-- ======= 001_init_tables.sql =======
-- Migration: 001_init_tables
-- Description: 创建 Windborne 所有数据表
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: -

-- ============================================
-- 1. users · 用户资料表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  nickname    TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  bio         TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'verified_aviator', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS '用户资料表，id 与 Supabase auth.users 关联';

-- ============================================
-- 2. airports · 机场库（知识库基础数据）
-- ============================================
CREATE TABLE IF NOT EXISTS airports (
  icao_code   TEXT PRIMARY KEY,
  iata_code   TEXT,
  name_cn     TEXT NOT NULL,
  name_en     TEXT,
  city_cn     TEXT NOT NULL,
  city_en     TEXT,
  country     TEXT NOT NULL DEFAULT '中国',
  latitude    DECIMAL(9,6),
  longitude   DECIMAL(9,6),
  elevation   INTEGER,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE airports IS '机场百科，知识库基础数据';

-- ============================================
-- 3. aircraft · 机型库（知识库基础数据）
-- ============================================
CREATE TABLE IF NOT EXISTS aircraft (
  icao_code    TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  family       TEXT NOT NULL,
  engine_count INTEGER,
  engine_type  TEXT,
  cruise_range INTEGER,
  seats_typical INTEGER,
  description  TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE aircraft IS '机型百科，知识库基础数据';

-- ============================================
-- 4. flights · 飞行日志主表
-- ============================================
CREATE TABLE IF NOT EXISTS flights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 基本信息
  date            DATE NOT NULL,
  flight_no       TEXT NOT NULL,
  airline         TEXT NOT NULL DEFAULT '',
  airline_icao    TEXT NOT NULL DEFAULT '',
  aircraft        TEXT NOT NULL DEFAULT '',
  registration    TEXT NOT NULL DEFAULT '',
  seat            TEXT NOT NULL DEFAULT '',
  cabin_class     TEXT NOT NULL DEFAULT '',

  -- 航段信息
  dep_icao        TEXT NOT NULL,
  dep_city        TEXT NOT NULL DEFAULT '',
  arr_icao        TEXT NOT NULL,
  arr_city        TEXT NOT NULL DEFAULT '',
  via             TEXT NOT NULL DEFAULT '',

  -- 时间
  dep_time_scheduled  TEXT NOT NULL DEFAULT '',
  dep_time_actual     TEXT NOT NULL DEFAULT '',
  arr_time_scheduled  TEXT NOT NULL DEFAULT '',
  arr_time_actual     TEXT NOT NULL DEFAULT '',

  -- 专业字段（复刻纸质版）
  v1_vr_v2        TEXT NOT NULL DEFAULT '',
  cruise_alt      TEXT NOT NULL DEFAULT '',
  cruise_mach     TEXT NOT NULL DEFAULT '',
  cruise_cas      TEXT NOT NULL DEFAULT '',
  route           TEXT NOT NULL DEFAULT '',
  sid             TEXT NOT NULL DEFAULT '',
  star            TEXT NOT NULL DEFAULT '',
  approach        TEXT NOT NULL DEFAULT '',
  weather_dep     TEXT NOT NULL DEFAULT '',
  weather_arr     TEXT NOT NULL DEFAULT '',

  -- 留言（复刻纸质版四级留言）
  remarks_passenger  TEXT NOT NULL DEFAULT '',
  remarks_captain    TEXT NOT NULL DEFAULT '',
  remarks_fo         TEXT NOT NULL DEFAULT '',
  remarks_purser     TEXT NOT NULL DEFAULT '',

  -- 元数据
  is_public       BOOLEAN NOT NULL DEFAULT false,
  distance_km     INTEGER,
  flight_duration INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE flights IS '飞行日志主表，复刻纸质版完整字段';

-- ============================================
-- 5. flight_tickets · 机票/票据图片
-- ============================================
CREATE TABLE IF NOT EXISTS flight_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id   UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  caption     TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE flight_tickets IS '机票/票据图片，关联到飞行日志';

-- ============================================
-- 6. posts · 动态广场帖子（P1 阶段使用）
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL,
  images          TEXT[] NOT NULL DEFAULT '{}',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  flight_id       UUID REFERENCES flights(id) ON DELETE SET NULL,
  likes_count     INTEGER NOT NULL DEFAULT 0,
  comments_count  INTEGER NOT NULL DEFAULT 0,
  views_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE posts IS '动态广场帖子，P1 阶段使用';

-- ============================================
-- 7. comments · 评论（P1 阶段使用）
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE comments IS '帖子评论，支持楼中楼回复';

-- ============================================
-- 8. follows · 关注关系（P2 阶段使用）
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id != followed_id)
);

COMMENT ON TABLE follows IS '用户关注关系';

-- ============================================
-- 9. likes · 点赞（P1 阶段使用）
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL CHECK (target_type IN ('post', 'flight', 'comment')),
  target_id    UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

COMMENT ON TABLE likes IS '点赞记录，支持帖子/飞行日志/评论';

-- 完成
SELECT '001_init_tables: 9 tables created' AS result;


-- ======= 002_init_indexes.sql =======
-- Migration: 002_init_indexes
-- Description: 创建索引提升查询性能
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: 001_init_tables

-- flights 索引
CREATE INDEX IF NOT EXISTS idx_flights_user_id ON flights(user_id);
CREATE INDEX IF NOT EXISTS idx_flights_user_date ON flights(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_flights_public ON flights(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_flights_flight_no ON flights(flight_no);
CREATE INDEX IF NOT EXISTS idx_flights_dep_icao ON flights(dep_icao);
CREATE INDEX IF NOT EXISTS idx_flights_arr_icao ON flights(arr_icao);
CREATE INDEX IF NOT EXISTS idx_flights_aircraft ON flights(aircraft);

-- flight_tickets 索引
CREATE INDEX IF NOT EXISTS idx_tickets_flight_id ON flight_tickets(flight_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON flight_tickets(user_id);

-- posts 索引
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);

-- comments 索引
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- follows 索引
CREATE INDEX IF NOT EXISTS idx_follows_followed_id ON follows(followed_id);

-- likes 索引
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

SELECT '002_init_indexes: all indexes created' AS result;


-- ======= 003_init_rls.sql =======
-- Migration: 003_init_rls
-- Description: 启用行级权限（RLS）并定义策略
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: 001_init_tables
-- 重要：RLS 是安全核心，任何表都必须启用

-- ============================================
-- 1. users 表 RLS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 所有登录用户可查看其他用户基本信息
DROP POLICY IF EXISTS "users_select_authenticated" ON users;
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT TO authenticated USING (true);

-- 匿名用户也可查看用户基本信息（公开主页需要）
DROP POLICY IF EXISTS "users_select_anon" ON users;
CREATE POLICY "users_select_anon" ON users
  FOR SELECT TO anon USING (true);

-- 用户只能修改自己的资料
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 用户只能插入自己的记录
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. flights 表 RLS
-- ============================================
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;

-- 登录用户：公开的任何人可看，私有的只有所有者可看
DROP POLICY IF EXISTS "flights_select_authenticated" ON flights;
CREATE POLICY "flights_select_authenticated" ON flights
  FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid());

-- 匿名用户：只能看公开的
DROP POLICY IF EXISTS "flights_select_anon" ON flights;
CREATE POLICY "flights_select_anon" ON flights
  FOR SELECT TO anon USING (is_public = true);

-- 插入：只有所有者
DROP POLICY IF EXISTS "flights_insert_own" ON flights;
CREATE POLICY "flights_insert_own" ON flights
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 更新：只有所有者
DROP POLICY IF EXISTS "flights_update_own" ON flights;
CREATE POLICY "flights_update_own" ON flights
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 删除：只有所有者
DROP POLICY IF EXISTS "flights_delete_own" ON flights;
CREATE POLICY "flights_delete_own" ON flights
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 3. flight_tickets 表 RLS
-- ============================================
ALTER TABLE flight_tickets ENABLE ROW LEVEL SECURITY;

-- 查看：关联的 flight 是公开的，或所有者
DROP POLICY IF EXISTS "tickets_select" ON flight_tickets;
CREATE POLICY "tickets_select" ON flight_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flights
      WHERE flights.id = flight_tickets.flight_id
      AND (flights.is_public = true OR flights.user_id = auth.uid())
    )
  );

-- 插入：只有 flight 所有者
DROP POLICY IF EXISTS "tickets_insert_own" ON flight_tickets;
CREATE POLICY "tickets_insert_own" ON flight_tickets
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM flights
      WHERE flights.id = flight_tickets.flight_id
      AND flights.user_id = auth.uid()
    )
  );

-- 更新：只有 flight 所有者
DROP POLICY IF EXISTS "tickets_update_own" ON flight_tickets;
CREATE POLICY "tickets_update_own" ON flight_tickets
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM flights
      WHERE flights.id = flight_tickets.flight_id
      AND flights.user_id = auth.uid()
    )
  );

-- 删除：只有 flight 所有者
DROP POLICY IF EXISTS "tickets_delete_own" ON flight_tickets;
CREATE POLICY "tickets_delete_own" ON flight_tickets
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM flights
      WHERE flights.id = flight_tickets.flight_id
      AND flights.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. posts 表 RLS（P1）
-- ============================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select_all" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 5. comments 表 RLS（P1）
-- ============================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_all" ON comments;
CREATE POLICY "comments_select_all" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_update_own" ON comments;
CREATE POLICY "comments_update_own" ON comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 6. likes 表 RLS（P1）
-- ============================================
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select_all" ON likes;
CREATE POLICY "likes_select_all" ON likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes_insert_own" ON likes;
CREATE POLICY "likes_insert_own" ON likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "likes_delete_own" ON likes;
CREATE POLICY "likes_delete_own" ON likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 7. follows 表 RLS（P2）
-- ============================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select_all" ON follows;
CREATE POLICY "follows_select_all" ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON follows;
CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "follows_delete_own" ON follows;
CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- ============================================
-- 8. airports / aircraft 表 RLS（公开只读）
-- ============================================
ALTER TABLE airports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "airports_select_all" ON airports;
CREATE POLICY "airports_select_all" ON airports FOR SELECT USING (true);

ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aircraft_select_all" ON aircraft;
CREATE POLICY "aircraft_select_all" ON aircraft FOR SELECT USING (true);

SELECT '003_init_rls: RLS enabled on all tables' AS result;


-- ======= 004_init_triggers.sql =======
-- Migration: 004_init_triggers
-- Description: 创建触发器函数和触发器
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: 001_init_tables

-- ============================================
-- 1. 新用户注册时自动创建 users 记录
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, username, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. 自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS flights_updated_at ON flights;
CREATE TRIGGER flights_updated_at BEFORE UPDATE ON flights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS aircraft_updated_at ON aircraft;
CREATE TRIGGER aircraft_updated_at BEFORE UPDATE ON aircraft
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 3. 自动计算飞行距离（基于机场坐标）
-- ============================================
CREATE OR REPLACE FUNCTION calculate_flight_metrics()
RETURNS TRIGGER AS $$
DECLARE
  dep_city TEXT;
  arr_city TEXT;
BEGIN
  -- 如果有出发和到达机场，且机场有坐标，计算距离
  IF NEW.dep_icao IS NOT NULL AND NEW.arr_icao IS NOT NULL THEN
    SELECT
      6371 * acos(
        LEAST(1.0, cos(radians(a1.latitude)) * cos(radians(a2.latitude))
        * cos(radians(a2.longitude) - radians(a1.longitude))
        + sin(radians(a1.latitude)) * sin(radians(a2.latitude)))
      ),
      a1.city_cn,
      a2.city_cn
    INTO NEW.distance_km, dep_city, arr_city
    FROM airports a1, airports a2
    WHERE a1.icao_code = NEW.dep_icao AND a2.icao_code = NEW.arr_icao;

    -- 自动填充城市（仅当应用层未提供时）
    IF NEW.dep_city IS NULL AND dep_city IS NOT NULL THEN
      NEW.dep_city := dep_city;
    END IF;
    IF NEW.arr_city IS NULL AND arr_city IS NOT NULL THEN
      NEW.arr_city := arr_city;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS flights_calculate_metrics ON flights;
CREATE TRIGGER flights_calculate_metrics
  BEFORE INSERT OR UPDATE ON flights
  FOR EACH ROW EXECUTE FUNCTION calculate_flight_metrics();

-- ============================================
-- 4. 点赞时同步 posts.likes_count
-- ============================================
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_like_change ON likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- ============================================
-- 5. 评论时同步 posts.comments_count
-- ============================================
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_change ON comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comments_count();

SELECT '004_init_triggers: 5 triggers created' AS result;


-- ======= 005_init_views.sql =======
-- Migration: 005_init_views
-- Description: 创建视图用于聚合查询
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: 001_init_tables

-- ============================================
-- 1. user_stats · 用户统计视图
-- ============================================
CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.id AS user_id,
  u.nickname,
  u.username,
  COUNT(DISTINCT f.id) AS total_flights,
  COUNT(DISTINCT f.dep_icao) AS unique_dep_airports,
  COUNT(DISTINCT f.arr_icao) AS unique_arr_airports,
  COALESCE(SUM(f.distance_km), 0) AS total_distance_km,
  COALESCE(SUM(f.flight_duration), 0) AS total_flight_minutes,
  COUNT(DISTINCT f.aircraft) AS unique_aircraft_types,
  COUNT(DISTINCT f.airline) AS unique_airlines,
  MIN(f.date) AS first_flight_date,
  MAX(f.date) AS last_flight_date
FROM users u
LEFT JOIN flights f ON f.user_id = u.id
GROUP BY u.id, u.nickname, u.username;

COMMENT ON VIEW user_stats IS '用户飞行统计聚合视图（包含所有日志，含私有）';

-- ============================================
-- 2. public_feed · 公开广场视图
-- ============================================
CREATE OR REPLACE VIEW public_feed AS
SELECT
  f.id,
  f.user_id,
  u.nickname,
  u.avatar_url,
  u.username,
  f.date,
  f.flight_no,
  f.airline,
  f.airline_icao,
  f.aircraft,
  f.registration,
  f.dep_icao,
  f.dep_city,
  f.arr_icao,
  f.arr_city,
  f.seat,
  f.cabin_class,
  f.distance_km,
  f.flight_duration,
  f.via,
  f.created_at,
  COUNT(t.id) AS ticket_count
FROM flights f
JOIN users u ON u.id = f.user_id
LEFT JOIN flight_tickets t ON t.flight_id = f.id
WHERE f.is_public = true
GROUP BY f.id, u.id, u.nickname, u.avatar_url, u.username
ORDER BY f.created_at DESC;

COMMENT ON VIEW public_feed IS '公开广场信息流视图（只含 is_public=true 的飞行日志）';

-- ============================================
-- 3. airport_stats · 机场统计视图
-- ============================================
-- 注意：OR 关联无法高效利用索引，P0 数据量小不影响
-- P2 阶段数据量增大后可拆分为 UNION + DISTINCT 优化
CREATE OR REPLACE VIEW airport_stats AS
SELECT
  a.icao_code,
  a.name_cn,
  a.city_cn,
  COUNT(DISTINCT f.id) AS flight_count,
  COUNT(DISTINCT f.user_id) AS user_count
FROM airports a
LEFT JOIN flights f ON f.dep_icao = a.icao_code OR f.arr_icao = a.icao_code
GROUP BY a.icao_code, a.name_cn, a.city_cn
ORDER BY flight_count DESC;

COMMENT ON VIEW airport_stats IS '机场热度统计视图';

-- ============================================
-- 4. aircraft_stats · 机型统计视图
-- ============================================
CREATE OR REPLACE VIEW aircraft_stats AS
SELECT
  aircraft,
  COUNT(*) AS flight_count,
  COUNT(DISTINCT user_id) AS user_count
FROM flights
WHERE aircraft != ''
GROUP BY aircraft
ORDER BY flight_count DESC;

COMMENT ON VIEW aircraft_stats IS '机型热度统计视图';

SELECT '005_init_views: 4 views created' AS result;


-- ======= 006_seed_airports.sql =======
-- Migration: 006_seed_airports
-- Description: 预填中国主要机场数据
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: 001_init_tables
-- 数据来源：公开 ICAO/IATA 代码

INSERT INTO airports (icao_code, iata_code, name_cn, name_en, city_cn, city_en, latitude, longitude, elevation) VALUES
-- 华北
('ZBAA', 'PEK', '北京首都国际机场', 'Beijing Capital International Airport', '北京', 'Beijing', 40.0801, 116.5846, 35),
('ZBAD', 'PKX', '北京大兴国际机场', 'Beijing Daxing International Airport', '北京', 'Beijing', 39.5098, 116.4105, 25),
('ZBTJ', 'TSN', '天津滨海国际机场', 'Tianjin Binhai International Airport', '天津', 'Tianjin', 39.1244, 117.3458, 3),
('ZBSJ', 'SJW', '石家庄正定国际机场', 'Shijiazhuang Zhengding International Airport', '石家庄', 'Shijiazhuang', 38.2812, 114.6958, 71),
('ZBYN', 'TYN', '太原武宿国际机场', 'Taiyuan Wusu International Airport', '太原', 'Taiyuan', 37.7469, 112.6297, 782),
('ZBHH', 'HET', '呼和浩特白塔国际机场', 'Hohhot Baita International Airport', '呼和浩特', 'Hohhot', 40.8497, 111.8244, 1083),

-- 东北
('ZYTX', 'SHE', '沈阳桃仙国际机场', 'Shenyang Taoxian International Airport', '沈阳', 'Shenyang', 41.6392, 123.4836, 60),
('ZYCC', 'CGQ', '长春龙嘉国际机场', 'Changchun Longjia International Airport', '长春', 'Changchun', 43.9961, 125.6856, 215),
('ZYTL', 'DLC', '大连周水子国际机场', 'Dalian Zhoushuizi International Airport', '大连', 'Dalian', 38.9657, 121.5386, 33),
('ZYHB', 'HRB', '哈尔滨太平国际机场', 'Harbin Taiping International Airport', '哈尔滨', 'Harbin', 45.6234, 126.2503, 139),

-- 华东
('ZSSS', 'SHA', '上海虹桥国际机场', 'Shanghai Hongqiao International Airport', '上海', 'Shanghai', 31.1979, 121.3364, 3),
('ZSPD', 'PVG', '上海浦东国际机场', 'Shanghai Pudong International Airport', '上海', 'Shanghai', 31.1443, 121.8083, 4),
('ZSHC', 'HGH', '杭州萧山国际机场', 'Hangzhou Xiaoshan International Airport', '杭州', 'Hangzhou', 30.2295, 120.4344, 7),
('ZSNJ', 'NKG', '南京禄口国际机场', 'Nanjing Lukou International Airport', '南京', 'Nanjing', 31.7420, 118.8622, 14),
('ZSWX', 'WUX', '无锡苏南硕放国际机场', 'Wuxi Shuofang International Airport', '无锡', 'Wuxi', 31.5022, 120.4336, 5),
('ZSWZ', 'WNZ', '温州龙湾国际机场', 'Wenzhou Longwan International Airport', '温州', 'Wenzhou', 27.9144, 120.8511, 5),
('ZSCN', 'KHN', '南昌昌北国际机场', 'Nanchang Changbei International Airport', '南昌', 'Nanchang', 28.8650, 115.9019, 44),
('ZSFZ', 'FOC', '福州长乐国际机场', 'Fuzhou Changle International Airport', '福州', 'Fuzhou', 25.9351, 119.6633, 14),
('ZSAM', 'XMN', '厦门高崎国际机场', 'Xiamen Gaoqi International Airport', '厦门', 'Xiamen', 24.5440, 118.1273, 18),
('ZSQD', 'TAO', '青岛胶东国际机场', 'Qingdao Jiaodong International Airport', '青岛', 'Qingdao', 36.3664, 120.3744, 9),
('ZSJN', 'TNA', '济南遥墙国际机场', 'Jinan Yaoqiang International Airport', '济南', 'Jinan', 36.8542, 117.2197, 23),
('ZSHZ', 'HFE', '合肥新桥国际机场', 'Hefei Xinqiao International Airport', '合肥', 'Hefei', 31.7311, 117.3078, 29),

-- 华中
('ZHHH', 'WUH', '武汉天河国际机场', 'Wuhan Tianhe International Airport', '武汉', 'Wuhan', 30.7838, 114.2081, 34),
('ZGHA', 'CSX', '长沙黄花国际机场', 'Changsha Huanghua International Airport', '长沙', 'Changsha', 28.1892, 113.2196, 66),
('ZGCY', 'CGO', '郑州新郑国际机场', 'Zhengzhou Xinzheng International Airport', '郑州', 'Zhengzhou', 34.5197, 113.8408, 151),

-- 华南
('ZGGG', 'CAN', '广州白云国际机场', 'Guangzhou Baiyun International Airport', '广州', 'Guangzhou', 23.3924, 113.2988, 11),
('ZGSZ', 'SZX', '深圳宝安国际机场', 'Shenzhen Baoan International Airport', '深圳', 'Shenzhen', 22.6394, 113.8108, 4),
('ZGSY', 'SYX', '三亚凤凰国际机场', 'Sanya Phoenix International Airport', '三亚', 'Sanya', 18.3029, 109.4124, 28),
('ZJQH', 'HAK', '海口美兰国际机场', 'Haikou Meilan International Airport', '海口', 'Haikou', 19.9349, 110.4589, 23),
('ZGOW', 'SWA', '揭阳潮汕国际机场', 'Jieyang Chaoshan International Airport', '揭阳', 'Jieyang', 23.5519, 116.5156, 15),
('ZGBH', 'BHY', '北海福成国际机场', 'Beihai Fucheng Airport', '北海', 'Beihai', 21.5386, 109.2925, 6),

-- 西南
('ZUUU', 'CTU', '成都双流国际机场', 'Chengdu Shuangliu International Airport', '成都', 'Chengdu', 30.5785, 103.9471, 495),
('ZUTF', 'TFU', '成都天府国际机场', 'Chengdu Tianfu International Airport', '成都', 'Chengdu', 30.3120, 104.4410, 462),
('ZUCK', 'CKG', '重庆江北国际机场', 'Chongqing Jiangbei International Airport', '重庆', 'Chongqing', 29.7192, 106.6417, 416),
('ZUMY', 'MIG', '绵阳南郊机场', 'Mianyang Nanjiao Airport', '绵阳', 'Mianyang', 31.4336, 104.7389, 532),
('ZUKJ', 'JHG', '西双版纳嘎洒国际机场', 'Xishuangbanna Gasa International Airport', '西双版纳', 'Xishuangbanna', 21.9906, 100.7764, 553),
('ZPPP', 'KMG', '昆明长水国际机场', 'Kunming Changshui International Airport', '昆明', 'Kunming', 25.1019, 102.9292, 2102),
('ZUGY', 'GYU', '贵阳龙洞堡国际机场', 'Guiyang Longdongbao International Airport', '贵阳', 'Guiyang', 26.5385, 106.8009, 1139),

-- 西北
('ZLXY', 'XIY', '西安咸阳国际机场', 'Xi An Xianyang International Airport', '西安', 'Xian', 34.4471, 108.7517, 479),
('ZLLL', 'LHW', '兰州中川国际机场', 'Lanzhou Zhongchuan International Airport', '兰州', 'Lanzhou', 36.5152, 103.6202, 1947),
('ZLXN', 'XNN', '西宁曹家堡国际机场', 'Xining Caojiabao International Airport', '西宁', 'Xining', 36.5333, 102.0375, 2184),
('ZLYA', 'YIN', '延安二十里堡机场', 'Yanan Ershilipu Airport', '延安', 'Yanan', 36.6375, 109.5514, 958),
('ZWSH', 'KHG', '喀什国际机场', 'Kashgar International Airport', '喀什', 'Kashgar', 39.5408, 75.9499, 1370),
('ZWAK', 'AKU', '阿克苏温宿机场', 'Aksu Wensu Airport', '阿克苏', 'Aksu', 41.2658, 80.2372, 1149),
('ZWWW', 'URC', '乌鲁木齐地窝堡国际机场', 'Urumqi Diwopu International Airport', '乌鲁木齐', 'Urumqi', 43.9072, 87.4742, 648),

-- 港澳台
('VHHH', 'HKG', '香港国际机场', 'Hong Kong International Airport', '中国香港', 'Hong Kong', 22.3080, 113.9185, 9),
('VMMC', 'MFM', '澳门国际机场', 'Macau International Airport', '中国澳门', 'Macao', 22.1496, 113.5916, 6),
('RCTP', 'TPE', '台湾桃园国际机场', 'Taiwan Taoyuan International Airport', '中国台湾', 'Taiwan', 25.0777, 121.2328, 33),
('RCSS', 'TSA', '台北松山机场', 'Taipei Songshan Airport', '中国台湾', 'Taipei', 25.0697, 121.5519, 5)
ON CONFLICT (icao_code) DO NOTHING;

SELECT '006_seed_airports: ' || COUNT(*) || ' airports inserted' AS result FROM airports;


-- ======= 007_seed_aircraft.sql =======
-- Migration: 007_seed_aircraft
-- Description: 预填常见机型数据
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: 001_init_tables
-- 数据来源：ICAO 机型代码表

INSERT INTO aircraft (icao_code, name, manufacturer, family, engine_count, engine_type, cruise_range, seats_typical) VALUES
-- Airbus 系列
('A318', 'Airbus A318', 'Airbus', 'A320', 2, '涡扇', 6000, 132),
('A319', 'Airbus A319', 'Airbus', 'A320', 2, '涡扇', 6700, 156),
('A320', 'Airbus A320-200', 'Airbus', 'A320', 2, '涡扇', 6100, 180),
('A321', 'Airbus A321-200', 'Airbus', 'A320', 2, '涡扇', 5950, 220),
('A332', 'Airbus A330-200', 'Airbus', 'A330', 2, '涡扇', 13450, 293),
('A333', 'Airbus A330-300', 'Airbus', 'A330', 2, '涡扇', 11750, 335),
('A338', 'Airbus A330-800', 'Airbus', 'A330', 2, '涡扇', 15700, 257),
('A339', 'Airbus A330-900', 'Airbus', 'A330', 2, '涡扇', 13300, 287),
('A343', 'Airbus A340-300', 'Airbus', 'A340', 4, '涡扇', 13700, 335),
('A345', 'Airbus A340-500', 'Airbus', 'A340', 4, '涡扇', 16700, 313),
('A346', 'Airbus A340-600', 'Airbus', 'A340', 4, '涡扇', 14600, 380),
('A359', 'Airbus A350-900', 'Airbus', 'A350', 2, '涡扇', 15000, 325),
('A35K', 'Airbus A350-1000', 'Airbus', 'A350', 2, '涡扇', 16100, 366),
('A388', 'Airbus A380-800', 'Airbus', 'A380', 4, '涡扇', 15200, 555),

-- Boeing 系列
('B712', 'Boeing 717-200', 'Boeing', '717', 2, '涡扇', 3820, 117),
('B732', 'Boeing 737-200', 'Boeing', '737', 2, '涡扇', 4260, 130),
('B733', 'Boeing 737-300', 'Boeing', '737', 2, '涡扇', 5000, 149),
('B734', 'Boeing 737-400', 'Boeing', '737', 2, '涡扇', 4000, 168),
('B735', 'Boeing 737-500', 'Boeing', '737', 2, '涡扇', 5180, 132),
('B736', 'Boeing 737-600', 'Boeing', '737', 2, '涡扇', 5925, 145),
('B737', 'Boeing 737-700', 'Boeing', '737', 2, '涡扇', 6230, 149),
('B738', 'Boeing 737-800', 'Boeing', '737', 2, '涡扇', 5765, 189),
('B739', 'Boeing 737-900', 'Boeing', '737', 2, '涡扇', 5265, 215),
('B7M8', 'Boeing 737 MAX 8', 'Boeing', '737 MAX', 2, '涡扇', 6570, 178),
('B7M9', 'Boeing 737 MAX 9', 'Boeing', '737 MAX', 2, '涡扇', 6170, 193),
('B744', 'Boeing 747-400', 'Boeing', '747', 4, '涡扇', 13450, 416),
('B748', 'Boeing 747-8', 'Boeing', '747', 4, '涡扇', 14310, 467),
('B752', 'Boeing 757-200', 'Boeing', '757', 2, '涡扇', 7270, 200),
('B753', 'Boeing 757-300', 'Boeing', '757', 2, '涡扇', 6420, 243),
('B762', 'Boeing 767-200', 'Boeing', '767', 2, '涡扇', 7130, 216),
('B763', 'Boeing 767-300', 'Boeing', '767', 2, '涡扇', 9070, 261),
('B764', 'Boeing 767-400', 'Boeing', '767', 2, '涡扇', 10420, 304),
('B772', 'Boeing 777-200', 'Boeing', '777', 2, '涡扇', 9700, 314),
('B773', 'Boeing 777-300', 'Boeing', '777', 2, '涡扇', 11165, 396),
('B77W', 'Boeing 777-300ER', 'Boeing', '777', 2, '涡扇', 13650, 396),
('B77L', 'Boeing 777-200LR', 'Boeing', '777', 2, '涡扇', 17395, 317),
('B788', 'Boeing 787-8', 'Boeing', '787', 2, '涡扇', 13620, 242),
('B789', 'Boeing 787-9', 'Boeing', '787', 2, '涡扇', 14140, 296),
('B78X', 'Boeing 787-10', 'Boeing', '787', 2, '涡扇', 11160, 330),

-- 中国商飞 COMAC
('ARJ21', 'COMAC ARJ21', 'COMAC', 'ARJ21', 2, '涡扇', 3700, 90),
('C919', 'COMAC C919', 'COMAC', 'C919', 2, '涡扇', 5555, 168),

-- Embraer 巴西航空工业
('E145', 'Embraer ERJ-145', 'Embraer', 'ERJ', 2, '涡扇', 3700, 50),
('E170', 'Embraer E170', 'Embraer', 'E-Jet', 2, '涡扇', 4260, 78),
('E190', 'Embraer E190', 'Embraer', 'E-Jet', 2, '涡扇', 4537, 114),
('E195', 'Embraer E195', 'Embraer', 'E-Jet', 2, '涡扇', 4260, 132),

-- Bombardier 庞巴迪 / Airbus A220
('CRJ2', 'Bombardier CRJ200', 'Bombardier', 'CRJ', 2, '涡扇', 3046, 50),
('CRJ7', 'Bombardier CRJ700', 'Bombardier', 'CRJ', 2, '涡扇', 3530, 70),
('CRJ9', 'Bombardier CRJ900', 'Bombardier', 'CRJ', 2, '涡扇', 3500, 90),
('CS300', 'Airbus A220-300 (原 CS300)', 'Airbus', 'A220', 2, '涡扇', 6112, 135)
ON CONFLICT (icao_code) DO NOTHING;

SELECT '007_seed_aircraft: ' || COUNT(*) || ' aircraft inserted' AS result FROM aircraft;


-- ======= 008_storage_buckets.sql =======
-- Migration: 008_storage_buckets
-- Description: 创建 Supabase Storage 存储桶及访问策略
-- Author: 小扶
-- Date: 2026-07-20

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public=true, file_size_limit=2097152, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('flight-tickets', 'flight-tickets', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=5242880, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "tickets_select_own" ON storage.objects;
CREATE POLICY "tickets_select_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'flight-tickets');
DROP POLICY IF EXISTS "tickets_insert_own" ON storage.objects;
CREATE POLICY "tickets_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'flight-tickets');

SELECT '008_storage_buckets: avatars + flight-tickets created' AS result;
