// ============================================
// 飞行日志 · Zod 校验规则
// ============================================
// 对应 flights 表 30+ 字段
// 必填: date, flight_no, dep_icao, arr_icao
// 其余字段均有 DEFAULT '' 或 NULL
// ============================================

import { z } from 'zod';

// ─── 通用辅助 ───────────────────────────────────

/** 可空字符串：将空串/空白串转为空字符串 */
const nullableText = (max: number) =>
  z.string().max(max).trim().optional().default('');

/** ICAO 机场代码：4 位大写字母 */
const icaoCode = z
  .string()
  .length(4, 'ICAO 代码必须为 4 位')
  .regex(/^[A-Z]{4}$/, 'ICAO 代码必须为大写英文字母');

/** 航班号：2-3 位字母 + 1-4 位数字，如 CA1234 / 3U8825 */
const flightNoPattern = z
  .string()
  .min(3, '航班号至少 3 位')
  .max(8, '航班号最多 8 位')
  .regex(/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/, '航班号格式：如 CA1234 / 3U8825');

/** ISO 日期 YYYY-MM-DD */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD');

/** 舱位等级枚举 */
const cabinClassEnum = z.enum([
  '', 'economy', 'premium_economy', 'business', 'first',
]).optional().default('');

// ─── 时间字段：格式 HH:MM 或空 ──────────────────

const timeField = z.string().max(5).optional().default('');

// ─── 创建飞行日志请求 ───────────────────────────

export const createFlightSchema = z.object({
  // 必填字段
  date: isoDate,
  flight_no: flightNoPattern,
  dep_icao: icaoCode,
  arr_icao: icaoCode,

  // 基本信息（可选，默认空字符串）
  airline:         z.string().max(100).optional().default(''),
  airline_icao:    z.string().max(3).optional().default(''),
  aircraft:        z.string().max(10).optional().default(''),
  registration:    z.string().max(20).optional().default(''),
  seat:            z.string().max(10).optional().default(''),
  cabin_class:     cabinClassEnum,

  // 航段信息
  dep_city:        z.string().max(50).optional().default(''),
  arr_city:        z.string().max(50).optional().default(''),
  via:             z.string().max(100).optional().default(''),

  // 时间
  dep_time_scheduled: timeField,
  dep_time_actual:    timeField,
  arr_time_scheduled: timeField,
  arr_time_actual:    timeField,

  // 专业字段
  v1_vr_v2:        z.string().max(50).optional().default(''),
  cruise_alt:      z.string().max(20).optional().default(''),
  cruise_mach:     z.string().max(10).optional().default(''),
  cruise_cas:      z.string().max(10).optional().default(''),
  route:           z.string().max(500).optional().default(''),
  sid:             z.string().max(20).optional().default(''),
  star:            z.string().max(20).optional().default(''),
  approach:        z.string().max(50).optional().default(''),
  weather_dep:     z.string().max(100).optional().default(''),
  weather_arr:     z.string().max(100).optional().default(''),

  // 备注
  remarks_passenger: z.string().max(1000).optional().default(''),
  remarks_captain:   z.string().max(1000).optional().default(''),
  remarks_fo:        z.string().max(1000).optional().default(''),
  remarks_purser:    z.string().max(1000).optional().default(''),

  // 公开/私有
  is_public:       z.boolean().optional().default(false),

  // 距离和时长（触发器自动计算，也可手动指定）
  distance_km:     z.number().min(0).max(20000).optional().nullable(),
  flight_duration: z.number().int().min(0).max(1440).optional().nullable(),
}).refine(
  (data) => data.dep_icao !== data.arr_icao,
  { message: '出发机场和到达机场不能相同', path: ['arr_icao'] }
);

// ─── 更新飞行日志请求（全部可选） ───────────────

export const updateFlightSchema = z.object({
  date:           isoDate.optional(),
  flight_no:      flightNoPattern.optional(),
  dep_icao:       icaoCode.optional(),
  arr_icao:       icaoCode.optional(),

  airline:        z.string().max(100).optional(),
  airline_icao:   z.string().max(3).optional(),
  aircraft:       z.string().max(10).optional(),
  registration:   z.string().max(20).optional(),
  seat:           z.string().max(10).optional(),
  cabin_class:    z.enum(['', 'economy', 'premium_economy', 'business', 'first']).optional(),

  dep_city:       z.string().max(50).optional(),
  arr_city:       z.string().max(50).optional(),
  via:            z.string().max(100).optional(),

  dep_time_scheduled: z.string().max(5).optional(),
  dep_time_actual:    z.string().max(5).optional(),
  arr_time_scheduled: z.string().max(5).optional(),
  arr_time_actual:    z.string().max(5).optional(),

  v1_vr_v2:       z.string().max(50).optional(),
  cruise_alt:     z.string().max(20).optional(),
  cruise_mach:    z.string().max(10).optional(),
  cruise_cas:     z.string().max(10).optional(),
  route:          z.string().max(500).optional(),
  sid:            z.string().max(20).optional(),
  star:           z.string().max(20).optional(),
  approach:       z.string().max(50).optional(),
  weather_dep:    z.string().max(100).optional(),
  weather_arr:    z.string().max(100).optional(),

  remarks_passenger: z.string().max(1000).optional(),
  remarks_captain:   z.string().max(1000).optional(),
  remarks_fo:        z.string().max(1000).optional(),
  remarks_purser:    z.string().max(1000).optional(),

  is_public:      z.boolean().optional(),

  distance_km:     z.number().min(0).max(20000).optional().nullable(),
  flight_duration: z.number().int().min(0).max(1440).optional().nullable(),
}).refine(
  (data) => {
    // 如果同时改了 dep_icao 和 arr_icao，检查是否相同
    if (data.dep_icao && data.arr_icao && data.dep_icao === data.arr_icao) return false;
    return true;
  },
  { message: '出发机场和到达机场不能相同', path: ['arr_icao'] }
);

/** 导出类型（供 API 层使用） */
export type CreateFlightInput = z.infer<typeof createFlightSchema>;
export type UpdateFlightInput = z.infer<typeof updateFlightSchema>;
