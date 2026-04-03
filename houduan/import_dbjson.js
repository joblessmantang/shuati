/**
 * 从 db.json 导入数据到 MySQL
 * 运行方式: node import_dbjson.js
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const { pool } = require('./src/config/database');

async function importData() {
  const dbJsonPath = path.join(__dirname, '..', 'shuati', 'db.json');
  const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));

  console.log('开始导入数据...\n');

  // ----- 1. 导入 users -----
  console.log(`[1/5] 导入 users (${data.users.length} 条)...`);
  for (const user of data.users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    try {
      await pool.execute(
        'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
        [user.id, user.username, hashedPassword, user.role || 'user']
      );
      console.log(`  ✓ 用户 ${user.username} (id=${user.id})`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`  - 用户 ${user.username} 已存在，跳过`);
      } else {
        throw err;
      }
    }
  }

  // ----- 2. 导入 wrong_book -----
  console.log(`\n[2/5] 导入 wrong_book (${data.wrongBook.length} 条)...`);
  for (const item of data.wrongBook) {
    try {
      await pool.execute(
        'INSERT INTO wrong_book (id, userId, questionId) VALUES (?, ?, ?)',
        [item.id, item.userId, item.questionId]
      );
      console.log(`  ✓ id=${item.id} userId=${item.userId} questionId=${item.questionId}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`  - id=${item.id} 已存在，跳过`);
      } else {
        throw err;
      }
    }
  }

  // ----- 3. 导入 favorites -----
  console.log(`\n[3/5] 导入 favorites (${data.favorites.length} 条)...`);
  for (const item of data.favorites) {
    try {
      await pool.execute(
        'INSERT INTO favorites (id, userId, questionId) VALUES (?, ?, ?)',
        [item.id, item.userId, item.questionId]
      );
      console.log(`  ✓ id=${item.id}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`  - id=${item.id} 已存在，跳过`);
      } else {
        throw err;
      }
    }
  }

  // ----- 4. 导入 practice_history -----
  console.log(`\n[4/5] 导入 practice_history (${data.practiceHistory.length} 条)...`);
  for (const item of data.practiceHistory) {
    try {
      await pool.execute(
        'INSERT INTO practice_history (id, userId, score, total, timeSpent, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [item.id, item.userId, item.score, item.total, item.timeSpent, new Date(item.createdAt)]
      );
      console.log(`  ✓ id=${item.id} userId=${item.userId}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`  - id=${item.id} 已存在，跳过`);
      } else {
        throw err;
      }
    }
  }

  // ----- 5. 导入 reports -----
  console.log(`\n[5/5] 导入 reports (${data.reports.length} 条)...`);
  for (const item of data.reports) {
    try {
      await pool.execute(
        'INSERT INTO reports (id, questionId, reason, createdAt) VALUES (?, ?, ?, ?)',
        [item.id, item.questionId, item.reason, new Date(item.createdAt)]
      );
      console.log(`  ✓ id=${item.id} questionId=${item.questionId}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`  - id=${item.id} 已存在，跳过`);
      } else {
        throw err;
      }
    }
  }

  console.log('\n导入完成!');
  process.exit(0);
}

importData().catch((err) => {
  console.error('\n导入失败:', err.message);
  process.exit(1);
});
