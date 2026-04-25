/**
 * JS 代码题功能迁移脚本
 * 幂等：已存在的字段/表会跳过
 * 用法：node src/scripts/migrate_js_code_question.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'interview_platform',
  multipleStatements: true,
};

async function migrate() {
  console.log('[JS代码题迁移] 开始...');

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // 读取 SQL 脚本
    const sqlPath = path.join(__dirname, 'migrate_js_code_question.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await connection.query(stmt);
        console.log('[OK]', stmt.substring(0, 80));
      } catch (err) {
        // 忽略已知错误：重复列、重复表、外键已存在
        const ignoreCodes = [
          'ER_DUP_FIELDNAME',     // 字段已存在
          'ER_TABLE_EXISTS_ERROR', // 表已存在
          'ER_FK_DUP_NAME',        // 外键已存在
          'ER_KEY_COLUMN_DOES_NOT_EXIST', // ALTER 时字段不存在的警告
        ];
        if (ignoreCodes.includes(err.code)) {
          console.log('[跳过]', err.code, err.message.substring(0, 60));
        } else {
          throw err;
        }
      }
    }

    console.log('[JS代码题迁移] 完成！');
  } catch (err) {
    console.error('[迁移失败]', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
