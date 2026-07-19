// ============================================
// 认证相关 Zod 验证 Schema
// ============================================

import { z } from 'zod';

/** 用户名规则：3-20 字符，字母开头，字母数字下划线 */
export const usernameSchema = z
  .string()
  .min(3, '用户名至少 3 个字符')
  .max(20, '用户名最多 20 个字符')
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '用户名须以字母开头，只能含字母、数字、下划线');

/** 邮箱规则 */
export const emailSchema = z
  .string()
  .min(1, '邮箱不能为空')
  .email('邮箱格式不正确')
  .max(255, '邮箱过长');

/** 密码规则：至少 8 位，含字母和数字 */
export const passwordSchema = z
  .string()
  .min(8, '密码至少 8 位')
  .max(72, '密码最多 72 位')
  .regex(/[a-zA-Z]/, '密码须包含字母')
  .regex(/[0-9]/, '密码须包含数字');

/** 昵称规则：1-30 字符 */
export const nicknameSchema = z
  .string()
  .min(1, '昵称不能为空')
  .max(30, '昵称最多 30 个字符')
  .trim();

/** 注册请求 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema.optional(),
});

/** 登录请求 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '密码不能为空'),
});

/** 修改密码请求 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

/** 忘记密码请求 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** 重置密码请求 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '重置令牌不能为空'),
  password: passwordSchema,
});

// 类型导出
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
