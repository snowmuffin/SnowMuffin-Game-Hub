const express = require('express');
const resourceController = require('../controllers/resourceController');
const verifyUser = require('../middleware/verifyUser');
const router = express.Router();

// /api/resources/:steamid route handler
router.get('/:steamid', verifyUser, resourceController.getResources);
router.post('/download',resourceController.download);
router.post('/upload',resourceController.upload);
module.exports = router;
