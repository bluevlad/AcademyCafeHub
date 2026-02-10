# 크롤링 문제 해결 가이드

## 현재 상황 분석

### 발생한 에러
```
[Crawler] No posts found with HTML parsing, trying API method...
[Crawler] Error in API method: TimeoutError: Navigation timeout of 30000 ms exceeded
```

## 문제 원인

### 1. 네이버 카페 로그인 필요
독공사 카페(https://cafe.naver.com/m2school)가 **비공개 카페**이거나 **검색 기능이 회원 전용**일 가능성이 높습니다.

### 2. HTML 구조 변경
네이버 카페의 HTML 구조가 예상과 다를 수 있습니다.

### 3. 봇 감지
네이버가 자동화된 접근을 감지하여 차단했을 수 있습니다.

## 해결 방법

### ✅ 방법 1: 수동 데이터 입력 (가장 간단)

카페에서 직접 게시글 정보를 복사하여 JSON 파일로 저장:

```json
// data/willvis-posts.json
{
  "posts": [
    {
      "title": "윌비스 행정법 강의 후기",
      "author": "홍길동",
      "postedAt": "2025.10.15",
      "viewCount": 152,
      "commentCount": 8,
      "url": "https://cafe.naver.com/m2school/12345"
    }
  ]
}
```

### ✅ 방법 2: 네이버 로그인 추가 (중급)

Puppeteer에 로그인 기능 추가:

```javascript
async login(username, password) {
  await this.page.goto('https://nid.naver.com/nidlogin.login');
  await this.page.type('#id', username);
  await this.page.type('#pw', password);
  await this.page.click('.btn_login');
  await this.page.waitForNavigation();
}
```

**주의**: 네이버 계정 정보를 안전하게 관리해야 합니다.

### ✅ 방법 3: 네이버 카페 API 사용 (고급)

네이버 개발자 센터에서 공식 API를 신청하여 사용:
- https://developers.naver.com/

### ✅ 방법 4: 현재 샘플 데이터 활용 (데모용)

현재 구현된 샘플 데이터로 UI/UX를 먼저 확인하고, 실제 데이터 수집은 별도로 진행.

## 현재 상태 확인

### 서버 로그 확인하기

서버를 재시작하고 다음 로그를 확인하세요:

```bash
npm run server
```

데이터 수집 버튼 클릭 후 확인해야 할 로그:

```
[Crawler] Searching for keyword: 윌비스 in https://cafe.naver.com/m2school
[Crawler] Navigating to search URL: ...
[Crawler] Parsing HTML content...
[Crawler] HTML length: XXXXX characters
[Crawler] Found XX elements with selector: ...
```

### HTML 길이 체크

- **HTML < 1000 characters**: 로그인 페이지나 에러 페이지
- **HTML > 10000 characters**: 정상적인 카페 페이지
- **HTML = 0**: 페이지 로딩 실패

## 권장 방법

현재 상황에서는 다음 순서로 진행하는 것을 추천합니다:

### 1단계: UI 확인 (샘플 데이터)
현재 구현된 샘플 데이터로 전체 기능이 정상 작동하는지 확인합니다.

### 2단계: 수동 데이터 수집
독공사 카페에서 직접 "윌비스" 검색 후 게시글 정보를 수동으로 수집합니다.

### 3단계: 데이터 파일 생성
수집한 정보를 JSON 파일로 저장합니다.

### 4단계: 파일 기반 로딩
크롤러 대신 JSON 파일을 읽어오도록 수정합니다.

## 대안: 파일 기반 데이터 로딩

크롤링 대신 정적 파일을 사용하는 방법:

```javascript
// server/routes/crawler.js
router.get('/naver-cafe/search', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // JSON 파일에서 데이터 읽기
    const dataPath = path.join(__dirname, '../../data/willvis-posts.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    res.json({
      success: true,
      data: {
        cafeUrl: 'https://cafe.naver.com/m2school',
        keyword: '윌비스',
        totalResults: data.posts.length,
        posts: data.posts
      }
    });
  } catch (error) {
    // 파일이 없으면 샘플 데이터 사용
    res.json({
      success: true,
      data: {
        cafeUrl: 'https://cafe.naver.com/m2school',
        keyword: '윌비스',
        totalResults: 0,
        posts: []
      }
    });
  }
});
```

## 네이버 카페 접근 확인

브라우저에서 직접 확인:

1. https://cafe.naver.com/m2school 접속
2. 로그인 없이 접근 가능한지 확인
3. 검색창에 "윌비스" 입력
4. 검색 결과가 보이는지 확인

**로그인이 필요하다면**: 크롤링에도 로그인이 필요합니다.

## 다음 단계

현재 샘플 데이터로 UI가 정상 작동하는지 확인한 후, 실제 데이터 수집 방법을 결정하세요.

### 질문 체크리스트

- [ ] 독공사 카페가 공개 카페인가요?
- [ ] 로그인 없이 게시글 검색이 가능한가요?
- [ ] 실제 데이터가 필요한가요, 아니면 데모용인가요?
- [ ] 네이버 계정으로 자동 로그인해도 괜찮은가요?

답변에 따라 적절한 해결 방법을 적용할 수 있습니다.
