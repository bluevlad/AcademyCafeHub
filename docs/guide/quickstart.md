# 빠른 시작 가이드 - 윌비스 게시글 분석

## 🚀 빠른 실행 (3단계)

### 1단계: 의존성 설치
```bash
# 서버 의존성
npm install

# 클라이언트 의존성
cd client
npm install
cd ..
```

### 2단계: 서버 실행
```bash
# 터미널 1
npm run server
```

### 3단계: 클라이언트 실행
```bash
# 터미널 2 (새 터미널)
cd client
npm start
```

## 📱 접속

브라우저가 자동으로 열리며 `http://localhost:3000/willvis-crawler`로 이동합니다.

**"📊 데이터 수집하기"** 버튼을 클릭하면 독공사 카페에서 윌비스 관련 게시글(2025년 10월~12월)을 수집합니다!

## 📊 확인할 수 있는 정보

### 통계
- 전체 게시글 수
- 월별 게시글 수 (10월, 11월, 12월)
- 총 조회수 및 평균 조회수
- 총 댓글 수 및 평균 댓글 수
- 최다 조회 게시글

### 게시글 목록
- 제목, 작성자, 작성일
- 조회수, 댓글 수
- 원문 링크 (클릭 시 네이버 카페로 이동)

## 🎯 설정 변경

기간, 키워드, 카페를 변경하려면 [client/src/components/WillvisCrawler.js](client/src/components/WillvisCrawler.js) 파일을 수정하세요:

```javascript
const CAFE_URL = 'https://cafe.naver.com/m2school';  // 카페 변경
const KEYWORD = '윌비스';                              // 키워드 변경
const START_DATE = '2025-10-01';                       // 시작 날짜
const END_DATE = '2025-12-31';                         // 종료 날짜
```

## 📚 상세 문서

- [크롤러 가이드](CRAWLER_GUIDE.md)
- [윌비스 기능 가이드](WILLVIS_FEATURE_GUIDE.md)
- [개발 가이드](CLAUDE.md)

## ⚠️ 문제 해결

### 서버 오류 메시지가 나올 때
→ 터미널에서 `npm run server`가 실행 중인지 확인

### 게시글이 수집되지 않을 때
→ 서버 로그를 확인하거나 네이버 카페 접속 상태 확인

### Puppeteer 설치 오류
```bash
npm install puppeteer --ignore-scripts=false
```

---

**즐거운 분석 되세요! 🎉**
