const { pool } = require('../config/database');

function formatTopic(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description || '',
        questionCount: row.question_count || 0,
        practiceCount: row.practice_count || 0,
        lastPracticedAt: row.last_practiced_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function formatQuestion(q) {
    var opts = q.options;
    if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch (e) { opts = []; }
    }
    return {
        id: q.id,
        title: q.title,
        code: q.code,
        options: opts,
        correctAnswer: q.correctAnswer,
        categoryId: q.categoryId,
        sortOrder: q.sortOrder
    };
}

module.exports = {
    async verifyOwnership(topicId, userId) {
        var rows = await pool.query(
            'SELECT id FROM topics WHERE id = ? AND user_id = ?',
            [topicId, userId]
        );
        return rows[0].length > 0;
    },

    async list(userId) {
        var rows = await pool.query(
            'SELECT id, user_id AS userId, name, description, question_count AS questionCount, ' +
            'practice_count AS practiceCount, last_practiced_at AS lastPracticedAt, ' +
            'created_at AS createdAt FROM topics WHERE user_id = ? ORDER BY updated_at DESC',
            [userId]
        );
        return rows[0];
    },

    async getDetail(topicId, userId) {
        var topicRows = await pool.query(
            'SELECT id, user_id AS userId, name, description, question_count AS questionCount, ' +
            'practice_count AS practiceCount, last_practiced_at AS lastPracticedAt, ' +
            'created_at AS createdAt FROM topics WHERE id = ?',
            [topicId]
        );
        if (topicRows[0].length === 0) return null;
        var topic = topicRows[0][0];

        if (userId && topicRows[0][0].userId !== userId) {
            var err = new Error('无权查看该专�?);
            err.status = 403;
            throw err;
        }

        var questions = await pool.query(
            'SELECT q.id, q.title, q.code, q.options, q.correctAnswer, q.categoryId, ' +
            'tq.sort_order AS sortOrder FROM topic_questions tq ' +
            'JOIN questions q ON tq.question_id = q.id WHERE tq.topic_id = ? ORDER BY tq.sort_order ASC',
            [topicId]
        );

        return {
            id: topic.id,
            userId: topic.userId,
            name: topic.name,
            description: topic.description || '',
            questionCount: topic.questionCount || 0,
            practiceCount: topic.practiceCount || 0,
            lastPracticedAt: topic.lastPracticedAt,
            createdAt: topic.createdAt,
            questions: questions[0].map(formatQuestion)
        };
    },

    async create(data) {
        var userId = data.userId;
        var name = data.name;
        var description = data.description || '';
        var result = await pool.query(
            'INSERT INTO topics (user_id, name, description, question_count, practice_count) VALUES (?, ?, ?, 0, 0)',
            [userId, name, description]
        );
        return {
            id: result[0].insertId,
            userId: userId,
            name: name,
            description: description,
            questionCount: 0,
            practiceCount: 0,
            lastPracticedAt: null,
            createdAt: new Date().toISOString()
        };
    },

    async update(topicId, data, userId) {
        var own = await this.verifyOwnership(topicId, userId);
        if (!own) {
            var err1 = new Error('专题不存在或无权修改');
            err1.status = 404;
            throw err1;
        }
        var updates = [];
        var vals = [];
        if (data.name !== undefined) { updates.push('name = ?'); vals.push(data.name); }
        if (data.description !== undefined) { updates.push('description = ?'); vals.push(data.description); }
        if (updates.length === 0) {
            var r = await pool.query('SELECT * FROM topics WHERE id = ?', [topicId]);
            return formatTopic(r[0][0]);
        }
        updates.push('updated_at = NOW()');
        vals.push(topicId);
        await pool.query('UPDATE topics SET ' + updates.join(', ') + ' WHERE id = ?', vals);
        var upd = await pool.query('SELECT * FROM topics WHERE id = ?', [topicId]);
        return formatTopic(upd[0][0]);
    },

    async remove(topicId, userId) {
        var own = await this.verifyOwnership(topicId, userId);
        if (!own) {
            var err2 = new Error('专题不存在或无权删除');
            err2.status = 404;
            throw err2;
        }
        await pool.query('DELETE FROM topics WHERE id = ?', [topicId]);
    },

    async addQuestion(topicId, questionId, userId) {
        var own = await this.verifyOwnership(topicId, userId);
        if (!own) {
            var err3 = new Error('专题不存在或无权修改');
            err3.status = 404;
            throw err3;
        }
        var maxRows = await pool.query(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM topic_questions WHERE topic_id = ?',
            [topicId]
        );
        var nextOrder = maxRows[0][0].next_order;
        try {
            await pool.query(
                'INSERT INTO topic_questions (topic_id, question_id, sort_order) VALUES (?, ?, ?)',
                [topicId, questionId, nextOrder]
            );
        } catch (err4) {
            if (err4.code === 'ER_DUP_ENTRY') {
                var dup = new Error('题目已在该专题中');
                dup.code = 'DUPLICATE_QUESTION';
                throw dup;
            }
            throw err4;
        }
        await syncQuestionCount(topicId);
    },

    async removeQuestion(topicId, questionId, userId) {
        var own = await this.verifyOwnership(topicId, userId);
        if (!own) {
            var err5 = new Error('专题不存在或无权修改');
            err5.status = 404;
            throw err5;
        }
        await pool.query(
            'DELETE FROM topic_questions WHERE topic_id = ? AND question_id = ?',
            [topicId, questionId]
        );
        await syncQuestionCount(topicId);
    },

    async reorderQuestions(topicId, orderedIds, userId) {
        var own = await this.verifyOwnership(topicId, userId);
        if (!own) {
            var err6 = new Error('专题不存在或无权修改');
            err6.status = 404;
            throw err6;
        }
        var conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (var i = 0; i < orderedIds.length; i++) {
                await conn.query(
                    'UPDATE topic_questions SET sort_order = ? WHERE topic_id = ? AND question_id = ?',
                    [i, topicId, orderedIds[i]]
                );
            }
            await conn.commit();
        } catch (err7) {
            await conn.rollback();
            throw err7;
        } finally {
            conn.release();
        }
    }
};

async function syncQuestionCount(topicId) {
    var cnt = await pool.query(
        'SELECT COUNT(*) AS c FROM topic_questions WHERE topic_id = ?',
        [topicId]
    );
    await pool.query(
        'UPDATE topics SET question_count = ?, updated_at = NOW() WHERE id = ?',
        [cnt[0][0].c, topicId]
    );
}
