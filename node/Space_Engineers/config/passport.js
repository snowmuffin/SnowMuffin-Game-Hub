const SteamStrategy = require('passport-steam').Strategy;
const logger = require('../utils/logger');

module.exports = function(passport) {
  const STEAM_API_KEY = process.env.STEAM_API_KEY || 'your_default_steam_api_key';

  passport.use(new SteamStrategy({
    returnURL: process.env.RETURN_URL || 'http://localhost:3000/api/auth/steam/return',
    realm: process.env.REALM || 'http://localhost:3000/',
    apiKey: STEAM_API_KEY
  }, (identifier, profile, done) => {
    process.nextTick(() => {
      logger.info(`User authenticated via Steam. Steam ID: ${profile.id}`);
      return done(null, profile);
    });
  }));

  // Passport session settings
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
};
