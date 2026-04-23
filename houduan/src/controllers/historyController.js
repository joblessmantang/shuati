const { pool } = require('../config/database');

class HistoryController {
    async getList(req, res, next) {
        try {
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            const [items] = await pool.query(`
                SELECT * FROM practice_history
                WHERE userId = ?
                ORDER BY createdAt DESC
            `, [userId]);

            res.json({
                success: true,
                data: items
            });
        } catch (error) {
            next(error);
        }
    }

    async add(req, res, next) {
        try {
            const { userId, score, total, timeSpent, createdAt } = req.body;

            console.log('[History] 收到保存练习记录请求:', { userId, score, total, timeSpent, createdAt });

            if (!userId || total === undefined) {
                console.log('[History] 参数校验失败: 缺少 userId 或 total');
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数'
                });
            }

            const insertUserId = Number(userId);
            const insertScore = Number(score) || 0;
            const insertTotal = Number(total);
            const insertTimeSpent = Number(timeSpent) || 0;
            const insertMode = req.body.mode || 'normal';
            const insertCreatedAt = createdAt ? new Date(createdAt) : new Date();

            console.log('[History] 准备插入数据库:', { insertUserId, insertScore, insertTotal, insertTimeSpent, insertCreatedAt, insertMode });

            const [result] = await pool.execute(
                'INSERT INTO practice_history (userId, score, total, timeSpent, mode, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
                [insertUserId, insertScore, insertTotal, insertTimeSpent, insertMode, insertCreatedAt]
            );

            console.log('[History] 数据库插入成功, id:', result.insertId);

            res.status(201).json({
                success: true,
                message: '练习记录已保存',
                data: {
                    id: result.insertId,
                    userId: insertUserId,
                    score: insertScore,
                    total: insertTotal,
                    timeSpent: insertTimeSpent,
                    mode: insertMode
                }
            });
        } catch (error) {
            console.error('[History] 数据库插入失败:', error);
            next(error);
        }
    }
}

module.exports = new HistoryController();
