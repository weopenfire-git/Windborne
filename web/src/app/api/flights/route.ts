// ============================================
// GET  /api/flights   — 获取当前用户的飞行日志列表
// POST /api/flights   — 创建一条飞行日志
// ============================================
// GET:  支持 ?page=1&pageSize=20&is_public=true 筛选和分页
// POST: 创建 flight 记录，自动关联当前用户
//       触发器 calculate_flight_metrics 自动填充 dep_city/arr_city
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createFlightSchema } from '@/lib/flights/validation';
import {
  createdResponse,
  validationErrorResponse,
  validationErrorsResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { FlightListItemDTO } from '@/types/database';

// ─── GET · 飞行日志列表 ────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // 解析分页和筛选参数
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const isPublic = searchParams.get('is_public');
    const offset = (page - 1) * pageSize;

    // 构建查询
    let query = supabase
      .from('flights')
      .select(
        'id, date, flight_no, airline, aircraft, registration, dep_icao, dep_city, arr_icao, arr_city, is_public, distance_km, flight_duration, created_at',
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // 可选筛选：按公开状态
    if (isPublic === 'true') {
      query = query.eq('is_public', true);
    } else if (isPublic === 'false') {
      query = query.eq('is_public', false);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[flights] GET error:', error.message);
      return serverErrorResponse('获取飞行日志失败');
    }

    const total = count ?? 0;

    return NextResponse.json({
      success: true,
      data: (data ?? []) as FlightListItemDTO[],
      pagination: {
        page,
        pageSize,
        total,
        hasMore: offset + pageSize < total,
      },
    });
  } catch (e) {
    console.error('[flights] GET error:', e);
    return serverErrorResponse();
  }
}

// ─── POST · 创建飞行日志 ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // 解析请求体
    const body = await request.json().catch(() => null);
    if (!body) {
      return validationErrorResponse('请求体不能为空');
    }

    // Zod 验证
    const parsed = createFlightSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorsResponse(
        parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }))
      );
    }

    // 插入数据库（RLS 会自动校验 user_id = auth.uid()）
    const { data: flight, error } = await supabase
      .from('flights')
      .insert({ user_id: user.id, ...parsed.data })
      .select('*')
      .single();

    if (error) {
      console.error('[flights] POST error:', error.message, error.code);
      return serverErrorResponse('创建飞行日志失败');
    }

    if (!flight) {
      return serverErrorResponse('创建飞行日志失败，未返回数据');
    }

    return createdResponse(flight);
  } catch (e) {
    console.error('[flights] POST error:', e);
    return serverErrorResponse();
  }
}
