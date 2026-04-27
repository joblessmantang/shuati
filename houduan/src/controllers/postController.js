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

function parseTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

class PostController {
    escapeHtml(text) {
        return escapeHtml(text);
    }

    /** POST /api/posts - 创建帖子（支持 post_type、tags） */
    async createPost(req, res, next) {
        try {
            const { questionId, title, content, post_type = 'question', tags } = req.body;
            const userId = req.user.id;

            if (!title || !content) {
                return res.status(400).json({
                    success: false,
                    message: '标题和内容不能为空'
                });
            }

            if (title.trim().length < 5) {
                return res.status(400).json({
                    success: false,
                    message: '标题至少需要5个字符'
                });
            }

            if (content.trim().length < 10) {
                return res.status(400).json({
                    success: false,
                    message: '内容至少需要10个字符'
                });
            }

            const validTypes = ['question', 'answer', 'note'];
            const safeType = validTypes.includes(post_type) ? post_type : 'question';

            let questionIdValue = null;
            if (questionId) {
                const [questions] = await pool.execute(
                    'SELECT id FROM questions WHERE id = ?', [questionId]
                );
                if (questions.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: '题目不存在'
                    });
                }
                questionIdValue = questionId;
            }

            const safeTitle = escapeHtml(String(title.trim()));
            const safeContent = escapeHtml(String(content.trim()));
            const safeTags = tags && Array.isArray(tags) ? JSON.stringify(tags) : null;

            const [result] = await pool.execute(
                'INSERT INTO posts (user_id, question_id, title, content, post_type, tags) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, questionIdValue, safeTitle, safeContent, safeType, safeTags]
            );

