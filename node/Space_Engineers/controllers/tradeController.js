// controllers/tradeController.js
const db = require('../config/database');
const logger = require('../utils/logger');

// 비동기 에러 처리를 위한 헬퍼 함수
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 거래소 아이템 조회 엔드포인트
exports.getMarketplaceItems = asyncHandler(async (req, res) => {
  try {
    // marketplace_items와 items_info 테이블을 조인하여 필요한 데이터 가져오기
    const [rows] = await db.pool.promise().query(`
      SELECT 
        mi.seller_nickname AS nickname, 
        mi.id, 
        mi.item_name AS indexName, 
        ii.display_name AS displayName, 
        ii.category, 
        ii.rarity, 
        mi.quantity AS stock, 
        mi.price_per_unit AS price 
      FROM 
        marketplace_items AS mi
      LEFT JOIN 
        items_info AS ii ON mi.item_name = ii.index_name
    `);

    // 응답 전송
    res.status(200).json({
      status: 200,
      statusText: 'ok',
      tableData: rows.map(row => ({
        nickname: row.nickname,
        id: row.id,
        indexName: row.indexName,
        displayName: row.displayName,
        category: row.category,
        rarity: row.rarity,
        stock: row.stock,
        price: row.price
      }))
    });
  } catch (error) {
    logger.error(`Error fetching marketplace items: ${error.message}`, {
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      status: 500,
      statusText: 'Internal Server Error',
      error: '마켓플레이스 아이템을 가져오는데 실패했습니다.'
    });
  }
});

