// ============================================
// POST /api/user/avatar
// ============================================
// 上传用户头像
// - 接收 multipart/form-data，字段名: avatar
// - 验证文件类型（JPEG/PNG/WebP/GIF）和大小（≤ 2MB）
// - 上传到 Supabase Storage 的 avatars bucket
// - 更新 users.avatar_url
// - 返回新的头像 URL
// ============================================

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ALLOWED_AVATAR_TYPES,
  AVATAR_MAX_SIZE,
} from '@/lib/user/validation';
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ── 1. 认证检查 ──
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // ── 2. 解析 multipart form data ──
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return validationErrorResponse('请求格式错误，需要 multipart/form-data');
    }

    const file = formData.get('avatar');

    if (!file || !(file instanceof File)) {
      return validationErrorResponse('缺少 avatar 文件字段');
    }

    // ── 3. 文件类型验证 ──
    const mimeType = file.type;
    if (!ALLOWED_AVATAR_TYPES.includes(mimeType as typeof ALLOWED_AVATAR_TYPES[number])) {
      return validationErrorResponse(
        `不支持的文件类型: ${mimeType}，仅支持 JPEG、PNG、WebP、GIF`
      );
    }

    // ── 4. 文件大小验证 ──
    if (file.size > AVATAR_MAX_SIZE) {
      return validationErrorResponse(
        `文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB，最大允许 2MB`
      );
    }

    if (file.size === 0) {
      return validationErrorResponse('文件为空');
    }

    // ── 5. 生成文件名 ──
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const timestamp = Date.now();
    const filePath = `${user.id}/${timestamp}.${ext}`;

    // ── 6. 上传到 Storage ──
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[user/avatar] upload error:', uploadError.message);
      return serverErrorResponse('头像上传失败');
    }

    // ── 7. 获取公开 URL ──
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // ── 8. 更新 users 表 ──
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('[user/avatar] profile update error:', updateError.message);
      // 文件已上传成功，部分失败：返回 URL 但提示
      return successResponse(
        { avatar_url: avatarUrl },
      );
    }

    return successResponse({ avatar_url: avatarUrl });
  } catch (e) {
    console.error('[user/avatar] POST error:', e);
    return serverErrorResponse();
  }
}
