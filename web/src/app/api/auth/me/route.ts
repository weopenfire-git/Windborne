// ============================================
// GET /api/auth/me
// ============================================
// 获取当前登录用户信息
// - 从 session cookie 读取认证状态
// - 返回 user + profile
// - 未登录返回 401
// ============================================

import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { UserProfileDTO } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // 查询用户资料
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, username, nickname, avatar_url, bio, role, created_at')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // auth.users 有记录但 public.users 没有（触发器未执行或数据不一致）
      return unauthorizedResponse('用户资料不存在，请联系管理员');
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email ?? '',
      },
      profile: profile as UserProfileDTO,
    });
  } catch (e) {
    console.error('[auth/me] error:', e);
    return serverErrorResponse();
  }
}
