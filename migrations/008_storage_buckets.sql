-- Migration: 008_storage_buckets
-- Description: 创建 Supabase Storage 存储桶及访问策略
-- Author: 小扶
-- Date: 2026-07-20
-- Depends on: 003_init_rls（RLS 已启用）

-- ============================================
-- 1. 创建 avatars 头像存储桶（公开读取）
-- ============================================

-- 如果桶已存在则跳过（幂等）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                    -- 公开可读
  2097152,                 -- 2MB 上限
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================
-- 2. RLS 策略：storage.objects 表
--    Supabase Storage 的底层实现是 storage.objects 表
--    需要对该表设置访问策略
-- ============================================

-- 允许所有人读取 avatars（公开桶）
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 允许登录用户上传到自己的目录
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许登录用户更新自己的文件
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许登录用户删除自己的文件
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 3. 创建 flight-tickets 机票图片桶（不公开）
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flight-tickets',
  'flight-tickets',
  false,                   -- 不公开，通过 signed URL 访问
  5242880,                 -- 5MB 上限
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- flight-tickets 桶的策略（由航班所有者控制，模块 04 会用到）
-- 此处预留策略占位，模块 04 完善
DROP POLICY IF EXISTS "tickets_select_own" ON storage.objects;
CREATE POLICY "tickets_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'flight-tickets');

DROP POLICY IF EXISTS "tickets_insert_own" ON storage.objects;
CREATE POLICY "tickets_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'flight-tickets');

-- 完成
SELECT '008_storage_buckets: avatars (public) + flight-tickets (private) created' AS result;
