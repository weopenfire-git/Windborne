// ============================================
// Windborne · 数据库类型定义
// ============================================
// 对应 migrations/001_init_tables.sql 的 9 张表
// 用于 Supabase 客户端的类型推断 + 业务层 DTO
// ============================================

// ---- Supabase Database Schema（供 supabase-js 类型推断）----

export type UserRole = 'member' | 'verified_aviator' | 'admin';

export type LikeTargetType = 'post' | 'flight' | 'comment';

// ---- 表 Insert 类型别名（供 Update 的 Partial 引用，避免接口内自引用）----

type AirportsInsert = {
  icao_code: string;
  iata_code?: string | null;
  name_cn: string;
  name_en?: string | null;
  city_cn: string;
  city_en?: string | null;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  elevation?: number | null;
  description?: string | null;
};

type AircraftInsert = {
  icao_code: string;
  name: string;
  manufacturer: string;
  family: string;
  engine_count?: number | null;
  engine_type?: string | null;
  cruise_range?: number | null;
  seats_typical?: number | null;
  description?: string | null;
  image_url?: string | null;
};

type FlightsInsert = {
  user_id: string;
  date: string;
  flight_no: string;
  airline?: string;
  airline_icao?: string;
  aircraft?: string;
  registration?: string;
  seat?: string;
  cabin_class?: string;
  dep_icao: string;
  dep_city?: string;
  arr_icao: string;
  arr_city?: string;
  via?: string;
  dep_time_scheduled?: string;
  dep_time_actual?: string;
  arr_time_scheduled?: string;
  arr_time_actual?: string;
  v1_vr_v2?: string;
  cruise_alt?: string;
  cruise_mach?: string;
  cruise_cas?: string;
  route?: string;
  sid?: string;
  star?: string;
  approach?: string;
  weather_dep?: string;
  weather_arr?: string;
  remarks_passenger?: string;
  remarks_captain?: string;
  remarks_fo?: string;
  remarks_purser?: string;
  is_public?: boolean;
  distance_km?: number | null;
  flight_duration?: number | null;
};

export interface Database {
  public: {
    Tables: {
      // 1. 用户资料表
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          nickname: string;
          avatar_url: string | null;
          bio: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // 来自 auth.users
          email: string;
          username: string;
          nickname?: string;
          avatar_url?: string | null;
          bio?: string;
          role?: UserRole;
        };
        Update: {
          email?: string;
          username?: string;
          nickname?: string;
          avatar_url?: string | null;
          bio?: string;
          role?: UserRole;
        };
      };

      // 2. 机场库
      airports: {
        Row: {
          icao_code: string;
          iata_code: string | null;
          name_cn: string;
          name_en: string | null;
          city_cn: string;
          city_en: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          elevation: number | null;
          description: string | null;
          created_at: string;
        };
        Insert: AirportsInsert;
        Update: Partial<AirportsInsert>;
      };

