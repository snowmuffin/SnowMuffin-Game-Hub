const mysql = require('mysql2');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  supportBigNumbers: true,
  bigNumberStrings: true,
  connectionLimit: 10 // 풀의 최대 연결 수 (필요에 따라 조정 가능)
});

pool.getConnection((err) => {
  if (err) {
    logger.error(`MySQL pool error: ${err.message}`);
    return;
  }
  logger.info('Successfully connected to MySQL.');

  // Initialize tables
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS user_data (
      steam_id BIGINT NOT NULL,
      nickname VARCHAR(256) DEFAULT NULL,
      sek_coin FLOAT DEFAULT 0,
      total_damage FLOAT DEFAULT 0,
      PRIMARY KEY (steam_id)
    );
  `;

  const createOnlineStorageTable = `
    CREATE TABLE IF NOT EXISTS online_storage (
      steam_id BIGINT NOT NULL,
      ore_stone FLOAT DEFAULT 0,
      ore_iron FLOAT DEFAULT 0,
      ore_nickel FLOAT DEFAULT 0,
      ore_cobalt FLOAT DEFAULT 0,
      ore_magnesium FLOAT DEFAULT 0,
      ore_silicon FLOAT DEFAULT 0,
      ore_silver FLOAT DEFAULT 0,
      ore_gold FLOAT DEFAULT 0,
      ore_platinum FLOAT DEFAULT 0,
      ore_uranium FLOAT DEFAULT 0,
      ore_ice FLOAT DEFAULT 0,
      ore_scrap FLOAT DEFAULT 0,
      ore_lanthanum FLOAT DEFAULT 0,
      ore_cerium FLOAT DEFAULT 0,
      Construction INT DEFAULT 0,
      MetalGrid INT DEFAULT 0,
      InteriorPlate INT DEFAULT 0,
      SteelPlate INT DEFAULT 0,
      Girder INT DEFAULT 0,
      SmallTube INT DEFAULT 0,
      LargeTube INT DEFAULT 0,
      Motor INT DEFAULT 0,
      Display INT DEFAULT 0,
      BulletproofGlass INT DEFAULT 0,
      Superconductor INT DEFAULT 0,
      Computer INT DEFAULT 0,
      Reactor INT DEFAULT 0,
      Thrust INT DEFAULT 0,
      GravityGenerator INT DEFAULT 0,
      Medical INT DEFAULT 0,
      RadioCommunication INT DEFAULT 0,
      Detector INT DEFAULT 0,
      Explosives INT DEFAULT 0,
      SolarCell INT DEFAULT 0,
      PowerCell INT DEFAULT 0,
      Canvas INT DEFAULT 0,
      EngineerPlushie INT DEFAULT 0,
      SabiroidPlushie INT DEFAULT 0,
      PrototechFrame INT DEFAULT 0,
      PrototechPanel INT DEFAULT 0,
      PrototechCapacitor INT DEFAULT 0,
      PrototechPropulsionUnit INT DEFAULT 0,
      PrototechMachinery INT DEFAULT 0,
      PrototechCircuitry INT DEFAULT 0,
      PrototechCoolingUnit INT DEFAULT 0,
      DefenseUpgradeModule_Level1 INT DEFAULT 0,
      DefenseUpgradeModule_Level2 INT DEFAULT 0,
      DefenseUpgradeModule_Level3 INT DEFAULT 0,
      DefenseUpgradeModule_Level4 INT DEFAULT 0,
      DefenseUpgradeModule_Level5 INT DEFAULT 0,
      DefenseUpgradeModule_Level6 INT DEFAULT 0,
      DefenseUpgradeModule_Level7 INT DEFAULT 0,
      DefenseUpgradeModule_Level8 INT DEFAULT 0,
      DefenseUpgradeModule_Level9 INT DEFAULT 0,
      DefenseUpgradeModule_Level10 INT DEFAULT 0,
      AttackUpgradeModule_Level1 INT DEFAULT 0,
      AttackUpgradeModule_Level2 INT DEFAULT 0,
      AttackUpgradeModule_Level3 INT DEFAULT 0,
      AttackUpgradeModule_Level4 INT DEFAULT 0,
      AttackUpgradeModule_Level5 INT DEFAULT 0,
      AttackUpgradeModule_Level6 INT DEFAULT 0,
      AttackUpgradeModule_Level7 INT DEFAULT 0,
      AttackUpgradeModule_Level8 INT DEFAULT 0,
      AttackUpgradeModule_Level9 INT DEFAULT 0,
      AttackUpgradeModule_Level10 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level1 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level2 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level3 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level4 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level5 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level6 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level7 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level8 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level9 INT DEFAULT 0,
      PowerEfficiencyUpgradeModule_Level10 INT DEFAULT 0,
      BerserkerModule_Level1 INT DEFAULT 0,
      BerserkerModule_Level2 INT DEFAULT 0,
      BerserkerModule_Level3 INT DEFAULT 0,
      BerserkerModule_Level4 INT DEFAULT 0,
      BerserkerModule_Level5 INT DEFAULT 0,
      BerserkerModule_Level6 INT DEFAULT 0,
      BerserkerModule_Level7 INT DEFAULT 0,
      BerserkerModule_Level8 INT DEFAULT 0,
      BerserkerModule_Level9 INT DEFAULT 0,
      BerserkerModule_Level10 INT DEFAULT 0,
      SpeedModule_Level1 INT DEFAULT 0,
      SpeedModule_Level2 INT DEFAULT 0,
      SpeedModule_Level3 INT DEFAULT 0,
      SpeedModule_Level4 INT DEFAULT 0,
      SpeedModule_Level5 INT DEFAULT 0,
      SpeedModule_Level6 INT DEFAULT 0,
      SpeedModule_Level7 INT DEFAULT 0,
      SpeedModule_Level8 INT DEFAULT 0,
      SpeedModule_Level9 INT DEFAULT 0,
      SpeedModule_Level10 INT DEFAULT 0,
      FortressModule_Level1 INT DEFAULT 0,
      FortressModule_Level2 INT DEFAULT 0,
      FortressModule_Level3 INT DEFAULT 0,
      FortressModule_Level4 INT DEFAULT 0,
      FortressModule_Level5 INT DEFAULT 0,
      FortressModule_Level6 INT DEFAULT 0,
      FortressModule_Level7 INT DEFAULT 0,
      FortressModule_Level8 INT DEFAULT 0,
      FortressModule_Level9 INT DEFAULT 0,
      FortressModule_Level10 INT DEFAULT 0,
      prototech_scrap FLOAT DEFAULT 0,
      ingot_stone FLOAT DEFAULT 0,
      ingot_iron FLOAT DEFAULT 0,
      ingot_nickel FLOAT DEFAULT 0,
      ingot_cobalt FLOAT DEFAULT 0,
      ingot_magnesium FLOAT DEFAULT 0,
      ingot_silicon FLOAT DEFAULT 0,
      ingot_silver FLOAT DEFAULT 0,
      ingot_gold FLOAT DEFAULT 0,
      ingot_platinum FLOAT DEFAULT 0,
      ingot_uranium FLOAT DEFAULT 0,
      Prime_Matter INT DEFAULT 0,
      PRIMARY KEY (steam_id)
    );
  `;
  // marketplace_items 테이블 생성 (id 컬럼 추가)
  const createMarketplaceItemsTable = `
    CREATE TABLE IF NOT EXISTS marketplace_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      steam_id BIGINT NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      quantity DECIMAL(10,2),
      price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (steam_id) REFERENCES user_data(steam_id)
    );
  `;
  pool.query(createMarketplaceItemsTable, (err) => {
    if (err) {
      logger.error(`Error creating marketplace_items table: ${err.message}`);
      return;
    }
    logger.info('marketplace_items table has been verified or successfully created.');
  });
  pool.query(createUserTable, (err) => {
    if (err) {
      logger.error(`Error creating user_data table: ${err.message}`);
      return;
    }
    logger.info('user_data table has been verified or successfully created.');
  });

  pool.query(createOnlineStorageTable, (err) => {
    if (err) {
      logger.error(`Error creating online_storage table: ${err.message}`);
      return;
    }
    logger.info('online_storage table has been verified or successfully created.');
  });
});

// Function to close connection
function endConnection(callback) {
  pool.end((err) => {
    if (err) {
      logger.error(`Error closing MySQL connection: ${err.message}`);
    } else {
      logger.info('MySQL connection closed successfully.');
    }
    if (callback) callback();
  });
}

module.exports = {
  pool,
  endConnection
};
