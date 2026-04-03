const { pool } = require('../config/database');

class ReportController {
    async getList(req, res, next) {
        try {
            const [reports] = await pool.query(`
                SELECT r.*, q.title as questionTitle
                FROM reports r
                JOIN questions q ON r.questionId = q.id
                ORDER BY r.createdAt DESC
            `);

            res.json({
                success: true,
                data: reports
            });
        } catch (error) {
            next(error);
        }
    }

    async add(req, res, next) {
        try {
            const { questionId, reason } = req.body;

            if (!questionId || !reason) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数'
                });
            }

            const [result] = await pool.execute(
                'INSERT INTO reports (questionId, reason) VALUES (?, ?)',
                [questionId, reason]
            );

            res.status(201).json({
                success: true,
                message: '举报已提交',
                data: {
                    id: result.insertId,
                    questionId,
                    reason
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async remove(req, res, next) {
        try {
            const { id } = req.params;

            const [result] = await pool.execute(
                'DELETE FROM reports WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '举报记录不存在'
                });
            }

            res.json({
                success: true,
                message: '举报已删除'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ReportController();
