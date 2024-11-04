// utils/jwt.js
const jwt = require('jsonwebtoken');

/**
 * JWT 토큰을 생성하는 함수
 * @param {Object} payload - 토큰에 포함할 페이로드 데이터
 * @param {string} expiresIn - 토큰 만료 시간 (예: '2h', '1d')
 * @returns {string} 생성된 JWT 토큰
 */
const generateToken = (payload, expiresIn = '2h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * JWT 토큰을 검증하는 함수
 * @param {string} token - 검증할 JWT 토큰
 * @returns {Object} 토큰의 디코딩된 페이로드
 * @throws {Error} 유효하지 않은 토큰인 경우 오류 발생
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
