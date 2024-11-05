const jwt = require('jsonwebtoken'); // jwt 불러오기 추가
const logger = require('../utils/logger');
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

function verifyUser(req, res, next) {
  if (!req.isAuthenticated()) {
    logger.warn('Unauthorized access attempt.');
    return res.status(401).json({ error: 'Login is required.' });
  }

  const requestedSteamId = req.params.steamid;
  const loggedSteamId = req.user.steamId; // authenticateToken에서 설정한 steamId를 사용

  if (requestedSteamId !== loggedSteamId) {
    logger.warn(`Forbidden access attempt. Requested Steam ID: ${requestedSteamId}, Logged Steam ID: ${loggedSteamId}`);
    return res.status(403).json({ error: 'Access denied.' });
  }

  next();
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    // 토큰에서 steamId와 data 정보를 추출하여 req.user에 저장
    req.user = {
      steamId: payload.steamId,
      data: payload.data
    };
    next();
  });
}

module.exports = {
  authenticateToken,
  verifyUser
};
