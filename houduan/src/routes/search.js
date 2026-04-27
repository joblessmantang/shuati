const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');

// GET /api/search - 全局搜索（聚合题目+资料+帖子）
router.get('/', optionalAuth, async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        const type = req.query.type || 'all'; // all | questions | resources | posts

        if (!q || q.length < 1) {
            return res.json({ success: true, data: { questions: [], resources: [], posts: [] } });
        }

        const searchTerm = `%${q}%`;
        const results = {};

        if (type === 'all' || type === 'questions') {
            const [questions] = await pool.execute(
                `SELECT q.id, q.title, q.difficulty, q.categoryId, c.name as categoryName,
                        'question' as source
                 FROM questions q
                 LEFT JOIN categories c ON q.categoryId = c.id
                 WHERE q.title LIKE ? OR q.description LIKE ?
                 ORDER BY q.id DESC
                 LIMIT 10`,
                [searchTerm, searchTerm]
            );
            results.questions = questions;
        } else {
            results.questions = [];
        }

        if (type === 'all' || type === 'resources') {
            const [resources] = await pool.execute(
                `SELECT id, title, description, category as categoryName, 'resource' as source
                 FROM resources
                 WHERE title LIKE ? OR description LIKE ?
                 ORDER BY id DESC
                 LIMIT 5`,
                [searchTerm, searchTerm]
            );
            results.resources = resources;
        } else {
            results.resources = [];
        }

        if (type === 'all' || type === 'posts') {
            const [posts] = await pool.execute(
                `SELECT id, title, created_at as createdAt, 'post' as source
                 FROM posts
                 WHERE title LIKE ? OR content LIKE ?
                 ORDER BY created_at DESC
                 LIMIT 5`,
                [searchTerm, searchTerm]
            );
            results.posts = posts;
        } else {
            results.posts = [];
        }

        res.json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
