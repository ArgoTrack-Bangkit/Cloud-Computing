const express = require('express');
const multer = require('multer');
const { scanTomato, getAllUsers, getScanById, deleteScanById, deleteAllScansByUser } = require('../controllers/scanController');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }
}).single('image');

router.post('/scan', (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).send({ error: 'Max Image 2 MB' });
            }
            return res.status(400).send({ error: err.message });
        }
        next();
    });
}, scanTomato);

router.get('/scan/:userId', getAllUsers);

router.get('/scan/:userId/:scanId', getScanById);

router.delete('/scan/:userId/:scanId', deleteScanById);

router.delete('/scans/:userId', deleteAllScansByUser);

module.exports = router;
