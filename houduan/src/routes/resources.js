/**
 * 学习资料路由
 * 用户侧：GET list, GET :id, GET :id/download, GET recommended
 * 管理侧：GET admin, POST, PATCH, DELETE  (需管理员权限)
 */
const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');

// 用户侧路由（登录可选）
router.get('/', optionalAuth, resourceController.list);
router.get('/recommended', optionalAuth, resourceController.getRecommended);
router.get('/:id', optionalAuth, resourceController.get);
router.get('/:id/download', optionalAuth, resourceController.download);

// 管理侧路由（必须登录且为管理员）
router.get('/admin/list', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可访问' });
  }
  next();
}, resourceController.adminList);

router.post('/', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可访问' });
  }
  next();
}, resourceController.create);

router.patch('/:id', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可访问' });
  }
  next();
}, resourceController.update);

router.delete('/:id', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可访问' });
  }
  next();
}, resourceController.remove);

module.exports = router;
