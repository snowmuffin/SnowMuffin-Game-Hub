require('dotenv').config(); // 환경 변수를 로드
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const mysql = require('mysql2');

// Express 앱 생성
const app = express();

// Steam API Key 설정
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'your_default_steam_api_key';
connection.connect((err) => {
  if (err) {
    console.error('MySQL 연결 오류:', err);
    return;
  }
  console.log('MySQL에 성공적으로 연결되었습니다.');

  // 테이블이 없으면 생성하는 쿼리
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS online_storage (
      steam_id BIGINT NOT NULL,
      stone INT DEFAULT 0,
      iron INT DEFAULT 0,
      nickel INT DEFAULT 0,
      cobalt INT DEFAULT 0,
      magnesium INT DEFAULT 0,
      silicon INT DEFAULT 0,
      silver INT DEFAULT 0,
      gold INT DEFAULT 0,
      platinum INT DEFAULT 0,
      uranium INT DEFAULT 0,
      ice INT DEFAULT 0,
      organic INT DEFAULT 0,
      scrap INT DEFAULT 0,
      lanthanum INT DEFAULT 0,
      cerium INT DEFAULT 0,
      PRIMARY KEY (steam_id)
    );
  `;

  connection.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('테이블 생성 오류:', err);
      return;
    }
    console.log('테이블이 확인되었거나 성공적으로 생성되었습니다.');
  });
});

// 특정 사용자(Steam ID)의 자원 데이터를 반환하는 API
app.get('/api/resources/steamid', (req, res) => {
  const steamId = req.params.steamid;

  const query = 'SELECT * FROM online_storage WHERE steam_id = ?';
  connection.query(query, [steamId], (err, results) => {
    if (err) {
      console.error('자원 데이터 조회 오류:', err);
      return res.status(500).json({ error: '데이터베이스 오류' });
    }

    if (results.length > 0) {
      res.json({ steamid: steamId, resources: results[0] });
    } else {
      res.json({ steamid: steamId, resources: '자원이 없습니다.' }); // 데이터가 없을 경우
    }
  });
});
// Session 설정
app.use(session({
  secret: process.env.SESSION_SECRET || 'my_super_secret_key_12345',  // 환경 변수로 비밀 키 설정
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
  returnURL: process.env.RETURN_URL || 'http://localhost:3000/api/auth/steam/return',  // 환경 변수 사용
  realm: process.env.REALM || 'http://localhost:3000/',  // 환경 변수 사용
  apiKey: STEAM_API_KEY
}, (identifier, profile, done) => {
  process.nextTick(() => {
    return done(null, profile);
  });
}));

// Steam 로그인 라우트
app.get('/api/auth/steam', passport.authenticate('steam'));

app.get('/api/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
  res.redirect(process.env.REDIRECT_URL || 'http://localhost/'); // 로그인 후 리디렉션할 페이지를 환경 변수로 설정
});

// 로그인한 사용자 정보 반환
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

// MySQL 연결 설정
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'my-secret-pw',
  database: process.env.DB_NAME || 'mydatabase'
});

// MySQL 연결 확인
connection.connect((err) => {
  if (err) {
    console.error('MySQL 연결 오류:', err);
    return;
  }
  console.log('MySQL에 성공적으로 연결되었습니다.');
});

// 특정 사용자(Steam ID)의 피해 데이터를 반환하는 API
app.get('/api/damage/:steamid', (req, res) => {
  // Steam ID를 문자열로 처리
  const steamId = req.params.steamid;

  // Steam ID를 숫자가 아닌 문자열로 MySQL에 전달
  const query = 'SELECT total_damage FROM damage_logs WHERE steam_id = ?';
  connection.query(query, [steamId], (err, results) => {
    if (err) {
      console.error('Error fetching damage data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      res.json({ steamid: steamId, totalDamage: results[0].total_damage });
    } else {
      res.json({ steamid: steamId, totalDamage: 0 }); // 데이터가 없을 경우 0 반환
    }
  });
});
// 홈 라우트
app.get('/', (req, res) => {
  res.send(req.user ? `Logged in as ${req.user.displayName}` : 'Not logged in');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

// 서버 종료 시 MySQL 연결 해제
process.on('SIGINT', () => {
  connection.end(err => {
    if (err) {
      console.error('MySQL 연결 종료 오류:', err);
    } else {
      console.log('MySQL 연결이 성공적으로 종료되었습니다.');
    }
    process.exit();
  });
});
