const db = require('../config/database');
const logger = require('../utils/logger');


const sendResponse = (res, status, statusText, data) => {
    res.status(status).json({ status, statusText, data });
};



exports.registerItem = [
  (req, res) => {
      const { steamId } = req.user;
      const { itemName, price, quantity } = req.body;

      // 필수 필드 확인
      if (!itemName || !price || !quantity) {
          return sendResponse(res, 400, 'Invalid Data', { error: '아이템 이름, 가격 및 수량은 필수입니다.' });
      }

      // 유효한 아이템 이름 목록
      const validItemTypes = [
          'ore_stone', 'ore_iron', 'ore_nickel', 'ore_cobalt', 'ore_magnesium',
          'ore_silicon', 'ore_silver', 'ore_gold', 'ore_platinum', 'ore_uranium',
          'ore_ice', 'ore_scrap', 'ore_lanthanum', 'ore_cerium',
          'Construction', 'MetalGrid', 'InteriorPlate', 'SteelPlate',
          'Girder', 'SmallTube', 'LargeTube', 'Motor', 'Display',
          'BulletproofGlass', 'Superconductor', 'Computer', 'Reactor',
          'Thrust', 'GravityGenerator', 'Medical', 'RadioCommunication',
          'Detector', 'Explosives', 'SolarCell', 'PowerCell', 'Canvas',
          'EngineerPlushie', 'SabiroidPlushie', 'PrototechFrame', 'PrototechPanel',
          'PrototechCapacitor', 'PrototechPropulsionUnit', 'PrototechMachinery',
          'PrototechCircuitry', 'PrototechCoolingUnit',
          'DefenseUpgradeModule_Level1', 'DefenseUpgradeModule_Level2',
          'DefenseUpgradeModule_Level3', 'DefenseUpgradeModule_Level4',
          'DefenseUpgradeModule_Level5', 'DefenseUpgradeModule_Level6',
          'DefenseUpgradeModule_Level7', 'DefenseUpgradeModule_Level8',
          'DefenseUpgradeModule_Level9', 'DefenseUpgradeModule_Level10',
          'AttackUpgradeModule_Level1', 'AttackUpgradeModule_Level2',
          'AttackUpgradeModule_Level3', 'AttackUpgradeModule_Level4',
          'AttackUpgradeModule_Level5', 'AttackUpgradeModule_Level6',
          'AttackUpgradeModule_Level7', 'AttackUpgradeModule_Level8',
          'AttackUpgradeModule_Level9', 'AttackUpgradeModule_Level10',
          'PowerEfficiencyUpgradeModule_Level1', 'PowerEfficiencyUpgradeModule_Level2',
          'PowerEfficiencyUpgradeModule_Level3', 'PowerEfficiencyUpgradeModule_Level4',
          'PowerEfficiencyUpgradeModule_Level5', 'PowerEfficiencyUpgradeModule_Level6',
          'PowerEfficiencyUpgradeModule_Level7', 'PowerEfficiencyUpgradeModule_Level8',
          'PowerEfficiencyUpgradeModule_Level9', 'PowerEfficiencyUpgradeModule_Level10',
          'BerserkerModule_Level1', 'BerserkerModule_Level2', 'BerserkerModule_Level3',
          'BerserkerModule_Level4', 'BerserkerModule_Level5', 'BerserkerModule_Level6',
          'BerserkerModule_Level7', 'BerserkerModule_Level8', 'BerserkerModule_Level9',
          'BerserkerModule_Level10',
          'SpeedModule_Level1', 'SpeedModule_Level2', 'SpeedModule_Level3',
          'SpeedModule_Level4', 'SpeedModule_Level5', 'SpeedModule_Level6',
          'SpeedModule_Level7', 'SpeedModule_Level8', 'SpeedModule_Level9',
          'SpeedModule_Level10',
          'FortressModule_Level1', 'FortressModule_Level2', 'FortressModule_Level3',
          'FortressModule_Level4', 'FortressModule_Level5', 'FortressModule_Level6',
          'FortressModule_Level7', 'FortressModule_Level8', 'FortressModule_Level9',
          'FortressModule_Level10',
          'prototech_scrap', 'ingot_stone', 'ingot_iron', 'ingot_nickel',
          'ingot_cobalt', 'ingot_magnesium', 'ingot_silicon', 'ingot_silver',
          'ingot_gold', 'ingot_platinum', 'ingot_uranium', 'Prime_Matter'
      ];

      if (!validItemTypes.includes(itemName)) {
          return sendResponse(res, 400, 'Invalid Data', { error: '유효하지 않은 아이템 이름입니다.' });
      }

      // 트랜잭션 시작
      db.pool.getConnection((connectionErr, connection) => {
          if (connectionErr) {
              logger.error(`MySQL pool error: ${connectionErr.message}`);
              return sendResponse(res, 500, 'Database Error', { error: '아이템 등록에 실패했습니다.' });
          }

          connection.beginTransaction((transactionErr) => {
              if (transactionErr) {
                  connection.release();
                  logger.error(`트랜잭션 시작 오류: ${transactionErr.message}`);
                  return sendResponse(res, 500, 'Transaction Error', { error: '트랜잭션 시작에 실패했습니다.' });
              }

              // `online_storage`에서 아이템 수량 확인
              const checkItemQuery = `
                  SELECT ?? FROM online_storage WHERE steam_id = ?
              `;
              connection.query(checkItemQuery, [itemName, steamId], (checkErr, checkResults) => {
                  if (checkErr) {
                      return connection.rollback(() => {
                          connection.release();
                          logger.error(`아이템 확인 오류: ${checkErr.message}`);
                          sendResponse(res, 500, 'Database Error', { error: '아이템 확인에 실패했습니다.' });
                      });
                  }

                  if (checkResults.length === 0) {
                      return connection.rollback(() => {
                          connection.release();
                          sendResponse(res, 404, 'Not Found', { error: '사용자 정보를 찾을 수 없습니다.' });
                      });
                  }

                  const currentQuantity = checkResults[0][itemName];

                  if (currentQuantity < quantity) {
                      return connection.rollback(() => {
                          connection.release();
                          sendResponse(res, 400, 'Insufficient Quantity', { error: '온라인 스토리지에 해당 아이템의 수량이 부족합니다.' });
                      });
                  }

                  // `marketplace_items`에서 동일한 아이템 존재 여부 확인
                  const checkMarketplaceQuery = `
                      SELECT * FROM marketplace_items 
                      WHERE steam_id = ? AND item_name = ?
                      FOR UPDATE
                  `;
                  connection.query(checkMarketplaceQuery, [steamId, itemName], (marketplaceErr, marketplaceResults) => {
                      if (marketplaceErr) {
                          return connection.rollback(() => {
                              connection.release();
                              logger.error(`마켓플레이스 아이템 확인 오류: ${marketplaceErr.message}`);
                              sendResponse(res, 500, 'Database Error', { error: '마켓플레이스 아이템 확인에 실패했습니다.' });
                          });
                      }

                      if (marketplaceResults.length > 0) {
                          // 이미 존재하는 경우 수량 업데이트
                          const existingItem = marketplaceResults[0];
                          const newQuantity = parseFloat(existingItem.quantity) + parseFloat(quantity);

                          const updateMarketplaceQuery = `
                              UPDATE marketplace_items
                              SET quantity = ?
                              WHERE id = ?
                          `;
                          connection.query(updateMarketplaceQuery, [newQuantity, existingItem.id], (updateErr) => {
                              if (updateErr) {
                                  return connection.rollback(() => {
                                      connection.release();
                                      logger.error(`마켓플레이스 아이템 업데이트 오류: ${updateErr.message}`);
                                      sendResponse(res, 500, 'Database Error', { error: '마켓플레이스 아이템 업데이트에 실패했습니다.' });
                                  });
                              }

                              // `online_storage`에서 아이템 수량 감소
                              const updateStorageQuery = `
                                  UPDATE online_storage
                                  SET ?? = ?? - ?
                                  WHERE steam_id = ?
                              `;
                              connection.query(updateStorageQuery, [itemName, itemName, quantity, steamId], (storageErr) => {
                                  if (storageErr) {
                                      return connection.rollback(() => {
                                          connection.release();
                                          logger.error(`온라인 스토리지 업데이트 오류: ${storageErr.message}`);
                                          sendResponse(res, 500, 'Database Error', { error: '온라인 스토리지 업데이트에 실패했습니다.' });
                                      });
                                  }

                                  // 트랜잭션 커밋
                                  connection.commit((commitErr) => {
                                      if (commitErr) {
                                          return connection.rollback(() => {
                                              connection.release();
                                              logger.error(`트랜잭션 커밋 오류: ${commitErr.message}`);
                                              sendResponse(res, 500, 'Transaction Error', { error: '트랜잭션 커밋에 실패했습니다.' });
                                          });
                                      }

                                      connection.release();
                                      logger.info(`Steam ID ${steamId}가 아이템 ${itemName}의 수량을 ${quantity}만큼 추가했습니다.`);
                                      sendResponse(res, 200, 'Success', { message: '아이템이 성공적으로 등록되었습니다.', itemId: existingItem.id });
                                  });
                              });
                          });
                      } else {
                          // 존재하지 않는 경우 새로 등록
                          const registerItemQuery = `
                              INSERT INTO marketplace_items (steam_id, item_name, price, quantity, created_at)
                              VALUES (?, ?, ?, ?, NOW())
                          `;
                          connection.query(registerItemQuery, [steamId, itemName, price, quantity], (registerErr, registerResults) => {
                              if (registerErr) {
                                  return connection.rollback(() => {
                                      connection.release();
                                      logger.error(`아이템 등록 오류: ${registerErr.message}`);
                                      sendResponse(res, 500, 'Database Error', { error: '아이템 등록에 실패했습니다.' });
                                  });
                              }

                              // `online_storage`에서 아이템 수량 감소
                              const updateStorageQuery = `
                                  UPDATE online_storage
                                  SET ?? = ?? - ?
                                  WHERE steam_id = ?
                              `;
                              connection.query(updateStorageQuery, [itemName, itemName, quantity, steamId], (storageErr) => {
                                  if (storageErr) {
                                      return connection.rollback(() => {
                                          connection.release();
                                          logger.error(`온라인 스토리지 업데이트 오류: ${storageErr.message}`);
                                          sendResponse(res, 500, 'Database Error', { error: '온라인 스토리지 업데이트에 실패했습니다.' });
                                      });
                                  }

                                  // 트랜잭션 커밋
                                  connection.commit((commitErr) => {
                                      if (commitErr) {
                                          return connection.rollback(() => {
                                              connection.release();
                                              logger.error(`트랜잭션 커밋 오류: ${commitErr.message}`);
                                              sendResponse(res, 500, 'Transaction Error', { error: '트랜잭션 커밋에 실패했습니다.' });
                                          });
                                      }

                                      connection.release();
                                      logger.info(`Steam ID ${steamId}가 아이템 ${itemName}을 판매 목록에 등록했습니다.`);
                                      sendResponse(res, 200, 'Success', { message: '아이템이 성공적으로 등록되었습니다.', itemId: registerResults.insertId });
                                  });
                              });
                          });
                      }
                  });
              });
          });
      });
  }
];

