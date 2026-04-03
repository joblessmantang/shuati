const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middlewares/auth');

router.post('/hint', aiController.getHint);
router.post('/explain', authMiddleware, aiController.getExplanation);

module.exports = router;
