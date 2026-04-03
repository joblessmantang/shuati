const { pool } = require('../config/database');
const aiService = require('../services/aiService');

class AIController {
    async getHint(req, res, next) {
        try {
            const { questionId, question, options, userAnswer } = req.body;

            if (!questionId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少题目ID'
                });
            }

            if (!question) {
                const [questions] = await pool.execute(
                    'SELECT id, title, code, options FROM questions WHERE id = ?',
                    [questionId]
                );

                if (questions.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: '题目不存在'
                    });
                }

                const q = questions[0];
                question = {
                    id: q.id,
                    title: q.title,
                    code: q.code
                };
                options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
            }

            const hint = await aiService.getHint(
                questionId,
                question,
                options,
                userAnswer
            );

            res.json({
                hint,
                questionId: parseInt(questionId)
            });
        } catch (error) {
            next(error);
        }
    }

    async getExplanation(req, res, next) {
        try {
            const { questionId, question, options, userQuestion } = req.body;

            if (!questionId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少题目ID'
                });
            }

            if (!question) {
                const [questions] = await pool.execute(
                    'SELECT id, title, code, options, correctAnswer FROM questions WHERE id = ?',
                    [questionId]
                );

                if (questions.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: '题目不存在'
                    });
                }

                const q = questions[0];
                question = {
                    id: q.id,
                    title: q.title,
                    code: q.code,
                    correctAnswer: q.correctAnswer
                };
                options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
            }

            const explanation = await aiService.getExplanation(
                questionId,
                question,
                options,
                userQuestion || '请详细解释这道题目'
            );

            res.json({
                explanation,
                questionId: parseInt(questionId)
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AIController();
