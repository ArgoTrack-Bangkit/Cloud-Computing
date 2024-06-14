const express = require('express');
const { register, login, getProfile, editProfile, deleteAccount, changePassword } = require('../controllers/profileController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/user/:email', getProfile);
router.put('/user/:email', editProfile);
router.delete('/user/:email', deleteAccount);
router.post('/user/:email/change-password', changePassword);

module.exports = router;
