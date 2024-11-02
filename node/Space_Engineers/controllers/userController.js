const db = require('../config/database');
const logger = require('../utils/logger');

const sendResponse = (res, status, statustext, data) => {
  res.status(status).json({ status, statustext, data });
};

/**
 * Get User Profile
 * GET /api/user/:steamid/profile
 */
exports.getUserProfile = (req, res) => {
  const steamId = req.params.steamid;
  logger.info(`Fetching profile for Steam ID: ${steamId}`);

  const query = 'SELECT * FROM user_data WHERE steam_id = ?';
  db.pool.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`Error fetching user profile: ${err.message}`);
      return sendResponse(res, 500, 'Database Error', { error: err.message });
    }

    if (results.length > 0) {
      sendResponse(res, 200, 'Success', { steamid: steamId, profile: results[0] });
    } else {
      sendResponse(res, 404, 'User Not Found', { error: 'User not found' });
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
    return sendResponse(res, 400, 'Invalid Request', { error: 'Nickname is required' });
  }

  const query = 'UPDATE user_data SET nickname = ? WHERE steam_id = ?';
  db.pool.query(query, [nickname, steamId], (err, results) => {
    if (err) {
      logger.error(`Error updating user profile: ${err.message}`);
      return sendResponse(res, 500, 'Database Error', { error: err.message });
    }

    if (results.affectedRows > 0) {
      sendResponse(res, 200, 'Success', { message: 'Profile updated successfully' });
    } else {
      sendResponse(res, 404, 'User Not Found', { error: 'User not found' });
    }
  });
};

/**
 * Update User Data and Check Storage
 * POST /api/user/updateuserdb
 */
exports.updateuserdb = (req, res) => {
  const { steamid, nickname } = req.body;

  if (!nickname) {
    return sendResponse(res, 400, 'Invalid Request', { error: 'Nickname is required' });
  }

  const updateUserQuery = 'UPDATE user_data SET nickname = ? WHERE steam_id = ?';
  const insertUserQuery = 'INSERT INTO user_data (steam_id, nickname) VALUES (?, ?)';
  const checkStorageQuery = 'SELECT 1 FROM online_storage WHERE steam_id = ?';
  const insertStorageQuery = 'INSERT INTO online_storage (steam_id) VALUES (?)';

  db.pool.query(updateUserQuery, [nickname, steamid], (err, results) => {
    if (err) {
      logger.error(`Error updating user profile: ${err.message}`);
      return sendResponse(res, 500, 'Database Error', { error: err.message });
    }

    if (results.affectedRows > 0) {
      return checkAndInsertStorage(steamid, res, 'Profile updated successfully');
    } else {
      db.pool.query(insertUserQuery, [steamid, nickname], (err, results) => {
        if (err) {
          logger.error(`Error inserting into user_data: ${err.message}`);
          return sendResponse(res, 500, 'Database Error', { error: err.message });
        }
        checkAndInsertStorage(steamid, res, 'Profile created and storage checked');
      });
    }
  });

  function checkAndInsertStorage(steamid, res, successMessage) {
    db.pool.query(checkStorageQuery, [steamid], (err, results) => {
      if (err) {
        logger.error(`Error checking online_storage: ${err.message}`);
        return sendResponse(res, 500, 'Database Error', { error: err.message });
      }

      if (results.length > 0) {
        sendResponse(res, 200, 'Success', { message: successMessage });
      } else {
        db.pool.query(insertStorageQuery, [steamid], (err, results) => {
          if (err) {
            logger.error(`Error inserting into online_storage: ${err.message}`);
            return sendResponse(res, 500, 'Database Error', { error: err.message });
          }
          sendResponse(res, 200, 'Success', { message: `${successMessage} and storage record created` });
        });
      }
    });
  }
};
