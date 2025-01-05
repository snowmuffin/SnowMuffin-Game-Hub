// controller.js

const db = require('../config/database');
const logger = require('../utils/logger');
const gacha = require('../utils/gacha'); // 가챠 유틸리티 모듈 불러오기

// Helper function to handle async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 애플리케이션 시작 시 가챠 시스템 초기화
(async () => {
  try {
    await gacha.initializeGacha();
    logger.info('Gacha system initialized successfully.');
  } catch (err) {
    logger.error(`Failed to initialize gacha system: ${err.message}`);
    process.exit(1); // 초기화 실패 시 애플리케이션 종료
  }
})();

// 기존 엔드포인트 유지...
exports.getResources = asyncHandler(async (req, res) => {
  const steamId = req.user.steamId;
  logger.info(`Received request for resources. Steam ID: ${steamId}`);

  const query = 'SELECT * FROM online_storage WHERE steam_id = ?';
  logger.debug(`Executing SQL Query: ${query} with Steam ID: ${steamId}`);

  const [results] = await db.pool.promise().query(query, [steamId]);

  if (results.length > 0) {
    const resources = results[0];
    const resourceKeys = Object.keys(resources).filter(key => key !== 'steam_id' && resources[key] > 0);

    if (resourceKeys.length === 0) {
      return res.status(200).json({
        status: 200,
        statustext: 'Resources retrieved successfully',
        items: []
      });
    }

    const placeholders = resourceKeys.map(() => '?').join(', ');
    const itemInfoQuery = `SELECT index_name, display_name, category, description, rarity FROM items_info WHERE index_name IN (${placeholders})`;
    logger.debug(`Executing SQL Query: ${itemInfoQuery} with Resource Keys: ${resourceKeys.join(', ')}`);

    const [infoResults] = await db.pool.promise().query(itemInfoQuery, resourceKeys);

    const filteredResources = infoResults.map(info => ({
      indexName: info.index_name,
      displayName: info.display_name,
      category: info.category,
      description: info.description,
      rarity: info.rarity,
      quantity: resources[info.index_name]
    }));

    logger.info(`Resources retrieved for Steam ID ${steamId}: ${JSON.stringify(filteredResources)}`);
    return res.status(200).json({
      status: 200,
      statustext: 'Resources retrieved successfully',
      items: filteredResources
    });
  } else {
    const insertQuery = 'INSERT INTO online_storage (steam_id) VALUES (?)';
    logger.info(`No resources found for Steam ID ${steamId}. Inserting new row.`);

    await db.pool.promise().query(insertQuery, [steamId]);
    logger.info(`New row added. Steam ID: ${steamId}`);
    return res.status(200).json({
      status: 200,
      statustext: 'New row added successfully',
      items: []
    });
  }
});

