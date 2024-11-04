const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const router = express.Router();

// Steam authentication route
router.get('/steam', passport.authenticate('steam'));

// Steam authentication callback route
router.get('/steam/return', passport.authenticate('steam', { failureRedirect: '/login' }), authController.steamCallback);

// Route to get user data after authentication
router.post('/getUserData', authController.getUserData);

// Token validation route
router.post('/validation', authController.validateToken);

module.exports = router;
