/**
 * 迁移脚本：为 practice_history 添加 mode 字段
 * 幂等：已存在则跳过，已存在但无默认值则补充
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

    try {
        // 1. 检查 practice_history 表是否存在
        const [tables] = await connection.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'practice_history' AND COLUMN_NAME = 'mode'`,
            [connectionConfig.database]
        );

        if (tables.length > 0) {
            console.log('[Migration] mode 字段已存在，跳过');
        } else {
            // 2. 检查表是否存在
            const [tableCheck] = await connection.query(
                `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'practice_history'`,
                [connectionConfig.database]
            );

            if (tableCheck[0].cnt === 0) {
                console.log('[Migration] practice_history 表不存在，跳过（请先运行 initDb）');
            } else {
                // 3. 添加 mode 字段
                console.log('[Migration] 添加 mode 字段到 practice_history...');
                await connection.query(
                    `ALTER TABLE practice_history
                     ADD COLUMN mode VARCHAR(20) NOT NULL DEFAULT 'normal' AFTER timeSpent`
                );
                console.log('[Migration] mode 字段添加成功');

                // 4. 为已存在记录设置默认值
                const [updateResult] = await connection.query(
                    `UPDATE practice_history SET mode = 'normal' WHERE mode IS NULL OR mode = ''`
                );
                console.log(`[Migration] 已更新 ${updateResult.affectedRows} 条历史记录的 mode 字段`);
            }
        }

        // 5. 添加索引（忽略报错）
        try {
            await connection.query(
                `CREATE INDEX idx_practice_history_user_mode ON practice_history(userId, mode)`
            );
            console.log('[Migration] 索引创建成功');
        } catch (idxErr) {
            if (idxErr.code === 'ER_DUP_KEYNAME') {
                console.log('[Migration] 索引已存在，跳过');
            } else {
                console.warn('[Migration] 索引创建失败（不影响使用）:', idxErr.message);
            }
        }

        console.log('========================================');
        console.log('  迁移完成！practice_history.mode 字段就绪');
        console.log('========================================');

    } finally {
        await connection.end();
    }
}

migrate()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('[Migration] 迁移失败:', err.message);
        process.exit(1);
    });
