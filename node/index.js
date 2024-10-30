require('dotenv').config(); // Load environment variables
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const logger = require('./logger'); // Load logger
const cors = require('cors');

const secretKey = process.env.JWT_SECRET || 'defaultSecretKey';
const app = express(); // Create Express app

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
  secret: process.env.SESSION_SECRET || 'my_super_secret_key_12345', // Secret key from environment variables
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport session settings
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Middleware to verify user authentication and Steam ID
function verifyUser(req, res, next) {
  if (!req.isAuthenticated()) {
    logger.warn('Unauthorized access attempt.');
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const requestedSteamId = req.params.steamid;
  const loggedSteamId = req.user.id; // Steam ID saved during login

  if (requestedSteamId !== loggedSteamId) {
    logger.warn(`Forbidden access attempt. Requested Steam ID: ${requestedSteamId}, Logged Steam ID: ${loggedSteamId}`);
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  next();
}

// Drop table configuration
const dropTable = {
  PrototechFrame: 11,
  PrototechPanel: 4,
  PrototechCapacitor: 4,
  PrototechPropulsionUnit: 4,
  PrototechMachinery: 4,
  PrototechCircuitry: 4,
  PrototechCoolingUnit: 8,
  DefenseUpgradeModule_Level1: 1,
  DefenseUpgradeModule_Level2: 2,
  DefenseUpgradeModule_Level3: 3,
  DefenseUpgradeModule_Level4: 4,
  DefenseUpgradeModule_Level5: 5,
  DefenseUpgradeModule_Level6: 6,
  DefenseUpgradeModule_Level7: 7,
  DefenseUpgradeModule_Level8: 8,
  DefenseUpgradeModule_Level9: 9,
  DefenseUpgradeModule_Level10: 10,
  AttackUpgradeModule_Level1: 1,
  AttackUpgradeModule_Level2: 2,
  AttackUpgradeModule_Level3: 3,
  AttackUpgradeModule_Level4: 4,
  AttackUpgradeModule_Level5: 5,
  AttackUpgradeModule_Level6: 6,
  AttackUpgradeModule_Level7: 7,
  AttackUpgradeModule_Level8: 8,
  AttackUpgradeModule_Level9: 9,
  AttackUpgradeModule_Level10: 10,
  PowerEfficiencyUpgradeModule_Level1: 1,
  PowerEfficiencyUpgradeModule_Level2: 2,
  PowerEfficiencyUpgradeModule_Level3: 3,
  PowerEfficiencyUpgradeModule_Level4: 4,
  PowerEfficiencyUpgradeModule_Level5: 5,
  PowerEfficiencyUpgradeModule_Level6: 6,
  PowerEfficiencyUpgradeModule_Level7: 7,
  PowerEfficiencyUpgradeModule_Level8: 8,
  PowerEfficiencyUpgradeModule_Level9: 9,
  PowerEfficiencyUpgradeModule_Level10: 10,
  BerserkerModule_Level1: 11,
  BerserkerModule_Level2: 12,
  BerserkerModule_Level3: 13,
  BerserkerModule_Level4: 14,
  BerserkerModule_Level5: 15,
  BerserkerModule_Level6: 16,
  BerserkerModule_Level7: 17,
  BerserkerModule_Level8: 18,
  BerserkerModule_Level9: 19,
  BerserkerModule_Level10: 20,
  SpeedModule_Level1: 11,
  SpeedModule_Level2: 12,
  SpeedModule_Level3: 13,
  SpeedModule_Level4: 14,
  SpeedModule_Level5: 15,
  SpeedModule_Level6: 16,
  SpeedModule_Level7: 17,
  SpeedModule_Level8: 18,
  SpeedModule_Level9: 19,
  SpeedModule_Level10: 20,
  FortressModule_Level1: 11,
  FortressModule_Level2: 12,
  FortressModule_Level3: 13,
  FortressModule_Level4: 14,
  FortressModule_Level5: 15,
  FortressModule_Level6: 16,
  FortressModule_Level7: 17,
  FortressModule_Level8: 18,
  FortressModule_Level9: 19,
  FortressModule_Level10: 20,
  Prime_Matter: 3,
  SpaceCredit: 1 // Removed duplicate entries
};

// Steam API Key configuration
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'your_default_steam_api_key';

// Configure Steam login strategy
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

// Steam authentication route
app.get('/api/auth/steam', passport.authenticate('steam'));

// Steam authentication callback route
app.get(
  '/api/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/login' }),
  (req, res) => {
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
            alert('인증 후 창을 닫을 수 없습니다.');
          }
        </script>
      `);
    } else {
      logger.warn('Steam authentication failed.');

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

// Route to get user data after authentication
app.post('/api/auth/getUserData', (req, res) => {
  if (!req.isAuthenticated()) {
    logger.info('인증되지 않은 사용자가 데이터 요청을 시도했습니다.');
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const steamId = req.body.steamId;

  if (!steamId) {
    logger.warn('Steam ID가 제공되지 않았습니다.');
    return res.status(400).json({ error: 'Steam ID가 필요합니다.' });
  }

  logger.info(`데이터 요청 수신. Steam ID: ${steamId}`);
  const query = 'SELECT * FROM user_data WHERE steam_id = ?';
  logger.debug(`실행 중인 SQL 쿼리: ${query} with Steam ID: ${steamId}`);

  connection.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`유저 데이터 조회 오류 for Steam ID ${steamId}: ${err.message}`);
      return res.status(500).json({ error: '데이터베이스 오류' });
    }

    if (results.length > 0) {
      const token = jwt.sign(
        { steamId: steamId, data: results[0] },
        secretKey,
        { expiresIn: '1s' }
      );

      res.setHeader('Authorization', `Bearer ${token}`);
      res.status(200).json({
        status: 200,
        statusText: 'ok',
        userData: results[0]
      });
    } else {
      logger.info(`Steam ID ${steamId}에 대한 데이터가 존재하지 않습니다.`);
      res.status(404).json({ status: 404, statusText: '데이터가 존재하지 않습니다.', data: null });
    }
  });
});

// MySQL connection setup
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  supportBigNumbers: true,
  bigNumberStrings: true
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    logger.error(`MySQL 연결 오류: ${err.message}`);
    return;
  }
  logger.info('MySQL에 성공적으로 연결되었습니다.');

  const createUserTable = `
    CREATE TABLE IF NOT EXISTS user_data (
      steam_id BIGINT NOT NULL,
      nickname VARCHAR(256) DEFAULT NULL,
      sek_coin FLOAT DEFAULT 0,
      total_damage FLOAT DEFAULT 0,
      PRIMARY KEY (steam_id)
    );
  `;

  const createOnlineStorageTable = `
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
      Construction INT DEFAULT 0,
      MetalGrid INT DEFAULT 0,
      InteriorPlate INT DEFAULT 0,
      SteelPlate INT DEFAULT 0,
      Girder INT DEFAULT 0,
      SmallTube INT DEFAULT 0,
      LargeTube INT DEFAULT 0,
      Motor INT DEFAULT 0,
      Display INT DEFAULT 0,
      BulletproofGlass INT DEFAULT 0,
      Superconductor INT DEFAULT 0,
      Computer INT DEFAULT 0,
      Reactor INT DEFAULT 0,
      Thrust INT DEFAULT 0,
      GravityGenerator INT DEFAULT 0,
      Medical INT DEFAULT 0,
      RadioCommunication INT DEFAULT 0,
      Detector INT DEFAULT 0,
      Explosives INT DEFAULT 0,
      SolarCell INT DEFAULT 0,
      PowerCell INT DEFAULT 0,
      Canvas INT DEFAULT 0,
      EngineerPlushie INT DEFAULT 0,
      SabiroidPlushie INT DEFAULT 0,
      PrototechFrame INT DEFAULT 0,
      PrototechPanel INT DEFAULT 0,
      PrototechCapacitor INT DEFAULT 0,
      PrototechPropulsionUnit INT DEFAULT 0,
      PrototechMachinery INT DEFAULT 0,
      PrototechCircuitry INT DEFAULT 0,
      PrototechCoolingUnit INT DEFAULT 0,
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

  connection.query(createUserTable, (err) => {
    if (err) {
      logger.error(`user_data 테이블 생성 오류: ${err.message}`);
      return;
    }
    logger.info('user_data 테이블이 확인되었거나 성공적으로 생성되었습니다.');
  });

  connection.query(createOnlineStorageTable, (err) => {
    if (err) {
      logger.error(`online_storage 테이블 생성 오류: ${err.message}`);
      return;
    }
    logger.info('online_storage 테이블이 확인되었거나 성공적으로 생성되었습니다.');
  });
});
app.post('/api/auth/validation', (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    logger.warn('Token not provided.');
    return res.status(403).json({ status: 403, message: 'Invalid Token' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn('Token has expired.');
        return res.status(403).json({ status: 403, message: 'Invalid Token' });
      }
      logger.warn('Invalid token.');
      return res.status(403).json({ status: 403, message: 'Invalid Token' });
    }

    // If the token is valid, return user information with token in header
    logger.info(`Valid token. Steam ID: ${decoded.steamId}`);
    res.setHeader('Authorization', `Bearer ${token}`);
    res.status(200).json({
      status: 200,
      message: 'Token is valid'
    });
  });
});


