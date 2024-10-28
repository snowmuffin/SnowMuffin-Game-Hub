require('dotenv').config(); // 환경 변수를 로드
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
// Express 앱 생성
const app = express();
app.use(express.json());
// Steam API Key 설정
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'your_default_steam_api_key';

const dropTable = {
  prototech_frame: 11, prototech_panel: 4, prototech_capacitor: 4, prototech_propulsion_unit: 4,
  prototech_machinery: 4, prototech_circuitry: 4, prototech_cooling_unit: 8,
  DefenseUpgradeModule_Level1: 1, DefenseUpgradeModule_Level2: 2, DefenseUpgradeModule_Level3: 3,
  DefenseUpgradeModule_Level4: 4, DefenseUpgradeModule_Level5: 5, DefenseUpgradeModule_Level6: 6,
  DefenseUpgradeModule_Level7: 7, DefenseUpgradeModule_Level8: 8, DefenseUpgradeModule_Level9: 9,
  DefenseUpgradeModule_Level10: 10,
  AttackUpgradeModule_Level1: 1, AttackUpgradeModule_Level2: 2, AttackUpgradeModule_Level3: 3,
  AttackUpgradeModule_Level4: 4, AttackUpgradeModule_Level5: 5, AttackUpgradeModule_Level6: 6,
  AttackUpgradeModule_Level7: 7, AttackUpgradeModule_Level8: 8, AttackUpgradeModule_Level9: 9,
  AttackUpgradeModule_Level10: 10,
  PowerEfficiencyUpgradeModule_Level1: 1, PowerEfficiencyUpgradeModule_Level2: 2, PowerEfficiencyUpgradeModule_Level3: 3,
  PowerEfficiencyUpgradeModule_Level4: 4, PowerEfficiencyUpgradeModule_Level5: 5, PowerEfficiencyUpgradeModule_Level6: 6,
  PowerEfficiencyUpgradeModule_Level7: 7, PowerEfficiencyUpgradeModule_Level8: 8, PowerEfficiencyUpgradeModule_Level9: 9,
  PowerEfficiencyUpgradeModule_Level10: 10,
  BerserkerModule_Level1: 11, BerserkerModule_Level2: 12, BerserkerModule_Level3: 13,
  BerserkerModule_Level4: 14, BerserkerModule_Level5: 15, BerserkerModule_Level6: 16,
  BerserkerModule_Level7: 17, BerserkerModule_Level8: 18, BerserkerModule_Level9: 19,
  BerserkerModule_Level10: 20,
  SpeedModule_Level1: 11, SpeedModule_Level2: 12, SpeedModule_Level3: 13,
  SpeedModule_Level4: 14, SpeedModule_Level5: 15, SpeedModule_Level6: 16,
  SpeedModule_Level7: 17, SpeedModule_Level8: 18, SpeedModule_Level9: 19,
  SpeedModule_Level10: 20,
  FortressModule_Level1: 11, FortressModule_Level2: 12, FortressModule_Level3: 13,
  FortressModule_Level4: 14, FortressModule_Level5: 15, FortressModule_Level6: 16,
  FortressModule_Level7: 17, FortressModule_Level8: 18, FortressModule_Level9: 19,
  FortressModule_Level10: 20
};


