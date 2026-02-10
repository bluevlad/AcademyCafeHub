# 네이버 카페 크롤러 사용 가이드

## 개요
네이버 카페 https://cafe.naver.com/m2school 에서 "윌비스" 키워드로 최신 게시글을 자동으로 수집하는 크롤러 시스템입니다.

## 설치 방법

### 1. 의존성 설치
```bash
npm install
```

새로 추가된 패키지:
- `puppeteer`: 헤드리스 브라우저 자동화
- `cheerio`: HTML 파싱
- `axios`: HTTP 요청

### 2. 서버 실행
```bash
# 개발 모드
npm run server

# 또는 직접 실행
node server/server.js
```

서버는 기본적으로 `http://localhost:5000` 에서 실행됩니다.

## API 사용법

### 1. 키워드로 게시글 검색

**엔드포인트:** `GET /api/crawler/naver-cafe/search`

**Query Parameters:**
- `cafeUrl` (필수): 네이버 카페 URL (예: `https://cafe.naver.com/m2school`)
- `keyword` (필수): 검색 키워드 (예: `윌비스`)
- `maxResults` (선택): 최대 결과 수 (기본값: 10)

**예시:**
```bash
# cURL 사용
curl "http://localhost:5000/api/crawler/naver-cafe/search?cafeUrl=https://cafe.naver.com/m2school&keyword=윌비스&maxResults=10"

# 브라우저에서 직접 접근
http://localhost:5000/api/crawler/naver-cafe/search?cafeUrl=https://cafe.naver.com/m2school&keyword=윌비스&maxResults=10
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "cafeUrl": "https://cafe.naver.com/m2school",
    "keyword": "윌비스",
    "totalResults": 5,
    "posts": [
      {
        "title": "윌비스 행정법 후기",
        "url": "https://cafe.naver.com/m2school/12345",
        "author": "홍길동",
        "postedAt": "2024.01.06",
        "viewCount": 152,
        "commentCount": 8,
        "keyword": "윌비스",
        "source": "naver_cafe",
        "cafeUrl": "https://cafe.naver.com/m2school",
        "collectedAt": "2024-01-06T02:30:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-06T02:30:00.000Z"
}
```

### 2. 게시글 상세 정보 가져오기

**엔드포인트:** `GET /api/crawler/naver-cafe/post-detail`

**Query Parameters:**
- `articleUrl` (필수): 게시글 URL

**예시:**
```bash
curl "http://localhost:5000/api/crawler/naver-cafe/post-detail?articleUrl=https://cafe.naver.com/m2school/12345"
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "title": "윌비스 행정법 후기",
    "author": "홍길동",
    "postedAt": "2024.01.06 14:30",
    "content": "<div>게시글 HTML 내용...</div>",
    "viewCount": 152,
    "comments": [
      {
        "author": "김철수",
        "content": "좋은 정보 감사합니다!",
        "commentedAt": "2024.01.06 15:00"
      }
    ],
    "url": "https://cafe.naver.com/m2school/12345"
  },
  "timestamp": "2024-01-06T02:30:00.000Z"
}
```

### 3. 여러 키워드로 동시 검색

**엔드포인트:** `POST /api/crawler/naver-cafe/batch-search`

**Request Body:**
```json
{
  "cafeUrl": "https://cafe.naver.com/m2school",
  "keywords": ["윌비스", "메가공무원", "해커스"],
  "maxResults": 5
}
```

**예시:**
```bash
curl -X POST http://localhost:5000/api/crawler/naver-cafe/batch-search \
  -H "Content-Type: application/json" \
  -d '{
    "cafeUrl": "https://cafe.naver.com/m2school",
    "keywords": ["윌비스", "메가공무원"],
    "maxResults": 5
  }'
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "cafeUrl": "https://cafe.naver.com/m2school",
    "keywords": ["윌비스", "메가공무원"],
    "results": {
      "윌비스": {
        "success": true,
        "totalResults": 5,
        "posts": [...]
      },
      "메가공무원": {
        "success": true,
        "totalResults": 3,
        "posts": [...]
      }
    }
  },
  "timestamp": "2024-01-06T02:30:00.000Z"
}
```

## 직접 테스트

### 테스트 스크립트 실행
```bash
node test-crawler.js
```

이 스크립트는:
1. "윌비스" 키워드로 게시글 검색
2. 검색 결과 출력
3. 첫 번째 게시글의 상세 정보 가져오기
4. 댓글 정보 출력

### 코드에서 직접 사용

