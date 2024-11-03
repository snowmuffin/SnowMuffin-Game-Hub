const express = require('express');
const damageController = require('../controllers/damageController');
const { verifyLocalRequest, validateTokenMiddleware, verifyUser,adminMiddleware } = require('../middleware/verifyUser');

const router = express.Router();
// 개발 환경에서만 어드민 미들웨어 적용
if (process.env.NODE_ENV !== 'production') {
    router.use(adminMiddleware);
  }
  
// /api/damage_logs route handler
router.post('/', verifyLocalRequest,damageController.postDamageLogs);

module.exports = router;
