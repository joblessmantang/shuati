const express = require('express');
const router = express.Router();
const userAnswersController = require('../controllers/userAnswersController');

router.post('/', userAnswersController.add);

module.exports = router;
