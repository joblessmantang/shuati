const { pool } = require('../config/database');

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

class CommentController {
    escapeHtml(text) {
        return escapeHtml(text);
    }

    async getCommentsByPost(req, res, next) {
        try {
            const { postId } = req.params;
            const { page = 1, limit = 50 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [comments] = await pool.query(`
                SELECT c.*, u.username as author_name
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = ?
                ORDER BY c.created_at ASC
                LIMIT ${parseInt(limit)} OFFSET ${offset}
            `, [postId]);

            const [countResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM comments WHERE post_id = ?',
                [postId]
            );

            res.json({
                success: true,
                data: {
                    comments,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: countResult[0].total
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async createComment(req, res, next) {
        try {
            const { postId } = req.params;
            const { content } = req.body;
            const userId = req.user.id;

            if (!content || !content.trim()) {
                return res.status(400).json({
                    success: false,
                    message: '评论内容不能为空'
                });
            }

            const [posts] = await pool.execute(
                'SELECT id FROM posts WHERE id = ?',
                [postId]
            );

            if (posts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '帖子不存在'
                });
            }

            const safeContent = escapeHtml(String(content.trim()));

            const [result] = await pool.execute(
                'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
                [postId, userId, safeContent]
            );

            const [newComment] = await pool.execute(`
                SELECT c.*, u.username as author_name
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.id = ?
            `, [result.insertId]);

            res.status(201).json({
                success: true,
                message: '评论发布成功',
                data: {
                    comment: newComment[0]
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteComment(req, res, next) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const [comments] = await pool.execute(
                'SELECT * FROM comments WHERE id = ? AND user_id = ?',
                [commentId, userId]
            );

            if (comments.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '评论不存在或无权限删除'
                });
            }

            await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);

            res.json({
                success: true,
                message: '评论删除成功'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CommentController();
