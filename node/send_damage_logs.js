// send_damage_logs.js
require('dotenv').config(); // 환경 변수 로드
const axios = require('axios');

// 서버 설정
const SERVER_URL = 'http://localhost:3000/api/damage_logs'; // 환경 변수로 설정 가능

// 반복 횟수 및 지연 시간 설정
const NUM_REQUESTS = 10000; // 보낼 요청의 총 개수
const BATCH_SIZE = 100; // 동시에 보낼 요청 개수

// 데미지 로그 데이터 생성 함수
function generateDamageLog(steam_id, damage) {
  return {
    steam_id: steam_id.toString(),
    damage: damage,
    server_id: 'A'
  };
}

// 병렬적으로 POST 요청 보내기
async function sendDamageLogs() {
  const steam_id = '76561198267339203'; // 예시 Steam ID, 필요에 따라 수정

  for (let i = 0; i < NUM_REQUESTS; i += BATCH_SIZE) {
    const batchRequests = [];

    for (let j = 0; j < BATCH_SIZE && i + j < NUM_REQUESTS; j++) {
      const damage = Math.floor(Math.random() * 50); // 0~99 사이의 랜덤 데미지
      const damageLog = generateDamageLog(steam_id, damage);

      const request = axios.post(SERVER_URL, [damageLog], {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      batchRequests.push(request);
    }

    try {
      const responses = await Promise.all(batchRequests);
      responses.forEach((response, index) => {
        console.log(`Request ${i + index + 1}: 성공 - Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
      });
    } catch (error) {
      if (error.response) {
        console.error(`Request 실패 - Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}, Headers: ${JSON.stringify(error.response.headers)}`);
      } else {
        console.error(`Request 실패 - ${error.message}`);
      }
    }
  }
}

sendDamageLogs();