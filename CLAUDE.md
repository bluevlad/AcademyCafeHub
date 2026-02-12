# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 상위 `C:/GIT/CLAUDE.md`의 Git-First Workflow를 상속합니다.

## Project Overview

AcademyInsight - 학원 강사 온라인 평판 모니터링 시스템 (크롤링 → AI 감성 분석 → 대시보드)

## Environment

- **Database**: MongoDB 6 (Mongoose ODM)
- **Target Server**: MacBook Docker (172.30.1.72) / Windows 로컬 개발
- **Docker Strategy**: Docker Compose 운영 / 소스 직접 실행 로컬
- **Node.js**: Express 4 + React (CRA)

## Tech Stack

### Backend (server/)

| 항목 | 기술 |
|------|------|
| Language | JavaScript (Node.js) |
| Framework | Express 4.18 |
| Database | MongoDB 6 (Mongoose 8) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Crawler | Puppeteer 21 + puppeteer-extra (stealth, adblocker) |
| HTTP Client | Axios |
| Web Scraping | Cheerio |

### Frontend (client/)

| 항목 | 기술 |
|------|------|
| Framework | React (CRA) |
| HTTP Client | Axios |

## Setup and Run Commands

```bash
# 의존성 설치 (server + client)
npm run install-all

# 서버 + 클라이언트 동시 실행
npm run dev

# 서버만 실행
npm run server              # 프로덕션
npm run server:dev          # nodemon (개발)

# 클라이언트만 실행
npm run client

# Docker (운영)
docker compose up -d

# 운영 배포 (GitHub Actions 자동 트리거)
git push origin main:prod
```

### Port Mapping

| 서비스 | 로컬 | Docker (운영) |
|--------|------|---------------|
| Backend API | 5000 | 8082:8082 |
| Frontend | 3000 | 4020:4020 |
| MongoDB | 27017 | (내부) |

## Architecture Overview

```
server/
├── server.js          # Express 엔트리포인트
├── routes/            # API 라우트
├── services/          # 비즈니스 로직 (크롤러, 분석)
├── models/            # Mongoose 스키마
├── middleware/         # 인증 등 미들웨어
└── scripts/           # 유틸리티 스크립트

client/
└── src/               # React 애플리케이션
```

### 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 기본 브랜치 (개발/통합) |
| `prod` | 운영 배포 (push 시 GitHub Actions 자동 배포) |

## Do NOT

- 서버 주소, API 키, MongoDB URI 추측 금지 — 반드시 확인 후 사용
- 운영 Docker 컨테이너 직접 조작 금지 (academyinsight-backend, academyinsight-frontend, academyinsight-mongo)
- .env 파일 커밋 금지
- package.json에 없는 패키지를 설치 없이 require 금지
- 자격증명(비밀번호, API 키, JWT Secret)을 소스코드에 하드코딩하지 마라
- CORS에 origin: "*" 사용하지 마라 — 허용 Origin을 명시적으로 설정
- API 엔드포인트를 인증 없이 노출하지 마라
- console.log로 민감 정보(토큰, 비밀번호)를 출력하지 마라
- 포트 충돌 주의: 로컬 테스트 전 3000, 5000 포트 사용 여부 확인

## Required Environment Variables

```
PORT=8082               # 서버 포트
MONGODB_URI=            # MongoDB 연결 문자열
JWT_SECRET=             # JWT 서명 키
JWT_EXPIRE=7d           # JWT 만료 기간
NAVER_CLIENT_ID=        # 네이버 API
NAVER_CLIENT_SECRET=
CRAWL_ENABLED=true      # 크롤러 활성화
CRAWL_SCHEDULE=0 4 * * *  # 크론 스케줄 (매일 4시)
```

## Deployment

- **CI/CD**: GitHub Actions (prod 브랜치 push 시 자동 배포)
- **운영 포트**: Frontend 4020, Backend 8082
- **도메인**: insight.unmong.com
- **네트워크**: academyinsight-network

> 로컬 환경 정보는 `CLAUDE.local.md` 참조 (git에 포함되지 않음)
