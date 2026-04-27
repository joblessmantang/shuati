const mysql = require('mysql2/promise');
async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'tl20041204',
    database: 'interview_platform'
  });

  // 检查 comments 表的 user_id 是否有对应的 users
  const [comments] = await conn.query(`
    SELECT c.id, c.user_id, c.post_id, c.content, u.username
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY c.id DESC
    LIMIT 20
  `);
  console.log('Recent comments:');
  comments.forEach(c => {
    console.log(`  id=${c.id}, user_id=${c.user_id}, username=${c.username}, post_id=${c.post_id}, content=${c.content.substring(0, 30)}`);
  });

  // 检查 users 表
  const [users] = await conn.query('SELECT id, username FROM users ORDER BY id');
  console.log('\nAll users:', users.map(u => `${u.id}:${u.username}`).join(', '));

  // 检查最近的消息插入是否成功
  const [msgs] = await conn.query('SELECT id, user_id, type, title, content, created_at FROM messages ORDER BY id DESC LIMIT 10');
  console.log('\nRecent messages:');
  msgs.forEach(m => {
    console.log(`  id=${m.id}, user_id=${m.user_id}, type=${m.type}, title=${m.title}, created_at=${m.created_at}`);
  });

  await conn.end();
}
check().catch(e => {
  console.error('Error:', e.message, e.code);
  process.exit(1);
});