exports.download = asyncHandler(async (req, res) => {
  const { steamid, itemName, quantity } = req.body;

  logger.info(`Download request received: Steam ID=${steamid}, Item=${itemName}, Quantity=${quantity}`);

  // Validation
  if (!itemName || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid item name or quantity' });
  }

  const connection = await db.pool.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Fetch available quantity
    const query = `SELECT ?? AS availableQuantity FROM online_storage WHERE steam_id = ? FOR UPDATE`;
    const [results] = await connection.query(query, [itemName, steamid]);

    if (results.length === 0 || results[0].availableQuantity === undefined) {
      await connection.rollback();
      return res.status(404).json({ Exist: false, message: "Item not found in online storage." });
    }

    const availableQuantity = results[0].availableQuantity;
    if (availableQuantity < quantity) {
      await connection.rollback();
      return res.status(200).json({
        Exist: true,
        quantity: availableQuantity,
        message: `Insufficient quantity. Available: ${availableQuantity}`
      });
    }

    // Update quantity
    const updateQuery = `UPDATE online_storage SET ?? = ?? - ? WHERE steam_id = ?`;
    await connection.query(updateQuery, [itemName, itemName, quantity, steamid]);

    await connection.commit();

    logger.info(`Downloaded ${quantity}x '${itemName}' for Steam ID ${steamid}`);
    return res.status(200).json({
      Exist: true,
      quantity: availableQuantity,
      message: `${quantity}x '${itemName}' has been downloaded and deducted from your storage.`
    });
  } catch (error) {
    await connection.rollback();
    logger.error(`Error during download process for Steam ID ${steamid}: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

exports.upload = asyncHandler(async (req, res) => {
  const { steamid, itemName, quantity } = req.body;
  logger.info(`Upload request received: Steam ID=${steamid}, Item=${itemName}, Quantity=${quantity}`);

  // Validation
  if (!itemName || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid item name or quantity' });
  }

  const connection = await db.pool.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Check if Steam ID exists and fetch sek_coin
    const checkQuery = `
      SELECT ?? AS availableQuantity
      FROM online_storage WHERE steam_id = ?
    `;
    const [results] = await connection.query(checkQuery, [itemName, steamid]);

    if (results.length === 0) {
      await connection.rollback();
      return res.status(404).json({ Exist: false, message: "Steam ID not found in online storage." });
    }

    const availableQuantity = results[0].availableQuantity;

    // Update inventory and sek_coin
    const updateQuery = `
      UPDATE online_storage
      SET ?? = ?? + ?
      WHERE steam_id = ?
    `;
    await connection.query(updateQuery, [itemName, itemName, quantity, steamid]);

    await connection.commit();

    logger.info(`Uploaded ${quantity}x '${itemName}' for Steam ID ${steamid}`);
    return res.status(200).json({
      Exist: true,
      quantity: availableQuantity + quantity,
      message: `${quantity}x '${itemName}' has been uploaded to your storage.`
    });
  } catch (error) {
    await connection.rollback();
    logger.error(`Error during upload process for Steam ID ${steamid}: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

exports.upgrade = asyncHandler(async (req, res) => {
  const connection = await db.pool.promise().getConnection();
  try {
    await connection.beginTransaction();

    const steamId = req.user.steamId;
    const targetItem = req.body.target_item;

    // Step 1: Fetch blueprint with quantity information
    const blueprintWithQuantityQuery = `
      SELECT 
        ingredient1, quantity1, 
        ingredient2, quantity2, 
        ingredient3, quantity3, 
        ingredient4, quantity4, 
        ingredient5, quantity5 
      FROM blue_prints 
      WHERE index_name = ?
      FOR UPDATE
    `;
    const [blueprintResults] = await connection.query(blueprintWithQuantityQuery, [targetItem]);

    if (blueprintResults.length === 0) {
      logger.error(`No blueprint data found for ${targetItem}`);
      await connection.rollback();
      return res.status(400).json({ error: 'No blueprint data found' });
    }

    const blueprintData = blueprintResults[0];
    const nonNullItems = {};

    // Assign matched ingredient and quantity values to nonNullItems
    for (let i = 1; i <= 5; i++) {
      const ingredientKey = `ingredient${i}`;
      const quantityKey = `quantity${i}`;

      if (blueprintData[ingredientKey]) {
        nonNullItems[blueprintData[ingredientKey]] = blueprintData[quantityKey];
      }
    }

    const itemKeys = Object.keys(nonNullItems);

    if (itemKeys.length === 0) {
      logger.error(`No valid ingredients found for ${targetItem}`);
      await connection.rollback();
      return res.status(400).json({ error: 'No valid ingredients found' });
    }

    // Step 2: Check if inventory has enough items
    const inventoryQuery = `SELECT ${itemKeys.map(() => '??').join(', ')} FROM online_storage WHERE steam_id = ? FOR UPDATE`;
    const [inventoryResults] = await connection.query(inventoryQuery, [...itemKeys, steamId]);

    if (inventoryResults.length === 0) {
      logger.error(`No inventory found for Steam ID ${steamId}`);
      await connection.rollback();
      return res.status(404).json({ error: 'Inventory not found' });
    }

    const inventoryData = inventoryResults[0];
    for (const [item, requiredQuantity] of Object.entries(nonNullItems)) {
      if (inventoryData[item] === undefined || inventoryData[item] < requiredQuantity) {
        logger.error(`Not enough ${item} for Steam ID ${steamId}`);
        await connection.rollback();
        return res.status(400).json({ error: `Not enough ${item} in inventory` });
      }
    }

    // Step 3: Update inventory - decrease ingredients and increase target item
    const updateStatements = itemKeys.map(item => `${item} = ${item} - ?`).join(", ");
    const updateInventoryQuery = `
      UPDATE online_storage 
      SET ${updateStatements}, ${targetItem} = ${targetItem} + 1 
      WHERE steam_id = ?
    `;
    const updateValues = [...Object.values(nonNullItems), steamId];

    await connection.query(updateInventoryQuery, updateValues);

    await connection.commit();
    logger.info(`Upgrade process completed successfully for Steam ID ${steamId}`);
    return res.status(200).json({ status: 200, statustext: 'Upgrade process completed successfully' });
  } catch (error) {
    await connection.rollback();
    logger.error(`Error during upgrade process: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

exports.getBlueprints = asyncHandler(async (req, res) => {
  const steamId = req.user.steamId;
  logger.info(`Received request for blueprints. Steam ID: ${steamId}`);

  try {
    const blueprintsQuery = 'SELECT * FROM blue_prints';
    logger.debug(`Executing SQL Query: ${blueprintsQuery}`);

    const [blueprints] = await db.pool.promise().query(blueprintsQuery);

    if (blueprints.length === 0) {
      logger.info(`No blueprints found for Steam ID ${steamId}`);
      return res.status(404).json({
        status: 404,
        statustext: 'No blueprints found',
        blueprints: [],
      });
    }

    // Blueprint 데이터 구조화
    const bp_Result = blueprints.reduce((list, bp) => {
      // 기존에 index_name이 있는지 확인
      const existing = list.find(item => item.indexName === bp.index_name);

      if (existing) {
        // ingredient_list에 새로운 재료 추가
        if (bp.ingredient_name) {
          existing.ingredient_list[bp.ingredient_name] = bp.quantity;
        }
      } else {
        // 새로운 index_name 추가
        const ingredients = {};
        for (let i = 1; i <= 5; i++) {
          const ingredient = bp[`ingredient${i}`];
          const quantity = bp[`quantity${i}`];
          if (ingredient) {
            ingredients[ingredient] = quantity;
          }
        }

        list.push({
          indexName: bp.index_name,
          ingredient_list: ingredients
        });
      }

      return list;
    }, []);

    logger.info(`Blueprints retrieved for Steam ID ${steamId}: ${JSON.stringify(bp_Result)}`);
    return res.status(200).json({
      status: 200,
      statustext: 'Blueprints retrieved successfully',
      blueprints: bp_Result
    });

  } catch (error) {
    logger.error(`Error fetching blueprints: ${error.message}`);
    return res.status(500).json({
      status: 500,
      statustext: 'Internal server error',
      data: null,
    });
  }
});

// 새로운 가챠 엔드포인트 핸들러
exports.pullGacha = asyncHandler(async (req, res) => {
  const steamId = req.user.steamId;
  logger.info(`Gacha pull requested by Steam ID: ${steamId}`);

  const connection = await db.pool.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Step 1: Check user's sek_coin balance
    const coinQuery = 'SELECT sek_coin FROM user_data WHERE steam_id = ? FOR UPDATE';
    const [coinResults] = await connection.query(coinQuery, [steamId]);

    if (coinResults.length === 0) {
      throw new Error('User not found');
    }

    const currentSekCoin = coinResults[0].sek_coin;

    if (currentSekCoin < 500) {
      await connection.rollback();
      return res.status(400).json({
        status: 400,
        statustext: 'Insufficient sek_coin',
        message: 'You do not have enough sek_coin to perform a gacha pull.',
      });
    }

    // Step 2: Deduct 500 sek_coin
    const deductQuery = 'UPDATE user_data SET sek_coin = sek_coin - 500 WHERE steam_id = ?';
    await connection.query(deductQuery, [steamId]);

    // Step 3: Perform gacha pull
    const droppedItem = gacha.pullGacha();
    logger.info(`Dropped item for Steam ID ${steamId}: ${JSON.stringify(droppedItem)}`);

    const { index_name, rarity } = droppedItem;

    // Step 4: Update online_storage table
    const insertQuery = `
      INSERT INTO online_storage (steam_id, ${index_name})
      VALUES (?, 1)
      ON DUPLICATE KEY UPDATE ${index_name} = ${index_name} + 1
    `;
    await connection.query(insertQuery, [steamId]);

    await connection.commit();

    return res.status(200).json({
      status: 200,
      statustext: 'Gacha pull successful',
      item: {
        indexName: index_name,
        rarity: rarity,
        quantity: 1
      }
    });
  } catch (err) {
    await connection.rollback();
    logger.error(`Error during gacha pull for Steam ID ${steamId}: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// 여러 번 가챠를 실행하는 엔드포인트 핸들러 (선택 사항)
exports.pullMultipleGacha = asyncHandler(async (req, res) => {
  const steamId = req.user.steamId;
  const { count } = req.body;
  const gachaCount = parseInt(count, 10) || 1;

  if (gachaCount <= 0) {
    return res.status(400).json({ error: 'Invalid gacha count' });
  }

  logger.info(`Multiple gacha pull requested by Steam ID: ${steamId}, Count: ${gachaCount}`);

  const connection = await db.pool.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Step 1: Check user's sek_coin balance
    const coinQuery = 'SELECT sek_coin FROM user_data WHERE steam_id = ? FOR UPDATE';
    const [coinResults] = await connection.query(coinQuery, [steamId]);

    if (coinResults.length === 0) {
      throw new Error('User not found');
    }

    const currentSekCoin = coinResults[0].sek_coin;
    const totalDeduction = 500 * gachaCount;

    if (currentSekCoin < totalDeduction) {
      await connection.rollback();
      return res.status(400).json({
        status: 400,
        statustext: 'Insufficient sek_coin',
        message: `You do not have enough sek_coin to perform ${gachaCount} gacha pulls. Required: ${totalDeduction}, Available: ${currentSekCoin}`,
      });
    }

    // Step 2: Deduct total sek_coin
    const deductQuery = 'UPDATE user_data SET sek_coin = sek_coin - ? WHERE steam_id = ?';
    await connection.query(deductQuery, [totalDeduction, steamId]);

    // Step 3: Perform multiple gacha pulls
    const droppedItems = [];
    const insertQueries = [];

    for (let i = 0; i < gachaCount; i++) {
      const droppedItem = gacha.pullGacha();
      droppedItems.push(droppedItem);

      const { index_name, rarity } = droppedItem;

      // Prepare insert queries
      const insertQuery = `
        INSERT INTO online_storage (steam_id, ${index_name})
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE ${index_name} = ${index_name} + 1
      `;
      insertQueries.push(connection.query(insertQuery, [steamId]));
    }

    // Execute all insert queries in parallel
    await Promise.all(insertQueries);

    await connection.commit();

    return res.status(200).json({
      status: 200,
      statustext: 'Multiple gacha pulls successful',
      items: droppedItems.map(item => ({
        indexName: item.index_name,
        rarity: item.rarity,
        quantity: 1
      }))
    });
  } catch (err) {
    await connection.rollback();
    logger.error(`Error during multiple gacha pulls for Steam ID ${steamId}: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});
