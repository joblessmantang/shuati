const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');

// 公开注册（注册普通用户）
router.post('/register', authController.register);
// 管理员注册（需要认证且是管理员）
router.post('/register/admin', authMiddleware, authController.registerAdmin);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getCurrentUser);
// 用户管理相关（需要管理员权限）
router.get('/users', authMiddleware, authController.getUsers);
router.patch('/users/:userId/role', authMiddleware, authController.updateUserRole);
router.delete('/users/:userId', authMiddleware, authController.deleteUser);

module.exports = router;
