// controllers/userController.js

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get User Profile
 * GET /api/user/:steamid/profile
 */
exports.getUserProfile = (req, res) => {
  const steamId = req.params.steamid;
  logger.info(`Fetching profile for Steam ID: ${steamId}`);

  const query = 'SELECT * FROM user_data WHERE steam_id = ?';
  db.connection.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`Error fetching user profile: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      res.json({ steamid: steamId, profile: results[0] });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
};

/**
 * Update User Profile
 * PUT /api/user/:steamid/profile
 */
exports.updateUserProfile = (req, res) => {
  const steamId = req.params.steamid;
  const { nickname } = req.body;

  if (!nickname) {
    return res.status(400).json({ error: 'Nickname is required' });
  }

  const query = 'UPDATE user_data SET nickname = ? WHERE steam_id = ?';
  db.connection.query(query, [nickname, steamId], (err, results) => {
    if (err) {
      logger.error(`Error updating user profile: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows > 0) {
      res.json({ message: 'Profile updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
};
