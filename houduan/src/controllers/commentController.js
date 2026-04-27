const { pool } = require('../config/database');
const { pushNewMessage } = require('../services/socketService');

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
            const rawContent = String(content.trim()).substring(0, 50);

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                const [result] = await conn.execute(
                    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
                    [postId, userId, safeContent]
                );

                const [newComment] = await conn.execute(`
                    SELECT c.*, u.username as author_name
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.id = ?
                `, [result.insertId]);

                const [postInfo] = await conn.execute(
                    'SELECT id, user_id, title FROM posts WHERE id = ?', [postId]
                );

                if (postInfo.length > 0 && postInfo[0].user_id !== userId) {
                    const displayContent = rawContent.length < content.trim().length
                        ? rawContent + '...'
                        : rawContent;
                    await conn.execute(
                        `INSERT INTO messages (user_id, type, title, content, related_id, related_type)
                         VALUES (?, 'reply', '有人回复了你的帖子', ?, ?, 'post')`,
                        [
                            postInfo[0].user_id,
                            `"${postInfo[0].title}"有了新回复：${displayContent}`,
                            postId
                        ]
                    );
                }

                await conn.commit();

                if (postInfo.length > 0 && postInfo[0].user_id !== userId) {
                    const displayContent = rawContent.length < content.trim().length
                        ? rawContent + '...'
                        : rawContent;
                    pushNewMessage(postInfo[0].user_id, {
                        type: 'reply',
                        title: '有人回复了你的帖子',
                        content: `"${postInfo[0].title}"有了新回复：${displayContent}`,
                        related_id: parseInt(postId),
                        related_type: 'post'
                    });
                }

                res.status(201).json({
                    success: true,
                    message: '评论发布成功',
                    data: { comment: newComment[0] }
                });
            } catch (err) {
                await conn.rollback();
                throw err;
            } finally {
                conn.release();
            }
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

    /** PATCH /api/posts/:postId/comments/:commentId/like */
    async toggleLike(req, res, next) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const [comments] = await pool.execute(
                `SELECT c.id, c.like_count, c.user_id, p.title as post_title, p.id as post_id
                 FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = ?`,
                [commentId]
            );

            if (comments.length === 0) {
                return res.status(404).json({ success: false, message: '评论不存在' });
            }

            const comment = comments[0];

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                const [updateResult] = await conn.execute(
                    'UPDATE comments SET like_count = like_count + 1 WHERE id = ?',
                    [commentId]
                );

                const [[updated]] = await conn.execute(
                    'SELECT like_count FROM comments WHERE id = ?',
                    [commentId]
                );

                if (comment.user_id !== userId) {
                    await conn.execute(
                        `INSERT INTO messages (user_id, type, title, content, related_id, related_type)
                         VALUES (?, 'like', '有人赞了你的评论', ?, ?, 'comment')`,
                        [
                            comment.user_id,
                            `你的评论被赞了："${comment.post_title}"`,
                            comment.post_id
                        ]
                    );
                }

                await conn.commit();

                if (comment.user_id !== userId) {
                    pushNewMessage(comment.user_id, {
                        type: 'like',
                        title: '有人赞了你的评论',
                        content: `你的评论被赞了："${comment.post_title}"`,
                        related_id: parseInt(comment.post_id),
                        related_type: 'comment'
                    });
                }

                res.json({ success: true, data: { likeCount: updated.like_count } });
            } catch (err) {
                await conn.rollback();
                throw err;
            } finally {
                conn.release();
            }
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CommentController();
