// utils/gacha.js

const db = require('../config/database'); // 데이터베이스 설정 파일 경로
const logger = require('./logger'); // 로깅 설정 파일 경로

let cumulativeWeights = [];
let itemList = [];
let totalWeight = 0;
const rarityMap = {};

/**
 * 사전에 누적 가중치를 계산하여 가중 랜덤 선택을 위한 준비
 * @param {Array} items - 아이템 배열 (index_name, rarity 포함)
 */
async function prepareWeightedRandom(items) {
    try {
        cumulativeWeights = [];
        itemList = [];
        totalWeight = 0;
        for (const key in rarityMap) {
            delete rarityMap[key];
        }

        // 레어도 >0인 아이템의 최대 가중치를 설정 (예: max_rarity_weight = 100)
        const max_rarity_weight = 100;

        items.forEach(item => {
            let weight;
            if (item.rarity === 0) {
                weight = 1; // 레어도 0인 아이템의 가중치 (가장 낮음)
            } else {
                weight = max_rarity_weight / item.rarity; // 레어도 >0인 아이템의 가중치
            }
            totalWeight += weight;
            cumulativeWeights.push(totalWeight);
            itemList.push(item.index_name);
            rarityMap[item.index_name] = item.rarity;
        });

    } catch (err) {
        logger.error(`Error preparing gacha weights: ${err.message}`);
        throw err;
    }
}

/**
 * 이진 탐색을 사용한 가중 랜덤 선택 함수
 * @param {Array} cumulativeWeights - 누적 가중치 배열
 * @param {Array} items - 아이템 리스트 배열
 * @param {Number} totalWeight - 전체 가중치 합
 * @returns {string} 선택된 아이템의 index_name
 */
function selectWeightedRandom(cumulativeWeights, items, totalWeight) {
    const randomWeight = Math.random() * totalWeight;
    let left = 0;
    let right = cumulativeWeights.length - 1;
    let selectedIndex = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (randomWeight < cumulativeWeights[mid]) {
            selectedIndex = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    return items[selectedIndex];
}

/**
 * 가챠 시스템을 초기화하여 아이템 데이터를 로드하고 가중치를 계산
 */
async function initializeGacha() {
    try {
        const [results, fields] = await db.pool.promise().query('SELECT * FROM items_info');

        if (!Array.isArray(results)) {
            logger.error('Query 결과가 배열이 아닙니다.');
            throw new Error('Invalid query result');
        }

        if (results.length === 0) {
            logger.error('items_info 테이블에 데이터가 없습니다.');
            throw new Error('No items in items_info table');
        }

        await prepareWeightedRandom(results);
        logger.info('Gacha system initialized successfully.');
    } catch (err) {
        logger.error(`Error initializing gacha system: ${err.message}`);
        throw err;
    }
}

/**
 * 가챠를 실행하여 드랍된 아이템을 반환
 * @returns {Object} 선택된 아이템 { index_name, rarity }
 */
function pullGacha() {
    if (itemList.length === 0 || cumulativeWeights.length === 0) {
        throw new Error('Gacha system not initialized. Call initializeGacha first.');
    }

    const selectedIndexName = selectWeightedRandom(cumulativeWeights, itemList, totalWeight);
    const selectedRarity = rarityMap[selectedIndexName];

    return { index_name: selectedIndexName, rarity: selectedRarity };
}

/**
 * 가챠 시스템을 리프레시하여 아이템 데이터를 다시 로드
 */
async function refreshGacha() {
    try {
        const [results, fields] = await db.pool.promise().query('SELECT * FROM items_info');

        if (!Array.isArray(results)) {
            logger.error('Query 결과가 배열이 아닙니다.');
            throw new Error('Invalid query result');
        }

        if (results.length === 0) {
            logger.error('items_info 테이블에 데이터가 없습니다.');
            throw new Error('No items in items_info table');
        }

        await prepareWeightedRandom(results);
        logger.info('Gacha system refreshed successfully.');
    } catch (err) {
        logger.error(`Error refreshing gacha system: ${err.message}`);
        throw err;
    }
}

module.exports = {
    initializeGacha,
    pullGacha,
    refreshGacha
};
