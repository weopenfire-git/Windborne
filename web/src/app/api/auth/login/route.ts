// ============================================
// POST /api/auth/login
// ============================================
// 邮箱密码登录
// - 调用 Supabase Auth signInWithPassword
// - @supabase/ssr 自动设置 session cookie
// - 返回 user + profile
// ============================================

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/auth/validation';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { UserProfileDTO } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return validationErrorResponse('请求体不能为空');
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? '参数错误');
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 常见错误：邮箱未验证、密码错误、用户不存在
      return unauthorizedResponse(error.message);
    }

    if (!data.user) {
      return errorResponse('AUTH_ERROR', '登录失败', 500);
    }

    // 查询用户资料
    const { data: profile } = await supabase
      .from('users')
      .select('id, username, nickname, avatar_url, bio, role, created_at')
      .eq('id', data.user.id)
      .single();

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
      },
      profile: profile as UserProfileDTO | null,
    });
  } catch (e) {
    console.error('[auth/login] error:', e);
    return serverErrorResponse();
  }
}