      // 3. 机型库
      aircraft: {
        Row: {
          icao_code: string;
          name: string;
          manufacturer: string;
          family: string;
          engine_count: number | null;
          engine_type: string | null;
          cruise_range: number | null;
          seats_typical: number | null;
          description: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: AircraftInsert;
        Update: Partial<AircraftInsert>;
      };

      // 4. 飞行日志主表
      flights: {
        Row: {
          id: string;
          user_id: string;
          date: string; // ISO date (YYYY-MM-DD)
          flight_no: string;
          airline: string;
          airline_icao: string;
          aircraft: string;
          registration: string;
          seat: string;
          cabin_class: string;
          dep_icao: string;
          dep_city: string;
          arr_icao: string;
          arr_city: string;
          via: string;
          dep_time_scheduled: string;
          dep_time_actual: string;
          arr_time_scheduled: string;
          arr_time_actual: string;
          v1_vr_v2: string;
          cruise_alt: string;
          cruise_mach: string;
          cruise_cas: string;
          route: string;
          sid: string;
          star: string;
          approach: string;
          weather_dep: string;
          weather_arr: string;
          remarks_passenger: string;
          remarks_captain: string;
          remarks_fo: string;
          remarks_purser: string;
          is_public: boolean;
          distance_km: number | null;
          flight_duration: number | null; // 分钟
          created_at: string;
          updated_at: string;
        };
        Insert: FlightsInsert;
        Update: Partial<FlightsInsert>;
      };

      // 5. 机票/票据图片
      flight_tickets: {
        Row: {
          id: string;
          flight_id: string;
          user_id: string;
          image_url: string;
          caption: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          flight_id: string;
          user_id: string;
          image_url: string;
          caption?: string;
          sort_order?: number;
        };
        Update: {
          image_url?: string;
          caption?: string;
          sort_order?: number;
        };
      };

      // 6. 动态广场帖子（P1）
      posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          images: string[];
          tags: string[];
          flight_id: string | null;
          likes_count: number;
          comments_count: number;
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title?: string;
          content: string;
          images?: string[];
          tags?: string[];
          flight_id?: string | null;
        };
        Update: {
          title?: string;
          content?: string;
          images?: string[];
          tags?: string[];
          flight_id?: string | null;
        };
      };

      // 7. 评论（P1）
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          content: string;
          parent_id?: string | null;
        };
        Update: {
          content?: string;
        };
      };

      // 8. 关注关系（P2）
      follows: {
        Row: {
          follower_id: string;
          followed_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          followed_id: string;
        };
        Update: {};
      };

      // 9. 点赞（P1）
      likes: {
        Row: {
          user_id: string;
          target_type: LikeTargetType;
          target_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          target_type: LikeTargetType;
          target_id: string;
        };
        Update: {};
      };
    };
    Views: {
      // 见 migrations/005_init_views.sql
      user_stats: {
        Row: {
          user_id: string;
          nickname: string;
          username: string;
          total_flights: number;
          unique_dep_airports: number;
          unique_arr_airports: number;
          total_distance_km: number;
          total_flight_minutes: number;
          unique_aircraft_types: number;
          unique_airlines: number;
          first_flight_date: string | null;
          last_flight_date: string | null;
        };
      };
      public_feed: {
        Row: {
          id: string;
          user_id: string;
          nickname: string;
          avatar_url: string | null;
          username: string;
          date: string;
          flight_no: string;
          airline: string;
          airline_icao: string;
          aircraft: string;
          registration: string;
          dep_icao: string;
          dep_city: string;
          arr_icao: string;
          arr_city: string;
          seat: string;
          cabin_class: string;
          distance_km: number | null;
          flight_duration: number | null;
          via: string;
          created_at: string;
          ticket_count: number;
        };
      };
      airport_stats: {
        Row: {
          icao_code: string;
          name_cn: string;
          city_cn: string;
          flight_count: number;
          user_count: number;
        };
      };
      aircraft_stats: {
        Row: {
          aircraft: string;
          flight_count: number;
          user_count: number;
        };
      };
    };
    Functions: {
      // 见 migrations/004_init_triggers.sql
      handle_new_user: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}

// ---- 业务层 DTO 类型 ----

/** 用户公开资料（广场、他人主页可见） */
export interface UserProfileDTO {
  id: string;
  username: string;
  nickname: string;
  avatar_url: string | null;
  bio: string;
  role: UserRole;
  created_at: string;
}

/** 飞行日志列表项（精简） */
export interface FlightListItemDTO {
  id: string;
  date: string;
  flight_no: string;
  airline: string;
  aircraft: string;
  registration: string;
  dep_icao: string;
  dep_city: string;
  arr_icao: string;
  arr_city: string;
  is_public: boolean;
  distance_km: number | null;
  flight_duration: number | null;
  created_at: string;
}

/** 飞行日志详情（含机票） */
export interface FlightDetailDTO extends FlightListItemDTO {
  user_id: string;
  airline_icao: string;
  seat: string;
  cabin_class: string;
  via: string;
  dep_time_scheduled: string;
  dep_time_actual: string;
  arr_time_scheduled: string;
  arr_time_actual: string;
  v1_vr_v2: string;
  cruise_alt: string;
  cruise_mach: string;
  cruise_cas: string;
  route: string;
  sid: string;
  star: string;
  approach: string;
  weather_dep: string;
  weather_arr: string;
  remarks_passenger: string;
  remarks_captain: string;
  remarks_fo: string;
  remarks_purser: string;
  updated_at: string;
  tickets: FlightTicketDTO[];
}

/** 机票图片 */
export interface FlightTicketDTO {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

/** 统计数据（对应 user_stats 视图） */
export interface UserStatsDTO {
  user_id: string;
  nickname: string;
  username: string;
  total_flights: number;
  unique_dep_airports: number;
  unique_arr_airports: number;
  total_distance_km: number;
  total_flight_minutes: number;
  unique_aircraft_types: number;
  unique_airlines: number;
  first_flight_date: string | null;
  last_flight_date: string | null;
}

/** API 统一响应包装 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}
