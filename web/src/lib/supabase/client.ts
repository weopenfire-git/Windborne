// ============================================
// Supabase 浏览器端客户端
// ============================================
// 用于客户端组件中的数据查询和认证操作
// 自动从环境变量读取配置，带类型推断
// ============================================

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * 创建浏览器端 Supabase 客户端
 * 单例模式，避免重复创建连接
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      '缺少 Supabase 环境变量。请复制 web/.env.local.example 为 web/.env.local 并填入实际值。'
    );
  }

  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}

/**
 * 获取当前登录用户（浏览器端）
 * 返回 null 表示未登录
 */
export async function getCurrentUser() {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}
