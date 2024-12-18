// controllers/userController.js

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get User Profile
 * GET /api/user/:steamid/profile
 */
exports.getUserProfile = (req, res) => {
  const steamId = req.params.steamid;
  logger.info(`Fetching profile for Steam ID: ${steamId}`);

  const query = 'SELECT * FROM user_data WHERE steam_id = ?';
  db.pool.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`Error fetching user profile: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      res.json({ steamid: steamId, profile: results[0] });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
};

/**
 * Update User Profile
 * PUT /api/user/:steamid/profile
 */
exports.updateUserProfile = (req, res) => {
  const steamId = req.params.steamid;
  const { nickname } = req.body;

  if (!nickname) {
    return res.status(400).json({ error: 'Nickname is required' });
  }

  const query = 'UPDATE user_data SET nickname = ? WHERE steam_id = ?';
  db.pool.query(query, [nickname, steamId], (err, results) => {
    if (err) {
      logger.error(`Error updating user profile: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows > 0) {
      res.json({ message: 'Profile updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
};


exports.updateuserdb = (req, res) => {
  const { steamid, nickname } = req.body;

  if (!nickname) {
    return res.status(400).json({ error: 'Nickname is required' });
  }

  const updateUserQuery = 'UPDATE user_data SET nickname = ? WHERE steam_id = ?';
  const insertUserQuery = 'INSERT INTO user_data (steam_id, nickname) VALUES (?, ?)';
  const checkStorageQuery = 'SELECT 1 FROM online_storage WHERE steam_id = ?';
  const insertStorageQuery = 'INSERT INTO online_storage (steam_id) VALUES (?)';

  // 첫 번째 쿼리: user_data 업데이트 시도
  db.pool.query(updateUserQuery, [nickname, steamid], (err, results) => {
    if (err) {
      logger.error(`Error updating user profile: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows > 0) {
      // user_data 업데이트 성공 시 online_storage 확인 및 삽입 시도
      return checkAndInsertStorage(steamid, res);
    } else {
      // user_data에 사용자 레코드가 없는 경우 삽입
      db.pool.query(insertUserQuery, [steamid, nickname], (err, results) => {
        if (err) {
          logger.error(`Error inserting into user_data: ${err.message}`);
          return res.status(500).json({ error: 'Database error' });
        }
        // user_data 삽입 성공 후 online_storage 확인 및 삽입 시도
        checkAndInsertStorage(steamid, res);
      });
    }
  });

  // online_storage에 steam_id가 없을 경우 새 레코드 삽입
  function checkAndInsertStorage(steamid, res) {
    db.pool.query(checkStorageQuery, [steamid], (err, results) => {
      if (err) {
        logger.error(`Error checking online_storage: ${err.message}`);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length > 0) {
        // 레코드가 이미 있는 경우
        return res.json({ message: 'Profile updated successfully' });
      } else {
        // 레코드가 없는 경우 새 레코드 삽입
        db.pool.query(insertStorageQuery, [steamid], (err, results) => {
          if (err) {
            logger.error(`Error inserting into online_storage: ${err.message}`);
            return res.status(500).json({ error: 'Database error' });
          }
          return res.json({ message: 'Profile updated and storage record created' });
        });
      }
    });
  }
};

exports.getranking = async (req, res) => {
  const rankingQuery = `
    SELECT 
      @rank := @rank + 1 AS rank, 
      user_data.*
    FROM user_data, (SELECT @rank := 0) AS r
    ORDER BY total_damage DESC
  `;

  try {
    const [RankingResults] = await db.pool.promise().query(rankingQuery);
    const response = {
      status: 'success',
      data: RankingResults,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
};

