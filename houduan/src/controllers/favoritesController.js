const { pool } = require('../config/database');

class FavoritesController {
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
                SELECT f.*, q.title, q.options, q.categoryId
                FROM favorites f
                JOIN questions q ON f.questionId = q.id
                WHERE f.userId = ?
                ORDER BY f.created_at DESC
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
                'SELECT id FROM favorites WHERE userId = ? AND questionId = ?',
                [userId, questionId]
            );

            if (existing.length > 0) {
                return res.json({
                    success: true,
                    message: '题目已在收藏夹中',
                    data: existing[0]
                });
            }

            const [result] = await pool.execute(
                'INSERT INTO favorites (userId, questionId) VALUES (?, ?)',
                [userId, questionId]
            );

            res.status(201).json({
                success: true,
                message: '已收藏',
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
                'DELETE FROM favorites WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '收藏记录不存在'
                });
            }

            res.json({
                success: true,
                message: '已取消收藏'
            });
        } catch (error) {
            next(error);
        }
    }

    async removeByUserAndQuestion(req, res, next) {
        try {
            const { userId, questionId } = req.query;

            const [result] = await pool.execute(
                'DELETE FROM favorites WHERE userId = ? AND questionId = ?',
                [userId, questionId]
            );

            res.json({
                success: true,
                message: '已取消收藏'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new FavoritesController();
