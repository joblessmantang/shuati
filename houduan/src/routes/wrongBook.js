const express = require('express');
const router = express.Router();
const wrongBookController = require('../controllers/wrongBookController');

router.get('/', wrongBookController.getList);
router.post('/', wrongBookController.add);
router.delete('/:id', wrongBookController.remove);

module.exports = router;
