const db = require('../config/database');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { getDrop, dropTable } = require('../utils/dropUtils');

const secretKey = process.env.JWT_SECRET || 'defaultSecretKey';

// Function to handle POST /api/damage_logs
exports.postDamageLogs = async (req, res) => {
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
        db.pool.query(damage_event, [steam_id, damage, sekCoinToAdd], (err) => {
          if (err) {
            logger.error(`Error saving damage log for Steam ID ${steam_id}: ${err.message}`);
            return reject(err);
          }
          logger.info(`Successfully saved damage ${damage} and sek_coin ${sekCoinToAdd} for Steam ID ${steam_id}.`);

          if (droppedItem) {
            db.pool.query(updateOnlineStorageQuery, [steam_id], (storageErr) => {
              if (storageErr) {
                logger.error(`Error updating online storage for Steam ID ${steam_id}, Item: ${droppedItem}: ${storageErr.message}`);
                return reject(storageErr);
              }
              logger.info(`Dropped item ${droppedItem} added to online storage for Steam ID ${steam_id}.`);
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
    logger.error(`Error processing damage logs and updating coin balances: ${err.message}`);
    res.status(500).json({ error: 'Failed to process damage logs and update coin balances' });
  }
};