// /api/resources/:steamid route handler
app.get('/api/resources/:steamid', verifyUser, (req, res) => {
  const steamId = req.params.steamid;
  logger.info(`Received request for resources. Steam ID: ${steamId}`);

  const query = 'SELECT * FROM online_storage WHERE steam_id = ?';
  logger.debug(`Executing SQL Query: ${query} with Steam ID: ${steamId}`);

  connection.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`자원 데이터 조회 오류 for Steam ID ${steamId}: ${err.message}`);
      return res.status(500).json({ error: '데이터베이스 오류' });
    }

    if (results.length > 0) {
      logger.info(`Resources retrieved for Steam ID ${steamId}: ${JSON.stringify(results[0])}`);
      res.json({ steamid: steamId, resources: results[0] });
    } else {
      const insertQuery = 'INSERT INTO online_storage (steam_id) VALUES (?)';
      logger.info(`No resources found for Steam ID ${steamId}. Inserting new row.`);

      connection.query(insertQuery, [steamId], (insertErr) => {
        if (insertErr) {
          logger.error(`새로운 행 삽입 오류 for Steam ID ${steamId}: ${insertErr.message}`);
          return res.status(500).json({ error: '새로운 행 삽입 중 오류 발생' });
        }

        logger.info(`새로운 행이 추가되었습니다. Steam ID: ${steamId}`);
        res.json({ steamid: steamId, resources: {} });
      });
    }
  });
});

