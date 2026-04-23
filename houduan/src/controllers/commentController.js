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

    /** GET /api/posts/:postId/comments */
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
                ORDER BY c.is_accepted DESC, c.is_highlighted DESC, c.like_count DESC, c.created_at ASC
                LIMIT ${parseInt(limit)} OFFSET ${offset}
            `, [postId]);

            const [countResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM comments WHERE post_id = ?', [postId]
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

    /** POST /api/posts/:postId/comments */
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

            if (content.trim().length < 5) {
                return res.status(400).json({
                    success: false,
                    message: '评论内容至少需要5个字符'
                });
            }

            const [posts] = await pool.execute(
                'SELECT id FROM posts WHERE id = ?', [postId]
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
                data: { comment: newComment[0] }
            });
        } catch (error) {
            next(error);
        }
    }

    /** DELETE /api/posts/:postId/comments/:commentId */
    async deleteComment(req, res, next) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            const [comments] = await pool.execute(
                'SELECT * FROM comments WHERE id = ?', [commentId]
            );

            if (comments.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '评论不存在'
                });
            }

            if (comments[0].user_id !== userId && userRole !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '无权限删除该评论'
                });
            }

            await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);

            res.json({ success: true, message: '评论删除成功' });
        } catch (error) {
            next(error);
        }
    }

    /** PATCH /api/posts/:postId/comments/:commentId/like */
    async toggleLike(req, res, next) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const [comments] = await pool.execute(
                'SELECT id, like_count FROM comments WHERE id = ?', [commentId]
            );

            if (comments.length === 0) {
                return res.status(404).json({ success: false, message: '评论不存在' });
            }

            await pool.execute(
                'UPDATE comments SET like_count = like_count + 1 WHERE id = ?', [commentId]
            );

            const [[updated]] = await pool.execute(
                'SELECT like_count FROM comments WHERE id = ?', [commentId]
            );

            res.json({ success: true, data: { likeCount: updated.like_count } });
        } catch (error) {
            next(error);
        }
    }

    /** PATCH /api/posts/:postId/comments/:commentId/highlight - 管理员精选 */
    async toggleHighlight(req, res, next) {
        try {
            const { commentId } = req.params;
            const userRole = req.user.role;

            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: '仅管理员可操作' });
            }

            const [comments] = await pool.execute(
                'SELECT is_highlighted FROM comments WHERE id = ?', [commentId]
            );

            if (comments.length === 0) {
                return res.status(404).json({ success: false, message: '评论不存在' });
            }

            const newVal = comments[0].is_highlighted ? 0 : 1;
            await pool.execute(
                'UPDATE comments SET is_highlighted = ? WHERE id = ?', [newVal, commentId]
            );

            res.json({ success: true, data: { isHighlighted: !!newVal } });
        } catch (error) {
            next(error);
        }
    }

    /** PATCH /api/posts/:postId/comments/:commentId/accept - 楼主采纳 */
    async toggleAccept(req, res, next) {
        try {
            const { commentId } = req.params;
            const { postId } = req.params;
            const userId = req.user.id;

            // 必须是帖主才能采纳
            const [posts] = await pool.execute(
                'SELECT user_id FROM posts WHERE id = ?', [postId]
            );

            if (posts.length === 0 || posts[0].user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: '只有帖子作者才能采纳答案'
                });
            }

            const [comments] = await pool.execute(
                'SELECT is_accepted FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]
            );

            if (comments.length === 0) {
                return res.status(404).json({ success: false, message: '评论不存在' });
            }

            const newVal = comments[0].is_accepted ? 0 : 1;

            // 如果采纳新评论，先取消该帖所有其他采纳
            if (newVal === 1) {
                await pool.execute(
                    'UPDATE comments SET is_accepted = 0 WHERE post_id = ?', [postId]
                );
            }

            await pool.execute(
                'UPDATE comments SET is_accepted = ? WHERE id = ?', [newVal, commentId]
            );

            res.json({ success: true, data: { isAccepted: !!newVal } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CommentController();
