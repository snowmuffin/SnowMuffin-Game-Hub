const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const { authenticateToken, verifyUser } = require('../middleware/verifyUser');


router.post('/getMarketplaceItems',authenticateToken, tradeController.getMarketplaceItems);
router.post('/purchaseItem',authenticateToken, tradeController.purchaseItem);
router.post('/registerItem',authenticateToken, tradeController.registerItem);
router.post('/cancelMarketplaceItem',authenticateToken, tradeController.cancelMarketplaceItem);

module.exports = router;