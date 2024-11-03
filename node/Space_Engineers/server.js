require('dotenv').config(); // Load environment variables
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const logger = require('./utils/logger');
const db = require('./config/database');
const passportConfig = require('./config/passport');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const damageRoutes = require('./routes/damageRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// CORS settings
const corsOptions = {
  origin: 'https://test.snowmuffingame.com', // Allowed domain
  credentials: true // Include credentials
};
app.use(cors(corsOptions));

// Session settings
app.use(session({
  secret: process.env.SESSION_SECRET || 'my_super_secret_key_12345',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Initialize Passport configuration
passportConfig(passport);

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/damage_logs', damageRoutes);
app.use('/api/trade',tradeRoutes)
// Home route
app.get('/', (req, res) => {
  const userStatus = req.user ? `Logged in as ${req.user.displayName}` : 'Not logged in';
  logger.info(`Home route accessed. User status: ${userStatus}`);
  res.send(userStatus);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, () => {
  logger.info(`Server is running at http://${HOST}:${PORT}`);
});

// Gracefully close MySQL connection pool on server shutdown
process.on('SIGINT', () => {
  pool.end((err) => {
    if (err) {
      logger.error('Error closing MySQL connection pool:', err);
    } else {
      logger.info('MySQL connection pool closed successfully.');
    }
    process.exit(err ? 1 : 0); // 종료 코드: 에러 시 1, 정상 종료 시 0
  });
});