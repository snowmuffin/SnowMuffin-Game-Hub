const mysql = require('mysql2');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  supportBigNumbers: true,
  bigNumberStrings: true,
  connectionLimit: 20,
  queueLimit: 0
});

// Create items_info table to store item metadata
const createItemsInfoTable = `
  CREATE TABLE IF NOT EXISTS items_info (
    index_name VARCHAR(256) NOT NULL,
    display_name VARCHAR(256) DEFAULT NULL,
    category VARCHAR(256) DEFAULT NULL,
    description VARCHAR(256) DEFAULT NULL,
    rarity INT DEFAULT 0,
    quantity INT DEFAULT 0,
    PRIMARY KEY (index_name)
  );
`;

// Insert item data into items_info table
const insertItemsInfo = `
  INSERT INTO items_info (index_name, display_name, category, description, rarity) VALUES
    ('ore_stone', 'Stone', 'ore', 'ore_stone_description', 0),
    ('ore_iron', 'Iron', 'ore', 'ore_iron_description', 0),
    ('ore_nickel', 'Nickel', 'ore', 'ore_nickel_description', 0),
    ('ore_cobalt', 'Cobalt', 'ore', 'ore_cobalt_description', 0),
    ('ore_magnesium', 'Magnesium', 'ore', 'ore_magnesium_description', 0),
    ('ore_silicon', 'Silicon', 'ore', 'ore_silicon_description', 0),
    ('ore_silver', 'Silver', 'ore', 'ore_silver_description', 0),
    ('ore_gold', 'Gold', 'ore', 'ore_gold_description', 0),
    ('ore_platinum', 'Platinum', 'ore', 'ore_platinum_description', 0),
    ('ore_uranium', 'Uranium', 'ore', 'ore_uranium_description', 0),
    ('ore_ice', 'Ice', 'ore', 'ore_ice_description', 0),
    ('ore_scrap', 'Scrap', 'ore', 'ore_scrap_description', 0),
    ('ore_lanthanum', 'Lanthanum', 'ore', 'ore_lanthanum_description', 0),
    ('ore_cerium', 'Cerium', 'ore', 'ore_cerium_description', 0),
    ('Construction', 'Construction Component', 'component', 'construction_description', 0),
    ('MetalGrid', 'Metal Grid', 'component', 'metal_grid_description', 0),
    ('InteriorPlate', 'Interior Plate', 'component', 'interior_plate_description', 0),
    ('SteelPlate', 'Steel Plate', 'component', 'steel_plate_description', 0),
    ('Girder', 'Girder', 'component', 'girder_description', 0),
    ('SmallTube', 'Small Tube', 'component', 'small_tube_description', 0),
    ('LargeTube', 'Large Tube', 'component', 'large_tube_description', 0),
    ('Motor', 'Motor', 'component', 'motor_description', 0),
    ('Display', 'Display', 'component', 'display_description', 0),
    ('BulletproofGlass', 'Bulletproof Glass', 'component', 'bulletproof_glass_description', 0),
    ('Superconductor', 'Superconductor', 'component', 'superconductor_description', 0),
    ('Computer', 'Computer', 'component', 'computer_description', 0),
    ('Reactor', 'Reactor Component', 'component', 'reactor_description', 0),
    ('Thrust', 'Thruster Component', 'component', 'thrust_description', 0),
    ('GravityGenerator', 'Gravity Generator Component', 'component', 'gravity_generator_description', 0),
    ('Medical', 'Medical Component', 'component', 'medical_description', 0),
    ('RadioCommunication', 'Radio Communication Component', 'component', 'radio_communication_description', 0),
    ('Detector', 'Detector Component', 'component', 'detector_description', 0),
    ('Explosives', 'Explosives', 'component', 'explosives_description', 0),
    ('SolarCell', 'Solar Cell', 'component', 'solar_cell_description', 0),
    ('PowerCell', 'Power Cell', 'component', 'power_cell_description', 0),
    ('Canvas', 'Canvas', 'component', 'canvas_description', 0),
    ('EngineerPlushie', 'Engineer Plushie', 'misc', 'engineer_plushie_description', 0),
    ('SabiroidPlushie', 'Sabiroid Plushie', 'misc', 'sabiroid_plushie_description', 0),
    ('PrototechFrame', 'Prototech Frame', 'prototech', 'prototech_frame_description', 0),
    ('PrototechPanel', 'Prototech Panel', 'prototech', 'prototech_panel_description', 0),
    ('PrototechCapacitor', 'Prototech Capacitor', 'prototech', 'prototech_capacitor_description', 0),
    ('PrototechPropulsionUnit', 'Prototech Propulsion Unit', 'prototech', 'prototech_propulsion_description', 0),
    ('PrototechMachinery', 'Prototech Machinery', 'prototech', 'prototech_machinery_description', 0),
    ('PrototechCircuitry', 'Prototech Circuitry', 'prototech', 'prototech_circuitry_description', 0),
    ('PrototechCoolingUnit', 'Prototech Cooling Unit', 'prototech', 'prototech_cooling_unit_description', 0),
    ('DefenseUpgradeModule_Level1', 'Defense Upgrade Module Level 1', 'module', 'defense_upgrade_lvl1', 0),
    ('DefenseUpgradeModule_Level2', 'Defense Upgrade Module Level 2', 'module', 'defense_upgrade_lvl2', 0),
    ('DefenseUpgradeModule_Level3', 'Defense Upgrade Module Level 3', 'module', 'defense_upgrade_lvl3', 0),
    ('DefenseUpgradeModule_Level4', 'Defense Upgrade Module Level 4', 'module', 'defense_upgrade_lvl4', 0),
    ('DefenseUpgradeModule_Level5', 'Defense Upgrade Module Level 5', 'module', 'defense_upgrade_lvl5', 0),
    ('DefenseUpgradeModule_Level6', 'Defense Upgrade Module Level 6', 'module', 'defense_upgrade_lvl6', 0),
    ('DefenseUpgradeModule_Level7', 'Defense Upgrade Module Level 7', 'module', 'defense_upgrade_lvl7', 0),
    ('DefenseUpgradeModule_Level8', 'Defense Upgrade Module Level 8', 'module', 'defense_upgrade_lvl8', 0),
    ('DefenseUpgradeModule_Level9', 'Defense Upgrade Module Level 9', 'module', 'defense_upgrade_lvl9', 0),
    ('DefenseUpgradeModule_Level10', 'Defense Upgrade Module Level 10', 'module', 'defense_upgrade_lvl10', 0),
    ('AttackUpgradeModule_Level1', 'Attack Upgrade Module Level 1', 'module', 'attack_upgrade_lvl1', 0),
    ('AttackUpgradeModule_Level2', 'Attack Upgrade Module Level 2', 'module', 'attack_upgrade_lvl2', 0),
    ('AttackUpgradeModule_Level3', 'Attack Upgrade Module Level 3', 'module', 'attack_upgrade_lvl3', 0),
    ('AttackUpgradeModule_Level4', 'Attack Upgrade Module Level 4', 'module', 'attack_upgrade_lvl4', 0),
    ('AttackUpgradeModule_Level5', 'Attack Upgrade Module Level 5', 'module', 'attack_upgrade_lvl5', 0),
    ('AttackUpgradeModule_Level6', 'Attack Upgrade Module Level 6', 'module', 'attack_upgrade_lvl6', 0),
    ('AttackUpgradeModule_Level7', 'Attack Upgrade Module Level 7', 'module', 'attack_upgrade_lvl7', 0),
    ('AttackUpgradeModule_Level8', 'Attack Upgrade Module Level 8', 'module', 'attack_upgrade_lvl8', 0),
    ('AttackUpgradeModule_Level9', 'Attack Upgrade Module Level 9', 'module', 'attack_upgrade_lvl9', 0),
    ('AttackUpgradeModule_Level10', 'Attack Upgrade Module Level 10', 'module', 'attack_upgrade_lvl10', 0),
    ('BerserkerModule_Level1', 'Berserker Module Level 1', 'module', 'berserker_module_lvl1', 0),
    ('BerserkerModule_Level2', 'Berserker Module Level 2', 'module', 'berserker_module_lvl2', 0),
    ('BerserkerModule_Level3', 'Berserker Module Level 3', 'module', 'berserker_module_lvl3', 0),
    ('BerserkerModule_Level4', 'Berserker Module Level 4', 'module', 'berserker_module_lvl4', 0),
    ('BerserkerModule_Level5', 'Berserker Module Level 5', 'module', 'berserker_module_lvl5', 0),
    ('BerserkerModule_Level6', 'Berserker Module Level 6', 'module', 'berserker_module_lvl6', 0),
    ('BerserkerModule_Level7', 'Berserker Module Level 7', 'module', 'berserker_module_lvl7', 0),
    ('BerserkerModule_Level8', 'Berserker Module Level 8', 'module', 'berserker_module_lvl8', 0),
    ('BerserkerModule_Level9', 'Berserker Module Level 9', 'module', 'berserker_module_lvl9', 0),
    ('BerserkerModule_Level10', 'Berserker Module Level 10', 'module', 'berserker_module_lvl10', 0),
    ('SpeedModule_Level1', 'Speed Module Level 1', 'module', 'speed_module_lvl1', 0),
    ('SpeedModule_Level2', 'Speed Module Level 2', 'module', 'speed_module_lvl2', 0),
    ('SpeedModule_Level3', 'Speed Module Level 3', 'module', 'speed_module_lvl3', 0),
    ('SpeedModule_Level4', 'Speed Module Level 4', 'module', 'speed_module_lvl4', 0),
    ('SpeedModule_Level5', 'Speed Module Level 5', 'module', 'speed_module_lvl5', 0),
    ('SpeedModule_Level6', 'Speed Module Level 6', 'module', 'speed_module_lvl6', 0),
    ('SpeedModule_Level7', 'Speed Module Level 7', 'module', 'speed_module_lvl7', 0),
    ('SpeedModule_Level8', 'Speed Module Level 8', 'module', 'speed_module_lvl8', 0),
    ('SpeedModule_Level9', 'Speed Module Level 9', 'module', 'speed_module_lvl9', 0),
    ('SpeedModule_Level10', 'Speed Module Level 10', 'module', 'speed_module_lvl10', 0),
    ('FortressModule_Level1', 'Fortress Module Level 1', 'module', 'fortress_module_lvl1', 0),
    ('FortressModule_Level2', 'Fortress Module Level 2', 'module', 'fortress_module_lvl2', 0),
    ('FortressModule_Level3', 'Fortress Module Level 3', 'module', 'fortress_module_lvl3', 0),
    ('FortressModule_Level4', 'Fortress Module Level 4', 'module', 'fortress_module_lvl4', 0),
    ('FortressModule_Level5', 'Fortress Module Level 5', 'module', 'fortress_module_lvl5', 0),
    ('FortressModule_Level6', 'Fortress Module Level 6', 'module', 'fortress_module_lvl6', 0),
    ('FortressModule_Level7', 'Fortress Module Level 7', 'module', 'fortress_module_lvl7', 0),
    ('FortressModule_Level8', 'Fortress Module Level 8', 'module', 'fortress_module_lvl8', 0),
    ('FortressModule_Level9', 'Fortress Module Level 9', 'module', 'fortress_module_lvl9', 0),
    ('FortressModule_Level10', 'Fortress Module Level 10', 'module', 'fortress_module_lvl10', 0),
    ('prototech_scrap', 'Prototech Scrap', 'scrap', 'prototech_scrap_description', 0),
    ('ingot_stone', 'Stone Ingot', 'ingot', 'ingot_stone_description', 0),
    ('ingot_iron', 'Iron Ingot', 'ingot', 'ingot_iron_description', 0),
    ('ingot_nickel', 'Nickel Ingot', 'ingot', 'ingot_nickel_description', 0),
    ('ingot_cobalt', 'Cobalt Ingot', 'ingot', 'ingot_cobalt_description', 0),
    ('ingot_magnesium', 'Magnesium Ingot', 'ingot', 'ingot_magnesium_description', 0),
    ('ingot_silicon', 'Silicon Ingot', 'ingot', 'ingot_silicon_description', 0),
    ('ingot_silver', 'Silver Ingot', 'ingot', 'ingot_silver_description', 0),
    ('ingot_gold', 'Gold Ingot', 'ingot', 'ingot_gold_description', 0),
    ('ingot_platinum', 'Platinum Ingot', 'ingot', 'ingot_platinum_description', 0),
    ('ingot_uranium', 'Uranium Ingot', 'ingot', 'ingot_uranium_description', 0),
    ('Prime_Matter', 'Prime Matter', 'misc', 'prime_matter_description', 0)
    ON DUPLICATE KEY UPDATE
      display_name = VALUES(display_name),
      category = VALUES(category),
      description = VALUES(description),
      rarity = VALUES(rarity),
      quantity = VALUES(quantity);
`;
// Create online_storage table based on items_info table
function createOnlineStorageTableFromItemsInfo() {
  pool.query('SELECT index_name FROM items_info', (err, results) => {
    if (err) {
      logger.error(`Error fetching items_info: ${err.message}`);
      return;
    }

    // Create columns based on items_info entries
    let columns = results.map((row) => `${row.index_name} FLOAT DEFAULT 0`).join(', ');
    const createOnlineStorageTable = `
      CREATE TABLE IF NOT EXISTS online_storage (
        steam_id BIGINT NOT NULL,
        ${columns},
        PRIMARY KEY (steam_id)
      );
    `;

    pool.query(createOnlineStorageTable, (err) => {
      if (err) {
        logger.error(`Error creating online_storage table from items_info: ${err.message}`);
        return;
      }
      logger.info('online_storage table has been verified or successfully created based on items_info.');
    });
  });
}

