const logger = require('../utils/logger');

module.exports = function verifyUser(req, res, next) {
  if (!req.isAuthenticated()) {
    logger.warn('Unauthorized access attempt.');
    return res.status(401).json({ error: 'Login is required.' });
  }

  const requestedSteamId = req.params.steamid;
  const loggedSteamId = req.user.id; // Steam ID saved during login

  if (requestedSteamId !== loggedSteamId) {
    logger.warn(`Forbidden access attempt. Requested Steam ID: ${requestedSteamId}, Logged Steam ID: ${loggedSteamId}`);
    return res.status(403).json({ error: 'Access denied.' });
  }

  next();
};
