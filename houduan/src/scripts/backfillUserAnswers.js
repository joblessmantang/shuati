/**
 * 回填脚本：从 practice_history 估算并填充 user_answers 表
 *
 * 问题背景：
 * - practice_history 表已正确保存每轮练习的 score/total
 * - user_answers 表为空（答题记录从未被正确保存）
 * - analysisService.getCategoryAbility 只查询 user_answers
 *
 * 回填策略：
 * - 每条 history 记录：按该练习的正确率，均摊到各分类的题目上
 * - 分类内题目列表：从 questions 表按 categoryId 取全部题目
 * - 为避免精确性争议，同一分类内的题目轮流标记为对/错，保持该分类总正确率与历史一致
 *
 * 限制：
 * - 历史数据为估算值，不代表真实每题对错
 * - 仅回填一次，再次运行不会重复插入（IGNORE）
 *
 * 运行方式：
 *   node src/scripts/backfillUserAnswers.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function backfill() {
    const connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'interview_platform',
    };

    const conn = await mysql.createConnection(connectionConfig);

    try {
        console.log('[Backfill] 开始回填 user_answers...\n');

        // Step 1: 检查 user_answers 是否已有数据
        const [[existingCount]] = await conn.query('SELECT COUNT(*) as cnt FROM user_answers');
        if (existingCount.cnt > 0) {
            console.log(`[Backfill] user_answers 已有 ${existingCount.cnt} 条记录，回填跳过。`);
            console.log('[Backfill] 如需重新回填，请先执行：TRUNCATE TABLE user_answers;');
            return;
        }

        // Step 2: 获取所有有练习记录的用户
        const [users] = await conn.query(
            'SELECT DISTINCT userId FROM practice_history ORDER BY userId'
        );
        console.log(`[Backfill] 找到 ${users.length} 个有练习记录的用户\n`);

        if (users.length === 0) {
            console.log('[Backfill] 没有需要回填的用户，结束。');
            return;
        }

        // Step 3: 获取所有题目及其分类
        const [questions] = await conn.query(
            'SELECT id, categoryId FROM questions WHERE categoryId IS NOT NULL ORDER BY categoryId, id'
        );

        // 按 categoryId 分组
        const questionsByCategory = {};
        for (const q of questions) {
            if (!questionsByCategory[q.categoryId]) {
                questionsByCategory[q.categoryId] = [];
            }
            questionsByCategory[q.categoryId].push(q.id);
        }
        console.log(`[Backfill] 共有 ${questions.length} 道题，分为 ${Object.keys(questionsByCategory).length} 个分类`);

        // Step 4: 获取所有历史练习记录
        const [histories] = await conn.query(
            'SELECT id, userId, score, total, createdAt FROM practice_history ORDER BY userId, createdAt'
        );
        console.log(`[Backfill] 共有 ${histories.length} 条练习记录待回填\n`);

        // Step 5: 遍历每条历史，按分类均摊对错
        let totalInserted = 0;
        const values = [];

        for (const hist of histories) {
            const { userId, score, total, createdAt } = hist;
            if (!total || total <= 0) continue;

            const accuracy = score / total; // 该练习整体正确率

            // 按分类均摊：每分类应练习题数 = 该分类题目数 / 总题数 * total
            for (const [catId, qIds] of Object.entries(questionsByCategory)) {
                if (qIds.length === 0) continue;

                const catTotal = Math.round((qIds.length / questions.length) * total);
                if (catTotal === 0) continue;

                const catCorrect = Math.round(catTotal * accuracy);
                // 分配：轮流标记，前 catCorrect 道为正确，后面的为错误
                for (let i = 0; i < catTotal; i++) {
                    const qId = qIds[i % qIds.length];
                    const isCorrect = i < catCorrect;
                    values.push([userId, qId, null, isCorrect, createdAt]);
                }
            }
        }

        if (values.length === 0) {
            console.log('[Backfill] 没有可回填的数据（历史记录总数为 0），结束。');
            return;
        }

        // Step 6: 批量插入（INSERT IGNORE 防止重复）
        const CHUNK = 500;
        for (let i = 0; i < values.length; i += CHUNK) {
            const chunk = values.slice(i, i + CHUNK);
            await conn.query(
                'INSERT IGNORE INTO user_answers (user_id, question_id, selected_index, is_correct, created_at) VALUES ?',
                [chunk]
            );
            process.stdout.write(`\r[Backfill] 插入进度: ${Math.min(i + CHUNK, values.length)} / ${values.length}`);
        }
        console.log('\n');

        // 统计
        const [[countAfter]] = await conn.query('SELECT COUNT(*) as cnt FROM user_answers');
        totalInserted = countAfter.cnt;
        console.log(`\n[Backfill] 回填完成！user_answers 现有 ${totalInserted} 条记录。`);

        // 验证：打印各用户各分类的统计
        const [verify] = await conn.query(`
            SELECT
                u.id as userId,
                u.username,
                c.name as categoryName,
                COUNT(ua.id) as total,
                SUM(ua.is_correct) as correct
            FROM user_answers ua
            JOIN users u ON ua.user_id = u.id
            JOIN questions q ON ua.question_id = q.id
            JOIN categories c ON q.categoryId = c.id
            GROUP BY u.id, c.id
            ORDER BY u.id, c.id
        `);
        console.log('\n[Backfill] 回填数据验证（各用户各分类统计）：');
        console.table(verify.map(r => ({
            user: r.username,
            category: r.categoryName,
            total: r.total,
            correct: r.correct,
            ability: r.total > 0 ? Math.round((r.correct / r.total) * 100) + '%' : 'N/A'
        })));

    } catch (error) {
        console.error('[Backfill] 回填失败:', error.message);
        throw error;
    } finally {
        await conn.end();
    }
}

backfill()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