            res.status(201).json({
                success: true,
                message: '帖子发布成功',
                data: { postId: result.insertId }
            });
        } catch (error) {
            next(error);
        }
    }

    /** GET /api/posts - 帖子列表 */
    async getPostsByQuestion(req, res, next) {
        try {
            const { questionId, q, post_type, page = 1, limit = 20 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            let query = `
                SELECT p.*, u.username as author_name, u.avatar_url as author_avatar, q.title as question_title, q.categoryId,
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
            if (post_type) {
                conditions.push('p.post_type = ?');
                params.push(post_type);
            }
            if (q && q.trim()) {
                const keyword = `%${q.trim()}%`;
                conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
                params.push(keyword, keyword);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ` ORDER BY p.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;

            const [posts] = await pool.query(query, params);

            // 解析 tags JSON
            const postsWithTags = posts.map(p => ({
                ...p,
                tags: parseTags(p.tags)
            }));

            res.json({
                success: true,
                data: {
                    posts: postsWithTags,
                    pagination: { page: parseInt(page), limit: parseInt(limit) }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /** GET /api/posts/:postId - 帖子详情（含评论、相关推荐） */
    async getPostById(req, res, next) {
        try {
            const { postId } = req.params;

            await pool.execute(
                'UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [postId]
            );

            const [posts] = await pool.execute(`
                SELECT p.*, u.username as author_name, u.avatar_url as author_avatar,
                    q.title as question_title, q.categoryId, q.options as question_options, q.correctAnswer as question_answer,
                    c_cat.name as category_name,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN questions q ON p.question_id = q.id
                LEFT JOIN categories c_cat ON q.categoryId = c_cat.id
                WHERE p.id = ?
            `, [postId]);

            if (posts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '帖子不存在'
                });
            }

            const post = {
                ...posts[0],
                tags: parseTags(posts[0].tags)
            };

            // 评论排序：采纳 > 精选 > 点赞数 > 时间
            const [comments] = await pool.execute(`
                SELECT c.*, u.username as author_name, u.avatar_url as author_avatar
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = ?
                ORDER BY c.is_accepted DESC, c.is_highlighted DESC, c.like_count DESC, c.created_at ASC
            `, [postId]);

            // 相关推荐（同分类的其他帖子，3条）
            let relatedPosts = [];
            if (post.categoryId) {
                const [related] = await pool.query(`
                    SELECT p.id, p.title, p.post_type, p.like_count,
                           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
                    FROM posts p
                    WHERE p.question_id IN (SELECT id FROM questions WHERE categoryId = ?)
                      AND p.id != ?
                    ORDER BY p.like_count DESC, p.created_at DESC
                    LIMIT 3
                `, [post.categoryId, postId]);
                relatedPosts = related;
            } else if (post.question_id) {
                const [related] = await pool.query(`
                    SELECT p.id, p.title, p.post_type, p.like_count,
                           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
                    FROM posts p
                    WHERE p.id != ? AND p.question_id = ?
                    ORDER BY p.like_count DESC
                    LIMIT 3
                `, [postId, post.question_id]);
                relatedPosts = related;
            }

            res.json({
                success: true,
                data: {
                    post,
                    comments,
                    relatedPosts
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /** POST /api/posts/:postId/like - 点赞/取消点赞 */
    async toggleLike(req, res, next) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                const [posts] = await conn.execute(
                    'SELECT id, user_id, like_count, title FROM posts WHERE id = ?', [postId]
                );
                if (posts.length === 0) {
                    await conn.rollback();
                    return res.status(404).json({ success: false, message: '帖子不存在' });
                }

                const post = posts[0];

                await conn.execute(
                    'UPDATE posts SET like_count = like_count + 1 WHERE id = ?', [postId]
                );

                const [[updated]] = await conn.execute(
                    'SELECT like_count FROM posts WHERE id = ?', [postId]
                );

                if (post.user_id !== userId) {
                    await conn.execute(
                        `INSERT INTO messages (user_id, type, title, content, related_id, related_type)
                         VALUES (?, 'like', '有人赞了你的帖子', ?, ?, 'post')`,
                        [post.user_id, `你的帖子"${post.title}"收到了 1 个赞`, postId]
                    );
                }

                await conn.commit();

                if (post.user_id !== userId) {
                    pushNewMessage(post.user_id, {
                        type: 'like',
                        title: '有人赞了你的帖子',
                        content: `你的帖子"${post.title}"收到了 1 个赞`,
                        related_id: parseInt(postId),
                        related_type: 'post'
                    });
                }

                res.json({
                    success: true,
                    data: { likeCount: updated.like_count }
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

    /** POST /api/posts/:postId/comments/:commentId/like - 点赞/取消点赞评论 */
    async toggleCommentLike(req, res, next) {
        try {
            const { postId, commentId } = req.params;
            const userId = req.user.id;

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                const [comments] = await conn.execute(
                    'SELECT id, user_id, like_count FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]
                );

                if (comments.length === 0) {
                    await conn.rollback();
                    return res.status(404).json({ success: false, message: '评论不存在' });
                }

                const comment = comments[0];

                await conn.execute(
                    'UPDATE comments SET like_count = like_count + 1 WHERE id = ?', [commentId]
                );

                const [[updated]] = await conn.execute(
                    'SELECT like_count FROM comments WHERE id = ?', [commentId]
                );

                if (comment.user_id !== userId) {
                    await conn.execute(
                        `INSERT INTO messages (user_id, type, title, content, related_id, related_type)
                         VALUES (?, 'like', '有人赞了你的评论', ?, ?, 'comment')`,
                        [comment.user_id, `你的评论收到了 1 个赞`, commentId]
                    );
                }

                await conn.commit();

                if (comment.user_id !== userId) {
                    pushNewMessage(comment.user_id, {
                        type: 'like',
                        title: '有人赞了你的评论',
                        content: '你的评论收到了 1 个赞',
                        related_id: parseInt(commentId),
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

    /** DELETE /api/posts/:postId - 删除帖子 */
    async deletePost(req, res, next) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const [posts] = await pool.execute(
                'SELECT * FROM posts WHERE id = ? AND user_id = ?', [postId, userId]
            );

            if (posts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '帖子不存在或无权限删除'
                });
            }

            await pool.execute('DELETE FROM posts WHERE id = ?', [postId]);

            res.json({ success: true, message: '帖子删除成功' });
        } catch (error) {
            next(error);
        }
    }

    /** PATCH /api/posts/:postId - 更新帖子 */
    async updatePost(req, res, next) {
        try {
            const { postId } = req.params;
            const { title, content, post_type, tags } = req.body;
            const userId = req.user.id;

            const [posts] = await pool.execute(
                'SELECT * FROM posts WHERE id = ?', [postId]
            );

            if (posts.length === 0) {
                return res.status(404).json({ success: false, message: '帖子不存在' });
            }

            if (posts[0].user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: '无权限编辑' });
            }

            const validTypes = ['question', 'answer', 'note'];
            const safeTitle = title ? escapeHtml(String(title)) : posts[0].title;
            const safeContent = content ? escapeHtml(String(content)) : posts[0].content;
            const safeType = post_type && validTypes.includes(post_type) ? post_type : posts[0].post_type;
            const safeTags = tags && Array.isArray(tags) ? JSON.stringify(tags) : posts[0].tags;

            await pool.execute(
                'UPDATE posts SET title = ?, content = ?, post_type = ?, tags = ? WHERE id = ?',
                [safeTitle, safeContent, safeType, safeTags, postId]
            );

            res.json({ success: true, message: '帖子更新成功' });
        } catch (error) {
            next(error);
        }
    }

    /** GET /api/posts/count - 帖子数量 */
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