// /api/damage/:steamid route handler
app.get('/api/damage/:steamid', verifyUser, (req, res) => {
  const steamId = req.params.steamid;
  logger.info(`Received request for damage data. Steam ID: ${steamId}`);

  const query = 'SELECT * FROM damage_logs WHERE steam_id = ?';
  logger.debug(`Executing SQL Query: ${query} with Steam ID: ${steamId}`);

  connection.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`Damage 데이터 조회 오류 for Steam ID ${steamId}: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    logger.debug(`Query Results for Steam ID ${steamId}: ${JSON.stringify(results)}`);

    if (results.length > 0) {
      const totalDamage = results[0].total_damage;
      logger.info(`Total damage for Steam ID ${steamId}: ${totalDamage}`);
      res.json({ steamid: steamId, totalDamage });
    } else {
      logger.info(`No damage data found for Steam ID ${steamId}. Returning totalDamage: 0`);
      res.json({ steamid: steamId, totalDamage: 0 });
    }
  });
});

// /api/coin_balance/:steamid route handler
app.get('/api/coin_balance/:steamid', verifyUser, (req, res) => {
  const steamId = req.params.steamid;
  logger.info(`Received request for coin balance. Steam ID: ${steamId}`);

  const query = 'SELECT * FROM coin_balance WHERE steam_id = ?';
  logger.debug(`Executing SQL Query: ${query} with Steam ID: ${steamId}`);

  connection.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`coin_balance 데이터 조회 오류 for Steam ID ${steamId}: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    logger.debug(`Query Results for Steam ID ${steamId}: ${JSON.stringify(results)}`);

    if (results.length > 0) {
      const coinBalance = results[0].sek_coin_balance;
      logger.info(`Coin balance for Steam ID ${steamId}: ${coinBalance}`);
      res.json({ steamid: steamId, coin_balance: coinBalance });
    } else {
      logger.info(`No coin_balance found for Steam ID ${steamId}. Returning coin_balance: 0`);
      res.json({ steamid: steamId, coin_balance: 0 });
    }
  });
});

// Home route
app.get('/', (req, res) => {
  const userStatus = req.user ? `Logged in as ${req.user.displayName}` : 'Not logged in';
  logger.info(`Home route accessed. User status: ${userStatus}`);
  res.send(userStatus);
});

