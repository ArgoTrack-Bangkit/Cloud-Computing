const { db } = require('../../config/firebaseAdminConfig');
const Article = require('../models/Article');

// Menambahkan artikel baru
exports.addArticle = async (req, res) => {
  try {
    const { title, content, author, publishDate, tags, imageUrl } = req.body;
    const newArticle = new Article(title, content, author, publishDate, tags, imageUrl);
    await db.collection('articles').add(JSON.parse(JSON.stringify(newArticle)));
    res.status(201).send(`Article successfully added`);
  } catch (error) {
    res.status(400).send(`Error adding article: ${error.message}`);
  }
};

// Mendapatkan semua artikel
exports.getAllArticles = async (req, res) => {
  try {
    const articlesSnapshot = await db.collection('articles').get();
    const articles = articlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(articles);
  } catch (error) {
    res.status(400).send(`Error getting articles: ${error.message}`);
  }
};

// Mendapatkan artikel berdasarkan ID
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('articles').doc(id).get();
    if (!doc.exists) {
      res.status(404).send('Article not found');
    } else {
      res.status(200).json({ id: doc.id, ...doc.data() });
    }
  } catch (error) {
    res.status(400).send(`Error getting article: ${error.message}`);
  }
};

// Memperbarui artikel
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, author, publishDate, tags, imageUrl } = req.body;
    const updatedArticle = { title, content, author, publishDate, tags, imageUrl };
    await db.collection('articles').doc(id).update(updatedArticle);
    res.status(200).send('Article updated successfully');
  } catch (error) {
    res.status(400).send(`Error updating article: ${error.message}`);
  }
};

// Menghapus artikel
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('articles').doc(id).delete();
    res.status(200).send('Article deleted successfully');
  } catch (error) {
    res.status(400).send(`Error deleting article: ${error.message}`);
  }
};