// Database connection and initialization
pool.getConnection((err) => {
  if (err) {
    logger.error(`MySQL pool error: ${err.message}`);
    return;
  }
  logger.info('Successfully connected to MySQL.');

  const createMarketTable = `
    CREATE TABLE IF NOT EXISTS marketplace_items (
      id INT NOT NULL AUTO_INCREMENT,
      seller_steam_id BIGINT NOT NULL,
      seller_nickname VARCHAR(256) DEFAULT NULL,
      item_name VARCHAR(256) NOT NULL,
      price_per_unit INT UNSIGNED UNSIGNED NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `;
  const createtradelogTable = `
    CREATE TABLE IF NOT EXISTS tradelog (
      id INT NOT NULL AUTO_INCREMENT,
      seller_nickname VARCHAR(256) DEFAULT NULL,
      seller_steam_id BIGINT NOT NULL,
      buyer_steam_id BIGINT NOT NULL,
      buyer_nickname VARCHAR(256) DEFAULT NULL,
      item_name VARCHAR(256) NOT NULL,
      price_per_unit INT UNSIGNED UNSIGNED NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `;

  // Create items_info table
  pool.query(createItemsInfoTable, (err) => {
    if (err) {
      logger.error(`Error creating items_info table: ${err.message}`);
      return;
    }
    logger.info('items_info table has been verified or successfully created.');

    // Insert item data into items_info table
    pool.query(insertItemsInfo, (err) => {
      if (err) {
        logger.error(`Error inserting items into items_info table: ${err.message}`);
        return;
      }
      logger.info('Items have been inserted or updated in items_info table.');

      // Create online_storage table based on items_info
      createOnlineStorageTableFromItemsInfo();
    });
  });

  // Create marketplace_items table
  pool.query(createMarketTable, (err) => {
    if (err) {
      logger.error(`Error creating marketplace_items table: ${err.message}`);
      return;
    }
    logger.info('marketplace_items table has been verified or successfully created.');
  });

  // Create tradelog table
  pool.query(createtradelogTable, (err) => {
    if (err) {
      logger.error(`Error creating tradelog table: ${err.message}`);
      return;
    }
    logger.info('tradelog table has been verified or successfully created.');
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
