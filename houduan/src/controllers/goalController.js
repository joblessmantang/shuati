const goalService = require('../services/goalService');

class GoalController {
    /**
     * GET /api/goals?userId=xxx
     * 获取用户当前有效目标
     */
    async getGoal(req, res, next) {
        try {
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            const goal = await goalService.getCurrentGoal(parseInt(userId));

            res.json({
                success: true,
                data: goal
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/goals
     * 创建或更新学习目标
     * Body: { userId, type, target }
     */
    async setGoal(req, res, next) {
        try {
            const { userId, type, target } = req.body;

            if (!userId || !type || target === undefined) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数：userId, type, target'
                });
            }

            if (!['daily', 'weekly'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'type 只能是 daily 或 weekly'
                });
            }

            if (typeof target !== 'number' || target < 1 || target > 9999) {
                return res.status(400).json({
                    success: false,
                    message: 'target 必须是 1~9999 的数字'
                });
            }

            const goal = await goalService.createGoal({
                userId: parseInt(userId),
                type,
                target
            });

            res.status(201).json({
                success: true,
                message: '目标已设置',
                data: goal
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/goals/:id
     * 更新目标（type / target）
     * Body: { type?, target? }
     */
    async updateGoal(req, res, next) {
        try {
            const { id } = req.params;
            const { type, target, userId } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            if (type !== undefined && !['daily', 'weekly'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'type 只能是 daily 或 weekly'
                });
            }

            if (target !== undefined && (typeof target !== 'number' || target < 1 || target > 9999)) {
                return res.status(400).json({
                    success: false,
                    message: 'target 必须是 1~9999 的数字'
                });
            }

            const goal = await goalService.updateGoal(
                parseInt(id),
                { type, target },
                parseInt(userId)
            );

            res.json({
                success: true,
                message: '目标已更新',
                data: goal
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
     * PATCH /api/goals/:id/progress
     * 追加目标完成进度（练习提交时调用）
     * Body: { userId, count }   count: 本次完成的题目数量
     */
    async addProgress(req, res, next) {
        try {
            const { id } = req.params;
            const { userId, count } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }
            if (typeof count !== 'number' || count < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'count 必须是正整数'
                });
            }

            // 追加 progress 到当前有效目标
            const goal = await goalService.addProgress(parseInt(userId), count);

            res.json({
                success: true,
                message: '目标进度已更新',
                data: goal
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new GoalController();
