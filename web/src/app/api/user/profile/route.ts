// ============================================
// GET /api/user/profile   — 查看当前用户资料
// PUT /api/user/profile   — 修改用户资料
// ============================================
// GET:  返回当前用户的完整资料（含 email）
// PUT:  更新 nickname / username / bio
//        验证 username 唯一性，nickname 非空
// ============================================

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateProfileSchema,
  profileUsernameSchema,
} from '@/lib/user/validation';
import {
  successResponse,
  validationErrorResponse,
  validationErrorsResponse,
  unauthorizedResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { UserProfileDTO } from '@/types/database';

// ─── GET · 查看当前用户资料 ───────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, username, nickname, avatar_url, bio, role, created_at, email')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return errorResponse(
        'PROFILE_NOT_FOUND',
        '用户资料不存在',
        500
      );
    }

    return successResponse(profile as UserProfileDTO & { email: string });
  } catch (e) {
    console.error('[user/profile] GET error:', e);
    return serverErrorResponse();
  }
}

// ─── PUT · 修改用户资料 ────────────────────────────────────

export async function PUT(request: NextRequest) {
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
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorsResponse(
        parsed.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        }))
      );
    }

    const { nickname, username, bio } = parsed.data;

    // 至少更新一个字段
    if (nickname === undefined && username === undefined && bio === undefined) {
      return validationErrorResponse('至少需要提供一个要更新的字段');
    }

    // 构建更新对象（只包含提供的字段）
    const updates: Record<string, string> = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (bio !== undefined) updates.bio = bio;

    // ── username 唯一性检查 ──
    if (username !== undefined) {
      // 先验证格式（safety net，Zod 已完成但二次确认）
      const unameResult = profileUsernameSchema.safeParse(username);
      if (!unameResult.success) {
        return validationErrorResponse(unameResult.error.issues[0]?.message ?? '用户名格式不正确');
      }

      // 检查是否与当前用户名相同（没变化则跳过唯一性检查）
      const { data: currentUser } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();

      if (currentUser && currentUser.username !== username) {
        // 检查唯一性
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (existing) {
          return errorResponse(
            'USERNAME_TAKEN',
            `用户名 "${username}" 已被占用`,
            409
          );
        }
      }

      updates.username = username;
    }

    // 执行更新
    const { data: updated, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('id, username, nickname, avatar_url, bio, role, created_at, email')
      .single();

    if (error) {
      // 捕获 PG 唯一约束冲突（极端并发情况）
      if (error.code === '23505') {
        return errorResponse(
          'USERNAME_TAKEN',
          `用户名已被占用`,
          409
        );
      }
      console.error('[user/profile] PUT error:', error.message, error.code);
      return serverErrorResponse('资料更新失败');
    }

    if (!updated) {
      return serverErrorResponse('资料更新失败，未返回数据');
    }

    return successResponse(updated as UserProfileDTO & { email: string });
  } catch (e) {
    console.error('[user/profile] PUT error:', e);
    return serverErrorResponse();
  }
}
