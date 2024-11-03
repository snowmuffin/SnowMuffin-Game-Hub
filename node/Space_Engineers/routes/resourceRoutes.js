const express = require('express');
const resourceController = require('../controllers/resourceController');
const { verifyLocalRequest, validateTokenMiddleware, verifyUser,adminMiddleware } = require('../middleware/verifyUser');

const router = express.Router();
// 개발 환경에서만 어드민 미들웨어 적용
if (process.env.NODE_ENV !== 'production') {
    router.use(adminMiddleware);
  }
  
// /api/resources/:steamid route handler
router.get('/:steamid', verifyUser, resourceController.getResources);
router.post('/download',verifyLocalRequest,resourceController.download);
router.post('/upload',verifyLocalRequest,resourceController.upload);
module.exports = router;
