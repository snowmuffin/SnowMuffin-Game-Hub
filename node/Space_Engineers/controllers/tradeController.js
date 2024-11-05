// controllers/tradeController.js
const db = require('../config/database');
const logger = require('../utils/logger');

// 응답을 표준화된 형식으로 보내는 함수
const sendResponse = (res, status, statusText, data) => {
  res.status(status).json({ status, statusText, data });
};

// 거래소 아이템 조회 엔드포인트
exports.getMarketplaceItems = [
  (req, res) => {
    let { itemName, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

    // 입력값 검증 및 기본값 설정
    page = parseInt(page);
    limit = parseInt(limit);
    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 ? 20 : limit;

    let query = 'SELECT * FROM marketplace_items';
    const params = [];

    const conditions = [];
    if (itemName) {
      conditions.push('item_name LIKE ?');
      params.push(`%${itemName}%`);
    }
    if (minPrice) {
      minPrice = parseFloat(minPrice);
      if (!isNaN(minPrice)) {
        conditions.push('price_per_unit >= ?');
        params.push(minPrice);
      }
    }
    if (maxPrice) {
      maxPrice = parseFloat(maxPrice);
      if (!isNaN(maxPrice)) {
        conditions.push('price_per_unit <= ?');
        params.push(maxPrice);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // 페이지네이션 추가
    const offset = (page - 1) * limit;
    const paginatedQuery = query + ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const paginatedParams = [...params, limit, offset];

    // 총 아이템 수 조회 쿼리
    let countQuery = 'SELECT COUNT(*) as total FROM marketplace_items';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // 두 개의 쿼리를 순차적으로 실행
    db.pool.query(countQuery, params, (countErr, countResults) => {
      if (countErr) {
        logger.error(`Error fetching total marketplace items count: ${countErr.message}`);
        return sendResponse(res, 500, 'Database Error', { error: 'Failed to fetch items count' });
      }

      const totalItems = countResults[0].total;

      db.pool.query(paginatedQuery, paginatedParams, (err, results) => {
        if (err) {
          logger.error(`Error fetching marketplace items: ${err.message}`);
          return sendResponse(res, 500, 'Database Error', { error: 'Failed to fetch items' });
        }

        sendResponse(res, 200, 'Success', { items: results, totalItems, page, limit });
      });
    });
  }
];

exports.purchaseItem = [
  async (req, res) => { // 비동기 함수로 변경하여 코드 가독성 향상
    const { buyerSteamId, itemId, quantity } = req.body;
    logger.info(`Purchase attempt initiated by Steam ID: ${buyerSteamId}`, {
      itemId,
      quantity,
      timestamp: new Date().toISOString(),
    });
    console.log("Purchase Request Body:", req.body);

    // 입력값 검증
    if (!itemId || !buyerSteamId || !quantity) {
      logger.warn(`Purchase failed: Missing required fields`, {
        buyerSteamId,
        itemId,
        quantity,
        timestamp: new Date().toISOString(),
      });
      return sendResponse(res, 400, 'Bad Request', { error: 'buyerSteamId, itemId, and quantity are required' });
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
        throw new Error('Item not found');
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
      const [userRows] = await connection.query('SELECT * FROM user_data WHERE steam_id = ?', [buyerSteamId]);
      if (userRows.length === 0) {
        logger.warn(`User not found`, {
          buyerSteamId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('User not found');
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
        throw new Error('Insufficient balance');
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
        throw new Error('Insufficient item quantity');
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
        pricePerUnit: item.price,
        quantity,
        timestamp: new Date().toISOString(),
      });
      await connection.query(
        'INSERT INTO tradelog (seller_steam_id, buyer_steam_id, price_per_unit, item_name, quantity, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [item.seller_steam_id, buyerSteamId, item.price_per_unit, item.item_name, quantity]
      );
      await connection.query(`UPDATE online_storage SET ${item.item_name} = ${item.item_name} + ? WHERE steam_id = ?`, [quantity, buyerSteamId]);
      logger.info(`Purchase record inserted`, {
        buyerSteamId,
        itemId,
        timestamp: new Date().toISOString(),
      });

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

      return sendResponse(res, 200, 'Success', { message: 'Item purchased successfully' });
    } catch (error) {
      // 트랜잭션 롤백
      if (connection) {
        try {
          await connection.rollback();
          logger.info(`Transaction rolled back`, {
            buyerSteamId,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        } catch (rollbackError) {
          logger.error(`Error during transaction rollback`, {
            buyerSteamId,
            rollbackError: rollbackError.message,
            timestamp: new Date().toISOString(),
          });
        } finally {
          connection.release();
          logger.info(`Database connection released`, {
            buyerSteamId,
            timestamp: new Date().toISOString(),
          });
        }
      }
      logger.error(`Error during purchase process`, {
        buyerSteamId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      // 에러 유형에 따라 적절한 응답 코드 및 메시지 반환
      const statusCode = error.message === 'Item not found' || error.message === 'User not found' || error.message === 'Insufficient balance' || error.message === 'Insufficient item quantity' ? 400 : 500;
      return sendResponse(res, statusCode, statusCode === 400 ? 'Bad Request' : 'Internal Server Error', { error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }
];


exports.registerItem = [
  (req, res) => {
    const { sellerSteamId,itemName, price,quantity } = req.body;

    // 입력값 검증
    if (!itemName || !price || price <= 0) {
      return sendResponse(res, 400, 'Bad Request', { error: 'Invalid item name or price' });
    }

    const insertQuery = 'INSERT INTO marketplace_items (seller_steam_id, item_name, price_per_unit,quantity) VALUES (?, ?, ?,?)';

    db.pool.query(insertQuery, [sellerSteamId, itemName, price,quantity], (err, results) => {
      if (err) {
        logger.error(`Error registering item: ${err.message}`);
        return sendResponse(res, 500, 'Database Error', { error: 'Failed to register item' });
      }

      return sendResponse(res, 201, 'Created', { message: 'Item registered successfully', itemId: results.insertId });
    });
  }
];