# Node.js의 특정 버전(여기서는 16)을 사용하는 베이스 이미지
FROM node:16

# 작업 디렉토리를 설정

# package.json과 package-lock.json을 먼저 복사하여 종속성을 설치
COPY node/package.json ./

# 종속성 설치
RUN npm install

# 애플리케이션의 나머지 소스 코드를 복사
COPY . .

# 기본 포트를 노출
EXPOSE 8888

# 애플리케이션을 실행
CMD ["npm", "start"]
