const { pool } = require('../config/database');

class CategoryController {
    async getAll(req, res, next) {
        try {
            const [categories] = await pool.execute(
                'SELECT * FROM categories ORDER BY id ASC'
            );
            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const [categories] = await pool.execute(
                'SELECT * FROM categories WHERE id = ?',
                [id]
            );

            if (categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '分类不存在'
                });
            }

            res.json({
                success: true,
                data: categories[0]
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: '分类名称不能为空'
                });
            }

            const [result] = await pool.execute(
                'INSERT INTO categories (name) VALUES (?)',
                [name.trim()]
            );

            res.status(201).json({
                success: true,
                message: '分类创建成功',
                data: {
                    id: result.insertId,
                    name: name.trim()
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: '分类名称不能为空'
                });
            }

            const [result] = await pool.execute(
                'UPDATE categories SET name = ? WHERE id = ?',
                [name.trim(), id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '分类不存在'
                });
            }

            res.json({
                success: true,
                message: '分类更新成功'
            });
        } catch (error) {
            next(error);
        }
    }

    async remove(req, res, next) {
        try {
            const { id } = req.params;

            const [result] = await pool.execute(
                'DELETE FROM categories WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '分类不存在'
                });
            }

            res.json({
                success: true,
                message: '分类删除成功'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CategoryController();
