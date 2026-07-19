// 一次性迁移执行脚本 - 从 .env.local 读取密码，执行 full_migration.sql
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从 .env.local 读取环境变量
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const PROJECT_REF = 'cjdjtapzkjambtawbfiz';
const DB_PASSWORD = process.env.DB_PASSWORD || env.SUPABASE_DB_PASSWORD;
const POOLER_HOST = process.env.DB_HOST || 'aws-0-ap-southeast-2.pooler.supabase.com';

if (!DB_PASSWORD) {
  console.error('[migrate] 缺少数据库密码。请在 .env.local 设置 SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, '../../migrations/full_migration.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log(`[migrate] 读取 SQL: ${sqlPath}`);
console.log(`[migrate] SQL 长度: ${sql.length} 字符, ${sql.split('\n').length} 行`);

const client = new Client({
  host: POOLER_HOST,
  port: 5432,
  user: `postgres.${PROJECT_REF}`,
  password: DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function main() {
  console.log('[migrate] 正在连接 Supabase...');
  await client.connect();
  console.log('[migrate] 连接成功 ✓');

  // 清理：先删视图，再删表（CASCADE），确保可重复执行
  console.log('[migrate] 清理已存在的对象（DROP CASCADE）...');
  const dropSql = `
    DROP VIEW IF EXISTS public.user_stats CASCADE;
    DROP VIEW IF EXISTS public.public_feed CASCADE;
    DROP VIEW IF EXISTS public.airport_stats CASCADE;
    DROP VIEW IF EXISTS public.aircraft_stats CASCADE;
    DROP TABLE IF EXISTS public.likes CASCADE;
    DROP TABLE IF EXISTS public.comments CASCADE;
    DROP TABLE IF EXISTS public.posts CASCADE;
    DROP TABLE IF EXISTS public.flight_tickets CASCADE;
    DROP TABLE IF EXISTS public.flights CASCADE;
    DROP TABLE IF EXISTS public.follows CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;
    DROP TABLE IF EXISTS public.airports CASCADE;
    DROP TABLE IF EXISTS public.aircraft CASCADE;
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
    DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS public.calculate_flight_metrics() CASCADE;
  `;
  await client.query(dropSql);
  console.log('[migrate] 清理完成 ✓');

  console.log('[migrate] 开始执行迁移...');
  const start = Date.now();

  try {
    await client.query(sql);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[migrate] 迁移执行完成 ✓ 用时 ${elapsed}s`);
  } catch (err) {
    console.error('[migrate] 迁移失败 ✗');
    console.error('[migrate] 错误:', err.message);
    if (err.position) {
      const pos = parseInt(err.position, 10);
      const before = sql.substring(Math.max(0, pos - 200), pos);
      const after = sql.substring(pos, pos + 200);
      console.error('[migrate] 错误位置上下文:');
      console.error('  ...', before, '<<<HERE>>>', after, '...');
    }
    await client.end();
    process.exit(1);
  }

  // 验证
  console.log('[migrate] 验证: 表...');
  const tablesRes = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `);
  tablesRes.rows.forEach(r => console.log(`  - ${r.tablename}`));

  console.log('[migrate] 验证: 视图...');
  const viewsRes = await client.query(`
    SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY viewname;
  `);
  viewsRes.rows.forEach(r => console.log(`  - ${r.viewname}`));

  const airportsCount = await client.query('SELECT COUNT(*) FROM airports;');
  const aircraftCount = await client.query('SELECT COUNT(*) FROM aircraft;');
  console.log(`[migrate] airports: ${airportsCount.rows[0].count} 条`);
  console.log(`[migrate] aircraft: ${aircraftCount.rows[0].count} 条`);

  await client.end();
  console.log('[migrate] 全部完成 ✓');
}

main().catch(err => {
  console.error('[migrate] 致命错误:', err.message);
  process.exit(1);
});
