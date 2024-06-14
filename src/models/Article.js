class Article {
  constructor(title, content, author, publishDate, tags, imageUrl) {
    this.title = title;
    this.content = content;
    this.author = author;
    this.publishDate = publishDate;
    this.tags = tags;
    this.imageUrl = imageUrl;
  }
}

module.exports = Article;