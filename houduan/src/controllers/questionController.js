const { pool } = require('../config/database');
const analysisService = require('../services/analysisService');

class QuestionController {
    async getAllQuestions(req, res, next) {
        try {
            const { categoryId, q, page = 1, limit = 100, questionType } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT
                    q.id, q.title, q.code, q.options, q.correctAnswer,
                    q.categoryId, q.question_type, q.created_at,
                    qjc.code_snippet, qjc.answer_mode, qjc.difficulty, qjc.knowledge_points
                FROM questions q
                LEFT JOIN question_js_code qjc ON q.id = qjc.question_id
                WHERE 1=1
            `;
            const params = [];

            if (categoryId) {
                query += ' AND q.categoryId = ?';
                params.push(parseInt(categoryId));
            }

            if (q) {
                query += ' AND (q.title LIKE ? OR q.code LIKE ?)';
                params.push(`%${q}%`, `%${q}%`);
            }

            if (questionType) {
                query += ' AND q.question_type = ?';
                params.push(questionType);
            }

            query += ' ORDER BY q.id ASC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [questions] = await pool.query(query, params);

            res.json({
                success: true,
                data: questions.map(q => {
                    const base = {
                        ...q,
                        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    };
                    if (q.question_type === 'js_code' && q.code_snippet) {
                        base.jsCodeMeta = {
                            code_snippet: q.code_snippet,
                            answer_mode: q.answer_mode,
                            difficulty: q.difficulty,
                            knowledge_points: q.knowledge_points
                        };
                    } else {
                        base.jsCodeMeta = null;
                    }
                    return base;
                })
            });
        } catch (error) {
            next(error);
        }
    }

    async getQuestionById(req, res, next) {
        try {
            const { id } = req.params;

            const [questions] = await pool.execute(`
                SELECT
                    q.id, q.title, q.code, q.options, q.correctAnswer,
                    q.categoryId, q.question_type, q.created_at,
                    qjc.code_snippet, qjc.answer_mode, qjc.explanation,
                    qjc.difficulty, qjc.knowledge_points
                FROM questions q
                LEFT JOIN question_js_code qjc ON q.id = qjc.question_id
                WHERE q.id = ?
            `, [id]);

            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }

            const q = questions[0];
            const base = {
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            };

            if (q.question_type === 'js_code' && q.code_snippet) {
                base.jsCodeMeta = {
                    code_snippet: q.code_snippet,
                    answer_mode: q.answer_mode,
                    explanation: q.explanation,
                    difficulty: q.difficulty,
                    knowledge_points: q.knowledge_points
                };
            } else {
                base.jsCodeMeta = null;
            }

            res.json({
                success: true,
                data: base
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

            const [questions] = await pool.execute(`
                SELECT
                    q.id, q.title, q.code, q.options, q.correctAnswer,
                    q.categoryId, q.question_type, q.created_at,
                    qjc.code_snippet, qjc.answer_mode, qjc.explanation,
                    qjc.difficulty, qjc.knowledge_points
                FROM questions q
                LEFT JOIN question_js_code qjc ON q.id = qjc.question_id
                WHERE q.id = ?
            `, [id]);

            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }

            const q = questions[0];
            const options = typeof q.options === 'string'
                ? JSON.parse(q.options)
                : q.options;

            const question = {
                id: q.id,
                title: q.title,
                code: q.code,
                options,
                correctAnswer: q.correctAnswer,
                categoryId: q.categoryId,
                question_type: q.question_type,
                created_at: q.created_at,
            };

            if (q.question_type === 'js_code' && q.code_snippet) {
                question.jsCodeMeta = {
                    code_snippet: q.code_snippet,
                    answer_mode: q.answer_mode,
                    explanation: q.explanation,
                    difficulty: q.difficulty,
                    knowledge_points: q.knowledge_points
                };
            }

            // 并行获取：用户关系 + 相似题 + 相关帖子
            const [relation, similar, posts] = await Promise.all([
                userId ? analysisService.getQuestionRelation(parseInt(userId), parseInt(id)) : Promise.resolve(null),
                analysisService.getSimilarQuestions(parseInt(id), 5),
                analysisService.getRelatedPosts(parseInt(id))
            ]);

            res.json({
                success: true,
                data: {
                    ...question,
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
            const { title, code, options, correctAnswer, categoryId, question_type, jsCodeMeta } = req.body;

            if (!title || !options || !correctAnswer) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数'
                });
            }

            const optionsJson = typeof options === 'string' ? options : JSON.stringify(options);
            const qType = question_type || 'normal';

            const [result] = await pool.execute(
                'INSERT INTO questions (title, code, options, correctAnswer, categoryId, question_type) VALUES (?, ?, ?, ?, ?, ?)',
                [title, code || null, optionsJson, correctAnswer, categoryId || null, qType]
            );

            const questionId = result.insertId;

            // 如果是代码题，同时写入扩展表
            if (qType === 'js_code' && jsCodeMeta) {
                const { code_snippet, answer_mode, explanation, difficulty, knowledge_points } = jsCodeMeta;
                await pool.execute(
                    `INSERT INTO question_js_code
                        (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        questionId,
                        code_snippet || '',
                        answer_mode || 'select',
                        explanation || null,
                        difficulty || 1,
                        knowledge_points || null
                    ]
                );
            }

            res.status(201).json({
                success: true,
                message: '题目创建成功',
                data: { id: questionId }
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { title, code, options, correctAnswer, categoryId, question_type, jsCodeMeta } = req.body;

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
            if (question_type !== undefined) {
                updates.push('question_type = ?');
                params.push(question_type);
            }

            if (updates.length > 0) {
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
            }

            // 更新代码题扩展信息
            if (question_type === 'js_code' && jsCodeMeta) {
                const { code_snippet, answer_mode, explanation, difficulty, knowledge_points } = jsCodeMeta;
                // 尝试更新，如果不存在则插入
                const [existing] = await pool.execute(
                    'SELECT id FROM question_js_code WHERE question_id = ?',
                    [id]
                );
                if (existing.length > 0) {
                    await pool.execute(
                        `UPDATE question_js_code SET
                            code_snippet = ?, answer_mode = ?, explanation = ?, difficulty = ?, knowledge_points = ?
                         WHERE question_id = ?`,
                        [code_snippet || '', answer_mode || 'select', explanation || null, difficulty || 1, knowledge_points || null, id]
                    );
                } else {
                    await pool.execute(
                        `INSERT INTO question_js_code
                            (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [id, code_snippet || '', answer_mode || 'select', explanation || null, difficulty || 1, knowledge_points || null]
                    );
                }
            } else if (question_type === 'normal') {
                // 切换为普通题时删除扩展数据
                await pool.execute(
                    'DELETE FROM question_js_code WHERE question_id = ?',
                    [id]
                );
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

            // 先删扩展表（如果有）
            await pool.execute(
                'DELETE FROM question_js_code WHERE question_id = ?',
                [id]
            );

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
