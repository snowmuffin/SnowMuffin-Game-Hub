const logger = require('./logger');

// Drop table configuration
const dropTable = {
  PrototechFrame: 11, PrototechPanel: 4, PrototechCapacitor: 4, PrototechPropulsionUnit: 4,
  PrototechMachinery: 4, PrototechCircuitry: 4, PrototechCoolingUnit: 8,
  DefenseUpgradeModule_Level1: 1, DefenseUpgradeModule_Level2: 2, DefenseUpgradeModule_Level3: 3,
  DefenseUpgradeModule_Level4: 4, DefenseUpgradeModule_Level5: 5, DefenseUpgradeModule_Level6: 6,
  DefenseUpgradeModule_Level7: 7, DefenseUpgradeModule_Level8: 8, DefenseUpgradeModule_Level9: 9,
  DefenseUpgradeModule_Level10: 10,
  AttackUpgradeModule_Level1: 1, AttackUpgradeModule_Level2: 2, AttackUpgradeModule_Level3: 3,
  AttackUpgradeModule_Level4: 4, AttackUpgradeModule_Level5: 5, AttackUpgradeModule_Level6: 6,
  AttackUpgradeModule_Level7: 7, AttackUpgradeModule_Level8: 8, AttackUpgradeModule_Level9: 9,
  AttackUpgradeModule_Level10: 10,
  PowerEfficiencyUpgradeModule_Level1: 1, PowerEfficiencyUpgradeModule_Level2: 2, PowerEfficiencyUpgradeModule_Level3: 3,
  PowerEfficiencyUpgradeModule_Level4: 4, PowerEfficiencyUpgradeModule_Level5: 5, PowerEfficiencyUpgradeModule_Level6: 6,
  PowerEfficiencyUpgradeModule_Level7: 7, PowerEfficiencyUpgradeModule_Level8: 8, PowerEfficiencyUpgradeModule_Level9: 9,
  PowerEfficiencyUpgradeModule_Level10: 10,
  BerserkerModule_Level1: 11, BerserkerModule_Level2: 12, BerserkerModule_Level3: 13,
  BerserkerModule_Level4: 14, BerserkerModule_Level5: 15, BerserkerModule_Level6: 16,
  BerserkerModule_Level7: 17, BerserkerModule_Level8: 18, BerserkerModule_Level9: 19,
  BerserkerModule_Level10: 20,
  SpeedModule_Level1: 11, SpeedModule_Level2: 12, SpeedModule_Level3: 13,
  SpeedModule_Level4: 14, SpeedModule_Level5: 15, SpeedModule_Level6: 16,
  SpeedModule_Level7: 17, SpeedModule_Level8: 18, SpeedModule_Level9: 19,
  SpeedModule_Level10: 20,
  FortressModule_Level1: 11, FortressModule_Level2: 12, FortressModule_Level3: 13,
  FortressModule_Level4: 14, FortressModule_Level5: 15, FortressModule_Level6: 16,
  FortressModule_Level7: 17, FortressModule_Level8: 18, FortressModule_Level9: 19,
  FortressModule_Level10: 20,
  Prime_Matter: 3,prototech_scrap:3,
  dummy: 1 // Removed duplicate entries
};

// Function to determine item drop based on damage
function getDrop(damage) {
  logger.info(`getDrop called with damage: ${damage}`);

  const maxDropChance = 0.7; // Max drop chance 80%
  const dropChance = Math.min(damage / 62, maxDropChance);
  logger.debug(`Calculated dropChance: ${dropChance} (maxDropChance: ${maxDropChance})`);

  const randomChance = parseFloat(Math.random().toFixed(10));  // 소수점 10자리까지 정밀도 높이기
  logger.debug(`Generated random value: ${randomChance}`);

  if (randomChance > dropChance) {
    logger.info('No item dropped based on dropChance.');
    return null;
  }

  logger.info('Item will be dropped based on dropChance.');

  let adjustedWeights = {};
  let totalWeight = 0;

  for (const [item, rarity] of Object.entries(dropTable)) {
    const adjustedWeight = Math.pow(0.4, rarity);
    adjustedWeights[item] = parseFloat(adjustedWeight.toFixed(10)); // 소수점 10자리까지 정밀도 유지
    totalWeight += adjustedWeight;
    logger.debug(`Item: ${item}, Rarity: ${rarity}, Adjusted Weight: ${adjustedWeight}`);
  }

  // 총 가중치를 기준으로 정규화
  totalWeight = parseFloat(totalWeight.toFixed(10));
  for (const item in adjustedWeights) {
    adjustedWeights[item] = parseFloat((adjustedWeights[item] / totalWeight).toFixed(10));
    logger.debug(`Normalized Weight for ${item}: ${adjustedWeights[item]}`);
  }

  const randomValue = parseFloat(Math.random().toFixed(10));  // 소수점 10자리까지 정밀도 높이기
  logger.debug(`Second generated random value for item selection: ${randomValue}`);
  let accumulatedProbability = 0;

  for (const [item, probability] of Object.entries(adjustedWeights)) {
    accumulatedProbability = parseFloat((accumulatedProbability + probability).toFixed(10));
    logger.debug(`Accumulated Probability after ${item}: ${accumulatedProbability}`);

    if (randomValue <= accumulatedProbability) {
      logger.info(`Item dropped: ${item}`);
      return item;
    }
  }

  logger.warn('No item dropped after weight calculation. This should not happen.');
  return null;
}

module.exports = {
  getDrop,
  dropTable
};