const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const db = require('../config/database');
const { generateToken, verifyToken } = require('../utils/jwt');
const secretKey = process.env.JWT_SECRET || 'defaultSecretKey';

const sendResponse = (res, status, statusText, data) => {
  res.status(status).json({ status, statusText, data });
};

// Function to handle Steam callback
exports.steamCallback = (req, res) => {
  if (req.user) {
    const userData = JSON.stringify({
      user: {
        steamId: req.user.id,
        displayName: req.user.displayName,
        profileUrl: req.user._json.profileurl,
        avatar: req.user._json.avatar
      }
    });

    logger.info(`Steam authentication successful for Steam ID: ${req.user.id}`);

    res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage(
            { status: 200, statusText: 'OK', data: ${userData} },
            '*'
          );
          window.close();
        } else {
          alert('Cannot close the window after authentication.');
        }
      </script>
    `);
  } else {
    logger.warn('Steam authentication failed.');

    res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage(
            { status: 401, statusText: 'Unauthorized', data: { error: 'Steam authentication failed' } },
            '*'
          );
          window.close();
        } else {
          alert('Cannot close the window after authentication.');
        }
      </script>
    `);
  }
};

// Function to get user data
exports.getUserData = async (req, res) => {
  try {
 

    const { steamId } = req.body;

    if (!steamId) {
      logger.warn('Steam ID was not provided.');
      return sendResponse(res, 400, 'Bad Request', { error: 'Steam ID is required.' });
    }

    logger.info(`Data request received. Steam ID: ${steamId}`);
    const query = 'SELECT * FROM user_data WHERE steam_id = ?';
    logger.debug(`Executing SQL query: ${query} with Steam ID: ${steamId}`);

    const [results] = await db.pool.promise().query(query, [steamId]);

    if (results.length > 0) {
      const userData = results[0];
      const token = jwt.sign(
        { steamId: steamId, data: results[0] },
        secretKey,
        { expiresIn: '2h' }
      );

      res.setHeader('Authorization', `Bearer ${token}`);

      sendResponse(res, 200, 'OK', userData );
    } else {
      logger.info(`No data found for Steam ID ${steamId}.`);
      sendResponse(res, 404, 'Not Found', { error: 'Data does not exist.' });
    }
  } catch (err) {
    logger.error(`Error fetching user data for Steam ID ${req.body.steamId}: ${err.message}`);
    sendResponse(res, 500, 'Internal Server Error', { error: 'Failed to fetch user data' });
  }
};

exports.validateToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Token not provided.');
      return sendResponse(res, 403, 'Forbidden', { error: 'Invalid Token' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Token format is invalid.');
      return sendResponse(res, 403, 'Forbidden', { error: 'Invalid Token' });
    }

    const token = parts[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn('Token has expired.');
        return sendResponse(res, 403, 'Forbidden', { error: 'Invalid Token' });
      }
      logger.warn('Invalid token.');
      return sendResponse(res, 403, 'Forbidden', { error: 'Invalid Token' });
    }

    const { steamId } = decoded;
    const query = 'SELECT * FROM user_data WHERE steam_id = ?';

    const [results] = await db.pool.promise().query(query, [steamId]);

    if (results.length === 0) {
      logger.warn(`No user data found for Steam ID ${steamId}`);
      return sendResponse(res, 404, 'Not Found', { error: 'User not found' });
    }

    const userData = results[0];
    logger.info(`User data retrieved for Steam ID ${steamId}`);

    sendResponse(res, 200, 'Token is valid', { userData });
  } catch (err) {
    logger.error(`Error validating token: ${err.message}`);
    sendResponse(res, 500, 'Internal Server Error', { error: 'An unexpected error occurred' });
  }
};