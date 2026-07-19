/**
 * Windborne Database Migration Script
 * 
 * 用法:
 *   1. 在 Supabase Dashboard → Settings → Database → Connection string 获取密码
 *   2. 设置环境变量 DATABASE_URL:
 *      export DATABASE_URL="postgresql://postgres:<PASSWORD>@db.cjdjtapzkjambtawbfiz.supabase.co:5432/postgres"
 *   3. 执行:
 *      npx ts-node scripts/migrate.ts
 *   或者直接用 psql:
 *      PGPASSWORD=<PASSWORD> psql -h db.cjdjtapzkjambtawbfiz.supabase.co -p 5432 -U postgres -d postgres -f migrations/full_migration.sql
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    console.error('   示例: export DATABASE_URL="postgresql://postgres:<PASSWORD>@db.cjdjtapzkjambtawbfiz.supabase.co:5432/postgres"');
    console.error('');
    console.error('   获取密码方式:');
    console.error('   1. 打开 Supabase Dashboard');
    console.error('   2. 左侧 Settings → Database');
    console.error('   3. 在 Connection string 中找到密码（<PASSWORD> 部分）');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ 已连接到 Supabase 数据库');

    const sqlPath = path.join(__dirname, '..', 'migrations', 'full_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log(`📄 读取迁移文件: ${sqlPath} (${sql.length} 字符)`);
    console.log('⏳ 执行迁移...');

    await client.query(sql);

    console.log('✅ 迁移完成！');
    console.log('');
    console.log('📊 已创建:');
    console.log('   - 9 张数据表 (users, flights, flight_tickets, posts, comments, likes, follows, airports, aircraft)');
    console.log('   - 15+ 索引');
    console.log('   - RLS 安全策略');
    console.log('   - 触发器 (自动更新 updated_at, 用户注册自动建资料)');
    console.log('   - 4 个视图 (user_stats, public_feed, airport_stats, aircraft_stats)');
    console.log('   - 47 个机场种子数据');
    console.log('   - 49 个机型种子数据');
  } catch (err) {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
