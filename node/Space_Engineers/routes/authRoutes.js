const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const router = express.Router();
const { verifyLocalRequest, validateTokenMiddleware, verifyUser,adminMiddleware } = require('../middleware/verifyUser');
// 개발 환경에서만 어드민 미들웨어 적용
if (process.env.NODE_ENV !== 'production') {
    router.use(adminMiddleware);
  }
  
// Steam authentication route
router.get('/steam', passport.authenticate('steam'));

// Steam authentication callback route
router.get('/steam/return', passport.authenticate('steam', { failureRedirect: '/login' }), authController.steamCallback);

// Route to get user data after authentication
router.post('/getUserData', authController.getUserData);

// Token validation route
router.post('/validation', authController.validateToken);

module.exports = router;
