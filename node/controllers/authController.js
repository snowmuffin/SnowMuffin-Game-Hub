const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const db = require('../config/database');

const secretKey = process.env.JWT_SECRET || 'defaultSecretKey';

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
exports.getUserData = (req, res) => {
  if (!req.isAuthenticated()) {
    logger.info('An unauthenticated user attempted to request data.');
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  const steamId = req.body.steamId;

  if (!steamId) {
    logger.warn('Steam ID was not provided.');
    return res.status(400).json({ error: 'Steam ID is required.' });
  }

  logger.info(`Data request received. Steam ID: ${steamId}`);
  const query = 'SELECT * FROM user_data WHERE steam_id = ?';
  logger.debug(`Executing SQL query: ${query} with Steam ID: ${steamId}`);

  db.connection.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`Error fetching user data for Steam ID ${steamId}: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      const token = jwt.sign(
        { steamId: steamId, data: results[0] },
        secretKey,
        { expiresIn: '2h' }
      );

      res.setHeader('Authorization', `Bearer ${token}`);
      res.status(200).json({
        status: 200,
        statusText: 'ok',
        userData: results[0]
      });
    } else {
      logger.info(`No data found for Steam ID ${steamId}.`);
      res.status(404).json({ status: 404, statusText: 'Data does not exist.'});
    }
  });
};

exports.validateToken = (req, res) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader) {
      logger.warn('Token not provided.');
      return res.status(403).json({ status: 403, statusText: 'Invalid Token' });
    }
  
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Token format is invalid.');
      return res.status(403).json({ status: 403, statusText: 'Invalid Token' });
    }
  
    const token = parts[1];
  
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          logger.warn('Token has expired.');
          return res.status(403).json({ status: 403, statusText: 'Invalid Token' });
        }
        logger.warn('Invalid token.');
        return res.status(403).json({ status: 403, statusText: 'Invalid Token' });
      }
  
      // 토큰이 유효한 경우 요청에 사용자 정보 추가
      req.user = decoded;
      logger.info(`Valid token. Steam ID: ${decoded.steamId}`);
      res.status(200).json({
        status: 200,
        statusText: 'Token is valid'
      });
    });
  };
  