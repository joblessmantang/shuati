/**
 * 迁移脚本：学习型讨论区增强字段
 * - posts.post_type        帖子类型（question/answer/note）
 * - posts.like_count      点赞数
 * - posts.tags            标签（JSON 数组）
 * - comments.like_count   评论点赞数
 * - comments.is_highlighted  是否精选
 * - comments.is_accepted  是否被楼主采纳
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'interview_platform',
        multipleStatements: false
    };

    const connection = await mysql.createConnection(connectionConfig);
    console.log('[Migration] 数据库连接成功');

    const migrations = [
        {
            name: 'posts.post_type',
            sql: `ALTER TABLE posts ADD COLUMN post_type VARCHAR(20) NOT NULL DEFAULT 'question' AFTER content`,
            checkSql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'post_type'`
        },
        {
            name: 'posts.like_count',
            sql: `ALTER TABLE posts ADD COLUMN like_count INT NOT NULL DEFAULT 0 AFTER view_count`,
            checkSql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'like_count'`
        },
        {
            name: 'posts.tags',
            sql: `ALTER TABLE posts ADD COLUMN tags JSON AFTER like_count`,
            checkSql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'tags'`
        },
        {
            name: 'comments.like_count',
            sql: `ALTER TABLE comments ADD COLUMN like_count INT NOT NULL DEFAULT 0 AFTER content`,
            checkSql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'like_count'`
        },
        {
            name: 'comments.is_highlighted',
            sql: `ALTER TABLE comments ADD COLUMN is_highlighted TINYINT(1) NOT NULL DEFAULT 0 AFTER like_count`,
            checkSql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'is_highlighted'`
        },
        {
            name: 'comments.is_accepted',
            sql: `ALTER TABLE comments ADD COLUMN is_accepted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_highlighted`,
            checkSql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'is_accepted'`
        },
    ];

    for (const mig of migrations) {
        const [rows] = await connection.query(mig.checkSql, [connectionConfig.database]);
        if (rows.length > 0) {
            console.log(`[Migration] ${mig.name} 已存在，跳过`);
        } else {
            try {
                await connection.query(mig.sql);
                console.log(`[Migration] ${mig.name} 创建成功`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`[Migration] ${mig.name} 已存在（DB错误），跳过`);
                } else {
                    console.error(`[Migration] ${mig.name} 失败:`, err.message);
                }
            }
        }
    }

    console.log('========================================');
    console.log('  学习型讨论区增强字段迁移完成');
    console.log('========================================');

    await connection.end();
}

migrate()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('[Migration] 迁移失败:', err.message);
        process.exit(1);
    });
