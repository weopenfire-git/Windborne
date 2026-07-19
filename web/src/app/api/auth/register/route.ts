// ============================================
// POST /api/auth/register
// ============================================
// 注册新用户
// - 调用 Supabase Auth signUp
// - 触发器 handle_new_user 自动创建 public.users 记录
// - 邮箱验证开启时返回 user 但无 session
// - 邮箱验证关闭时返回 user + session（自动登录）
// ============================================

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registerSchema } from '@/lib/auth/validation';
import {
  createdResponse,
  validationErrorResponse,
  validationErrorsResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { UserProfileDTO } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return validationErrorResponse('请求体不能为空');
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorsResponse(
        parsed.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        }))
      );
    }

    const { email, password, nickname } = parsed.data;
    const supabase = await createClient();

    // 调用 Supabase Auth 注册
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: nickname ? { nickname } : undefined,
      },
    });

    if (error) {
      // 常见错误：邮箱已注册、密码太弱等
      return errorResponse('AUTH_ERROR', error.message, 400);
    }

    if (!data.user) {
      return errorResponse('AUTH_ERROR', '注册失败，未返回用户信息', 500);
    }

    // 查询触发器创建的 public.users 记录（检查 error，触发器可能存在竞态）
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, username, nickname, avatar_url, bio, role, created_at')
      .eq('id', data.user.id)
      .single();

    let finalProfile = profile as UserProfileDTO | null;
    if (profileError) {
      console.error('[auth/register] profile 查询失败:', profileError.message);
      // 触发器可能存在竞态，等待 100ms 后重试
      await new Promise(r => setTimeout(r, 100));
      const { data: retryProfile } = await supabase
        .from('users')
        .select('id, username, nickname, avatar_url, bio, role, created_at')
        .eq('id', data.user.id)
        .single();
      finalProfile = retryProfile as UserProfileDTO | null;
      if (!finalProfile) {
        console.error('[auth/register] profile 重试仍失败，用户可能需要手动补全资料');
      }
    }

    const responseData = {
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
      },
      profile: finalProfile,
      // session 存在表示已自动登录（邮箱验证关闭的情况）
      sessionEstablished: !!data.session,
      // 邮箱验证开启时需要提示用户查收邮件
      emailConfirmationRequired: !data.session,
    };

    return createdResponse(responseData);
  } catch (e) {
    console.error('[auth/register] error:', e);
    return serverErrorResponse();
  }
}
