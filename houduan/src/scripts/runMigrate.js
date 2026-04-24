/**
 * 执行 SQL 迁移脚本（PowerShell 兼容方式）
 * 运行：node src/scripts/runMigrate.js
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  const conn = await mysql.createConnection(connectionConfig);

  try {
    const dbName = process.env.DB_NAME || 'interview_platform';
    const sqlFile = path.join(__dirname, 'migrate_resources.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log(`正在切换到数据库 ${dbName}...`);
    await conn.query(`USE \`${dbName}\``);

    console.log('正在执行 migrate_resources.sql...');
    await conn.query(sql);
    console.log('执行成功！资源表、示例数据已就绪。');
  } catch (err) {
    console.error('执行失败:', err.message);
  } finally {
    await conn.end();
  }
}

run();
