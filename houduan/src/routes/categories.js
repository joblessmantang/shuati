const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware } = require('../middlewares/auth');

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/', authMiddleware, categoryController.create);
router.patch('/:id', authMiddleware, categoryController.update);
router.delete('/:id', authMiddleware, categoryController.remove);

module.exports = router;
