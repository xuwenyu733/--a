const express = require('express');
const upload = require('../middlewares/upload');
const resumeController = require('../controllers/resumeController');

const router = express.Router();

router.post('/export-xlsx-pdf', upload.single('file'), resumeController.exportXlsxAsPdf);

module.exports = router;
