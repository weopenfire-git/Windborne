// ============================================
// POST /api/auth/logout
// ============================================
// 登出当前用户
// - 调用 Supabase Auth signOut
// - @supabase/ssr 自动清除 session cookie
// ============================================

import { createClient } from '@/lib/supabase/server';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return successResponse({ loggedOut: true });
  } catch (e) {
    console.error('[auth/logout] error:', e);
    return serverErrorResponse();
  }
}
