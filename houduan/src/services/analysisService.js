/**
 * 分析服务 - 知识图谱 + 个性化推荐
 *
 * 数据来源（纯聚合，无新表）：
 *   - user_answers   每题答题记录
 *   - questions      题目（含 categoryId）
 *   - categories    分类
 *   - wrong_book     错题本
 *   - practice_history 练习记录
 *   - favorites      收藏
 */
const { pool } = require('../config/database');

/**
 * 获取用户的分类能力分析数据（知识图谱/雷达图）
 * 能力值算法：
 *   - 每个分类：total=该分类做题总数, correct=正确数
 *   - 能力值 = correct / total (%)
 *   - 若该分类无做题记录，能力值 = null
 *   - 推荐程度：基于错题数和最近表现
 * @param {number} userId
 * @param {string|null} range - null|'all'|'week'|'month'
 */
async function getCategoryAbility(userId, range = null) {
    const [cats] = await pool.execute(
        'SELECT id, name FROM categories ORDER BY id ASC'
    );

    let dateFilter = '';
    if (range === 'week') {
        dateFilter = ' AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (range === 'month') {
        dateFilter = ' AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const [rows] = await pool.query(`
        SELECT
            q.categoryId,
            COUNT(ua.id)                          AS total,
            SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ? AND q.categoryId IS NOT NULL${dateFilter}
        GROUP BY q.categoryId
    `, [userId]);

    const statMap = {};
    rows.forEach(r => {
        statMap[r.categoryId] = {
            total: Number(r.total) || 0,
            correct: Number(r.correct) || 0
        };
    });

    // 薄弱分类（错题本中题目最多的分类 TOP3）
    const [weakRows] = await pool.query(`
        SELECT q.categoryId, COUNT(*) as cnt
        FROM wrong_book wb
        JOIN questions q ON wb.questionId = q.id
        WHERE wb.userId = ? AND q.categoryId IS NOT NULL
        GROUP BY q.categoryId
        ORDER BY cnt DESC
        LIMIT 3
    `, [userId]);

    const weakCatIds = new Set(weakRows.map(r => r.categoryId));

    return cats.map(cat => {
        const stat = statMap[cat.id] || { total: 0, correct: 0 };
        const ability = stat.total > 0
            ? Math.round((stat.correct / stat.total) * 100)
            : null;
        return {
            categoryId: cat.id,
            categoryName: cat.name,
            total: stat.total,
            correct: stat.correct,
            wrongCount: stat.total - stat.correct,
            ability,
            isWeak: weakCatIds.has(cat.id)
        };
    });
}

/**
 * 获取用户的薄弱分类推荐（首页使用）
 * 返回：推荐练习的分类列表 + 原因
 */
async function getWeakCategoryRecommendations(userId) {
    const [cats] = await pool.execute(
        'SELECT id, name FROM categories ORDER BY id ASC'
    );

    // 错题本中错题最多的分类
    const [wrongRows] = await pool.query(`
        SELECT q.categoryId, COUNT(*) as cnt
        FROM wrong_book wb
        JOIN questions q ON wb.questionId = q.id
        WHERE wb.userId = ? AND q.categoryId IS NOT NULL
        GROUP BY q.categoryId
        ORDER BY cnt DESC
    `, [userId]);

    const wrongMap = {};
    wrongRows.forEach(r => { wrongMap[r.categoryId] = Number(r.cnt); });

    // 各分类正确率最低的
    const [accRows] = await pool.query(`
        SELECT q.categoryId,
               COUNT(ua.id) as total,
               SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) as correct
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ? AND q.categoryId IS NOT NULL
        GROUP BY q.categoryId
        HAVING total >= 3
        ORDER BY (correct / total) ASC
        LIMIT 3
    `, [userId]);

    const weakCats = new Set();
    wrongRows.slice(0, 2).forEach(r => weakCats.add(r.categoryId));
    accRows.forEach(r => weakCats.add(r.categoryId));

    return cats
        .filter(c => weakCats.has(c.id))
        .map(c => ({
            categoryId: c.id,
            categoryName: c.name,
            reason: wrongMap[c.id] > 0
                ? `错题本中有 ${wrongMap[c.id]} 道相关题目`
                : '该分类正确率偏低，建议加强练习'
        }));
}

/**
 * 获取首页个性化推荐
 * 推荐策略（规则推荐，无推荐引擎）：
 *   1. 薄弱分类推荐（最多3个）
 *   2. 收藏题目推荐（最多3道，优先未做过的）
 *   3. 近期错题推荐（最近加入错题本的3道）
 *   4. 适合的练习模式推荐
 */
async function getHomeRecommendations(userId) {
    const [
        weakCats,
        recentHistory,
        recentWrong,
        recentFavorites,
        allQuestions
    ] = await Promise.all([
        getWeakCategoryRecommendations(userId),
        pool.query(`
            SELECT ph.*, ph.createdAt as created_at
            FROM practice_history ph
            WHERE ph.userId = ?
            ORDER BY ph.createdAt DESC
            LIMIT 10
        `, [userId]).then(r => r[0]),
        pool.query(`
            SELECT wb.*, q.title, q.categoryId, q.options
            FROM wrong_book wb
            JOIN questions q ON wb.questionId = q.id
            WHERE wb.userId = ?
            ORDER BY wb.created_at DESC
            LIMIT 3
        `, [userId]).then(r => r[0]),
        pool.query(`
            SELECT f.*, q.title, q.categoryId
            FROM favorites f
            JOIN questions q ON f.questionId = q.id
            WHERE f.userId = ?
            ORDER BY f.created_at DESC
            LIMIT 3
        `, [userId]).then(r => r[0]),
        pool.execute(
            'SELECT id, title, categoryId FROM questions LIMIT 100'
        ).then(r => r[0])
    ]);

    // 推荐练习模式
    const recommendMode = analyzePracticeMode(recentHistory);

    // 近期错题推荐（带格式化）
    const wrongRecommendations = recentWrong.map(w => ({
        id: w.questionId,
        title: w.title,
        categoryId: w.categoryId,
        reason: '错题本 · 需要复习',
        type: 'wrong'
    }));

    // 收藏推荐
    const favoriteRecommendations = recentFavorites.map(f => ({
        id: f.questionId,
        title: f.title,
        categoryId: f.categoryId,
        reason: '收藏题目',
        type: 'favorite'
    }));

    return {
        weakCategories: weakCats,
        recommendMode,
        wrongRecommendations,
        favoriteRecommendations
    };
}

/**
 * 分析用户适合的练习模式
 */
function analyzePracticeMode(history) {
    if (!history || history.length === 0) {
        return {
            mode: 'normal',
            reason: '开始你的第一次练习吧！'
        };
    }

    const last = history[0];
    const lastAcc = last.total > 0 ? (last.score / last.total) * 100 : 0;
    const recentAccs = history.slice(0, 5).map(h =>
        h.total > 0 ? (h.score / h.total) * 100 : 0
    );
    const avgAcc = recentAccs.reduce((a, b) => a + b, 0) / recentAccs.length;

    if (avgAcc >= 80) {
        return {
            mode: 'challenge',
            reason: '正确率优秀，试试计时挑战模式突破自我！'
        };
    } else if (avgAcc >= 50) {
        return {
            mode: 'mix',
            reason: '建议混合练习，查漏补缺提升正确率'
        };
    } else {
        return {
            mode: 'errors',
            reason: '错题较多，建议先专攻错题本'
        };
    }
}

/**
 * 获取用户与某道题的关系状态
 * 用于题目详情页
 */
async function getQuestionRelation(userId, questionId) {
    const [q] = await pool.execute(
        'SELECT id, title, categoryId FROM questions WHERE id = ?',
        [questionId]
    );
    if (q.length === 0) return null;

    const question = q[0];

    let inWrongBook = false;
    let inFavorites = false;
    let bestResult = null; // 'correct' | 'wrong' | null
    let attemptCount = 0;

    if (userId) {
        const [[wrongRows], [favRows], [answerRows]] = await Promise.all([
            pool.query('SELECT id FROM wrong_book WHERE userId = ? AND questionId = ?', [userId, questionId]),
            pool.query('SELECT id FROM favorites WHERE userId = ? AND questionId = ?', [userId, questionId]),
            pool.query(
                'SELECT is_correct FROM user_answers WHERE user_id = ? AND question_id = ? ORDER BY created_at DESC LIMIT 10',
                [userId, questionId]
            )
        ]);

        inWrongBook = wrongRows.length > 0;
        inFavorites = favRows.length > 0;

        const answers = answerRows[0] || [];
        attemptCount = answers.length;
        if (answers.length > 0) {
            // 最近一次
            bestResult = answers[0].is_correct ? 'correct' : 'wrong';
        }
    }

    return {
        questionId,
        questionTitle: question.title,
        categoryId: question.categoryId,
        inWrongBook,
        inFavorites,
        bestResult,
        attemptCount
    };
}

/**
 * 获取相似题目（同分类的其他题目，最多5道）
 */
async function getSimilarQuestions(questionId, limit = 5) {
    const [q] = await pool.execute(
        'SELECT id, title, categoryId FROM questions WHERE id = ?',
        [questionId]
    );
    if (q.length === 0) return [];

    const question = q[0];
    if (!question.categoryId) return [];

    const [rows] = await pool.query(
        `SELECT id, title, categoryId
         FROM questions
         WHERE categoryId = ? AND id != ?
         ORDER BY RAND()
         LIMIT ?`,
        [question.categoryId, questionId, limit]
    );

    return rows;
}

/**
 * 获取某题相关的论坛帖子（最多3条）
 */
async function getRelatedPosts(questionId) {
    const [rows] = await pool.query(`
        SELECT p.id, p.title, p.view_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
               u.username as author_name, p.created_at
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.question_id = ?
        ORDER BY p.view_count DESC
        LIMIT 3
    `, [questionId]);

    return rows;
}

module.exports = {
    getCategoryAbility,
    getWeakCategoryRecommendations,
    getHomeRecommendations,
    getQuestionRelation,
    getSimilarQuestions,
    getRelatedPosts
};
