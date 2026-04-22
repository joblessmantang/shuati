/**
 * 增量迁移脚本：补齐签到、学习目标、专题练习三模块
 * 运行时自动检测表是否存在（CREATE TABLE IF NOT EXISTS 幂等）
 * 种子数据使用 INSERT IGNORE 防止重复插入
 *
 * 运行方式：
 *   node src/scripts/migrate_learning.js
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
        console.log('[Migration] 开始执行增量迁移...\n');

        // ================================================================
        // 1. 创建签到表
        // ================================================================
        console.log('[Migration] 创建 check_ins 表...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS check_ins (
                id              INT PRIMARY KEY AUTO_INCREMENT,
                user_id         INT NOT NULL,
                checkin_date    DATE NOT NULL,
                streak_days     INT DEFAULT 1,
                total_days      INT DEFAULT 1,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_user_checkin_date (user_id, checkin_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] check_ins 表就绪\n');

        // ================================================================
        // 2. 创建学习目标表
        // ================================================================
        console.log('[Migration] 创建 study_goals 表...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS study_goals (
                id              INT PRIMARY KEY AUTO_INCREMENT,
                user_id         INT NOT NULL,
                type            ENUM('daily', 'weekly') NOT NULL DEFAULT 'daily',
                target_count    INT NOT NULL DEFAULT 10,
                current_count   INT NOT NULL DEFAULT 0,
                start_date      DATE NOT NULL,
                end_date        DATE NOT NULL,
                status          ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_goals_user_status (user_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] study_goals 表就绪\n');

        // ================================================================
        // 3. 创建专题表
        // ================================================================
        console.log('[Migration] 创建 topics 表...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS topics (
                id              INT PRIMARY KEY AUTO_INCREMENT,
                user_id         INT NOT NULL,
                name            VARCHAR(100) NOT NULL,
                description     VARCHAR(500) DEFAULT '',
                question_count  INT DEFAULT 0,
                practice_count  INT DEFAULT 0,
                last_practiced_at DATETIME DEFAULT NULL,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_topics_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] topics 表就绪\n');

        // ================================================================
        // 4. 创建专题-题目关联表
        // ================================================================
        console.log('[Migration] 创建 topic_questions 表...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS topic_questions (
                id              INT PRIMARY KEY AUTO_INCREMENT,
                topic_id        INT NOT NULL,
                question_id     INT NOT NULL,
                sort_order      INT NOT NULL DEFAULT 0,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_topic_question (topic_id, question_id),
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                INDEX idx_tq_topic_order (topic_id, sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] topic_questions 表就绪\n');

        // ================================================================
        // 5. 插入种子数据
        // ================================================================

        // 查测试用户 tl (id=2) 是否存在
        const [users] = await conn.query('SELECT id FROM users WHERE username = ?', ['tl']);
        const testUserId = users.length > 0 ? users[0].id : null;

        if (!testUserId) {
            console.log('[Migration] 未找到测试用户 tl，跳过种子数据插入（请先运行 initDb.js 创建用户）');
        } else {
            console.log(`[Migration] 找到测试用户 tl (id=${testUserId})，开始插入种子数据...\n`);

            // 5a. 签到种子：连续签到4天（今天，昨天，前天，大前天）
            const dates = [];
            for (let i = 3; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dates.push(d.toISOString().slice(0, 10));
            }

            for (let i = 0; i < dates.length; i++) {
                const streak = i + 1; // streak_days: 1, 2, 3, 4
                await conn.query(
                    `INSERT IGNORE INTO check_ins (user_id, checkin_date, streak_days, total_days)
                     VALUES (?, ?, ?, ?)`,
                    [testUserId, dates[i], streak, streak]
                );
                process.stdout.write(`  签到: ${dates[i]} streak=${streak} OK\n`);
            }
            console.log('');

            // 5b. 学习目标种子
            const today = new Date().toISOString().slice(0, 10);
            const monday = new Date();
            monday.setDate(monday.getDate() - monday.getDay() + 1);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            await conn.query(
                `INSERT IGNORE INTO study_goals
                 (user_id, type, target_count, current_count, start_date, end_date, status)
                 VALUES (?, 'daily', 20, 8, ?, ?, 'active')`,
                [testUserId, today, today]
            );
            console.log(`  每日目标: 目标20题/当前8题  OK`);

            await conn.query(
                `INSERT IGNORE INTO study_goals
                 (user_id, type, target_count, current_count, start_date, end_date, status)
                 VALUES (?, 'weekly', 100, 35, ?, ?, 'active')`,
                [testUserId, monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)]
            );
            console.log(`  每周目标: 目标100题/当前35题  OK\n`);

            // 5c. 专题种子
            const [existingTopic] = await conn.query(
                'SELECT id FROM topics WHERE user_id = ? LIMIT 1', [testUserId]
            );

            if (existingTopic.length === 0) {
                // 专题1：JavaScript核心
                await conn.query(
                    `INSERT INTO topics (user_id, name, description, question_count, practice_count, last_practiced_at)
                     VALUES (?, 'JavaScript 核心概念', '涵盖闭包、原型链、异步等高频面试知识点', 5, 2, DATE_SUB(NOW(), INTERVAL 2 DAY))`,
                    [testUserId]
                );
                // 专题2：CSS布局
                await conn.query(
                    `INSERT INTO topics (user_id, name, description, question_count, practice_count)
                     VALUES (?, 'CSS 布局专项', 'Flexbox 与 Grid 布局练习', 3, 0)`,
                    [testUserId]
                );

                const [topicRows] = await conn.query(
                    'SELECT id FROM topics WHERE user_id = ? ORDER BY id', [testUserId]
                );

                // topic_questions 关联数据
                const topicQuestions = [
                    // 专题1：JavaScript (id=4,7,8,20,31)
                    [topicRows[0].id, 4, 1],
                    [topicRows[0].id, 7, 2],
                    [topicRows[0].id, 8, 3],
                    [topicRows[0].id, 20, 4],
                    [topicRows[0].id, 31, 5],
                    // 专题2：CSS (id=3,9,24)
                    [topicRows[1].id, 3, 1],
                    [topicRows[1].id, 9, 2],
                    [topicRows[1].id, 24, 3],
                ];

                for (const [tid, qid, order] of topicQuestions) {
                    await conn.query(
                        'INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order) VALUES (?, ?, ?)',
                        [tid, qid, order]
                    );
                }

                // 同步 question_count 冗余字段
                for (const topic of topicRows) {
                    const [cnt] = await conn.query(
                        'SELECT COUNT(*) as c FROM topic_questions WHERE topic_id = ?', [topic.id]
                    );
                    await conn.query(
                        'UPDATE topics SET question_count = ? WHERE id = ?', [cnt[0].c, topic.id]
                    );
                }

                console.log('  专题1「JavaScript 核心概念」+ 5题  OK');
                console.log('  专题2「CSS 布局专项」+ 3题   OK\n');
            } else {
                console.log('[Migration] 专题数据已存在，跳过\n');
            }
        }

        console.log('========================================');
        console.log('  迁移完成！新表：');
        console.log('  - check_ins        每日签到记录');
        console.log('  - study_goals      学习目标');
        console.log('  - topics           专题');
        console.log('  - topic_questions  专题-题目关联');
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
