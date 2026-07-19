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
  validationErrorsResponse,
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
      return validationErrorsResponse(
        parsed.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        }))
      );
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 统一错误消息，避免用户枚举攻击
      // 不区分"用户不存在"、"密码错误"、"邮箱未验证"
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        return errorResponse('EMAIL_NOT_CONFIRMED', '邮箱尚未验证，请查收验证邮件', 401);
      }
      return unauthorizedResponse('邮箱或密码不正确');
    }

    if (!data.user) {
      return errorResponse('AUTH_ERROR', '登录失败', 500);
    }

    // 查询用户资料（检查 error，防止触发器未执行时静默返回 null）
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, username, nickname, avatar_url, bio, role, created_at')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('[auth/login] profile 查询失败:', profileError.message);
      // 触发器可能存在竞态，重试一次
      const { data: retryProfile, error: retryError } = await supabase
        .from('users')
        .select('id, username, nickname, avatar_url, bio, role, created_at')
        .eq('id', data.user.id)
        .single();
      if (retryError) {
        console.error('[auth/login] profile 重试仍失败:', retryError.message);
      }
      return successResponse({
        user: {
          id: data.user.id,
          email: data.user.email ?? email,
        },
        profile: (retryProfile as UserProfileDTO | null) ?? null,
      });
    }

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
