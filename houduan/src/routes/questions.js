const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');

router.get('/', questionController.getAllQuestions);
router.get('/:id', questionController.getQuestionById);
router.post('/:id/check', optionalAuth, questionController.checkAnswer);
router.post('/', authMiddleware, questionController.create);
router.patch('/:id', authMiddleware, questionController.update);
router.delete('/:id', authMiddleware, questionController.remove);

module.exports = router;
