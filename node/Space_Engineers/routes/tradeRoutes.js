const express = require('express');
const tradeController = require('../controllers/tradeController');
const { validateTokenMiddleware, adminMiddleware } = require('../middleware/verifyUser');

const rateLimit = require('express-rate-limit');
const router = express.Router();

// 개발 환경에서만 어드민 미들웨어 적용
if (process.env.NODE_ENV !== 'production') {
  router.use(adminMiddleware);
}

// 아이템 등록에 대한 요청 수 제한 (예: 15분 동안 최대 10번)
const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 15분 동안 최대 10번 아이템 등록 가능
  message: { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' }
});

// 아이템 등록 엔드포인트
if (process.env.NODE_ENV !== 'production') {
  router.post('/registerItem', registerRateLimiter, tradeController.registerItem);
} else {
  router.post('/registerItem', validateTokenMiddleware, registerRateLimiter, tradeController.registerItem);
}

// 거래소 아이템 조회 엔드포인트
router.get('/getMarketplaceItems', tradeController.getMarketplaceItems);

// 아이템 구매 엔드포인트
if (process.env.NODE_ENV !== 'production') {
  router.post('/purchaseItem', tradeController.purchaseItem);
} else {
  router.post('/purchaseItem', validateTokenMiddleware, tradeController.purchaseItem);
}

module.exports = router;
