// ============================================
// POST /api/flights/[id]/tickets  — 上传机票图片
// ============================================
// 每次上传一张机票图片（可多次调用上传多张）
// 图片存入 Supabase Storage flight-tickets 桶
// 按用户 ID 目录隔离：{user_id}/{flight_id}/{random}.ext
// ============================================

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/** 允许的图片类型 */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** 最大文件大小：5MB */
const MAX_SIZE = 5 * 1024 * 1024;

/** 生成随机文件名 */
function randomName(ext: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result}.${ext}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id: flightId } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // 确认 flight 存在且属于当前用户
    const { data: flight, error: flightError } = await supabase
      .from('flights')
      .select('id, user_id')
      .eq('id', flightId)
      .single();

    if (flightError || !flight) {
      return notFoundResponse('飞行日志不存在');
    }

    if (flight.user_id !== user.id) {
      return forbiddenResponse('无权为该飞行日志上传机票');
    }

    // 解析 multipart form data
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return validationErrorResponse('请求格式必须为 multipart/form-data');
    }

    const file = formData.get('ticket') as File | null;
    if (!file) {
      return validationErrorResponse('缺少 ticket 文件字段');
    }

    // 类型检查
    if (!ALLOWED_TYPES.includes(file.type)) {
      return validationErrorResponse(
        `不支持的文件类型 ${file.type}，允许：JPEG / PNG / WebP / GIF`
      );
    }

    // 大小检查
    if (file.size > MAX_SIZE) {
      return validationErrorResponse(
        `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大 5MB`
      );
    }

    if (file.size === 0) {
      return validationErrorResponse('文件为空');
    }

    // 生成存储路径
    const ext = file.type.split('/')[1] ?? 'jpg';
    const path = `${user.id}/${flightId}/${randomName(ext)}`;

    // 上传到 Supabase Storage
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('flight-tickets')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[flights/tickets] upload error:', uploadError.message);
      return serverErrorResponse('机票图片上传失败');
    }

    // 获取公开 URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('flight-tickets').getPublicUrl(path);

    // 获取 caption 可选参数
    const caption = (formData.get('caption') as string)?.trim() ?? '';

    // 获取当前最大 sort_order
    const { data: existingTickets } = await supabase
      .from('flight_tickets')
      .select('sort_order')
      .eq('flight_id', flightId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = (existingTickets?.[0]?.sort_order ?? -1) + 1;

    // 写入数据库
    const { data: ticket, error: dbError } = await supabase
      .from('flight_tickets')
      .insert({
        flight_id: flightId,
        user_id: user.id,
        image_url: publicUrl,
        caption: caption.substring(0, 500),
        sort_order: nextSortOrder,
      })
      .select('id, image_url, caption, sort_order')
      .single();

    if (dbError) {
      console.error('[flights/tickets] db insert error:', dbError.message);
      return serverErrorResponse('机票记录保存失败');
    }

    if (!ticket) {
      return serverErrorResponse('机票记录保存失败，未返回数据');
    }

    return createdResponse(ticket);
  } catch (e) {
    console.error('[flights/tickets] POST error:', e);
    return serverErrorResponse();
  }
}
