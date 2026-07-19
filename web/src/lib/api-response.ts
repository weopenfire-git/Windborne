// ============================================
// API 统一响应工具
// ============================================

import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/database';

/** 成功响应 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status }
  );
}

/** 创建成功响应（201） */
export function createdResponse<T>(data: T) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status: 201 }
  );
}

/** 错误响应 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400
) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message } },
    { status }
  );
}

/** 验证错误响应（单个消息） */
export function validationErrorResponse(message: string) {
  return errorResponse('VALIDATION_ERROR', message, 422);
}

/** 验证错误响应（多个字段错误，用于 Zod 批量错误） */
export function validationErrorsResponse(
  errors: Array<{ field?: string; message: string }>
) {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: errors[0]?.message ?? '参数错误',
        details: errors,
      },
    },
    { status: 422 }
  );
}

/** 未认证响应 */
export function unauthorizedResponse(message: string = '请先登录') {
  return errorResponse('UNAUTHORIZED', message, 401);
}

/** 禁止访问响应 */
export function forbiddenResponse(message: string = '无权访问') {
  return errorResponse('FORBIDDEN', message, 403);
}

/** 未找到响应 */
export function notFoundResponse(message: string = '资源不存在') {
  return errorResponse('NOT_FOUND', message, 404);
}

/** 服务器错误响应 */
export function serverErrorResponse(message: string = '服务器内部错误') {
  return errorResponse('SERVER_ERROR', message, 500);
}
