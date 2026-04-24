/**
 * 学习资料控制器
 * 用户侧：列表 / 详情 / 推荐 / 下载
 * 管理侧：CRUD
 */
const resourceService = require('../services/resourceService');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

class ResourceController {

  // ---------- 用户侧 ----------

  /** GET /api/resources */
  async list(req, res, next) {
    try {
      const { page = 1, pageSize = 12, categoryId, q, recommended } = req.query;
      const result = await resourceService.list({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        q,
        recommended: recommended !== undefined ? recommended === 'true' : undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/resources/recommended?userId=xxx */
  async getRecommended(req, res, next) {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ success: false, message: '缺少 userId' });
      }
      const result = await resourceService.getRecommendedForUser(parseInt(userId), 4);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/resources/:id */
  async get(req, res, next) {
    try {
      const resource = await resourceService.get(parseInt(req.params.id));
      if (!resource) {
        return res.status(404).json({ success: false, message: '资料不存在' });
      }
      await resourceService.incrementView(parseInt(req.params.id));
      res.json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/resources/:id/download */
  async download(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const resource = await resourceService.get(id);
      if (!resource) {
        return res.status(404).json({ success: false, message: '资料不存在' });
      }
      if (!resource.fileUrl) {
        return res.status(404).json({ success: false, message: '文件不存在' });
      }
      await resourceService.incrementDownload(id);
      const filePath = path.join(__dirname, '../../', resource.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        res.download(filePath);
      } else {
        res.status(404).json({ success: false, message: '文件不存在' });
      }
    } catch (error) {
      next(error);
    }
  }

  // ---------- 管理侧 ----------

  /** GET /api/resources/admin */
  async adminList(req, res, next) {
    try {
      const items = await resourceService.adminList();
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/resources */
  async create(req, res, next) {
    try {
      const { title, author, description, categoryId, coverUrl, fileUrl, fileType, fileSize, topicIds } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, message: '标题不能为空' });
      }
      const uploaderId = req.user?.id;
      const resource = await resourceService.create({
        title, author, description, categoryId, coverUrl, fileUrl, fileType, fileSize, uploaderId, topicIds
      });
      res.status(201).json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/resources/:id */
  async update(req, res, next) {
    try {
      const { title, author, description, categoryId, coverUrl, fileUrl, fileType, fileSize, isRecommended, topicIds } = req.body;
      const resource = await resourceService.update(parseInt(req.params.id), {
        title, author, description, categoryId, coverUrl, fileUrl, fileType, fileSize, isRecommended, topicIds
      });
      res.json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/resources/:id */
  async remove(req, res, next) {
    try {
      await resourceService.remove(parseInt(req.params.id));
      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ResourceController();
