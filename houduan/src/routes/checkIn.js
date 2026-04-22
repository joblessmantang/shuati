const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');

// GET  /api/checkIn?userId=xxx  获取签到记录
router.get('/', checkInController.getRecord);

// POST /api/checkIn  签到
router.post('/', checkInController.checkIn);

module.exports = router;
