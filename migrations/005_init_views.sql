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
