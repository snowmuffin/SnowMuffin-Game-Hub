// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyLocalRequest, validateTokenMiddleware, verifyUser,adminMiddleware } = require('../middleware/verifyUser');


// 개발 환경에서만 어드민 미들웨어 적용
if (process.env.NODE_ENV !== 'production') {
  router.use(adminMiddleware);
}

// Example route to get user profile
router.get('/:steamid/profile', verifyUser, userController.getUserProfile);

// Example route to update user profile
router.put('/:steamid/profile', verifyUser, userController.updateUserProfile);
router.post('/updateuserdb', userController.updateuserdb);

module.exports = router;
