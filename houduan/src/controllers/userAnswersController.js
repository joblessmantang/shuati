/**
 * 用户答题记录 - 用于知识图谱分析
 * 数据来源：每次提交练习时，批量保存用户每道题的作答结果到 user_answers 表
 */
const { pool } = require('../config/database');

class UserAnswersController {
    /**
     * 批量保存用户答题记录
     * body: { userId, answers: [{ questionId, selectedIndex, isCorrect }] }
     */
    async add(req, res, next) {
        try {
            const { userId, answers } = req.body;

            if (!userId || !Array.isArray(answers) || answers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '缺少 userId 或 answers 数据'
                });
            }

            const values = answers.map(a => [
                Number(userId),
                Number(a.questionId),
                a.selectedIndex !== undefined ? Number(a.selectedIndex) : null,
                Boolean(a.isCorrect)
            ]);

            await pool.query(
                `INSERT INTO user_answers (user_id, question_id, selected_index, is_correct) VALUES ?`,
                [values]
            );

            res.status(201).json({
                success: true,
                message: `已保存 ${answers.length} 条答题记录`
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserAnswersController();
