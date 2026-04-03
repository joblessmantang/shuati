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

class PostController {
    escapeHtml(text) {
        return escapeHtml(text);
    }

    async getPostsByQuestion(req, res, next) {
        try {
            const { questionId, q, page = 1, limit = 20 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            let query = `
                SELECT p.*, u.username as author_name, q.title as question_title,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN questions q ON p.question_id = q.id
            `;
            const params = [];
            const conditions = [];

            if (questionId) {
                conditions.push('p.question_id = ?');
                params.push(parseInt(questionId));
            }

            if (q && q.trim()) {
                const keyword = `%${q.trim()}%`;
                conditions.push('(p.title LIKE ? OR p.content LIKE ? OR q.title LIKE ?)');
                params.push(keyword, keyword, keyword);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ` ORDER BY p.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;

            const [posts] = await pool.query(query, params);

            res.json({
                success: true,
                data: {
                    posts,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async createPost(req, res, next) {
        try {
            const { questionId, title, content } = req.body;
            const userId = req.user.id;

            if (!title || !content) {
                return res.status(400).json({
                    success: false,
                    message: '标题和内容不能为空'
                });
            }

            let questionIdValue = null;
            if (questionId) {
                const [questions] = await pool.execute(
                    'SELECT id FROM questions WHERE id = ?',
                    [questionId]
                );

                if (questions.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: '题目不存在'
                    });
                }
                questionIdValue = questionId;
            }

            const safeTitle = escapeHtml(String(title || ''));
            const safeContent = escapeHtml(String(content || ''));

            const [result] = await pool.execute(
                'INSERT INTO posts (user_id, question_id, title, content) VALUES (?, ?, ?, ?)',
                [userId, questionIdValue, safeTitle, safeContent]
            );

            res.status(201).json({
                success: true,
                message: '帖子发布成功',
                data: {
                    postId: result.insertId
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getPostById(req, res, next) {
        try {
            const { postId } = req.params;

            // 先更新浏览量
            await pool.execute(
                'UPDATE posts SET view_count = view_count + 1 WHERE id = ?',
                [postId]
            );

            const [posts] = await pool.execute(`
                SELECT p.*, u.username as author_name, q.title as question_title,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN questions q ON p.question_id = q.id
                WHERE p.id = ?
            `, [postId]);

            if (posts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '帖子不存在'
                });
            }

            const [comments] = await pool.execute(`
                SELECT c.*, u.username as author_name
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = ?
                ORDER BY c.created_at ASC
            `, [postId]);

            res.json({
                success: true,
                data: {
                    post: posts[0],
                    comments
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deletePost(req, res, next) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const [posts] = await pool.execute(
                'SELECT * FROM posts WHERE id = ? AND user_id = ?',
                [postId, userId]
            );

            if (posts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '帖子不存在或无权限删除'
                });
            }

            await pool.execute('DELETE FROM posts WHERE id = ?', [postId]);

            res.json({
                success: true,
                message: '帖子删除成功'
            });
        } catch (error) {
            next(error);
        }
    }

    async updatePost(req, res, next) {
        try {
            const { postId } = req.params;
            const { title, content } = req.body;
            const userId = req.user.id;

            const [posts] = await pool.execute(
                'SELECT * FROM posts WHERE id = ?',
                [postId]
            );

            if (posts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '帖子不存在'
                });
            }

            if (posts[0].user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '无权限编辑'
                });
            }

            const safeTitle = title ? escapeHtml(String(title)) : posts[0].title;
            const safeContent = content ? escapeHtml(String(content)) : posts[0].content;

            await pool.execute(
                'UPDATE posts SET title = ?, content = ? WHERE id = ?',
                [safeTitle, safeContent, postId]
            );

            res.json({
                success: true,
                message: '帖子更新成功'
            });
        } catch (error) {
            next(error);
        }
    }

    async getCount(req, res, next) {
        try {
            const { questionId } = req.query;
            let query = 'SELECT COUNT(*) as total FROM posts';
            const params = [];

            if (questionId) {
                query += ' WHERE question_id = ?';
                params.push(parseInt(questionId));
            }

            const [rows] = await pool.execute(query, params);
            res.json({ success: true, data: { total: rows[0].total } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PostController();
