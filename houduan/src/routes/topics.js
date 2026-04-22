const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');

// GET  /api/topics?userId=xxx        专题列表
router.get('/', topicController.list);

// GET  /api/topics/:id?userId=xxx   专题详情（含题目）
router.get('/:id', topicController.get);

// POST /api/topics                  创建专题
router.post('/', topicController.create);

// PATCH /api/topics/:id            更新专题
router.patch('/:id', topicController.update);

// DELETE /api/topics/:id?userId=xxx  删除专题
router.delete('/:id', topicController.remove);

// POST   /api/topics/:id/questions       添加题目到专题
router.post('/:id/questions', topicController.addQuestion);

// DELETE /api/topics/:id/questions/:questionId?userId=xxx  移除专题题目
router.delete('/:id/questions/:questionId', topicController.removeQuestion);

// PATCH  /api/topics/:id/reorder     调整专题题目顺序
router.patch('/:id/reorder', topicController.reorderQuestions);

module.exports = router;
