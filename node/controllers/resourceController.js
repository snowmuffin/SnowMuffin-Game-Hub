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
