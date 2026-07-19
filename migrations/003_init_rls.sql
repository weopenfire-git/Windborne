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
CREATE POLICY IF EXISTS "flights_select_anon" ON flights
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
CREATE POLICY IF EXISTS "flights_delete_own" ON flights
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
CREATE POLICY IF EXISTS "tickets_delete_own" ON flight_tickets
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
CREATE POLICY IF EXISTS "likes_insert_own" ON likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "likes_delete_own" ON likes;
CREATE POLICY IF EXISTS "likes_delete_own" ON likes
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
CREATE POLICY IF EXISTS "follows_delete_own" ON follows
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
