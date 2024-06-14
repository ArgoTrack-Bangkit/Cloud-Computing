const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

router.post('/articles', articleController.addArticle);
router.get('/articles', articleController.getAllArticles);
router.get('/articles/:id', articleController.getArticleById);
router.put('/articles/:id', articleController.updateArticle);
router.delete('/articles/:id', articleController.deleteArticle);

module.exports = router;
