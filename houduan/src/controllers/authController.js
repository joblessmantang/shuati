const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 头像上传配置（复用封面图上传目录）
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});
const avatarFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('仅支持 jpg/png/webp/gif 格式的图片'), false);
};
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

class AuthController {
    async register(req, res, next) {
        try {
            const { username, password, role } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: '用户名和密码不能为空'
                });
            }

            if (username.length < 3 || username.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: '用户名长度应为3-50个字符'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: '密码长度至少6个字符'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // 只有管理员才能注册其他管理员，普通用户只能注册为 user
            const userRole = role === 'admin' && req.user && req.user.role === 'admin' ? 'admin' : 'user';

            const [result] = await pool.execute(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [username, hashedPassword, userRole]
            );

            const token = jwt.sign(
                { id: result.insertId, username, role: userRole },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.status(201).json({
                success: true,
                token,
                user: {
                    id: result.insertId,
                    username,
                    role: userRole,
                    avatar_url: null
                }
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: '用户名已存在'
                });
            }
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: '用户名和密码不能为空'
                });
            }

            const [users] = await pool.execute(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            const user = users[0];
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    avatar_url: user.avatar_url || null
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getCurrentUser(req, res) {
        try {
            const [users] = await pool.execute(
                'SELECT id, username, role, avatar_url, created_at FROM users WHERE id = ?',
                [req.user.id]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在'
                });
            }

            res.json({
                success: true,
                data: users[0]
            });
        } catch (error) {
            next(error);
        }
    }

    async registerAdmin(req, res, next) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: '用户名和密码不能为空'
                });
            }

            if (username.length < 3 || username.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: '用户名长度应为3-50个字符'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: '密码长度至少6个字符'
                });
            }

            // 检查当前用户是否是管理员
            const [admins] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [req.user.id]
            );

            if (admins.length === 0 || admins[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '只有管理员可以注册新管理员'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const [result] = await pool.execute(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [username, hashedPassword, 'admin']
            );

            res.status(201).json({
                success: true,
                message: '管理员注册成功',
                data: {
                    id: result.insertId,
                    username,
                    role: 'admin'
                }
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: '用户名已存在'
                });
            }
            next(error);
        }
    }

    async getUsers(req, res, next) {
        try {
            // 检查是否是管理员
            const [admins] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [req.user.id]
            );

            if (admins.length === 0 || admins[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '只有管理员可以查看用户列表'
                });
            }

            const [users] = await pool.execute(
                'SELECT id, username, role, avatar_url, created_at FROM users ORDER BY created_at DESC'
            );

            res.json({
                success: true,
                data: users
            });
        } catch (error) {
            next(error);
        }
    }

    async updateUserRole(req, res, next) {
        try {
            const { userId } = req.params;
            const { role } = req.body;

            if (!['user', 'admin'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: '角色必须是 user 或 admin'
                });
            }

            // 检查是否是管理员
            const [admins] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [req.user.id]
            );

            if (admins.length === 0 || admins[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '只有管理员可以修改用户角色'
                });
            }

            // 不能修改自己
            if (parseInt(userId) === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: '不能修改自己的角色'
                });
            }

            await pool.execute(
                'UPDATE users SET role = ? WHERE id = ?',
                [role, userId]
            );

            res.json({
                success: true,
                message: '角色更新成功'
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteUser(req, res, next) {
        try {
            const { userId } = req.params;

            // 检查是否是管理员
            const [admins] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [req.user.id]
            );

            if (admins.length === 0 || admins[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '只有管理员可以删除用户'
                });
            }

            // 不能删除自己
            if (parseInt(userId) === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: '不能删除自己'
                });
            }

            await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

            res.json({
                success: true,
                message: '用户删除成功'
            });
        } catch (error) {
            next(error);
        }
    }

    /** POST /api/auth/avatar - 上传用户头像 */
    uploadAvatar(req, res, next) {
        uploadAvatar.single('avatar')(req, res, async (err) => {
            if (err) {
                if (err.message.includes('格式')) {
                    return res.status(400).json({ success: false, message: err.message });
                }
                if (err.message.includes('File too large')) {
                    return res.status(400).json({ success: false, message: '图片大小不能超过 2MB' });
                }
                return res.status(500).json({ success: false, message: '头像上传失败' });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, message: '请选择头像图片' });
            }
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;
            try {
                await pool.execute(
                    'UPDATE users SET avatar_url = ? WHERE id = ?',
                    [avatarUrl, req.user.id]
                );
                res.json({
                    success: true,
                    data: { avatar_url: avatarUrl }
                });
            } catch (dbError) {
                next(dbError);
            }
        });
    }
}

module.exports = new AuthController();
