const db = require('../config/database');
const logger = require('../utils/logger');

exports.getResources = (req, res) => {
  const steamId = req.params.steamid;
  logger.info(`Received request for resources. Steam ID: ${steamId}`);

  const query = 'SELECT * FROM online_storage WHERE steam_id = ?';
  logger.debug(`Executing SQL Query: ${query} with Steam ID: ${steamId}`);

  db.connection.query(query, [steamId], (err, results) => {
    if (err) {
      logger.error(`Error fetching resource data for Steam ID ${steamId}: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      logger.info(`Resources retrieved for Steam ID ${steamId}: ${JSON.stringify(results[0])}`);
      res.json({ steamid: steamId, resources: results[0] });
    } else {
      const insertQuery = 'INSERT INTO online_storage (steam_id) VALUES (?)';
      logger.info(`No resources found for Steam ID ${steamId}. Inserting new row.`);

      db.connection.query(insertQuery, [steamId], (insertErr) => {
        if (insertErr) {
          logger.error(`Error inserting new row for Steam ID ${steamId}: ${insertErr.message}`);
          return res.status(500).json({ error: 'Error inserting new row' });
        }

        logger.info(`New row added. Steam ID: ${steamId}`);
        res.json({ steamid: steamId, resources: {} });
      });
    }
  });
};
exports.download = (req, res) => {
    const { steamid, itemName, quantity } = req.body;

    console.log(`Download request received: Steam ID=${steamid}, Item=${itemName}, Quantity=${quantity}`);

    // 유효성 검사
    if (!itemName || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item name or quantity' });
    }

    // 아이템 조회 쿼리: itemName을 동적으로 열 이름으로 사용
    const query = `SELECT ?? AS availableQuantity FROM online_storage WHERE steam_id = ?`;
    db.connection.query(query, [itemName, steamid], (err, results) => {
        if (err) {
            logger.error(`Error fetching resource data for Steam ID ${steamid}: ${err.message}`);
            return res.status(500).json({ error: 'Database error' });
        }

        // 조회 결과가 없을 경우
        if (results.length === 0 || results[0].availableQuantity === undefined) {
            return res.status(404).json({ Exist: false, message: "Item not found in online storage." });
        }

        // 조회된 수량 확인
        const availableQuantity = results[0].availableQuantity;
        if (availableQuantity < quantity) {
            return res.status(200).json({
                Exist: true,
                quantity: availableQuantity,
                message: `Insufficient quantity. Available: ${availableQuantity}`
            });
        }

        // 수량이 충분할 경우, 데이터베이스에서 차감하는 쿼리 실행
        const updateQuery = `UPDATE online_storage SET ?? = ?? - ? WHERE steam_id = ?`;
        db.connection.query(updateQuery, [itemName, itemName, quantity, steamid], (updateErr) => {
            if (updateErr) {
                logger.error(`Error updating resource data for Steam ID ${steamid}: ${updateErr.message}`);
                return res.status(500).json({ error: 'Failed to update item quantity in online storage.' });
            }

            // 성공 응답 반환
            res.status(200).json({
                Exist: true,
                quantity: availableQuantity,
                message: `${quantity}x '${itemName}' has been downloaded and deducted from your storage.`
            });
        });
    });
};
