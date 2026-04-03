const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware } = require('../middlewares/auth');

router.get('/', authMiddleware, reportController.getList);
router.post('/', reportController.add);
router.delete('/:id', authMiddleware, reportController.remove);

module.exports = router;