```javascript
const NaverCafeCrawler = require('./server/services/naverCafeCrawler');

async function example() {
  const crawler = new NaverCafeCrawler('https://cafe.naver.com/m2school');

  try {
    // 게시글 검색
    const posts = await crawler.searchPosts('윌비스', 10);
    console.log(`총 ${posts.length}개의 게시글 찾음`);

    // 게시글 상세 정보
    if (posts.length > 0 && posts[0].url) {
      const detail = await crawler.getPostDetail(posts[0].url);
      console.log('제목:', detail.title);
      console.log('댓글 수:', detail.comments.length);
    }
  } finally {
    await crawler.close(); // 반드시 브라우저 종료
  }
}

example();
```

## 프론트엔드에서 사용 예시

### React 컴포넌트 예시

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function CafeCrawler() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchPosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/crawler/naver-cafe/search', {
        params: {
          cafeUrl: 'https://cafe.naver.com/m2school',
          keyword: '윌비스',
          maxResults: 10
        }
      });

      if (response.data.success) {
        setPosts(response.data.data.posts);
      }
    } catch (error) {
      console.error('크롤링 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={searchPosts} disabled={loading}>
        {loading ? '검색 중...' : '윌비스 게시글 검색'}
      </button>

      <div>
        {posts.map((post, index) => (
          <div key={index} style={{ border: '1px solid #ddd', margin: '10px', padding: '10px' }}>
            <h3>{post.title}</h3>
            <p>작성자: {post.author} | 작성일: {post.postedAt}</p>
            <p>조회수: {post.viewCount} | 댓글: {post.commentCount}</p>
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              원문 보기
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CafeCrawler;
```

## 주의사항

### 1. 성능 고려사항
- Puppeteer는 크롬 브라우저를 실행하므로 메모리를 많이 사용합니다
- 동시에 많은 요청을 보내면 서버 부하가 발생할 수 있습니다
- 크롤링 후 반드시 `crawler.close()`를 호출하여 브라우저를 종료해야 합니다

### 2. 법적 고려사항
- 네이버 카페 이용약관 확인 필요
- 로봇 배제 표준(robots.txt) 준수
- 수집한 데이터의 저작권 유의
- 개인정보 보호법 준수 (작성자 정보 익명화 권장)

### 3. 기술적 제약
- 네이버 카페의 HTML 구조가 변경되면 선택자 수정 필요
- 로그인이 필요한 카페는 추가 구현 필요
- IP 차단 방지를 위해 요청 간 딜레이 권장
- 동적 콘텐츠 로딩에 시간이 소요될 수 있음

### 4. 에러 처리
- 네트워크 타임아웃: 30초 설정됨
- 페이지 로딩 실패 시 자동으로 API 방식으로 재시도
- 브라우저 크래시 시 자동 재시작 필요 (추후 구현)

## 트러블슈팅

### Puppeteer 설치 실패
```bash
# Windows
npm install puppeteer --ignore-scripts=false

# 또는 환경 변수 설정
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
npm install
```

### 브라우저 실행 오류
```javascript
// headless 모드 비활성화 (디버깅용)
const browser = await puppeteer.launch({
  headless: false, // 브라우저 창을 실제로 열어서 확인
  devtools: true
});
```

### 크롤링 결과가 없을 때
1. 네이버 카페 접속 확인 (브라우저에서 직접)
2. 키워드가 정확한지 확인
3. 카페가 비공개가 아닌지 확인
4. HTML 구조가 변경되었는지 확인

### 서버 메모리 부족
- Docker 사용 시 메모리 제한 늘리기
- 동시 크롤링 수 제한
- 크롤링 후 브라우저 즉시 종료

## 향후 개선 방향

1. **캐싱 시스템**
   - Redis를 활용한 결과 캐싱
   - 동일 키워드 재요청 시 캐시에서 반환

2. **스케줄링**
   - Celery/Bull을 활용한 주기적 크롤링
   - 크론잡으로 자동 수집

3. **데이터베이스 저장**
   - MongoDB에 수집 결과 저장
   - 히스토리 관리 및 트렌드 분석

4. **알림 기능**
   - 새 게시글 발견 시 이메일/SMS 알림
   - Webhook 지원

5. **프록시 지원**
   - IP 차단 방지를 위한 프록시 로테이션
   - User-Agent 랜덤화

6. **감성 분석**
   - AI를 활용한 긍정/부정 분석
   - 키워드 추출 및 워드 클라우드

## 문의 및 기여
이슈나 개선 사항은 GitHub Issues에 등록해 주세요.
