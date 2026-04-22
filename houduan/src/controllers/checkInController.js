const checkInService = require('../services/checkInService');

class CheckInController {
    /**
     * GET /api/checkIn?userId=xxx
     * 获取用户签到记录
     */
    async getRecord(req, res, next) {
        try {
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            const record = await checkInService.getCheckInRecord(parseInt(userId));

            res.json({
                success: true,
                data: record
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/checkIn
     * 执行签到
     * Body: { userId }
     */
    async checkIn(req, res, next) {
        try {
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            const result = await checkInService.doCheckIn(parseInt(userId));

            res.status(201).json({
                success: true,
                message: '签到成功！',
                data: {
                    userId: result.userId,
                    checkinDate: result.checkinDate,
                    continuousDays: result.streakDays,
                    totalDays: result.totalDays,
                }
            });
        } catch (error) {
            if (error.code === 'ALREADY_CHECKED_IN') {
                return res.status(400).json({
                    success: false,
                    message: '今日已签到，明天再来吧！'
                });
            }
            next(error);
        }
    }
}

module.exports = new CheckInController();
