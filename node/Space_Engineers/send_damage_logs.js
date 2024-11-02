// send_damage_logs.js
require('dotenv').config(); // 환경 변수 로드
const axios = require('axios');

// 서버 설정
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000/api/damage_logs'; // 환경 변수로 설정 가능

// 반복 횟수 및 지연 시간 설정
const NUM_REQUESTS = 1111; // 보낼 요청의 총 개수
const DELAY_MS = 1;      // 각 요청 사이의 지연 시간 (밀리초)

// 데미지 로그 데이터 생성 함수
function generateDamageLog(steam_id, damage) {
  return {
    steam_id: steam_id.toString(),
    damage: damage
  };
}

// 반복적으로 POST 요청 보내기
async function sendDamageLogs() {
  for (let i = 0; i < NUM_REQUESTS; i++) {
    const steam_id = `1`; // 예시 Steam ID, 필요에 따라 수정
    const damage = Math.floor(Math.random() * 100); // 0~99 사이의 랜덤 데미지

    const damageLog = generateDamageLog(steam_id, damage);

    try {
      const response = await axios.post(SERVER_URL, [damageLog], {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`Request ${i + 1}: 성공 - Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
    } catch (error) {
      if (error.response) {
        console.error(`Request ${i + 1}: 실패 - Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}, Headers: ${JSON.stringify(error.response.headers)}`);
      } else {
        console.error(`Request ${i + 1}: 실패 - ${error.message}`);
      }
    }

    // 지연 시간 적용
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
}

sendDamageLogs();
