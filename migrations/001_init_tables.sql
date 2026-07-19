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
