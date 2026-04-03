const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.get('/', historyController.getList);
router.post('/', historyController.add);

module.exports = router;
