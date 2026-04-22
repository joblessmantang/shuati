/**
 * 学习目标服务
 * 职责：
 *  - 获取用户当前有效目标（每日/每周各取一条 active 状态）
 *  - 创建/更新/取消目标
 *  - 追加完成进度（addProgress）
 *  - 目标自动重置逻辑预留
 */
const { pool } = require('../config/database');

class GoalService {
    /**
     * 获取用户当前有效的每日目标
     * @param {number} userId
     * @returns {Promise<object|null>}
     */
    async getActiveDailyGoal(userId) {
        const today = new Date().toISOString().slice(0, 10);
        const [rows] = await pool.query(
            `SELECT * FROM study_goals
             WHERE user_id = ? AND type = 'daily' AND status = 'active'
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        if (rows.length === 0) return null;

        const goal = rows[0];
        // 过期目标自动取消
        if (goal.end_date < today && goal.status === 'active') {
            await pool.query('UPDATE study_goals SET status = ? WHERE id = ?', ['cancelled', goal.id]);
            return null;
        }
        return this._formatGoal(goal);
    }

    /**
     * 获取用户当前有效的每周目标
     * @param {number} userId
     * @returns {Promise<object|null>}
     */
    async getActiveWeeklyGoal(userId) {
        const today = new Date().toISOString().slice(0, 10);
        const [rows] = await pool.query(
            `SELECT * FROM study_goals
             WHERE user_id = ? AND type = 'weekly' AND status = 'active'
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        if (rows.length === 0) return null;

        const goal = rows[0];
        if (goal.end_date < today && goal.status === 'active') {
            await pool.query('UPDATE study_goals SET status = ? WHERE id = ?', ['cancelled', goal.id]);
            return null;
        }
        return this._formatGoal(goal);
    }

    /**
     * 获取用户当前有效目标（合并返回）
     * 优先返回每日目标；每周目标作为第二个元素
     * @param {number} userId
     * @returns {Promise<object>} { daily: null|object, weekly: null|object }
     */
    async getActiveGoals(userId) {
        const [daily, weekly] = await Promise.all([
            this.getActiveDailyGoal(userId),
            this.getActiveWeeklyGoal(userId),
        ]);
        return { daily, weekly };
    }

    /**
     * 获取用户的最新一条目标（用于 GET /goals 接口直接返回）
     * 优先返回每日，其次每周
     * @param {number} userId
     * @returns {Promise<object|null>}
     */
    async getCurrentGoal(userId) {
        const [rows] = await pool.query(
            `SELECT * FROM study_goals
             WHERE user_id = ? AND status = 'active'
             ORDER BY type = 'daily' DESC, created_at DESC LIMIT 1`,
            [userId]
        );
        if (rows.length === 0) return null;

        const goal = rows[0];
        const today = new Date().toISOString().slice(0, 10);
        if (goal.end_date < today && goal.status === 'active') {
            await pool.query('UPDATE study_goals SET status = ? WHERE id = ?', ['cancelled', goal.id]);
            return null;
        }
        return this._formatGoal(goal);
    }

    /**
     * 创建学习目标
     * @param {object} params { userId, type, target }
     * @returns {Promise<object>}
     */
    async createGoal({ userId, type, target }) {
        // 同一类型的目标只保留一条 active 记录，先取消旧的
        if (type === 'daily' || type === 'weekly') {
            await pool.query(
                'UPDATE study_goals SET status = ? WHERE user_id = ? AND type = ? AND status = ?',
                ['cancelled', userId, type, 'active']
            );
        }

        const today = new Date();
        const startDate = today.toISOString().slice(0, 10);
        let endDate;

        if (type === 'daily') {
            endDate = startDate;
        } else if (type === 'weekly') {
            // 本周日
            const sunday = new Date(today);
            sunday.setDate(today.getDate() + (7 - today.getDay() === 7 ? 0 : 7 - today.getDay()));
            endDate = sunday.toISOString().slice(0, 10);
        } else {
            endDate = startDate;
        }

        const [result] = await pool.query(
            `INSERT INTO study_goals (user_id, type, target_count, current_count, start_date, end_date, status)
             VALUES (?, ?, ?, 0, ?, ?, 'active')`,
            [userId, type, target, startDate, endDate]
        );

        return this._formatGoal({
            id: result.insertId,
            user_id: userId,
            type,
            target_count: target,
            current_count: 0,
            start_date: startDate,
            end_date: endDate,
            status: 'active',
        });
    }

    /**
     * 更新学习目标（type / target）
     * @param {number} id
     * @param {object} data { type?, target? }
     * @param {number} userId 用于校验归属
     * @returns {Promise<object>}
     */
    async updateGoal(id, data, userId) {
        // 校验归属权
        const [existing] = await pool.query(
            'SELECT * FROM study_goals WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        if (existing.length === 0) {
            const err = new Error('目标不存在或无权修改');
            err.status = 404;
            throw err;
        }

        const updates = [];
        const values = [];

        if (data.type !== undefined) {
            updates.push('type = ?');
            values.push(data.type);
        }
        if (data.target !== undefined) {
            updates.push('target_count = ?');
            values.push(data.target);
        }
        if (updates.length === 0) return this._formatGoal(existing[0]);

        values.push(id);
        await pool.query(
            `UPDATE study_goals SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [updated] = await pool.query('SELECT * FROM study_goals WHERE id = ?', [id]);
        return this._formatGoal(updated[0]);
    }

    /**
     * 为目标追加完成进度
     * @param {number} userId
     * @param {number} questionCount 完成的题目数量
     * @returns {Promise<object>} 更新后的目标
     */
    async addProgress(userId, questionCount) {
        // 找到用户当前有效的每日目标
        const today = new Date().toISOString().slice(0, 10);
        const [rows] = await pool.query(
            `SELECT * FROM study_goals
             WHERE user_id = ? AND status = 'active'
             ORDER BY type = 'daily' DESC, created_at DESC LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) return null;

        const goal = rows[0];
        const newCount = Math.min(goal.current_count + questionCount, goal.target_count);
        const isCompleted = newCount >= goal.target_count;
        const newStatus = isCompleted ? 'completed' : 'active';

        await pool.query(
            `UPDATE study_goals
             SET current_count = ?, status = ?, updated_at = NOW()
             WHERE id = ?`,
            [newCount, newStatus, goal.id]
        );

        const [updated] = await pool.query('SELECT * FROM study_goals WHERE id = ?', [goal.id]);
        return this._formatGoal(updated[0]);
    }

    /**
     * 统一格式化目标字段
     * @param {object} row 数据库行
     * @returns {object}
     */
    _formatGoal(row) {
        if (!row) return null;
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            target: row.target_count,
            current: row.current_count,
            startDate: row.start_date instanceof Date
                ? row.start_date.toISOString().slice(0, 10)
                : String(row.start_date).slice(0, 10),
            endDate: row.end_date instanceof Date
                ? row.end_date.toISOString().slice(0, 10)
                : String(row.end_date).slice(0, 10),
            status: row.status,
            createdAt: row.created_at,
        };
    }
}

module.exports = new GoalService();
