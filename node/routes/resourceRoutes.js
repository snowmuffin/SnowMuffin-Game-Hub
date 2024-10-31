const express = require('express');
const resourceController = require('../controllers/resourceController');
const verifyUser = require('../middleware/verifyUser');
const router = express.Router();

// /api/resources/:steamid route handler
router.get('/:steamid', verifyUser, resourceController.getResources);

module.exports = router;
