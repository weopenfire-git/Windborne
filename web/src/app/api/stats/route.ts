// ============================================
// GET /api/stats  — 当前用户飞行统计仪表盘
// ============================================
// 查询 user_stats 视图，聚合用户的飞行数据：
// 次数、时长、距离、机场数、机型数、航司数
// 首次/最近飞行日期
// ============================================

import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { UserStatsDTO } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // 查询 user_stats 视图（包含空用户兜底，视图 LEFT JOIN 已保障）
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // .single() 在 0 行时抛 PGRST116，视为空统计返回默认值
      if (error.code === 'PGRST116') {
        const emptyStats: UserStatsDTO = {
          user_id: user.id,
          nickname: '',
          username: '',
          total_flights: 0,
          unique_dep_airports: 0,
          unique_arr_airports: 0,
          total_distance_km: 0,
          total_flight_minutes: 0,
          unique_aircraft_types: 0,
          unique_airlines: 0,
          first_flight_date: null,
          last_flight_date: null,
        };
        return successResponse(emptyStats);
      }
      console.error('[stats] GET error:', error.message, error.code);
      return serverErrorResponse('获取统计失败');
    }

    return successResponse(data as UserStatsDTO);
  } catch (e) {
    console.error('[stats] GET error:', e);
    return serverErrorResponse();
  }
}
