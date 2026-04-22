const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');

// GET  /api/goals?userId=xxx    获取当前目标
router.get('/', goalController.getGoal);

// POST /api/goals             创建/设置目标
router.post('/', goalController.setGoal);

// PATCH /api/goals/:id        更新目标（type / target）
router.patch('/:id', goalController.updateGoal);

// PATCH /api/goals/:id/progress  追加目标完成进度（Quiz 提交时调用）
router.patch('/:id/progress', goalController.addProgress);

module.exports = router;
