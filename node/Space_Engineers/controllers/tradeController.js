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
  (req, res) => {
    const { buyerSteamId, itemId, quantity } = req.body;

    if (!itemId) {
      return sendResponse(res, 400, 'Bad Request', { error: 'Item ID is required' });
    }

    // 트랜잭션 시작
    db.pool.getConnection((err, connection) => {
      if (err) {
        logger.error(`Error getting database connection: ${err.message}`);
        return sendResponse(res, 500, 'Database Error', { error: 'Database connection failed' });
      }

      connection.beginTransaction(async (transErr) => {
        if (transErr) {
          connection.release();
          logger.error(`Error starting transaction: ${transErr.message}`);
          return sendResponse(res, 500, 'Database Error', { error: 'Transaction failed to start' });
        }

        try {
          // 1. 아이템 정보 조회 (수정 잠금)
          const [itemRows] = await connection.promise().query('SELECT * FROM marketplace_items WHERE id = ? FOR UPDATE', [itemId]);

          if (itemRows.length === 0) {
            throw new Error('Item not found');
          }

          const item = itemRows[0];


          // 2. 구매자의 잔액 확인 (선택 사항)
          const [userRows] = await connection.promise().query('SELECT sek_coin FROM user_data WHERE steam_id = ?', [buyerSteamId]);
          if (userRows.length === 0 || userRows[0].sek_coin < item.price * quantity) {
            throw new Error('Insufficient balance');
          }

          // 3. 수량 확인 및 업데이트
          if (item.quantity < quantity) {
            throw new Error('Insufficient item quantity');
          }

          // 수량을 줄이고, 남은 수량이 0이면 행을 삭제
          if (item.quantity - quantity === 0) {
            await connection.promise().query('DELETE FROM marketplace_items WHERE id = ?', [itemId]);
          } else {
            await connection.promise().query('UPDATE marketplace_items SET quantity = quantity - ? WHERE id = ?', [quantity, itemId]);
          }

          // 4. 구매 기록 추가
          await connection.promise().query('INSERT INTO purchases (buyer_steam_id, item_id, price_per_unit) VALUES (?, ?, ?)', [buyerSteamId, itemId, item.price]);

          // 5. 구매자의 잔액 차감
          await connection.promise().query('UPDATE user_data SET sek_coin = sek_coin - ? WHERE steam_id = ?', [item.price * quantity, buyerSteamId]);

          // 트랜잭션 커밋
          connection.commit((commitErr) => {
            if (commitErr) {
              return connection.rollback(() => {
                connection.release();
                logger.error(`Error committing transaction: ${commitErr.message}`);
                return sendResponse(res, 500, 'Database Error', { error: 'Transaction commit failed' });
              });
            }

            connection.release();
            return sendResponse(res, 200, 'Success', { message: 'Item purchased successfully' });
          });
        } catch (error) {
          // 트랜잭션 롤백
          connection.rollback(() => {
            connection.release();
            logger.error(`Error during purchaseItem: ${error.message}`);
            return sendResponse(res, 400, 'Bad Request', { error: error.message });
          });
        }
      });
    });
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