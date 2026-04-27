const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/messages - 获取当前用户消息列表
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const userId = req.user.id;

        const [rows] = await pool.query(
            `SELECT id, type, title, content, is_read, related_id, related_type, created_at
             FROM messages
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM messages WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/messages/unread-count - 获取未读消息数
router.get('/unread-count', authMiddleware, async (req, res, next) => {
    try {
        const [[{ count }]] = await pool.execute(
            'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        res.json({ success: true, data: { count } });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/messages/:id/read - 标记单条已读
router.patch('/:id/read', authMiddleware, async (req, res, next) => {
    try {
        await pool.execute(
            'UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/messages/read-all - 全部已读
router.patch('/read-all', authMiddleware, async (req, res, next) => {
    try {
        await pool.execute(
            'UPDATE messages SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/messages/broadcast - 管理员向所有用户发送系统通知
router.post('/broadcast', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可操作' });
        }
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ success: false, message: '标题和内容不能为空' });
        }

        const [users] = await pool.execute('SELECT id FROM users');
        if (users.length === 0) {
            return res.json({ success: true, message: '暂无用户，消息未发送' });
        }

        // 批量插入，用事务保证一致性
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const user of users) {
                await conn.execute(
                    `INSERT INTO messages (user_id, type, title, content, related_id, related_type)
                     VALUES (?, 'system', ?, ?, NULL, 'broadcast')`,
                    [user.id, `【系统通知】${title}`, content]
                );
            }
            await conn.commit();
            res.json({ success: true, message: `已向 ${users.length} 位用户发送系统通知` });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
