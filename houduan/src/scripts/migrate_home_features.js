/**
 * 增量迁移脚本：公告、消息、反馈、主题偏好四模块
 * CREATE TABLE IF NOT EXISTS 幂等，可重复运行
 *
 * 运行方式：
 *   node src/scripts/migrate_home_features.js
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
        multipleStatements: true
    };

    const conn = await mysql.createConnection(connectionConfig);

    try {
        console.log('[Migration] 开始执行首页功能迁移...\n');

        // ================================================================
        // 1. 公告表
        // ================================================================
        console.log('[Migration] 创建 announcements 表...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id              INT PRIMARY KEY AUTO_INCREMENT,
                title           VARCHAR(200) NOT NULL,
                content         TEXT,
                type            ENUM('notice', 'promo', 'event') NOT NULL DEFAULT 'notice',
                priority        INT NOT NULL DEFAULT 0,
                start_date      DATE NOT NULL,
                end_date        DATE NOT NULL,
                is_pinned       TINYINT(1) NOT NULL DEFAULT 0,
                created_by      INT DEFAULT NULL,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_active_dates (start_date, end_date),
                INDEX idx_priority (priority DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] announcements 表就绪\n');

        // ================================================================
        // 2. 消息表
        // ================================================================
        console.log('[Migration] 创建 messages 表...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id              INT PRIMARY KEY AUTO_INCREMENT,
                user_id         INT NOT NULL,
                type            ENUM('reply', 'like', 'system') NOT NULL DEFAULT 'system',
                title           VARCHAR(200) NOT NULL DEFAULT '',
                content         VARCHAR(500) NOT NULL,
                is_read         TINYINT(1) NOT NULL DEFAULT 0,
                related_id      INT DEFAULT NULL,
                related_type    VARCHAR(50) DEFAULT NULL,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_msg_user_read (user_id, is_read),
                INDEX idx_msg_user_time (user_id, created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] messages 表就绪\n');

        // ================================================================
        // 3. 反馈表
        // ================================================================
        console.log('[Migration] 创建 feedbacks 表...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS feedbacks (
                id              INT PRIMARY KEY AUTO_INCREMENT,
                user_id         INT DEFAULT NULL,
                type            ENUM('bug', 'suggestion', 'other') NOT NULL DEFAULT 'suggestion',
                content         VARCHAR(1000) NOT NULL,
                contact         VARCHAR(100) DEFAULT '',
                status          ENUM('pending', 'reviewed', 'resolved') NOT NULL DEFAULT 'pending',
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_fb_status (status),
                INDEX idx_fb_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] feedbacks 表就绪\n');

        // ================================================================
        // 4. users 表新增 theme 字段
        // ================================================================
        console.log('[Migration] users 表新增 theme 字段...');
        try {
            await conn.query(`
                ALTER TABLE users
                ADD COLUMN theme ENUM('light', 'dark') NOT NULL DEFAULT 'light'
                AFTER avatar_url
            `);
            console.log('[Migration] theme 字段已添加\n');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('[Migration] theme 字段已存在，跳过\n');
            } else throw err;
        }

        // ================================================================
        // 5. 插入公告种子数据
        // ================================================================
        console.log('[Migration] 插入公告种子数据...');
        await conn.query(`
            INSERT IGNORE INTO announcements (id, title, content, type, priority, start_date, end_date)
            VALUES
                (1, '欢迎使用刷题平台', '这里是你提升编程能力的最佳训练场！每日刷题，坚持学习，开启你的技术成长之路。', 'notice', 10,
                 DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
                (2, '本周专题挑战：JavaScript 异步编程', '完成本周 JavaScript 异步相关练习，可获得限时徽章！', 'event', 8,
                 DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY))
        `);
        console.log('[Migration] 公告种子插入完成\n');

        console.log('========================================');
        console.log('  迁移完成！新表/字段：');
        console.log('  - announcements     公告管理');
        console.log('  - messages           消息中心');
        console.log('  - feedbacks          反馈建议');
        console.log('  - users.theme        主题偏好');
        console.log('========================================');

    } catch (error) {
        console.error('[Migration] 迁移失败:', error.message);
        throw error;
    } finally {
        await conn.end();
    }
}

migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
