/**
 * 学习资料服务
 * 职责：
 *  - 资料 CRUD
 *  - 文件 URL 生成
 *  - 关联知识点管理
 *  - 推荐资料规则匹配
 */
const { pool } = require('../config/database');

class ResourceService {

  /** 格式化单条资源（附加关联知识点） */
  async _formatResource(row) {
    if (!row) return null;
    const [topicRows] = await pool.query(
      'SELECT c.id, c.name FROM resource_topics rt JOIN categories c ON rt.category_id = c.id WHERE rt.resource_id = ?',
      [row.id]
    );
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.category_name || null,
      coverUrl: row.cover_url || '',
      fileUrl: row.file_url || '',
      fileType: row.file_type || 'pdf',
      fileSize: row.file_size || 0,
      isRecommended: !!row.is_recommended,
      uploaderId: row.uploader_id,
      uploaderName: row.uploader_name || '',
      viewCount: row.view_count || 0,
      downloadCount: row.download_count || 0,
      topics: topicRows.map(t => ({ id: t.id, name: t.name })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 分页获取资料列表
   * @param {object} params { page, pageSize, categoryId, q, recommended }
   */
  async list({ page = 1, pageSize = 12, categoryId, q, recommended }) {
    const offset = (page - 1) * pageSize;
    const conditions = ['1=1'];
    const params = [];

    if (categoryId) {
      conditions.push('r.category_id = ?');
      params.push(categoryId);
    }
    if (q) {
      conditions.push('(r.title LIKE ? OR r.author LIKE ? OR r.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (recommended !== undefined) {
      conditions.push('r.is_recommended = ?');
      params.push(recommended ? 1 : 0);
    }

    const where = conditions.join(' AND ');

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as count FROM resources r WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT r.*, c.name as category_name, u.username as uploader_name
       FROM resources r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN users u ON r.uploader_id = u.id
       WHERE ${where}
       ORDER BY r.is_recommended DESC, r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const items = await Promise.all(rows.map(r => this._formatResource(r)));

    return {
      items,
      total: totalRows[0].count,
      page,
      pageSize,
      totalPages: Math.ceil(totalRows[0].count / pageSize),
    };
  }

  /** 获取单条 */
  async get(id) {
    const [rows] = await pool.query(
      `SELECT r.*, c.name as category_name, u.username as uploader_name
       FROM resources r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN users u ON r.uploader_id = u.id
       WHERE r.id = ?`,
      [id]
    );
    return this._formatResource(rows[0]);
  }

  /** 增长浏览数 */
  async incrementView(id) {
    await pool.query('UPDATE resources SET view_count = view_count + 1 WHERE id = ?', [id]);
  }

  /** 增长下载数 */
  async incrementDownload(id) {
    await pool.query('UPDATE resources SET download_count = download_count + 1 WHERE id = ?', [id]);
  }

  /**
   * 创建资料（不含文件上传，由 controller 层处理 URL）
   * @param {object} data
   */
  async create({ title, author, description, categoryId, coverUrl, fileUrl, fileType, fileSize, uploaderId, topicIds }) {
    const [result] = await pool.query(
      `INSERT INTO resources (title, author, description, category_id, cover_url, file_url, file_type, file_size, uploader_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, author || '', description || '', categoryId || null, coverUrl || '', fileUrl || '', fileType || 'pdf', fileSize || 0, uploaderId]
    );

    const id = result.insertId;

    if (topicIds && Array.isArray(topicIds) && topicIds.length > 0) {
      const topicValues = topicIds.map(tid => [id, Number(tid)]);
      await pool.query(
        'INSERT IGNORE INTO resource_topics (resource_id, category_id) VALUES ?',
        [topicValues]
      );
    }

    return this.get(id);
  }

  /**
   * 更新资料
   */
  async update(id, { title, author, description, categoryId, coverUrl, fileUrl, fileType, fileSize, isRecommended, topicIds }) {
    const fields = [];
    const params = [];

    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (author !== undefined) { fields.push('author = ?'); params.push(author); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (categoryId !== undefined) { fields.push('category_id = ?'); params.push(categoryId); }
    if (coverUrl !== undefined) { fields.push('cover_url = ?'); params.push(coverUrl); }
    if (fileUrl !== undefined) { fields.push('file_url = ?'); params.push(fileUrl); }
    if (fileType !== undefined) { fields.push('file_type = ?'); params.push(fileType); }
    if (fileSize !== undefined) { fields.push('file_size = ?'); params.push(fileSize); }
    if (isRecommended !== undefined) { fields.push('is_recommended = ?'); params.push(isRecommended ? 1 : 0); }

    if (fields.length > 0) {
      params.push(id);
      await pool.query(`UPDATE resources SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    if (topicIds !== undefined) {
      await pool.query('DELETE FROM resource_topics WHERE resource_id = ?', [id]);
      if (Array.isArray(topicIds) && topicIds.length > 0) {
        const topicValues = topicIds.map(tid => [id, Number(tid)]);
        await pool.query('INSERT IGNORE INTO resource_topics (resource_id, category_id) VALUES ?', [topicValues]);
      }
    }

    return this.get(id);
  }

  /** 删除资料 */
  async remove(id) {
    await pool.query('DELETE FROM resources WHERE id = ?', [id]);
  }

  /**
   * 获取管理员列表（不分页，展示全部）
   */
  async adminList() {
    const [rows] = await pool.query(
      `SELECT r.*, c.name as category_name, u.username as uploader_name
       FROM resources r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN users u ON r.uploader_id = u.id
       ORDER BY r.created_at DESC`
    );
    return Promise.all(rows.map(r => this._formatResource(r)));
  }

  /**
   * 基于用户薄弱点推荐资料（规则匹配）
   * 逻辑：取用户最近薄弱的分类，匹配资料的 topics
   * @param {number} userId
   * @param {number} limit
   */
  async getRecommendedForUser(userId, limit = 4) {
    // 1. 获取用户最近薄弱分类（取最近 30 天内正确率 < 60% 的分类，按题目数降序）
    const [weakRows] = await pool.query(
      `SELECT c.id as category_id, c.name as category_name,
              COUNT(*) as total,
              SUM(ua.is_correct) as correct,
              ROUND(SUM(ua.is_correct) / COUNT(*) * 100) as accuracy
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       JOIN categories c ON q.categoryId = c.id
       WHERE ua.user_id = ? AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY c.id
       HAVING accuracy < 60
       ORDER BY total DESC
       LIMIT 5`,
      [userId]
    );

    if (weakRows.length === 0) {
      // 无薄弱点，返回标记推荐的资料
      const [rows] = await pool.query(
        `SELECT r.*, c.name as category_name, u.username as uploader_name
         FROM resources r
         LEFT JOIN categories c ON r.category_id = c.id
         LEFT JOIN users u ON r.uploader_id = u.id
         WHERE r.is_recommended = 1
         ORDER BY r.view_count DESC
         LIMIT ?`,
        [limit]
      );
      const items = await Promise.all(rows.map(r => this._formatResource(r)));
      return {
        items,
        reason: '精选推荐',
        weakCategories: [],
      };
    }

    const weakCategoryIds = weakRows.map(w => w.category_id);

    // 2. 查询匹配的资料
    const [rows] = await pool.query(
      `SELECT DISTINCT r.*, c.name as category_name, u.username as uploader_name
       FROM resources r
       JOIN resource_topics rt ON rt.resource_id = r.id
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN users u ON r.uploader_id = u.id
       WHERE rt.category_id IN (?)
       ORDER BY r.is_recommended DESC, r.view_count DESC
       LIMIT ?`,
      [weakCategoryIds, limit]
    );

    const items = await Promise.all(rows.map(r => this._formatResource(r)));

    return {
      items,
      reason: `针对「${weakRows[0].category_name}」等薄弱分类推荐`,
      weakCategories: weakRows,
    };
  }
}

module.exports = new ResourceService();
