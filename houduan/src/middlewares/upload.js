/**
 * 静态文件上传中间件
 * 支持封面图和资料文件上传
 * 文件保存到 houduan/uploads/ 目录下
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

const router = express.Router();

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../../uploads');
const coversDir = path.join(uploadsDir, 'covers');
const filesDir = path.join(uploadsDir, 'files');
[uploadsDir, coversDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 封面图存储
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, coversDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cover_${Date.now()}${ext}`);
  }
});

// 资料文件存储
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, filesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `file_${Date.now()}${ext}`);
  }
});

const coverFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('仅支持 jpg/png/webp/gif 格式的图片'), false);
};

const fileFilter = (req, file, cb) => {
  const allowed = /pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  if (ext) cb(null, true);
  else cb(new Error('仅支持 PDF 格式文件'), false);
};

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: coverFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadFile = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 上传封面图
router.post('/cover', (req, res, next) => {
  uploadCover.single('cover')(req, res, (err) => {
    if (err) {
      if (err.message.includes('格式')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(500).json({ success: false, message: '封面上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择封面图片' });
    }
    const url = `/uploads/covers/${req.file.filename}`;
    res.json({ success: true, data: { url, filename: req.file.filename } });
  });
});

// 上传资料文件
router.post('/file', (req, res, next) => {
  uploadFile.single('file')(req, res, (err) => {
    if (err) {
      if (err.message.includes('格式')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(500).json({ success: false, message: '文件上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择 PDF 文件' });
    }
    const url = `/uploads/files/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  });
});

// 获取上传目录（供外部访问静态文件）
router.get('/uploads/*', (req, res) => {
  const filePath = path.join(__dirname, '../../', req.params[0]);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, message: '文件不存在' });
  }
});

module.exports = router;
