# AcademyInsight

학원 온라인 평판 분석 시스템 - 주요 커뮤니티에서 학원/강사 관련 게시글을 자동 수집하고 분석하는 대시보드

## 시스템 구성

| 서비스 | 기술 | 포트 |
|--------|------|------|
| Frontend | React 18 + Nginx | 4020 |
| Backend | Node.js + Express | 8082 |
| Database | MongoDB 6 | 27017 (내부) |

## 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 기본 브랜치 (개발/통합) |
| `prod` | 운영 배포 (`push` 시 GitHub Actions 자동 배포) |

## 주요 기능

- **멀티 소스 크롤링**: 네이버 카페, 다음 카페, 디시인사이드
- **멀티 학원 관리**: 박문각, 에듀윌, 해커스, 공단기, 윌비스 등
- **관리자 대시보드**: 학원별 게시글 현황, 크롤링 상태 모니터링
- **감성 분석 (예정)**: AI 기반 긍정/부정 여론 분석

## 빠른 시작

### Docker Compose (운영)

```bash
git clone https://github.com/bluevlad/AcademyInsight.git
cd AcademyInsight
docker compose up -d
```

- Frontend: http://localhost:4020
- Backend API: http://localhost:8082

### 로컬 개발 (Docker 없이)

```bash
# 의존성 설치
npm run install-all

# 서버 + 클라이언트 동시 실행
npm run dev
```

## Docker 서비스

```yaml
# 컨테이너명
academyinsight-backend    # Backend API
academyinsight-frontend   # Frontend (Nginx)
academyinsight-mongo      # MongoDB
```

## 운영 배포

`prod` 브랜치에 push하면 GitHub Actions (self-hosted runner `insight-mac`)가 자동 배포합니다.

```bash
# main → prod 배포
git push origin main:prod
```

### 배포 워크플로우
1. Docker 이미지 빌드 (`--no-cache`)
2. 기존 컨테이너 중지
3. 새 컨테이너 기동
4. Health Check (Backend + Frontend)
5. Slack 알림

## 환경 변수

`.env.example`을 참고하여 `.env` 파일을 생성합니다.

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/academyinsight
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
```

## 로컬 개발 환경 제외 파일

| 파일/폴더 | 설명 |
|-----------|------|
| `.env` | 환경 변수 (DB 비밀번호, API 키 등) |
| `node_modules/` | npm 패키지 |
| `package-lock.json` | npm 의존성 잠금 파일 |
| `/debug/` | 디버그 관련 파일 |

## API 엔드포인트

```
POST /api/auth/login              # 로그인
POST /api/auth/register           # 회원가입
GET  /api/academies               # 학원 목록
GET  /api/crawl-sources           # 크롤링 소스 목록
POST /api/crawler/crawl           # 크롤링 실행
GET  /api/posts                   # 게시글 목록
GET  /api/seed/init               # 초기 데이터 생성
```
