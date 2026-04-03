const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');

router.get('/', favoritesController.getList);
router.post('/', favoritesController.add);
router.delete('/:id', favoritesController.remove);

module.exports = router;
