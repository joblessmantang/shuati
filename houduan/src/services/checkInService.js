/**
 * 签到服务
 * 职责：
 *  - 判断今天是否已签到
 *  - 执行签到（含连续签到天数计算）
 *  - 获取签到记录（含本周日历数据）
 *  - 计算连续签到天数
 */
const { pool } = require('../config/database');

class CheckInService {
    /**
     * 获取用户今日是否已签到
     * @param {number} userId
     * @returns {Promise<boolean>}
     */
    async hasCheckedInToday(userId) {
        const [rows] = await pool.query(
            'SELECT id FROM check_ins WHERE user_id = ? AND checkin_date = CURDATE() LIMIT 1',
            [userId]
        );
        return rows.length > 0;
    }

    /**
     * 获取用户最新一条签到记录
     * @param {number} userId
     * @returns {Promise<object|null>}
     */
    async getLastCheckIn(userId) {
        const [rows] = await pool.query(
            'SELECT * FROM check_ins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1',
            [userId]
        );
        return rows[0] || null;
    }

    /**
     * 计算连续签到天数
     * 从今天往前数，如果今天已签则包含今天
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async calculateStreak(userId) {
        const [rows] = await pool.query(
            `SELECT checkin_date, streak_days
             FROM check_ins
             WHERE user_id = ?
             ORDER BY checkin_date DESC`,
            [userId]
        );

        if (rows.length === 0) return 0;

        let streak = 0;
        let expectedDate = new Date();

        for (const row of rows) {
            const d = new Date(row.checkin_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkDate = new Date(d);
            checkDate.setHours(0, 0, 0, 0);

            const diff = Math.floor((today - checkDate) / (1000 * 60 * 60 * 24));

            if (diff === streak) {
                streak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    /**
     * 获取累计签到天数
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async getTotalDays(userId) {
        const [rows] = await pool.query(
            'SELECT total_days FROM check_ins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1',
            [userId]
        );
        return rows.length > 0 ? rows[0].total_days : 0;
    }

    /**
     * 执行签到
     * - 防止重复签到
     * - 自动计算连续天数
     * - 累加累计天数
     * @param {number} userId
     * @returns {Promise<object>} 签到结果
     */
    async doCheckIn(userId) {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        // 检查今天是否已签到
        const [existing] = await pool.query(
            'SELECT id FROM check_ins WHERE user_id = ? AND checkin_date = ?',
            [userId, today]
        );

        if (existing.length > 0) {
            const err = new Error('今日已签到');
            err.code = 'ALREADY_CHECKED_IN';
            throw err;
        }

        // 获取昨天的记录，计算连续天数
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const [yesterdayRows] = await pool.query(
            'SELECT streak_days, total_days FROM check_ins WHERE user_id = ? AND checkin_date = ?',
            [userId, yesterdayStr]
        );

        const yesterdayStreak = yesterdayRows.length > 0 ? yesterdayRows[0].streak_days : 0;
        const yesterdayTotal = yesterdayRows.length > 0 ? yesterdayRows[0].total_days : 0;

        // 判断是否连续（昨天有记录 → 连续；没有 → 重新开始）
        const isContinuous = yesterdayRows.length > 0;
        const newStreak = isContinuous ? yesterdayStreak + 1 : 1;
        const newTotal = yesterdayTotal + 1;

        const [result] = await pool.query(
            `INSERT INTO check_ins (user_id, checkin_date, streak_days, total_days)
             VALUES (?, ?, ?, ?)`,
            [userId, today, newStreak, newTotal]
        );

        return {
            id: result.insertId,
            userId,
            checkinDate: today,
            streakDays: newStreak,
            totalDays: newTotal,
        };
    }

    /**
     * 获取签到记录（供前端展示）
     * 返回：今日是否已签到、连续天数、累计天数、本周签到日期列表
     * @param {number} userId
     * @returns {Promise<object>}
     */
    async getCheckInRecord(userId) {
        const [allRows] = await pool.query(
            `SELECT checkin_date, streak_days, total_days
             FROM check_ins
             WHERE user_id = ?
             ORDER BY checkin_date DESC`,
            [userId]
        );

        if (allRows.length === 0) {
            return {
                lastCheckInDate: null,
                continuousDays: 0,
                totalDays: 0,
                lastCheckInDates: [],
            };
        }

        const latest = allRows[0];

        // 本周（周一~周日）的签到日期
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        monday.setHours(0, 0, 0, 0);

        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            weekDates.push(d.toISOString().slice(0, 10));
        }

        const weekCheckIns = allRows.filter(r =>
            weekDates.includes(new Date(r.checkin_date).toISOString().slice(0, 10))
        );

        return {
            lastCheckInDate: latest.checkin_date instanceof Date
                ? latest.checkin_date.toISOString().slice(0, 10)
                : String(latest.checkin_date),
            continuousDays: latest.streak_days,
            totalDays: latest.total_days,
            lastCheckInDates: weekCheckIns.map(r =>
                r.checkin_date instanceof Date
                    ? r.checkin_date.toISOString().slice(0, 10)
                    : String(r.checkin_date)
            ),
        };
    }
}

module.exports = new CheckInService();
