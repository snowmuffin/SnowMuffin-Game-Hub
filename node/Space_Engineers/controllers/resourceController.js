const db = require('../config/database');
const logger = require('../utils/logger');

const sendResponse = (res, status, statustext, data) => {
  res.status(status).json({ status, statustext, data });
};

exports.getResources = (req, res) => {
  const steamId = req.params.steamid;
  logger.info(`Received request for resources. Steam ID: ${steamId}`);

  const query = 'SELECT * FROM online_storage WHERE steam_id = ?';
  logger.debug(`Executing SQL Query: ${query} with Steam ID: ${steamId}`);

  db.pool.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`Error fetching resource data for Steam ID ${steamId}: ${err.message}`);
      return sendResponse(res, 500, 'Database error', { error: err.message });
    }

    if (results.length > 0) {
      const filteredResources = {};
      for (const [key, value] of Object.entries(results[0])) {
        if (value > 0 && key !== 'steam_id') {
          filteredResources[key] = value;
        }
      }
      logger.info(`Resources retrieved for Steam ID ${steamId}: ${JSON.stringify(filteredResources)}`);
      sendResponse(res, 200, 'Success', { steamid: steamId, resources: filteredResources });
    } else {
      const insertQuery = 'INSERT INTO online_storage (steam_id) VALUES (?)';
      logger.info(`No resources found for Steam ID ${steamId}. Inserting new row.`);

      db.pool.query(insertQuery, [steamId], (insertErr) => {
        if (insertErr) {
          logger.error(`Error inserting new row for Steam ID ${steamId}: ${insertErr.message}`);
          return sendResponse(res, 500, 'Error inserting new row', { error: insertErr.message });
        }

        logger.info(`New row added. Steam ID: ${steamId}`);
        sendResponse(res, 200, 'Success', { steamid: steamId, resources: {} });
      });
    }
  });
};

exports.download = (req, res) => {
  const { steamid, itemName, quantity } = req.body;
  logger.info(`Download request received: Steam ID=${steamid}, Item=${itemName}, Quantity=${quantity}`);

  if (!itemName || !quantity || quantity <= 0) {
    return sendResponse(res, 400, 'Invalid Request', { error: 'Invalid item name or quantity' });
  }

  const query = `SELECT ?? AS availableQuantity FROM online_storage WHERE steam_id = ?`;
  db.pool.query(query, [itemName, steamid], (err, results) => {
    if (err) {
      logger.error(`Error fetching resource data for Steam ID ${steamid}: ${err.message}`);
      return sendResponse(res, 500, 'Database error', { error: err.message });
    }

    if (results.length === 0 || results[0].availableQuantity === undefined) {
      return sendResponse(res, 404, 'Item Not Found', { Exist: false, message: "Item not found in online storage." });
    }

    const availableQuantity = results[0].availableQuantity;
    if (availableQuantity < quantity) {
      return sendResponse(res, 200, 'Insufficient Quantity', {
        Exist: true,
        quantity: availableQuantity,
        message: `Insufficient quantity. Available: ${availableQuantity}`
      });
    }

    const updateQuery = `UPDATE online_storage SET ?? = ?? - ? WHERE steam_id = ?`;
    db.pool.query(updateQuery, [itemName, itemName, quantity, steamid], (updateErr) => {
      if (updateErr) {
        logger.error(`Error updating resource data for Steam ID ${steamid}: ${updateErr.message}`);
        return sendResponse(res, 500, 'Update Error', { error: 'Failed to update item quantity in online storage.' });
      }

      sendResponse(res, 200, 'Success', {
        Exist: true,
        quantity: availableQuantity,
        message: `${quantity}x '${itemName}' has been downloaded and deducted from your storage.`
      });
    });
  });
};

exports.upload = (req, res) => {
  const { steamid, itemName, quantity } = req.body;
  logger.info(`Upload request received: Steam ID=${steamid}, Item=${itemName}, Quantity=${quantity}`);
  
  if (!itemName || !quantity || quantity <= 0) {
    return sendResponse(res, 400, 'Invalid Request', { error: 'Invalid item name or quantity' });
  }

  const checkQuery = `SELECT ?? AS availableQuantity, sek_coin FROM online_storage AS os JOIN user_data AS ud ON os.steam_id = ud.steam_id WHERE os.steam_id = ?`;
  db.pool.query(checkQuery, [itemName, steamid], (err, results) => {
    if (err) {
      logger.error(`Error checking resource data for Steam ID ${steamid}: ${err.message}`);
      return sendResponse(res, 500, 'Database error', { error: err.message });
    }

    if (results.length === 0) {
      return sendResponse(res, 404, 'Steam ID Not Found', { Exist: false, message: "Steam ID not found in online storage." });
    }

    if (results[0].availableQuantity === undefined) {
      return sendResponse(res, 404, 'Item Not Found', { Exist: false, message: "Item not found in online storage." });
    }

    const availableQuantity = results[0].availableQuantity;
    const currentCoin = results[0].sek_coin;
    
    if (currentCoin < quantity) {
      return sendResponse(res, 400, 'Insufficient Balance', {
        error: 'Insufficient sek_coin balance.',
        currentCoin,
        requiredAmount: quantity,
        message: `You need ${quantity} sek_coin, but only have ${currentCoin} available.`
      });
    }

    const updateQuery = `UPDATE online_storage AS os
                         JOIN user_data AS ud ON os.steam_id = ud.steam_id
                         SET os.?? = os.?? + ?, ud.sek_coin = ud.sek_coin - ?
                         WHERE os.steam_id = ?`;
    db.pool.query(updateQuery, [itemName, itemName, quantity, quantity, steamid], (updateErr) => {
      if (updateErr) {
        logger.error(`Error updating resource data for Steam ID ${steamid}: ${updateErr.message}`);
        return sendResponse(res, 500, 'Update Error', { error: 'Failed to update item quantity in online storage.' });
      }

      sendResponse(res, 200, 'Success', {
        Exist: true,
        quantity: availableQuantity + quantity,
        remainingCoins: currentCoin - quantity,
        message: `${quantity}x '${itemName}' has been uploaded to your storage, and ${quantity} sek_coin has been deducted from your account.`
      });
    });
  });
};
