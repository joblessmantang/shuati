const topicService = require('../services/topicService');

class TopicController {
    /**
     * GET /api/topics?userId=xxx
     * 获取用户专题列表
     */
    async list(req, res, next) {
        try {
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            const topics = await topicService.list(parseInt(userId));

            res.json({
                success: true,
                data: topics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/topics/:id
     * 获取专题详情（含题目列表）
     */
    async get(req, res, next) {
        try {
            const { id } = req.params;
            // userId 从 query 中取（前端方便传递）
            const { userId } = req.query;

            const topic = await topicService.getDetail(
                parseInt(id),
                userId ? parseInt(userId) : null
            );

            if (!topic) {
                return res.status(404).json({
                    success: false,
                    message: '专题不存在'
                });
            }

            res.json({
                success: true,
                data: topic
            });
        } catch (error) {
            if (error.status === 403) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * POST /api/topics
     * 创建专题
     * Body: { userId, name, description? }
     */
    async create(req, res, next) {
        try {
            const { userId, name, description } = req.body;

            if (!userId || !name) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数：userId, name'
                });
            }

            if (name.trim().length === 0 || name.trim().length > 100) {
                return res.status(400).json({
                    success: false,
                    message: '专题名称长度需在 1~100 个字符之间'
                });
            }

            const topic = await topicService.create({
                userId: parseInt(userId),
                name: name.trim(),
                description: description ? description.trim() : ''
            });

            res.status(201).json({
                success: true,
                message: '专题创建成功',
                data: topic
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/topics/:id
     * 更新专题（名称/描述）
     * Body: { userId, name?, description? }
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { userId, name, description } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            if (name !== undefined && (name.trim().length === 0 || name.trim().length > 100)) {
                return res.status(400).json({
                    success: false,
                    message: '专题名称长度需在 1~100 个字符之间'
                });
            }

            const topic = await topicService.update(
                parseInt(id),
                {
                    name: name !== undefined ? name.trim() : undefined,
                    description: description !== undefined ? description.trim() : undefined
                },
                parseInt(userId)
            );

            res.json({
                success: true,
                message: '专题已更新',
                data: topic
            });
        } catch (error) {
            if (error.status === 404) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * DELETE /api/topics/:id
     * 删除专题
     * Query: ?userId=xxx
     */
    async remove(req, res, next) {
        try {
            const { id } = req.params;
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            await topicService.remove(parseInt(id), parseInt(userId));

            res.json({
                success: true,
                message: '专题已删除'
            });
        } catch (error) {
            if (error.status === 404) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * POST /api/topics/:id/questions
     * 向专题添加题目
     * Body: { userId, questionId }
     */
    async addQuestion(req, res, next) {
        try {
            const { id } = req.params;
            const { userId, questionId } = req.body;

            if (!userId || !questionId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数：userId, questionId'
                });
            }

            await topicService.addQuestion(
                parseInt(id),
                parseInt(questionId),
                parseInt(userId)
            );

            res.status(201).json({
                success: true,
                message: '题目已添加到专题'
            });
        } catch (error) {
            if (error.status === 404) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.code === 'DUPLICATE_QUESTION' || error.message && error.message.includes('已在')) {
                return res.status(400).json({
                    success: false,
                    message: '题目已在该专题中'
                });
            }
            next(error);
        }
    }

    /**
     * DELETE /api/topics/:id/questions/:questionId
     * 从专题移除题目
     * Query: ?userId=xxx
     */
    async removeQuestion(req, res, next) {
        try {
            const { id, questionId } = req.params;
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            await topicService.removeQuestion(
                parseInt(id),
                parseInt(questionId),
                parseInt(userId)
            );

            res.json({
                success: true,
                message: '题目已从专题移除'
            });
        } catch (error) {
            if (error.status === 404) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * PATCH /api/topics/:id/reorder
     * 调整专题内题目顺序
     * Body: { userId, orderedIds: [id1, id2, ...] }
     */
    async reorderQuestions(req, res, next) {
        try {
            const { id } = req.params;
            const { userId, orderedIds } = req.body;

            if (!userId || !Array.isArray(orderedIds)) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数：userId, orderedIds（必须是数组）'
                });
            }

            const intIds = orderedIds.map(function(id) { return parseInt(id); });

            await topicService.reorderQuestions(
                parseInt(id),
                intIds,
                parseInt(userId)
            );

            res.json({
                success: true,
                message: '顺序已更新'
            });
        } catch (error) {
            if (error.status === 404) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }
}

module.exports = new TopicController();
