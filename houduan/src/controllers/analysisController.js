/**
 * 分析控制器 - 知识图谱 + 首页推荐
 */
const analysisService = require('../services/analysisService');

class AnalysisController {
    /**
     * GET /api/analysis/ability
     * 获取用户分类能力分析（知识图谱数据）
     * Query: userId
     */
    async getAbility(req, res, next) {
        try {
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            const ability = await analysisService.getCategoryAbility(parseInt(userId));

            res.json({
                success: true,
                data: ability
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analysis/recommendations
     * 获取首页个性化推荐
     * Query: userId
     */
    async getRecommendations(req, res, next) {
        try {
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            const recommendations = await analysisService.getHomeRecommendations(parseInt(userId));

            res.json({
                success: true,
                data: recommendations
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AnalysisController();
