// ============================================
// Supabase 服务端客户端（SSR）
// ============================================
// 用于 Server Components、Route Handlers、Server Actions
// 通过 cookies() 读写 session，支持 SSR 认证状态同步
// ============================================

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * 创建服务端 Supabase 客户端（带 cookie session）
 * 用于 Server Components 和 Route Handlers
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      '缺少 Supabase 环境变量。请复制 web/.env.local.example 为 web/.env.local 并填入实际值。'
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // 在 Server Component 中调用 set 会抛错（只读）
          // 可忽略，Middleware 会刷新 session
        }
      },
    },
  });
}

/**
 * 创建服务端 Supabase 客户端（绕过 RLS）
 * 仅用于迁移脚本、数据导入等需要管理员权限的场景
 * ⚠️ 切勿在浏览器端代码中使用
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      '缺少 Supabase 服务端密钥。请在 .env.local 中设置 SUPABASE_SERVICE_ROLE_KEY。'
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
