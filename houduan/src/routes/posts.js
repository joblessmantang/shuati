const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const { authMiddleware } = require('../middlewares/auth');

// 注意：/:postId/comments 必须放在 /:postId 前面，否则 /posts/123/comments 会被 /:postId 先捕获
router.get('/', postController.getPostsByQuestion);
router.get('/count', postController.getCount);
router.get('/:postId/comments', commentController.getCommentsByPost);
router.get('/:postId', postController.getPostById);
router.post('/:postId/comments', authMiddleware, commentController.createComment);
router.delete('/:postId/comments/:commentId', authMiddleware, commentController.deleteComment);
router.patch('/:postId', authMiddleware, postController.updatePost);
router.post('/', authMiddleware, postController.createPost);
router.delete('/:postId', authMiddleware, postController.deletePost);

module.exports = router;
