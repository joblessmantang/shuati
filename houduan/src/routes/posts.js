const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const { authMiddleware } = require('../middlewares/auth');

// 注意：/:postId/comments 必须放在 /:postId 前面
router.get('/', postController.getPostsByQuestion);
router.get('/count', postController.getCount);
router.get('/:postId/comments', commentController.getCommentsByPost);
router.get('/:postId', postController.getPostById);
router.patch('/:postId', authMiddleware, postController.updatePost);
router.post('/:postId/like', authMiddleware, postController.toggleLike);
router.delete('/:postId', authMiddleware, postController.deletePost);
// 评论
router.post('/:postId/comments', authMiddleware, commentController.createComment);
router.delete('/:postId/comments/:commentId', authMiddleware, commentController.deleteComment);
router.patch('/:postId/comments/:commentId/like', authMiddleware, commentController.toggleLike);
router.patch('/:postId/comments/:commentId/highlight', authMiddleware, commentController.toggleHighlight);
router.patch('/:postId/comments/:commentId/accept', authMiddleware, commentController.toggleAccept);
router.post('/', authMiddleware, postController.createPost);

module.exports = router;
