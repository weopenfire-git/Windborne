// ============================================
// Supabase Middleware 助手
// ============================================
// 1. 在 Next.js Middleware 中刷新 auth session
// 2. 保护需要登录的路由，未登录时重定向到 /login
// 3. 已登录用户访问 /login 时重定向到首页
// ============================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

// 需要登录才能访问的路径前缀
const PROTECTED_PATHS = ['/flights', '/settings', '/feed/new', '/profile'];

// 已登录用户不应访问的路径（避免重复登录）
const AUTH_PATHS = ['/login', '/register'];

/**
 * 刷新 Supabase session 并返回更新后的 response
 * 在 middleware.ts 中调用
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // 环境变量未配置时跳过（开发初期）
    return response;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 刷新 session（重要：不要在 await getUser 之前返回）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 路由保护逻辑
  const pathname = request.nextUrl.pathname;

  // API 路由不做重定向（API 自己返回 401）
  if (pathname.startsWith('/api/')) {
    return response;
  }

  // 未登录用户访问受保护路由 → 重定向到登录页
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 已登录用户访问登录/注册页 → 重定向到首页
  const isAuthPath = AUTH_PATHS.some(p => pathname.startsWith(p));
  if (isAuthPath && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
