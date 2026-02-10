# 윌비스 게시글 분석 기능 가이드

## 개요
독공사(https://cafe.naver.com/m2school) 카페에서 "윌비스" 키워드로 2025년 10월~12월에 등록된 게시글을 수집하고 분석하여 시각적으로 보여주는 기능입니다.

## 기능 특징

### 📊 주요 기능
1. **기간별 필터링** - 2025년 10월 1일 ~ 12월 31일 게시글만 수집
2. **통계 대시보드** - 월별 게시글 수, 조회수, 댓글 수 통계
3. **최다 조회 게시글** - 가장 인기있는 게시글 하이라이트
4. **게시글 목록** - 전체 게시글을 카드 형식으로 정리하여 표시
5. **실시간 수집** - 버튼 클릭 시 최신 데이터 수집

### 📈 제공되는 통계
- **전체 게시글 수** - 기간 내 총 게시글 수
- **월별 게시글 수** - 10월, 11월, 12월 각각의 게시글 수
- **총 조회수** - 모든 게시글의 조회수 합계
- **평균 조회수** - 게시글당 평균 조회수
- **총 댓글 수** - 모든 게시글의 댓글 수 합계
- **평균 댓글 수** - 게시글당 평균 댓글 수
- **최다 조회 게시글** - 가장 많은 조회수를 기록한 게시글

## 실행 방법

### 1. 의존성 설치

먼저 프로젝트의 모든 의존성을 설치합니다:

```bash
# 루트 디렉토리에서
npm install

# 클라이언트 디렉토리에서
cd client
npm install
```

### 2. 서버 실행

백엔드 서버를 실행합니다:

```bash
# 루트 디렉토리에서
npm run server
```

서버가 `http://localhost:5000`에서 실행됩니다.

### 3. 클라이언트 실행

새 터미널에서 프론트엔드를 실행합니다:

```bash
cd client
npm start
```

브라우저가 자동으로 `http://localhost:3000`을 열며, `/willvis-crawler` 페이지로 리다이렉트됩니다.

### 4. 기능 사용

1. **페이지 접속**: 브라우저에서 `http://localhost:3000/willvis-crawler` 접속
2. **데이터 수집**: "📊 데이터 수집하기" 버튼 클릭
3. **결과 확인**:
   - 통계 요약 섹션에서 전체 통계 확인
   - 게시글 목록 섹션에서 개별 게시글 확인
   - 게시글 제목 클릭 시 네이버 카페 원문으로 이동

## 화면 구성

### 1. 헤더 섹션
```
🎯 윌비스 게시글 분석
독공사 카페 | 2025년 10월 ~ 12월
```

### 2. 검색 정보 섹션
- 📍 카페: 독공사 (m2school)
- 🔍 키워드: 윌비스
- 📅 기간: 2025.10.01 ~ 2025.12.31

### 3. 통계 요약 섹션
```
┌─────────────┬─────────┬─────────┬─────────┐
│ 전체 게시글 │  10월   │  11월   │  12월   │
├─────────────┼─────────┼─────────┼─────────┤
│  총 조회수  │평균 조회│총 댓글수│평균 댓글│
└─────────────┴─────────┴─────────┴─────────┘

🏆 최다 조회 게시글
[게시글 제목]
👁️ 조회수 | 💬 댓글 | ✍️ 작성자 | 📅 날짜
```

### 4. 게시글 목록 섹션
```
📝 게시글 목록 (N개)

┌───────────────────────────────────────┐
│ #1                            10월    │
│ [게시글 제목]                         │
│ ✍️ 작성자 📅 날짜 👁️ 조회 💬 댓글   │
└───────────────────────────────────────┘
...
```

## API 엔드포인트

### GET /api/crawler/naver-cafe/search

날짜 필터링을 지원하는 게시글 검색 API

**Query Parameters:**
- `cafeUrl` (필수): 카페 URL
- `keyword` (필수): 검색 키워드
- `startDate` (선택): 시작 날짜 (YYYY-MM-DD 형식)
- `endDate` (선택): 종료 날짜 (YYYY-MM-DD 형식)
- `maxResults` (선택): 최대 결과 수 (기본값: 10)

**예시:**
```bash
curl "http://localhost:5000/api/crawler/naver-cafe/search?cafeUrl=https://cafe.naver.com/m2school&keyword=윌비스&startDate=2025-10-01&endDate=2025-12-31&maxResults=100"
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "cafeUrl": "https://cafe.naver.com/m2school",
    "keyword": "윌비스",
    "startDate": "2025-10-01",
    "endDate": "2025-12-31",
    "totalResults": 45,
    "posts": [
      {
        "title": "윌비스 행정법 후기",
        "url": "https://cafe.naver.com/m2school/12345",
        "author": "홍길동",
        "postedAt": "2025.10.15",
        "postedAtDate": "2025-10-15T00:00:00.000Z",
        "viewCount": 152,
        "commentCount": 8,
        "keyword": "윌비스",
        "source": "naver_cafe",
        "cafeUrl": "https://cafe.naver.com/m2school",
        "collectedAt": "2025-01-06T12:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-01-06T12:00:00.000Z"
}
```

## 파일 구조

```
AcademyInsight/
├── server/
│   ├── services/
│   │   └── naverCafeCrawler.js    # 날짜 필터링 기능 추가됨
│   └── routes/
│       └── crawler.js              # 날짜 파라미터 지원 추가됨
├── client/
│   └── src/
│       ├── components/
│       │   ├── WillvisCrawler.js   # 메인 컴포넌트 (새로 추가)
│       │   └── WillvisCrawler.css  # 스타일 (새로 추가)
│       └── App.js                  # 라우트 추가됨
└── WILLVIS_FEATURE_GUIDE.md        # 이 문서
```

## 주요 코드 설명

### 1. 날짜 필터링 (naverCafeCrawler.js)

```javascript
// 날짜 문자열을 Date 객체로 변환
parseDate(dateStr) {
  // "2025.10.15" 형식
  // "10.15" 형식 (올해)
  // "어제", "N시간 전" 등 상대적 표현 지원
}

// 검색 시 날짜 필터링 적용
async searchPosts(keyword, maxResults, options = {}) {
  // options.startDate, options.endDate로 필터링
}
```

### 2. 통계 계산 (WillvisCrawler.js)

```javascript
const calculateStats = (posts) => {
  // 월별 분류
  const monthlyData = { '10월': [], '11월': [], '12월': [] };

  // 조회수/댓글 집계
  const totalViews = posts.reduce((sum, post) => sum + post.viewCount, 0);
  const avgViews = totalViews / posts.length;

  // 최다 조회 게시글
  const topPost = posts.sort((a, b) => b.viewCount - a.viewCount)[0];
}
```

## 커스터마이징

### 기간 변경
[WillvisCrawler.js](client/src/components/WillvisCrawler.js) 파일에서 다음 상수를 수정:

```javascript
const START_DATE = '2025-10-01';  // 시작 날짜 변경
const END_DATE = '2025-12-31';    // 종료 날짜 변경
```

### 키워드 변경
```javascript
const KEYWORD = '윌비스';  // 다른 키워드로 변경
```

### 카페 변경
```javascript
const CAFE_URL = 'https://cafe.naver.com/m2school';  // 다른 카페 URL
```

### 최대 결과 수 변경
```javascript
maxResults: 100  // 원하는 숫자로 변경
```

### 스타일 커스터마이징
[WillvisCrawler.css](client/src/components/WillvisCrawler.css) 파일에서 색상, 레이아웃 등을 수정할 수 있습니다:

```css
/* 헤더 그라디언트 색상 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 통계 카드 색상 */
.stat-card.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## 주의사항

### 1. 크롤링 제약
- **네이버 카페 구조 변경**: HTML 구조가 변경되면 크롤러가 작동하지 않을 수 있습니다
- **IP 차단**: 과도한 요청 시 IP가 차단될 수 있으니 적절한 간격으로 사용하세요
- **로그인 필요 카페**: 비공개 카페는 로그인이 필요하므로 추가 구현이 필요합니다

### 2. 성능
- **처리 시간**: 100개 게시글 수집에 약 30초~1분 소요
- **메모리**: Puppeteer는 크롬 브라우저를 실행하므로 메모리를 많이 사용합니다
- **동시 요청**: 여러 사용자가 동시에 크롤링하면 서버 부하가 증가합니다

### 3. 날짜 파싱
- 네이버 카페의 날짜 형식은 다양합니다:
  - `2025.10.15` (전체 날짜)
  - `10.15` (올해)
  - `어제`
  - `5시간 전`
- 일부 형식은 정확하게 파싱되지 않을 수 있습니다

## 트러블슈팅

### 1. 서버 오류
```
⚠️ 서버 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.
```
**해결**: `npm run server`로 백엔드 서버가 실행 중인지 확인

### 2. CORS 오류
```
Access to XMLHttpRequest blocked by CORS policy
```
**해결**: [server/server.js](server/server.js)에 CORS가 설정되어 있는지 확인

### 3. 게시글이 수집되지 않음
- 네이버 카페 HTML 구조 변경 가능성
- 키워드 오타 확인
- 기간 내 실제 게시글이 있는지 확인

### 4. Puppeteer 설치 오류
```bash
# Windows
npm install puppeteer --ignore-scripts=false

# 또는 Chromium 수동 다운로드 비활성화
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install
```

## 향후 개선 사항

1. **데이터베이스 저장**
   - 수집한 데이터를 MongoDB에 저장
   - 히스토리 관리 및 트렌드 분석

2. **감성 분석**
   - AI를 활용한 게시글 긍정/부정 분석
   - "윌비스"에 대한 전반적인 여론 파악

3. **차트 시각화**
   - Chart.js로 월별 트렌드 그래프
   - 조회수/댓글 추이 분석

4. **자동 스케줄링**
   - 매일 자동으로 데이터 수집
   - 변화 추이 자동 리포팅

5. **알림 기능**
   - 새 게시글 등록 시 이메일 알림
   - 부정적 여론 급증 시 경고

6. **키워드 비교**
   - 여러 학원(윌비스, 메가공무원 등) 동시 분석
   - 경쟁사 비교 대시보드

## 기술 스택

### Backend
- **Node.js** + **Express**: REST API 서버
- **Puppeteer**: 헤드리스 브라우저 크롤링
- **Cheerio**: HTML 파싱

### Frontend
- **React**: UI 프레임워크
- **Axios**: HTTP 클라이언트
- **CSS3**: 반응형 디자인

## 라이선스 및 주의사항

- 이 도구는 교육 및 개인 사용 목적으로 제작되었습니다
- 네이버 카페 이용약관을 준수하여 사용하세요
- 수집한 데이터의 저작권은 원 작성자에게 있습니다
- 상업적 이용 시 법적 문제가 발생할 수 있습니다

## 문의

기능 개선 제안이나 버그 리포트는 GitHub Issues에 등록해 주세요.
