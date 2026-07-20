// ============================================
// GET    /api/flights/[id]   — 查看飞行日志详情（含机票）
// PUT    /api/flights/[id]   — 修改飞行日志
// DELETE /api/flights/[id]   — 删除飞行日志
// ============================================

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateFlightSchema } from '@/lib/flights/validation';
import {
  successResponse,
  validationErrorResponse,
  validationErrorsResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { FlightDetailDTO, FlightTicketDTO } from '@/types/database';

// ─── GET · 飞行日志详情 ────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 查询 flight
    const { data: flight, error } = await supabase
      .from('flights')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !flight) {
      return notFoundResponse('飞行日志不存在');
    }

    // RLS 已处理权限，但公开的允许匿名查看
    if (!flight.is_public) {
      if (!user || flight.user_id !== user.id) {
        return notFoundResponse('飞行日志不存在');
      }
    }

    // 查询关联的机票
    const { data: tickets, error: ticketsError } = await supabase
      .from('flight_tickets')
      .select('id, image_url, caption, sort_order')
      .eq('flight_id', id)
      .order('sort_order', { ascending: true });

    if (ticketsError) {
      console.error('[flights/[id]] GET tickets error:', ticketsError.message);
    }

    const detail: FlightDetailDTO = {
      ...flight,
      tickets: (tickets ?? []) as FlightTicketDTO[],
    };

    return successResponse(detail);
  } catch (e) {
    console.error('[flights/[id]] GET error:', e);
    return serverErrorResponse();
  }
}

// ─── PUT · 修改飞行日志 ────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // 先确认 flight 存在且属于当前用户
    const { data: existing, error: fetchError } = await supabase
      .from('flights')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return notFoundResponse('飞行日志不存在');
    }

    if (existing.user_id !== user.id) {
      return forbiddenResponse('无权修改他人的飞行日志');
    }

    // 解析请求体
    const body = await request.json().catch(() => null);
    if (!body) {
      return validationErrorResponse('请求体不能为空');
    }

    // Zod 验证
    const parsed = updateFlightSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorsResponse(
        parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }))
      );
    }

    // 至少更新一个字段
    const updates = { ...parsed.data };
    if (Object.keys(updates).length === 0) {
      return validationErrorResponse('至少需要提供一个要更新的字段');
    }

    // 执行更新
    const { data: updated, error } = await supabase
      .from('flights')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[flights/[id]] PUT error:', error.message, error.code);
      return serverErrorResponse('飞行日志更新失败');
    }

    if (!updated) {
      return serverErrorResponse('飞行日志更新失败，未返回数据');
    }

    return successResponse(updated);
  } catch (e) {
    console.error('[flights/[id]] PUT error:', e);
    return serverErrorResponse();
  }
}

// ─── DELETE · 删除飞行日志 ─────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // 先确认 flight 存在且属于当前用户
    const { data: existing, error: fetchError } = await supabase
      .from('flights')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return notFoundResponse('飞行日志不存在');
    }

    if (existing.user_id !== user.id) {
      return forbiddenResponse('无权删除他人的飞行日志');
    }

    // 删除（CASCADE 会自动删除关联的 flight_tickets）
    const { error } = await supabase
      .from('flights')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[flights/[id]] DELETE error:', error.message);
      return serverErrorResponse('飞行日志删除失败');
    }

    return successResponse({ deleted: true });
  } catch (e) {
    console.error('[flights/[id]] DELETE error:', e);
    return serverErrorResponse();
  }
}
