const express = require('express');
const resourceController = require('../controllers/resourceController');
const { authenticateToken, verifyUser } = require('../middleware/verifyUser');
const router = express.Router();

// /api/resources/:steamid route handler
router.post('/', authenticateToken, resourceController.getResources);
router.post('/download',resourceController.download);
router.post('/upload',resourceController.upload);
router.post('/upgrade', authenticateToken, resourceController.upgrade);
router.post('/getBlueprints', authenticateToken, resourceController.getBlueprints);
router.post('/gacha/pull',authenticateToken, resourceController.pullGacha);
router.post('/gacha/pull/multiple',authenticateToken, resourceController.pullMultipleGacha);

module.exports = router;
