const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'defaultSecretKey';

function verifyLocalRequest(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  
  // 로컬 IP 주소 확인 (IPv4 및 IPv6)
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

  if (!isLocal) {
    logger.warn(`Unauthorized non-local request from IP: ${ip}`);
    return res.status(403).json({ error: 'Access denied. Local requests only.' });
  }

  next();
}

function validateTokenMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Token not provided or invalid format');
    return res.status(403).json({ error: 'Invalid or missing token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      const errorMsg = err.name === 'TokenExpiredError' ? 'Token has expired.' : 'Invalid token.';
      logger.warn(errorMsg);
      return res.status(403).json({ error: errorMsg });
    }
    req.user = decoded; // 사용자 정보를 요청에 추가
    next();
  });
}

function verifyUser(requiredRole = null) {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Unauthorized access attempt.');
      return res.status(401).json({ error: 'Login is required.' });
    }

    const requestedSteamId = req.params.steamid;
    const loggedSteamId = req.user.steamId;

    // Steam ID 일치 확인
    if (requestedSteamId && requestedSteamId !== loggedSteamId) {
      logger.warn(`Forbidden access attempt. Requested Steam ID: ${requestedSteamId}, Logged Steam ID: ${loggedSteamId}`);
      return res.status(403).json({ error: 'Access denied.' });
    }

    // 역할 기반 접근 제어 (RBAC)
    if (requiredRole && req.user.role !== requiredRole) {
      logger.warn(`Insufficient role. Required: ${requiredRole}, User role: ${req.user.role}`);
      return res.status(403).json({ error: 'Insufficient role privileges' });
    }

    next();
  };
}

function adminMiddleware(req, res, next) {
  const localIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

  // 클라이언트의 IP 주소를 가져옵니다.
  const requestIP = req.ip || req.connection.remoteAddress;

  if (localIPs.includes(requestIP)) {
    // 로컬 요청인 경우, req.user를 설정합니다.
    req.user = {
      steamId: '1234', // 테스트를 위한 사용자 ID
      nickname: 'LocalUser',
      role: 'user' // 필요한 경우 역할 설정
    };
    next();
  } else {
    // 로컬이 아닌 요청은 접근을 차단합니다.
    return res.status(403).json({ error: 'Access denied.' });
  }
}

module.exports = {
  verifyLocalRequest,
  validateTokenMiddleware,
  verifyUser,
  adminMiddleware
};
