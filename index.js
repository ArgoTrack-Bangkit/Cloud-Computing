const express = require('express');
const bodyParser = require('body-parser');
const profileRoutes = require('./src/routes/profile');
const articlesRoutes = require('./src/routes/articles');
const scanRoutes = require('./src/routes/scanRoutes');
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 8000;

app.use(bodyParser.json());

app.use('/api', scanRoutes);
app.use('/api', profileRoutes);
app.use('/api', articlesRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