// 거래소 아이템 조회 엔드포인트
exports.getMarketplaceItems = [
    (req, res) => {
        const { itemName, minPrice, maxPrice } = req.query;

        let query = 'SELECT * FROM marketplace_items';
        const params = [];

        const conditions = [];
        if (itemName) {
            conditions.push('item_name LIKE ?');
            params.push(`%${itemName}%`);
        }
        if (minPrice) {
            conditions.push('price >= ?');
            params.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            conditions.push('price <= ?');
            params.push(parseFloat(maxPrice));
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        db.pool.query(query, params, (err, results) => {
            if (err) {
                logger.error(`Error fetching marketplace items: ${err.message}`);
                return sendResponse(res, 500, 'Database Error', { error: 'Failed to fetch items' });
            }

            sendResponse(res, 200, 'Success', { items: results });
        });
    }
];

// controllers/tradeController.js

// controllers/tradeController.js

exports.purchaseItem = [
  (req, res) => {
      const { steamId } = req.user;
      const { itemId, quantity } = req.body;

      if (!itemId || !quantity) {
          return sendResponse(res, 400, 'Invalid Data', { error: '아이템 ID와 수량은 필수입니다.' });
      }

      // 트랜잭션 시작
      db.pool.getConnection((connectionErr, connection) => {
          if (connectionErr) {
              logger.error(`MySQL pool error: ${connectionErr.message}`);
              return sendResponse(res, 500, 'Database Error', { error: '아이템 구매에 실패했습니다.' });
          }

          connection.beginTransaction((transactionErr) => {
              if (transactionErr) {
                  connection.release();
                  logger.error(`트랜잭션 시작 오류: ${transactionErr.message}`);
                  return sendResponse(res, 500, 'Transaction Error', { error: '트랜잭션 시작에 실패했습니다.' });
              }

              // `marketplace_items`에서 아이템 조회
              const getItemQuery = `
                  SELECT * FROM marketplace_items WHERE id = ? FOR UPDATE
              `;
              connection.query(getItemQuery, [itemId], (getItemErr, itemResults) => {
                  if (getItemErr) {
                      return connection.rollback(() => {
                          connection.release();
                          logger.error(`아이템 조회 오류: ${getItemErr.message}`);
                          sendResponse(res, 500, 'Database Error', { error: '아이템 조회에 실패했습니다.' });
                      });
                  }

                  if (itemResults.length === 0) {
                      return connection.rollback(() => {
                          connection.release();
                          sendResponse(res, 404, 'Not Found', { error: '아이템을 찾을 수 없습니다.' });
                      });
                  }

                  const item = itemResults[0];
                  const sellerSteamId = item.steam_id;
                  const itemName = item.item_name;
                  const pricePerUnit = parseFloat(item.price);
                  const totalPrice = pricePerUnit * quantity;

                  if (steamId === sellerSteamId) {
                      return connection.rollback(() => {
                          connection.release();
                          sendResponse(res, 400, 'Invalid Operation', { error: '자신의 아이템은 구매할 수 없습니다.' });
                      });
                  }

                  // 구매자의 잔액 조회
                  const getBuyerBalanceQuery = `
                      SELECT sek_coin FROM user_data WHERE steam_id = ? FOR UPDATE
                  `;
                  connection.query(getBuyerBalanceQuery, [steamId], (buyerErr, buyerResults) => {
                      if (buyerErr) {
                          return connection.rollback(() => {
                              connection.release();
                              logger.error(`구매자 잔액 조회 오류: ${buyerErr.message}`);
                              sendResponse(res, 500, 'Database Error', { error: '구매자 정보 조회에 실패했습니다.' });
                          });
                      }

                      if (buyerResults.length === 0) {
                          return connection.rollback(() => {
                              connection.release();
                              sendResponse(res, 404, 'Not Found', { error: '구매자 정보를 찾을 수 없습니다.' });
                          });
                      }

                      const buyerBalance = parseFloat(buyerResults[0].sek_coin);

                      if (buyerBalance < totalPrice) {
                          return connection.rollback(() => {
                              connection.release();
                              sendResponse(res, 400, 'Insufficient Funds', { error: '잔액이 부족합니다.' });
                          });
                      }

                      // 판매자의 잔액 조회
                      const getSellerBalanceQuery = `
                          SELECT sek_coin FROM user_data WHERE steam_id = ? FOR UPDATE
                      `;
                      connection.query(getSellerBalanceQuery, [sellerSteamId], (sellerErr, sellerResults) => {
                          if (sellerErr) {
                              return connection.rollback(() => {
                                  connection.release();
                                  logger.error(`판매자 잔액 조회 오류: ${sellerErr.message}`);
                                  sendResponse(res, 500, 'Database Error', { error: '판매자 정보 조회에 실패했습니다.' });
                              });
                          }

                          if (sellerResults.length === 0) {
                              return connection.rollback(() => {
                                  connection.release();
                                  sendResponse(res, 404, 'Not Found', { error: '판매자 정보를 찾을 수 없습니다.' });
                              });
                          }

                          const sellerBalance = parseFloat(sellerResults[0].sek_coin);

                          // 구매자의 잔액 차감 및 판매자의 잔액 증가
                          const updateBalancesQuery = `
                              UPDATE user_data
                              SET sek_coin = CASE
                                  WHEN steam_id = ? THEN sek_coin - ?
                                  WHEN steam_id = ? THEN sek_coin + ?
                              END
                              WHERE steam_id IN (?, ?)
                          `;
                          const updateBalancesParams = [steamId, totalPrice, sellerSteamId, totalPrice, steamId, sellerSteamId];
                          connection.query(updateBalancesQuery, updateBalancesParams, (updateErr) => {
                              if (updateErr) {
                                  return connection.rollback(() => {
                                      connection.release();
                                      logger.error(`잔액 업데이트 오류: ${updateErr.message}`);
                                      sendResponse(res, 500, 'Database Error', { error: '잔액 업데이트에 실패했습니다.' });
                                  });
                              }

                              // `marketplace_items`에서 아이템 수량 업데이트 또는 삭제
                              if (item.quantity > quantity) {
                                  // 수량이 남아있는 경우 수량만 감소
                                  const newQuantity = parseFloat(item.quantity) - parseFloat(quantity);
                                  const updateMarketplaceQuery = `
                                      UPDATE marketplace_items
                                      SET quantity = ?
                                      WHERE id = ?
                                  `;
                                  connection.query(updateMarketplaceQuery, [newQuantity, itemId], (updateMarketplaceErr) => {
                                      if (updateMarketplaceErr) {
                                          return connection.rollback(() => {
                                              connection.release();
                                              logger.error(`마켓플레이스 아이템 업데이트 오류: ${updateMarketplaceErr.message}`);
                                              sendResponse(res, 500, 'Database Error', { error: '마켓플레이스 아이템 업데이트에 실패했습니다.' });
                                          });
                                      }

                                      // 구매자의 `online_storage`에 아이템 추가
                                      const addToStorageQuery = `
                                          UPDATE online_storage
                                          SET ?? = ?? + ?
                                          WHERE steam_id = ?
                                      `;
                                      connection.query(addToStorageQuery, [itemName, itemName, quantity, steamId], (storageErr) => {
                                          if (storageErr) {
                                              return connection.rollback(() => {
                                                  connection.release();
                                                  logger.error(`온라인 스토리지 업데이트 오류: ${storageErr.message}`);
                                                  sendResponse(res, 500, 'Database Error', { error: '온라인 스토리지 업데이트에 실패했습니다.' });
                                              });
                                          }

                                          // 트랜잭션 커밋
                                          connection.commit((commitErr) => {
                                              if (commitErr) {
                                                  return connection.rollback(() => {
                                                      connection.release();
                                                      logger.error(`트랜잭션 커밋 오류: ${commitErr.message}`);
                                                      sendResponse(res, 500, 'Transaction Error', { error: '트랜잭션 커밋에 실패했습니다.' });
                                                  });
                                              }

                                              connection.release();
                                              logger.info(`Steam ID ${steamId}가 아이템 ID ${itemId}를 ${quantity}개 구매했습니다.`);
                                              sendResponse(res, 200, 'Success', { message: '아이템을 성공적으로 구매했습니다.' });
                                          });
                                      });
                                  });
                              } else {
                                  // 수량이 부족하거나 정확히 구매하는 경우 아이템 삭제
                                  const deleteItemQuery = `
                                      DELETE FROM marketplace_items WHERE id = ?
                                  `;
                                  connection.query(deleteItemQuery, [itemId], (deleteErr) => {
                                      if (deleteErr) {
                                          return connection.rollback(() => {
                                              connection.release();
                                              logger.error(`아이템 삭제 오류: ${deleteErr.message}`);
                                              sendResponse(res, 500, 'Database Error', { error: '아이템 구매에 실패했습니다.' });
                                          });
                                      }

                                      // 구매자의 `online_storage`에 아이템 추가
                                      const addToStorageQuery = `
                                          UPDATE online_storage
                                          SET ?? = ?? + ?
                                          WHERE steam_id = ?
                                      `;
                                      connection.query(addToStorageQuery, [itemName, itemName, quantity, steamId], (storageErr) => {
                                          if (storageErr) {
                                              return connection.rollback(() => {
                                                  connection.release();
                                                  logger.error(`온라인 스토리지 업데이트 오류: ${storageErr.message}`);
                                                  sendResponse(res, 500, 'Database Error', { error: '온라인 스토리지 업데이트에 실패했습니다.' });
                                              });
                                          }

                                          // 트랜잭션 커밋
                                          connection.commit((commitErr) => {
                                              if (commitErr) {
                                                  return connection.rollback(() => {
                                                      connection.release();
                                                      logger.error(`트랜잭션 커밋 오류: ${commitErr.message}`);
                                                      sendResponse(res, 500, 'Transaction Error', { error: '트랜잭션 커밋에 실패했습니다.' });
                                                  });
                                              }

                                              connection.release();
                                              logger.info(`Steam ID ${steamId}가 아이템 ID ${itemId}를 ${quantity}개 구매했습니다.`);
                                              sendResponse(res, 200, 'Success', { message: '아이템을 성공적으로 구매했습니다.' });
                                          });
                                      });
                                  });
                              }
                          });
                      });
                  });
              });
          });
      });
  }
];
