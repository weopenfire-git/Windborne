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
