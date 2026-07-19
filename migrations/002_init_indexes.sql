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
