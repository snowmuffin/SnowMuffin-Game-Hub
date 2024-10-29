// logger.js
const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

// 로그 디렉토리 설정
const logDir = 'logs';

// 로그 디렉토리 존재 여부 확인 및 생성
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 사용자 정의 로그 포맷
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// "Dropped item" 필터 포맷
const filterDroppedItems = format((info) => {
  if (info.message.includes('Dropped item')) {
    return info;
  }
  return false;
});

// 로거 생성
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info', // 환경 변수로 로그 레벨 설정 가능
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // 에러 객체의 스택 트레이스를 로그에 포함
    logFormat
  ),
  transports: [
    // 콘솔 로그
    new transports.Console({
      format: combine(
        colorize({ all: true }), // 색상 적용
        logFormat
      )
    }),
    // 에러 로그 파일
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error', // 에러 레벨 이상의 로그만 기록
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      )
    }),
    // 모든 로그를 기록하는 파일
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      )
    }),
    // "Dropped item" 로그만을 기록하는 파일
    new transports.File({
      filename: path.join(logDir, 'dropped_items.log'),
      level: 'info', // 'info' 레벨 이상의 로그만 기록
      format: combine(
        filterDroppedItems(), // "Dropped item" 메시지만 통과
        logFormat
      )
    })
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(logDir, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(logDir, 'rejections.log') })
  ],
  exitOnError: false, // 에러 발생 시 프로세스 종료 방지
});

// 환경에 따라 추가 콘솔 로그 설정 (개발 환경)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize({ all: true }),
      logFormat
    )
  }));
}

module.exports = logger;
