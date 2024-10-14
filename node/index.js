const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const app = express();

// Steam API Key
const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

// Session 설정
app.use(session({
  secret: 'my_super_secret_key_12345',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport 세션 설정
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Steam 로그인 전략 설정
passport.use(new SteamStrategy({
  returnURL: 'http://localhost:3000/api/auth/steam/return',  // 올바른 경로로 수정
  realm: 'http://localhost:3000/',
  apiKey: STEAM_API_KEY
}, (identifier, profile, done) => {
  process.nextTick(() => {
    return done(null, profile);
  });
}));
// Steam 로그인 라우트
app.get('/api/auth/steam', passport.authenticate('steam'));

app.get('/api/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('http://localhost/');
  }
);
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user }); // 로그인된 사용자 정보 반환
  } else {
    res.json({ user: null }); // 로그인이 되어 있지 않으면 null 반환
  }
});

// 홈 라우트
app.get('/', (req, res) => {
  res.send(req.user ? `Logged in as ${req.user.displayName}` : 'Not logged in');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

const mysql = require('mysql2');

// MySQL 연결 설정
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// 연결 확인
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database!');
});