const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/analysis/ability?userId=xxx   分类能力分析（知识图谱）
router.get('/ability', analysisController.getAbility);

// GET /api/analysis/recommendations?userId=xxx  首页推荐
router.get('/recommendations', analysisController.getRecommendations);

module.exports = router;
