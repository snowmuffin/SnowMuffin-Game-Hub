// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, verifyUser } = require('../middleware/verifyUser');

// Example route to get user profile
router.get('/:steamid/profile', verifyUser, userController.getUserProfile);

// Example route to update user profile
router.put('/:steamid/profile', verifyUser, userController.updateUserProfile);
router.post('/updateuserdb', userController.updateuserdb);
router.post('/getranking', userController.getranking);

module.exports = router;