// 아이템 구매 엔드포인트
exports.purchaseItem = asyncHandler(async (req, res) => {
  const { itemId, quantity } = req.body;
  const buyerSteamId = req.user.steamId; // 인증된 사용자 정보에서 Steam ID 가져오기

  logger.info(`Purchase attempt initiated by Steam ID: ${buyerSteamId}`, {
    itemId,
    quantity,
    timestamp: new Date().toISOString(),
  });

  // 입력값 검증
  if (!itemId || !quantity || !Number.isInteger(quantity) || quantity <= 0) {
    logger.warn(`Purchase failed: Invalid input`, {
      buyerSteamId,
      itemId,
      quantity,
      timestamp: new Date().toISOString(),
    });
    return res.status(400).json({
      status: 400,
      statusText: 'Bad Request',
      error: 'itemId과 quantity는 필수이며, quantity는 양의 정수여야 합니다.'
    });
  }

  let connection;
  try {
    // 데이터베이스 연결 획득
    connection = await db.pool.promise().getConnection();
    logger.info(`Database connection acquired for Buyer Steam ID: ${buyerSteamId}`, {
      timestamp: new Date().toISOString(),
    });

    // 트랜잭션 시작
    await connection.beginTransaction();
    logger.info(`Transaction started for Buyer Steam ID: ${buyerSteamId}`, {
      timestamp: new Date().toISOString(),
    });

    // 1. 아이템 정보 조회 (수정 잠금)
    logger.debug(`Fetching item details for Item ID: ${itemId}`, {
      buyerSteamId,
      timestamp: new Date().toISOString(),
    });
    const [itemRows] = await connection.query('SELECT * FROM marketplace_items WHERE id = ? FOR UPDATE', [itemId]);

    if (itemRows.length === 0) {
      logger.warn(`Item not found`, {
        buyerSteamId,
        itemId,
        timestamp: new Date().toISOString(),
      });
      throw { status: 404, message: '아이템을 찾을 수 없습니다.' };
    }

    const item = itemRows[0];
    logger.info(`Item retrieved`, {
      buyerSteamId,
      itemId,
      itemDetails: item,
      timestamp: new Date().toISOString(),
    });

    // 2. 구매자의 잔액 확인
    logger.debug(`Checking balance for Buyer Steam ID: ${buyerSteamId}`, {
      timestamp: new Date().toISOString(),
    });
    const [userRows] = await connection.query('SELECT sek_coin FROM user_data WHERE steam_id = ? FOR UPDATE', [buyerSteamId]);
    if (userRows.length === 0) {
      logger.warn(`User not found`, {
        buyerSteamId,
        timestamp: new Date().toISOString(),
      });
      throw { status: 404, message: '사용자를 찾을 수 없습니다.' };
    }
    const userBalance = userRows[0].sek_coin;
    const totalPrice = item.price_per_unit * quantity;
    logger.info(`User balance and total price calculated`, {
      buyerSteamId,
      userBalance,
      totalPrice,
      timestamp: new Date().toISOString(),
    });

    if (userBalance < totalPrice) {
      logger.warn(`Insufficient balance`, {
        buyerSteamId,
        userBalance,
        required: totalPrice,
        timestamp: new Date().toISOString(),
      });
      throw { status: 400, message: '잔액이 부족합니다.' };
    }

    // 3. 수량 확인 및 업데이트
    logger.debug(`Checking item quantity for Item ID: ${itemId}`, {
      buyerSteamId,
      requestedQuantity: quantity,
      availableQuantity: item.quantity,
      timestamp: new Date().toISOString(),
    });
    if (item.quantity < quantity) {
      logger.warn(`Insufficient item quantity`, {
        buyerSteamId,
        itemId,
        requestedQuantity: quantity,
        availableQuantity: item.quantity,
        timestamp: new Date().toISOString(),
      });
      throw { status: 400, message: '요청한 수량이 부족합니다.' };
    }

    // 수량을 줄이고, 남은 수량이 0이면 행을 삭제
    if (item.quantity - quantity === 0) {
      logger.info(`Deleting item as quantity will be zero`, {
        buyerSteamId,
        itemId,
        timestamp: new Date().toISOString(),
      });
      await connection.query('DELETE FROM marketplace_items WHERE id = ?', [itemId]);
    } else {
      logger.info(`Updating item quantity`, {
        buyerSteamId,
        itemId,
        decrementBy: quantity,
        newQuantity: item.quantity - quantity,
        timestamp: new Date().toISOString(),
      });
      await connection.query('UPDATE marketplace_items SET quantity = quantity - ? WHERE id = ?', [quantity, itemId]);
    }

    // 4. 구매 기록 추가
    logger.debug(`Inserting purchase record`, {
      buyerSteamId,
      itemId,
      pricePerUnit: item.price_per_unit,
      quantity,
      timestamp: new Date().toISOString(),
    });
    await connection.query(
      'INSERT INTO tradelog (seller_steam_id, buyer_steam_id, price_per_unit, item_name, quantity, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [item.seller_steam_id, buyerSteamId, item.price_per_unit, item.item_name, quantity]
    );

    // 구매자의 온라인 스토리지에 아이템 추가
    logger.debug(`Updating buyer's online storage`, {
      buyerSteamId,
      itemName: item.item_name,
      quantity,
      timestamp: new Date().toISOString(),
    });
    await connection.query(
      'UPDATE online_storage SET ?? = IFNULL(??, 0) + ? WHERE steam_id = ?',
      [item.item_name, item.item_name, quantity, buyerSteamId]
    );

    // 5. 구매자의 잔액 차감
    logger.debug(`Deducting balance`, {
      buyerSteamId,
      amount: totalPrice,
      previousBalance: userBalance,
      timestamp: new Date().toISOString(),
    });
    await connection.query('UPDATE user_data SET sek_coin = sek_coin - ? WHERE steam_id = ?', [totalPrice, buyerSteamId]);
    logger.info(`Balance updated`, {
      buyerSteamId,
      deductedAmount: totalPrice,
      newBalance: userBalance - totalPrice,
      timestamp: new Date().toISOString(),
    });

    // 트랜잭션 커밋
    await connection.commit();
    logger.info(`Transaction committed successfully`, {
      buyerSteamId,
      itemId,
      quantity,
      totalPrice,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      status: 200,
      statusText: 'Success',
      data: { message: '아이템이 성공적으로 구매되었습니다.' }
    });
  } catch (error) {
    // 트랜잭션 롤백
    if (connection) {
      try {
        await connection.rollback();
        logger.info(`Transaction rolled back`, {
          buyerSteamId,
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      } catch (rollbackError) {
        logger.error(`Error during transaction rollback`, {
          buyerSteamId,
          rollbackError: rollbackError.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
    logger.error(`Error during purchase process`, {
      buyerSteamId,
      error: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    // 에러 유형에 따라 적절한 응답 코드 및 메시지 반환
    const statusCode = error.status || 500;
    const statusText = statusCode === 400 ? 'Bad Request' : statusCode === 404 ? 'Not Found' : 'Internal Server Error';
    const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
    return res.status(statusCode).json({
      status: statusCode,
      statusText: statusText,
      error: errorMessage 
    });
  } finally {
    if (connection) connection.release();
  }
});

// 아이템 등록 엔드포인트
exports.registerItem = asyncHandler(async (req, res) => {
  const { itemName, price, quantity } = req.body;
  const sellerSteamId = req.user.steamId; // 인증된 사용자 정보에서 Steam ID 가져오기

  logger.info(`Register item request by Steam ID: ${sellerSteamId}`, {
    itemName,
    price,
    quantity,
    timestamp: new Date().toISOString(),
  });

  // 입력값 검증
  if (!itemName || !price || !Number.isFinite(price) || price <= 0 || !quantity || !Number.isInteger(quantity) || quantity <= 0) {
    logger.warn(`Item registration failed: Invalid input`, {
      sellerSteamId,
      itemName,
      price,
      quantity,
      timestamp: new Date().toISOString(),
    });
    return res.status(400).json({
      status: 400,
      statusText: 'Bad Request',
      error: 'itemName, price는 양의 숫자여야 하며, quantity는 양의 정수여야 합니다.'
    });
  }

  try {
    // 아이템 등록
    const [result] = await db.pool.promise().query(
      'INSERT INTO marketplace_items (seller_steam_id, item_name, price_per_unit, quantity) VALUES (?, ?, ?, ?)',
      [sellerSteamId, itemName, price, quantity]
    );

    logger.info(`Item registered successfully`, {
      sellerSteamId,
      itemName,
      price,
      quantity,
      insertId: result.insertId,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      status: 201,
      statusText: 'Created',
      message: '아이템이 성공적으로 등록되었습니다.', itemId: result.insertId
    });
  } catch (error) {
    logger.error(`Error registering item: ${error.message}`, {
      sellerSteamId,
      itemName,
      price,
      quantity,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      status: 500,
      statusText: 'Internal Server Error',
      error: '아이템 등록에 실패했습니다.'
    });
  }
});
