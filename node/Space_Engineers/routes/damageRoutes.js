const express = require('express');
const damageController = require('../controllers/damageController');
const verifyUser = require('../middleware/verifyUser');
const router = express.Router();

// /api/damage_logs route handler
router.post('/', damageController.postDamageLogs);

// /api/damage/:steamid route handler
router.get('/:steamid', verifyUser, damageController.getDamage);

module.exports = router;
