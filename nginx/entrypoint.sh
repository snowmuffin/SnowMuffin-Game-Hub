#!/bin/sh

# 환경 변수를 사용해 Nginx 설정 파일 생성
envsubst '${DOMAIN}'< /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Nginx 시작
nginx -g 'daemon off;'