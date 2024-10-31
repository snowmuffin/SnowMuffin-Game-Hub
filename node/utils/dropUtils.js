const logger = require('./logger');

// Drop table configuration
const dropTable = {
  PrototechFrame: 11,
  PrototechPanel: 4,
  // ...(생략) 모든 항목 포함
  SpaceCredit: 1 // Removed duplicate entries
};

// Function to determine item drop based on damage
function getDrop(damage) {
  logger.info(`getDrop called with damage: ${damage}`);

  const maxDropChance = 0.8; // Max drop chance 80%
  const dropChance = Math.min(damage / 62, maxDropChance);
  logger.debug(`Calculated dropChance: ${dropChance} (maxDropChance: ${maxDropChance})`);

  const randomChance = Math.random();
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
    adjustedWeights[item] = adjustedWeight;
    totalWeight += adjustedWeight;
    logger.debug(`Item: ${item}, Rarity: ${rarity}, Adjusted Weight: ${adjustedWeight}`);
  }

  for (const item in adjustedWeights) {
    adjustedWeights[item] /= totalWeight;
    logger.debug(`Normalized Weight for ${item}: ${adjustedWeights[item]}`);
  }

  const randomValue = Math.random();
  logger.debug(`Second generated random value for item selection: ${randomValue}`);
  let accumulatedProbability = 0;

  for (const [item, probability] of Object.entries(adjustedWeights)) {
    accumulatedProbability += probability;
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
