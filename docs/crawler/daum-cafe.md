# 다음 카페 크롤러 (DaumCafeCrawler) 리팩토링 가이드

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-10 | Puppeteer → HTTP(axios + cheerio) 전환, Kakao API fallback 추가 |

## 개요

다음 카페(cafe.daum.net)에서 키워드 기반으로 게시글을 수집하는 크롤러입니다.

### 리팩토링 배경

기존 Puppeteer 기반 크롤러는 다음과 같은 문제가 있었습니다:

| 문제 | 상세 |
|------|------|
| `/_search` 엔드포인트 차단 | 403 반환 (접근 불가) |
| 다음 통합검색 리다이렉트 | `search.daum.net` 카페 탭이 일반 검색으로 전환 |
| 샘플 데이터 fallback | 모든 검색이 실패하여 가짜 데이터만 생성 |
| 리소스 낭비 | Puppeteer 브라우저 인스턴스 메모리/CPU 소비 |

### 해결 방법

`m.cafe.daum.net/{cafeId}/search/all` 엔드포인트가 **서버사이드 렌더링 HTML**을 반환하므로, 단순 HTTP GET + cheerio 파싱으로 수집 가능합니다.

## 아키텍처

```
searchPosts(keyword)
  │
  ├─ 1순위: searchPostsHttp()
  │    └─ GET m.cafe.daum.net/{cafeId}/search/all?query={keyword}&sort=0&page={page}
  │    └─ cheerio로 HTML 파싱
  │
  ├─ 2순위: searchPostsKakaoApi()  (KAKAO_REST_API_KEY 있을 때만)
  │    └─ GET dapi.kakao.com/v2/search/cafe?query={keyword}
  │    └─ JSON 응답 파싱
  │
  └─ 모두 실패 시: 빈 배열 [] 반환 (샘플 데이터 없음)
```

## 수정 파일 목록

### 1. `server/services/crawlers/DaumCafeCrawler.js` (전면 재작성)

**Before:**
- `BaseCrawler` 상속 (Puppeteer 의존)
- `searchPostsMobile()` — Puppeteer로 모바일 페이지 렌더링
- `searchPostsDaumSearch()` — Puppeteer로 다음 통합검색
- `generateSampleData()` — 가짜 데이터 생성
- `getPostDetail()` — Puppeteer로 상세 페이지 렌더링

**After:**
- 독립 클래스 (Puppeteer 의존성 없음, NaverCafeCrawler 패턴)
- `searchPostsHttp()` — axios GET + cheerio 파싱
- `searchPostsKakaoApi()` — Kakao REST API (fallback)
- 실패 시 빈 배열 반환 (샘플 데이터 제거)
- `close()` — no-op (브라우저 없음)

### 2. `server/services/crawlers/CrawlerFactory.js`

- `daum_cafe` 케이스에서 `KAKAO_REST_API_KEY` 환경변수를 옵션으로 전달

### 3. `.env.example`

- `KAKAO_REST_API_KEY` 항목 추가

### 4. `server/scripts/backfillDaumCafe.js`

- Puppeteer 관련 주석 제거
- HTTP 기반 설명으로 업데이트
- `REQUEST_DELAY_MS` 3000 → 2000 단축

## HTTP 스크래핑 상세

### 요청 URL

```
https://m.cafe.daum.net/{cafeId}/search/all?query={keyword}&sort=0&page={page}
```

| 파라미터 | 설명 |
|----------|------|
| `cafeId` | 카페 ID (예: `gongdream`) |
| `query` | 검색 키워드 (URL 인코딩) |
| `sort` | `0` = 최신순, `1` = 정확도순 |
| `page` | 페이지 번호 (1부터 시작) |

### HTML 셀렉터

| 셀렉터 | 대상 |
|--------|------|
| `#slideArticleList li` | 검색 결과 리스트 아이템 |
| `a.link_cafe` | 게시글 링크 (href에서 URL 추출) |
| `.tit_info` | 게시글 제목 |
| `.desc_info` | 본문 미리보기 |
| `.username` | 작성자 |
| `.created_at` | 작성일 (형식: `YY.MM.DD`) |
| `.view_count` | 조회수 |
| `.comments` | 댓글수 |

### 요청 헤더

