// 验证脚本 - 检查触发器、函数、索引、RLS 策略
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

if (!DB_PASSWORD) {
  console.error('缺少 SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const client = new Client({
  host: 'aws-0-ap-southeast-2.pooler.supabase.com',
  port: 5432,
  user: `postgres.${PROJECT_REF}`,
  password: DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function main() {
  await client.connect();

  console.log('=== 表 ===');
  const tablesRes = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `);
  tablesRes.rows.forEach(r => console.log(`  - ${r.tablename}`));

  console.log('=== 视图 ===');
  const viewsRes = await client.query(`
    SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY viewname;
  `);
  viewsRes.rows.forEach(r => console.log(`  - ${r.viewname}`));

  console.log('=== 触发器 ===');
  const trgRes = await client.query(`
    SELECT t.tgname AS trigger_name, c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname;
  `);
  trgRes.rows.forEach(r => console.log(`  - ${r.table_name}.${r.trigger_name}`));

  console.log('=== 函数 ===');
  const fnRes = await client.query(`
    SELECT proname FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' ORDER BY proname;
  `);
  fnRes.rows.forEach(r => console.log(`  - ${r.proname}()`));

  console.log('=== 索引 ===');
  const idxRes = await client.query(`
    SELECT indexname, tablename FROM pg_indexes
    WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
    ORDER BY tablename, indexname;
  `);
  idxRes.rows.forEach(r => console.log(`  - ${r.tablename}.${r.indexname}`));

  console.log('=== RLS 策略 ===');
  const polRes = await client.query(`
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' ORDER BY tablename, policyname;
  `);
  polRes.rows.forEach(r => console.log(`  - ${r.tablename}.${r.policyname}`));

  console.log('=== 种子数据计数 ===');
  const airports = await client.query('SELECT COUNT(*) FROM airports;');
  const aircraft = await client.query('SELECT COUNT(*) FROM aircraft;');
  console.log(`  airports: ${airports.rows[0].count} 条`);
  console.log(`  aircraft: ${aircraft.rows[0].count} 条`);

  await client.end();
  console.log('=== 验证完成 ✓ ===');
}

main().catch(e => { console.error(e.message); process.exit(1); });
