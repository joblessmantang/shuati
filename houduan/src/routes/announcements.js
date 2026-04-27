const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/announcements - 获取有效公告列表（公开）
router.get('/', async (req, res, next) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const [rows] = await pool.execute(
            `SELECT id, title, content, type, priority, start_date, end_date, is_pinned, created_at
             FROM announcements
             WHERE start_date <= ? AND end_date >= ?
             ORDER BY is_pinned DESC, priority DESC, created_at DESC
             LIMIT 10`,
            [today, today]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

// ---------- 以下需要管理员权限 ----------

// GET /api/announcements/all - 获取全部公告（含已过期）
router.get('/all', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可操作' });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const [rows] = await pool.query(
            `SELECT a.*, u.username as creator_name
             FROM announcements a
             LEFT JOIN users u ON a.created_by = u.id
             ORDER BY a.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM announcements');
        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/announcements - 创建公告（同时可选发送系统消息给所有用户）
router.post('/', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可操作' });
        }
        const { title, content, type = 'notice', priority = 5, start_date, end_date, send_notification } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, message: '标题和内容不能为空' });
        }

        const start = start_date || new Date().toISOString().slice(0, 10);
        const end = end_date || '2099-12-31';

        const [result] = await pool.execute(
            `INSERT INTO announcements (title, content, type, priority, start_date, end_date, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, content, type, priority, start, end, req.user.id]
        );

        // 如果勾选了"发送系统消息"，向所有用户发送
        if (send_notification) {
            const [users] = await pool.execute('SELECT id FROM users');
            if (users.length > 0) {
                const values = users.map(u => [u.id, 'system', `【系统通知】${title}`, content, result.insertId, 'announcement']);
                const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
                const flatValues = values.flat();
                await pool.execute(
                    `INSERT INTO messages (user_id, type, title, content, related_id, related_type) VALUES ${placeholders}`,
                    flatValues
                );
            }
        }

        res.status(201).json({ success: true, message: '公告创建成功', data: { id: result.insertId } });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/announcements/:id - 更新公告
router.patch('/:id', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可操作' });
        }
        const { id } = req.params;
        const { title, content, type, priority, start_date, end_date, is_pinned } = req.body;

        const updates = [];
        const values = [];
        if (title) { updates.push('title = ?'); values.push(title); }
        if (content) { updates.push('content = ?'); values.push(content); }
        if (type) { updates.push('type = ?'); values.push(type); }
        if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
        if (start_date) { updates.push('start_date = ?'); values.push(start_date); }
        if (end_date) { updates.push('end_date = ?'); values.push(end_date); }
        if (is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(is_pinned ? 1 : 0); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: '没有需要更新的字段' });
        }

        values.push(id);
        await pool.execute(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ success: true, message: '公告更新成功' });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/announcements/:id - 删除公告
router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可操作' });
        }
        await pool.execute('DELETE FROM announcements WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: '公告删除成功' });
    } catch (error) {
        next(error);
    }
});

// POST /api/announcements/send-notification - 仅发送系统消息（不创建公告）
router.post('/send-notification', authMiddleware, async (req, res, next) => {
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

        const values = users.map(u => [u.id, 'system', `【系统通知】${title}`, content, null, 'broadcast']);
        const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = values.flat();
        await pool.execute(
            `INSERT INTO messages (user_id, type, title, content, related_id, related_type) VALUES ${placeholders}`,
            flatValues
        );

        res.json({ success: true, message: `已向 ${users.length} 位用户发送系统通知` });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
