const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');

// POST /api/feedbacks - 提交反馈（可选登录）
router.post('/', optionalAuth, async (req, res, next) => {
    try {
        const { type = 'suggestion', content, contact = '' } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: '反馈内容不能为空' });
        }
        if (content.length > 1000) {
            return res.status(400).json({ success: false, message: '反馈内容不能超过 1000 字' });
        }

        const uid = req.user?.id ?? null;

        const [result] = await pool.execute(
            'INSERT INTO feedbacks (user_id, type, content, contact) VALUES (?, ?, ?, ?)',
            [uid, type, content.trim(), contact.trim()]
        );

        res.status(201).json({ success: true, data: { id: result.insertId } });
    } catch (error) {
        next(error);
    }
});

// GET /api/feedbacks - 管理员获取反馈列表
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }

        const { status, page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let whereClause = '1=1';
        const params = [];

        if (status) {
            whereClause += ' AND f.status = ?';
            params.push(status);
        }

        const [rows] = await pool.query(`
            SELECT f.*, u.username AS user_name
            FROM feedbacks f
            LEFT JOIN users u ON f.user_id = u.id
            WHERE ${whereClause}
            ORDER BY f.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, Number(limit), Number(offset)]);

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM feedbacks f WHERE ${whereClause}`,
            params
        );

        res.json({
            success: true,
            data: rows,
            total,
            page: Number(page),
            limit: Number(limit)
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/feedbacks/:id - 管理员更新反馈状态
router.patch('/:id', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: '无效的状态值' });
        }

        const [result] = await pool.execute(
            'UPDATE feedbacks SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '反馈不存在' });
        }

        res.json({ success: true, message: '状态已更新' });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/feedbacks/:id - 管理员删除反馈
router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }

        const { id } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM feedbacks WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '反馈不存在' });
        }

        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