// 특정 사용자(Steam ID)의 자원 데이터를 반환하는 API

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
// 사용자 인증 및 Steam ID 검증 미들웨어
function verifyUser(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const requestedSteamId = req.params.steamid;
  const loggedSteamId = req.user.id; // passport에서 로그인 처리 시 저장된 사용자의 Steam ID

  if (requestedSteamId !== loggedSteamId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  next();
}
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



app.get('/api/auth/steam', passport.authenticate('steam'));

app.get(
  '/api/auth/steam/return',
  passport.authenticate('steam', { failureMessage: true }),
  (req, res) => {
    if (req.user) {
      // 인증 성공 시 부모 창으로 메시지 전송 후 창 닫기
      const user = JSON.stringify(req.user); // JSON 직렬화 처리
      res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage(
              { status: 200, statusText: 'OK', data: { message: 'Steam 인증 성공', user: ${user} } },
              '*'
            );
            window.close();
          } else {
            alert('인증 후 창을 닫을 수 없습니다.');
          }
        </script>
      `);
    } else {
      // 인증 실패 시 부모 창으로 실패 메시지 전송 후 창 닫기
      res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage(
              { status: 401, statusText: 'Unauthorized', data: { error: 'Steam 인증 실패' } },
              '*'
            );
            window.close();
          } else {
            alert('인증 후 창을 닫을 수 없습니다.');
          }
        </script>
      `);
    }
  }
);

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
  host: process.env.DB_HOST,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  supportBigNumbers: true,   // 큰 숫자 지원
  bigNumberStrings: true     // BIGINT를 문자열로 처리
});


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
    stone FLOAT DEFAULT 0,
    iron FLOAT DEFAULT 0,
    nickel FLOAT DEFAULT 0,
    cobalt FLOAT DEFAULT 0,
    magnesium FLOAT DEFAULT 0,
    silicon FLOAT DEFAULT 0,
    silver FLOAT DEFAULT 0,
    gold FLOAT DEFAULT 0,
    platinum FLOAT DEFAULT 0,
    uranium FLOAT DEFAULT 0,
    ice FLOAT DEFAULT 0,
    scrap FLOAT DEFAULT 0,
    lanthanum FLOAT DEFAULT 0,
    cerium FLOAT DEFAULT 0,
    construction INT DEFAULT 0,
    metal_grid INT DEFAULT 0,
    interior_plate INT DEFAULT 0,
    steel_plate INT DEFAULT 0,
    girder INT DEFAULT 0,
    small_tube INT DEFAULT 0,
    large_tube INT DEFAULT 0,
    motor INT DEFAULT 0,
    display INT DEFAULT 0,
    bulletproof_glass INT DEFAULT 0,
    superconductor INT DEFAULT 0,
    computer INT DEFAULT 0,
    reactor INT DEFAULT 0,
    thrust INT DEFAULT 0,
    gravity_generator INT DEFAULT 0,
    medical INT DEFAULT 0,
    radio_communication INT DEFAULT 0,
    detector INT DEFAULT 0,
    explosives INT DEFAULT 0,
    solar_cell INT DEFAULT 0,
    power_cell INT DEFAULT 0,
    canvas INT DEFAULT 0,
    engineer_plushie INT DEFAULT 0,
    sabiroid_plushie INT DEFAULT 0,
    prototech_frame INT DEFAULT 0,
    prototech_panel INT DEFAULT 0,
    prototech_capacitor INT DEFAULT 0,
    prototech_propulsion_unit INT DEFAULT 0,
    prototech_machinery INT DEFAULT 0,
    prototech_circuitry INT DEFAULT 0,
    prototech_cooling_unit INT DEFAULT 0,
    DefenseUpgradeModule_Level1 INT DEFAULT 0,
    DefenseUpgradeModule_Level2 INT DEFAULT 0,
    DefenseUpgradeModule_Level3 INT DEFAULT 0,
    DefenseUpgradeModule_Level4 INT DEFAULT 0,
    DefenseUpgradeModule_Level5 INT DEFAULT 0,
    DefenseUpgradeModule_Level6 INT DEFAULT 0,
    DefenseUpgradeModule_Level7 INT DEFAULT 0,
    DefenseUpgradeModule_Level8 INT DEFAULT 0,
    DefenseUpgradeModule_Level9 INT DEFAULT 0,
    DefenseUpgradeModule_Level10 INT DEFAULT 0,
    AttackUpgradeModule_Level1 INT DEFAULT 0,
    AttackUpgradeModule_Level2 INT DEFAULT 0,
    AttackUpgradeModule_Level3 INT DEFAULT 0,
    AttackUpgradeModule_Level4 INT DEFAULT 0,
    AttackUpgradeModule_Level5 INT DEFAULT 0,
    AttackUpgradeModule_Level6 INT DEFAULT 0,
    AttackUpgradeModule_Level7 INT DEFAULT 0,
    AttackUpgradeModule_Level8 INT DEFAULT 0,
    AttackUpgradeModule_Level9 INT DEFAULT 0,
    AttackUpgradeModule_Level10 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level1 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level2 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level3 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level4 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level5 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level6 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level7 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level8 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level9 INT DEFAULT 0,
    PowerEfficiencyUpgradeModule_Level10 INT DEFAULT 0,
    BerserkerModule_Level1 INT DEFAULT 0,
    BerserkerModule_Level2 INT DEFAULT 0,
    BerserkerModule_Level3 INT DEFAULT 0,
    BerserkerModule_Level4 INT DEFAULT 0,
    BerserkerModule_Level5 INT DEFAULT 0,
    BerserkerModule_Level6 INT DEFAULT 0,
    BerserkerModule_Level7 INT DEFAULT 0,
    BerserkerModule_Level8 INT DEFAULT 0,
    BerserkerModule_Level9 INT DEFAULT 0,
    BerserkerModule_Level10 INT DEFAULT 0,
    SpeedModule_Level1 INT DEFAULT 0,
    SpeedModule_Level2 INT DEFAULT 0,
    SpeedModule_Level3 INT DEFAULT 0,
    SpeedModule_Level4 INT DEFAULT 0,
    SpeedModule_Level5 INT DEFAULT 0,
    SpeedModule_Level6 INT DEFAULT 0,
    SpeedModule_Level7 INT DEFAULT 0,
    SpeedModule_Level8 INT DEFAULT 0,
    SpeedModule_Level9 INT DEFAULT 0,
    SpeedModule_Level10 INT DEFAULT 0,
    FortressModule_Level1 INT DEFAULT 0,
    FortressModule_Level2 INT DEFAULT 0,
    FortressModule_Level3 INT DEFAULT 0,
    FortressModule_Level4 INT DEFAULT 0,
    FortressModule_Level5 INT DEFAULT 0,
    FortressModule_Level6 INT DEFAULT 0,
    FortressModule_Level7 INT DEFAULT 0,
    FortressModule_Level8 INT DEFAULT 0,
    FortressModule_Level9 INT DEFAULT 0,
    FortressModule_Level10 INT DEFAULT 0,
    prototech_scrap FLOAT DEFAULT 0,
    ingot_stone FLOAT DEFAULT 0,
    ingot_iron FLOAT DEFAULT 0,
    ingot_nickel FLOAT DEFAULT 0,
    ingot_cobalt FLOAT DEFAULT 0,
    ingot_magnesium FLOAT DEFAULT 0,
    ingot_silicon FLOAT DEFAULT 0,
    ingot_silver FLOAT DEFAULT 0,
    ingot_gold FLOAT DEFAULT 0,
    ingot_platinum FLOAT DEFAULT 0,
    ingot_uranium FLOAT DEFAULT 0,
    Prime_Matter INT DEFAULT 0,
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
app.get('/api/resources/:steamid',verifyUser, (req, res) => {
  const steamId = req.params.steamid;

  const query = 'SELECT * FROM online_storage WHERE steam_id = ?';
  connection.query(query, [steamId], (err, results) => {
    if (err) {
      console.error('자원 데이터 조회 오류:', err);
      return res.status(500).json({ error: '데이터베이스 오류' });
    }

    if (results.length > 0) {
      // 데이터가 있는 경우
      res.json({ steamid: steamId, resources: results[0] });
    } else {
      // 데이터가 없는 경우 새로운 행 삽입
      connection.query(insertQuery, [steamId], (insertErr, insertResult) => {
        if (insertErr) {
          console.error('새로운 행 삽입 오류:', insertErr);
          return res.status(500).json({ error: '새로운 행 삽입 중 오류 발생' });
        }

        // 새로운 행이 성공적으로 삽입된 후 응답 전송
        console.log(`새로운 행이 추가되었습니다. Steam ID: ${steamId}`);
        res.json({ steamid: steamId, resources: '' });
      });
    }
  });
});
// 특정 사용자(Steam ID)의 피해 데이터를 반환하는 API
app.get('/api/damage/:steamid', verifyUser,(req, res) => {
  // Steam ID를 문자열로 처리
  const steamId = req.params.steamid;

  // Steam ID를 숫자가 아닌 문자열로 MySQL에 전달
  const query = 'SELECT * FROM damage_logs WHERE steam_id = ?';
  
  connection.query(query, [steamId], (err, results) => {
    if (err) {
      console.error('Error fetching damage data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('Received data:', results);
    console.log('Received data:', steamId,results[0]);
    if (results.length > 0) {
      res.json({ steamid: steamId, totalDamage: results[0].total_damage });
    } else {
      res.json({ steamid: steamId, totalDamage: 0 }); // 데이터가 없을 경우 0 반환
    }
  });
});


app.get('/api/coin_balance/:steamid', verifyUser,(req, res) => {
  // Steam ID를 문자열로 처리
  const steamId = req.params.steamid;

  // Steam ID를 숫자가 아닌 문자열로 MySQL에 전달
  const query = 'SELECT * FROM coin_balance WHERE steam_id = ?';
  
  connection.query(query, [steamId], (err, results) => {
    if (err) {
      console.error('Error fetching coin_balance data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('Received data:', results);
    console.log('Received data:', steamId,results[0]);
    if (results.length > 0) {
      res.json({ steamid: steamId, coin_balance: results[0].sek_coin_balance });
    } else {
      res.json({ steamid: steamId, coin_balance: 0 }); // 데이터가 없을 경우 0 반환
    }
  });
});
// 홈 라우트
app.get('/', (req, res) => {
  res.send(req.user ? `Logged in as ${req.user.displayName}` : 'Not logged in');
});
function getDrop(damage) {
  const maxDropChance = 0.8; // 최대 드랍 확률 80%
  const dropChance = Math.min(damage / 62, maxDropChance); // 피해량 50일 때 dropChance는 약 0.8

  if (Math.random() > dropChance) {
    return null; // 드랍 없음
  }

  // 아이템 희귀도에 따라 가중치 설정 (지수 함수 적용)
  let adjustedWeights = {};
  let totalWeight = 0;

  for (const [item, rarity] of Object.entries(dropTable)) {
    const adjustedWeight = Math.pow(0.4, rarity); // 희귀도가 높을수록 가중치가 지수적으로 감소
    adjustedWeights[item] = adjustedWeight;
    totalWeight += adjustedWeight;
  }

  // 확률을 정규화하여 총합이 1이 되도록 설정
  for (const item in adjustedWeights) {
    adjustedWeights[item] /= totalWeight;
  }

  const randomValue = Math.random();
  let accumulatedProbability = 0;

  for (const [item, probability] of Object.entries(adjustedWeights)) {
    accumulatedProbability += probability;
    if (randomValue <= accumulatedProbability) {
      return item; // 아이템 드랍
    }
  }

  return null; // 이론적으로는 여기까지 오지 않음
}



app.post('/api/damage_logs', async (req, res) => {
  const damageLogs = req.body;
  console.log('Received damage logs:', req.body);

  if (!Array.isArray(damageLogs) || damageLogs.length === 0) {
    console.log('Invalid damage log data');
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    // 모든 로그를 비동기적으로 처리
    await Promise.all(damageLogs.map(log => {
      let { steam_id, total_damage } = log;

      if (!steam_id || total_damage === undefined) {
        console.log('Invalid log data:', log);
        return Promise.resolve();  // 잘못된 데이터는 무시
      }

      steam_id = BigInt(steam_id); // Steam ID를 문자열로 처리

      // 손상 로그 저장과 계좌 업데이트를 동시에 처리
      const insertDamageLogQuery = `
        INSERT INTO damage_logs (steam_id, total_damage)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE total_damage = total_damage + VALUES(total_damage);
      `;

      const updateCoinBalanceQuery = `
        INSERT INTO coin_balance (steam_id, sek_coin_balance)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE sek_coin_balance = sek_coin_balance + ?;
      `;

      return new Promise((resolve, reject) => {
        // 피해 로그 저장
        connection.query(insertDamageLogQuery, [steam_id.toString(), total_damage], (err, result) => {
          if (err) {
            console.log('Error saving damage log:', err);
            return reject(err);
          }
          console.log(`Damage log for Steam ID ${steam_id} successfully saved with damage ${total_damage}.`);

          // 계좌에 코인 추가
          connection.query(updateCoinBalanceQuery, [steam_id.toString(), total_damage, total_damage], (coinErr, coinResult) => {
            if (coinErr) {
              console.log('Error updating coin balance:', coinErr);
              return reject(coinErr);
            }
            console.log(`Coin balance updated for Steam ID ${steam_id} by adding ${total_damage/10} coins.`);
            resolve();
          });
        });
      });
    }));

    res.send('Damage logs and coin balances updated successfully');
  } catch (err) {
    console.log('Error processing damage logs and updating coin balances:', err);
    res.status(500).json({ error: 'Failed to process damage logs and update coin balances' });
  }
});
// 서버 시작
const PORT = process.env.PORT;
const HOST = process.env.HOST;

app.listen(PORT, () => {
  console.log(`서버가 http://${HOST}:${PORT} 에서 실행 중입니다.`);
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
