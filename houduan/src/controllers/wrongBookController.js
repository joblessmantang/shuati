const { pool } = require('../config/database');

class WrongBookController {
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
                SELECT wb.*, q.title, q.options, q.categoryId
                FROM wrong_book wb
                JOIN questions q ON wb.questionId = q.id
                WHERE wb.userId = ?
                ORDER BY wb.created_at DESC
            `, [userId]);

            res.json({
                success: true,
                data: items.map(item => ({
                    ...item,
                    options: typeof item.options === 'string' ? JSON.parse(item.options) : item.options
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    async add(req, res, next) {
        try {
            const { userId, questionId } = req.body;

            if (!userId || !questionId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数'
                });
            }

            const [existing] = await pool.execute(
                'SELECT id FROM wrong_book WHERE userId = ? AND questionId = ?',
                [userId, questionId]
            );

            if (existing.length > 0) {
                return res.json({
                    success: true,
                    message: '题目已在错题本中',
                    data: existing[0]
                });
            }

            const [result] = await pool.execute(
                'INSERT INTO wrong_book (userId, questionId) VALUES (?, ?)',
                [userId, questionId]
            );

            res.status(201).json({
                success: true,
                message: '已加入错题本',
                data: {
                    id: result.insertId,
                    userId,
                    questionId
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
                'DELETE FROM wrong_book WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '记录不存在'
                });
            }

            res.json({
                success: true,
                message: '已从错题本移除'
            });
        } catch (error) {
            next(error);
        }
    }

    async removeByUserAndQuestion(req, res, next) {
        try {
            const { userId, questionId } = req.query;

            const [result] = await pool.execute(
                'DELETE FROM wrong_book WHERE userId = ? AND questionId = ?',
                [userId, questionId]
            );

            res.json({
                success: true,
                message: '已从错题本移除'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WrongBookController();