```
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) ...
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7
```

### 페이지네이션

- 최대 5페이지까지 순회
- 페이지 간 1~2초 랜덤 딜레이
- 결과가 0건이면 조기 중단

## Kakao API Fallback

HTTP 스크래핑 실패 시, `KAKAO_REST_API_KEY` 환경변수가 설정되어 있으면 Kakao 검색 API를 사용합니다.

### 요청

```
GET https://dapi.kakao.com/v2/search/cafe
  ?query={keyword}&sort=recency&page={page}&size=50

Authorization: KakaoAK {REST_API_KEY}
```

### 제한사항

| 항목 | 내용 |
|------|------|
| 카페 필터링 | 불가 — 클라이언트에서 `cafe.daum.net` + `cafeId` 포함 여부로 필터 |
| 작성자/조회수 | 미제공 (`알 수 없음` / `0`) |
| API 키 | [Kakao Developers](https://developers.kakao.com)에서 발급 필요 |

### API 키 설정

```bash
# .env 파일에 추가
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

## 날짜 파싱

다음 카페 검색 결과의 날짜 형식을 처리합니다:

| 형식 | 예시 | 처리 |
|------|------|------|
| 4자리 연도 | `2025.10.15` | 그대로 파싱 |
| 2자리 연도 | `26.02.09` | `2000 + YY`로 변환 |
| 월.일 | `10.15` | 올해 기준 |
| 상대 시간 | `어제`, `3시간 전`, `30분 전`, `2일 전` | 현재 시간 기준 계산 |

## 실행 방법

### 백필 크롤링

```bash
# Docker 환경
docker exec academyinsight-backend node server/scripts/backfillDaumCafe.js

# 로컬 환경
node server/scripts/backfillDaumCafe.js
```

### 코드에서 직접 사용

```javascript
const DaumCafeCrawler = require('./server/services/crawlers/DaumCafeCrawler');

const crawler = new DaumCafeCrawler('https://cafe.daum.net/gongdream');

const posts = await crawler.searchPosts('윌비스', 20);
console.log(`${posts.length}건 수집`);

// close() 호출 (no-op이지만 인터페이스 호환)
await crawler.close();
```

### CrawlerFactory를 통한 사용

```javascript
const CrawlerFactory = require('./server/services/crawlers/CrawlerFactory');

const crawler = CrawlerFactory.create('daum_cafe', 'https://cafe.daum.net/gongdream');
const posts = await crawler.searchPosts('키워드', 20);
await crawler.close();
```

## 응답 데이터 형식

```json
{
  "title": "게시글 제목",
  "url": "https://m.cafe.daum.net/gongdream/XXXX/12345",
  "author": "작성자닉네임",
  "content": "본문 미리보기...",
  "postedAt": "26.02.09",
  "postedAtDate": "2026-02-09T00:00:00.000Z",
  "viewCount": 152,
  "commentCount": 8,
  "keyword": "검색키워드",
  "source": "daum_cafe",
  "cafeUrl": "https://cafe.daum.net/gongdream",
  "collectedAt": "2026-02-10T12:00:00.000Z",
  "isSample": false
}
```

## 크롤러 비교 (Before/After)

| 항목 | Before (Puppeteer) | After (HTTP) |
|------|-------------------|--------------|
| 의존성 | puppeteer, puppeteer-extra, stealth plugin | axios, cheerio |
| 메모리 | ~200MB+ (Chrome 인스턴스) | ~5MB |
| 속도 | 느림 (브라우저 렌더링 대기) | 빠름 (HTTP 요청만) |
| 안정성 | 낮음 (브라우저 크래시, 타임아웃) | 높음 |
| 실제 데이터 | 수집 실패 → 샘플 데이터 | 수집 성공 또는 빈 배열 |
| Docker | Chrome 바이너리 필요 | 불필요 |

## 주의사항

1. **셀렉터 변경 가능성**: 다음 카페 HTML 구조가 변경되면 셀렉터 업데이트 필요
2. **Rate Limiting**: 요청 간 1~2초 딜레이 적용됨, 과도한 호출 자제
3. **카페 접근 제한**: 비공개 카페는 수집 불가
4. **Kakao API 할당량**: 일일 요청 제한 있음 (기본 30,000건/일)
