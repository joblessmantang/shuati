const { pool } = require('../config/database');
const analysisService = require('../services/analysisService');

class QuestionController {
    async getAllQuestions(req, res, next) {
        try {
            const { categoryId, q, page = 1, limit = 100 } = req.query;
            const offset = (page - 1) * limit;

            let query = 'SELECT id, title, code, options, correctAnswer, categoryId, created_at FROM questions WHERE 1=1';
            const params = [];

            if (categoryId) {
                query += ' AND categoryId = ?';
                params.push(parseInt(categoryId));
            }

            if (q) {
                query += ' AND (title LIKE ? OR code LIKE ?)';
                params.push(`%${q}%`, `%${q}%`);
            }

            query += ' ORDER BY id ASC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [questions] = await pool.query(query, params);

            res.json({
                success: true,
                data: questions.map(q => ({
                    ...q,
                    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    async getQuestionById(req, res, next) {
        try {
            const { id } = req.params;

            const [questions] = await pool.execute(
                'SELECT id, title, code, options, correctAnswer, categoryId, created_at FROM questions WHERE id = ?',
                [id]
            );

            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }

            res.json({
                success: true,
                data: {
                    ...questions[0],
                    options: typeof questions[0].options === 'string'
                        ? JSON.parse(questions[0].options)
                        : questions[0].options
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/questions/:id/detail?userId=xxx
     * 题目详情页聚合接口
     * 返回：题目信息 + 用户关系状态 + 相似题 + 相关帖子
     */
    async getQuestionDetail(req, res, next) {
        try {
            const { id } = req.params;
            const { userId } = req.query;

            const [questions] = await pool.execute(
                'SELECT id, title, code, options, correctAnswer, categoryId, created_at FROM questions WHERE id = ?',
                [id]
            );

            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }

            const question = questions[0];
            const options = typeof question.options === 'string'
                ? JSON.parse(question.options)
                : question.options;

            // 并行获取：用户关系 + 相似题 + 相关帖子
            const [relation, similar, posts] = await Promise.all([
                userId ? analysisService.getQuestionRelation(parseInt(userId), parseInt(id)) : Promise.resolve(null),
                analysisService.getSimilarQuestions(parseInt(id), 5),
                analysisService.getRelatedPosts(parseInt(id))
            ]);

            res.json({
                success: true,
                data: {
                    id: question.id,
                    title: question.title,
                    code: question.code,
                    options,
                    correctAnswer: question.correctAnswer,
                    categoryId: question.categoryId,
                    created_at: question.created_at,
                    relation,
                    similarQuestions: similar,
                    relatedPosts: posts
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async checkAnswer(req, res, next) {
        try {
            const { id } = req.params;
            const { selectedIndex, selectedId } = req.body;
            const userId = req.user?.id;

            const [questions] = await pool.execute(
                'SELECT id, correctAnswer FROM questions WHERE id = ?',
                [id]
            );

            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }

            const question = questions[0];
            const isCorrect = selectedId === question.correctAnswer;

            if (userId) {
                await pool.execute(
                    'INSERT INTO user_answers (user_id, question_id, selected_index, is_correct) VALUES (?, ?, ?, ?)',
                    [userId, id, selectedIndex !== undefined ? selectedIndex : 0, isCorrect]
                );
            }

            res.json({
                success: true,
                data: {
                    correct: isCorrect,
                    correctAnswer: question.correctAnswer
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const { title, code, options, correctAnswer, categoryId } = req.body;

            if (!title || !options || !correctAnswer) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数'
                });
            }

            const optionsJson = typeof options === 'string' ? options : JSON.stringify(options);

            const [result] = await pool.execute(
                'INSERT INTO questions (title, code, options, correctAnswer, categoryId) VALUES (?, ?, ?, ?, ?)',
                [title, code || null, optionsJson, correctAnswer, categoryId || null]
            );

            res.status(201).json({
                success: true,
                message: '题目创建成功',
                data: {
                    id: result.insertId
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { title, code, options, correctAnswer, categoryId } = req.body;

            const updates = [];
            const params = [];

            if (title !== undefined) {
                updates.push('title = ?');
                params.push(title);
            }
            if (code !== undefined) {
                updates.push('code = ?');
                params.push(code);
            }
            if (options !== undefined) {
                updates.push('options = ?');
                params.push(typeof options === 'string' ? options : JSON.stringify(options));
            }
            if (correctAnswer !== undefined) {
                updates.push('correctAnswer = ?');
                params.push(correctAnswer);
            }
            if (categoryId !== undefined) {
                updates.push('categoryId = ?');
                params.push(categoryId);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '没有要更新的字段'
                });
            }

            params.push(id);

            const [result] = await pool.execute(
                `UPDATE questions SET ${updates.join(', ')} WHERE id = ?`,
                params
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }

            res.json({
                success: true,
                message: '题目更新成功'
            });
        } catch (error) {
            next(error);
        }
    }

    async remove(req, res, next) {
        try {
            const { id } = req.params;

            const [result] = await pool.execute(
                'DELETE FROM questions WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }

            res.json({
                success: true,
                message: '题目删除成功'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new QuestionController();
