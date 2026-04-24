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

            const uid = Number(userId);
            if (isNaN(uid) || uid <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'userId 无效'
                });
            }

            let saved = 0;
            for (const a of answers) {
                const rawQid = a.questionId;
                const parsedQid = Number(rawQid);
                if (Number.isNaN(parsedQid) || !Number.isFinite(parsedQid)) {
                    console.warn('[userAnswers] 跳过无效 questionId:', rawQid, typeof rawQid, JSON.stringify(a));
                    continue;
                }

                const rawSelected = a.selectedIndex;
                const parsedSelected = rawSelected != null ? Number(rawSelected) : null;
                const finalSelected = (parsedSelected != null && Number.isFinite(parsedSelected)) ? parsedSelected : null;
                const finalCorrect = a.isCorrect ? 1 : 0;

                await pool.query(
                    `INSERT IGNORE INTO user_answers (user_id, question_id, selected_index, is_correct) VALUES (?, ?, ?, ?)`,
                    [uid, parsedQid, finalSelected, finalCorrect]
                );
                saved++;
            }

            res.status(201).json({
                success: true,
                message: `已保存 ${saved} 条答题记录`
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserAnswersController();
