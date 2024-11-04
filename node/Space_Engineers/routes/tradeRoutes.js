const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const verifyUser = require('../middleware/verifyUser');


router.get('/getMarketplaceItems', tradeController.getMarketplaceItems);
router.post('/purchaseItem', tradeController.purchaseItem);
router.post('/registerItem', tradeController.registerItem);
module.exports = router;