// Function to determine item drop based on damage
function getDrop(damage) {
  logger.info(`getDrop called with damage: ${damage}`);

  const maxDropChance = 0.8; // Max drop chance 80%
  const dropChance = Math.min(damage / 62, maxDropChance);
  logger.debug(`Calculated dropChance: ${dropChance} (maxDropChance: ${maxDropChance})`);

  const randomChance = Math.random();
  logger.debug(`Generated random value: ${randomChance}`);

  if (randomChance > dropChance) {
    logger.info('No item dropped based on dropChance.');
    return null;
  }

  logger.info('Item will be dropped based on dropChance.');

  let adjustedWeights = {};
  let totalWeight = 0;

  for (const [item, rarity] of Object.entries(dropTable)) {
    const adjustedWeight = Math.pow(0.4, rarity);
    adjustedWeights[item] = adjustedWeight;
    totalWeight += adjustedWeight;
    logger.debug(`Item: ${item}, Rarity: ${rarity}, Adjusted Weight: ${adjustedWeight}`);
  }

  for (const item in adjustedWeights) {
    adjustedWeights[item] /= totalWeight;
    logger.debug(`Normalized Weight for ${item}: ${adjustedWeights[item]}`);
  }

  const randomValue = Math.random();
  logger.debug(`Second generated random value for item selection: ${randomValue}`);
  let accumulatedProbability = 0;

  for (const [item, probability] of Object.entries(adjustedWeights)) {
    accumulatedProbability += probability;
    logger.debug(`Accumulated Probability after ${item}: ${accumulatedProbability}`);

    if (randomValue <= accumulatedProbability) {
      logger.info(`Item dropped: ${item}`);
      return item;
    }
  }

  logger.warn('No item dropped after weight calculation. This should not happen.');
  return null;
}

// /api/damage_logs route handler
app.post('/api/damage_logs', async (req, res) => {
  const damageLogs = req.body;
  logger.info(`Received damage logs: ${JSON.stringify(damageLogs)}`);

  if (!Array.isArray(damageLogs) || damageLogs.length === 0) {
    logger.warn('Invalid damage log data received.');
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    await Promise.all(damageLogs.map(log => {
      let { steam_id, damage } = log;

      if (!steam_id || damage === undefined) {
        logger.warn(`Invalid log data: ${JSON.stringify(log)}`);
        return Promise.resolve();
      }

      if (typeof steam_id !== 'string' || !/^\d+$/.test(steam_id)) {
        logger.warn(`Invalid steam_id format: ${steam_id}`);
        return Promise.resolve();
      }

      if (typeof damage !== 'number' || damage < 0) {
        logger.warn(`Invalid damage value: ${damage}`);
        return Promise.resolve();
      }

      steam_id = steam_id.toString();
      const droppedItem = getDrop(damage);
      logger.info(`Dropped item for Steam ID ${steam_id}: ${droppedItem}`);

      const damage_event = `
        INSERT INTO user_data (steam_id, total_damage, sek_coin)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          total_damage = total_damage + VALUES(total_damage),
          sek_coin = sek_coin + VALUES(sek_coin);
      `;

      let updateOnlineStorageQuery = null;
      if (droppedItem) {
        updateOnlineStorageQuery = `
          INSERT INTO online_storage (steam_id, \`${droppedItem}\`)
          VALUES (?, 1)
          ON DUPLICATE KEY UPDATE \`${droppedItem}\` = \`${droppedItem}\` + 1;
        `;
      }

      const sekCoinToAdd = damage / 10;

      return new Promise((resolve, reject) => {
        connection.query(damage_event, [steam_id, damage, sekCoinToAdd], (err) => {
          if (err) {
            logger.error(`데미지 로그 저장 오류 for Steam ID ${steam_id}: ${err.message}`);
            return reject(err);
          }
          logger.info(`Steam ID ${steam_id}에 대한 데미지 ${damage}과 sek_coin ${sekCoinToAdd}이 성공적으로 저장되었습니다.`);

          if (droppedItem) {
            connection.query(updateOnlineStorageQuery, [steam_id], (storageErr) => {
              if (storageErr) {
                logger.error(`온라인 스토리지 업데이트 오류 for Steam ID ${steam_id}, Item: ${droppedItem}: ${storageErr.message}`);
                return reject(storageErr);
              }
              logger.info(`Dropped item ${droppedItem}이 온라인 스토리지에 추가되었습니다 for Steam ID ${steam_id}.`);
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    }));

    logger.info('Damage logs and coin balances updated successfully.');
    res.send('Damage logs and coin balances updated successfully');
  } catch (err) {
    logger.error(`Damage logs 처리 및 coin balances 업데이트 중 오류: ${err.message}`);
    res.status(500).json({ error: 'Failed to process damage logs and update coin balances' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, () => {
  logger.info(`서버가 http://${HOST}:${PORT} 에서 실행 중입니다.`);
});

// Gracefully close MySQL connection on server shutdown
process.on('SIGINT', () => {
  connection.end((err) => {
    if (err) {
      logger.error(`MySQL 연결 종료 오류: ${err.message}`);
    } else {
      logger.info('MySQL 연결이 성공적으로 종료되었습니다.');
    }
    process.exit();
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});