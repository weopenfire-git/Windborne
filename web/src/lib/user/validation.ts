// ============================================
// 用户资料相关 Zod 验证 Schema
// ============================================

import { z } from 'zod';

/** 昵称规则：1-30 字符，允许中英文数字空格 */
export const profileNicknameSchema = z
  .string()
  .min(1, '昵称不能为空')
  .max(30, '昵称最多 30 个字符')
  .trim();

/** 用户名规则：3-20 字符，字母开头，字母数字下划线 */
export const profileUsernameSchema = z
  .string()
  .min(3, '用户名至少 3 个字符')
  .max(20, '用户名最多 20 个字符')
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '用户名须以字母开头，只能含字母、数字、下划线');

/** 简介规则：最多 500 字符 */
export const bioSchema = z
  .string()
  .max(500, '简介最多 500 个字符')
  .trim()
  .optional()
  .default('');

/** 更新用户资料请求 */
export const updateProfileSchema = z.object({
  nickname: profileNicknameSchema.optional(),
  username: profileUsernameSchema.optional(),
  bio: bioSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** 允许的头像文件类型 */
export const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** 头像文件大小上限：2MB */
export const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
