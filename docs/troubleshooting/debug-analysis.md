# 크롤링 결과 차이 분석

## 📊 현재 상황

### 실제 네이버 카페 검색 결과 (스크린샷)
- **전체 게시글**: 3,552,434개
- **실제 표시되는 게시글**: 많음
- **최신 게시글 날짜**: 2025.12.30, 2025.12.27 등
- **작성자, 조회수, 댓글 수**: 모두 표시됨

### 크롤러 수집 결과
- **수집된 게시글**: 5개 (샘플 데이터)
- **10월**: 0개
- **11월**: 3개
- **12월**: 2개
- **총 조회수**: 1,396

## 🔍 차이가 나는 이유

### 1. 크롤러가 샘플 데이터를 반환함

현재 크롤러는 다음 순서로 동작합니다:

```
1. HTML 파싱 시도 → 실패 (게시글 0개 발견)
   ↓
2. API 방식 시도 → 타임아웃 실패
   ↓
3. 샘플 데이터 생성 → 5개 더미 데이터 반환 ✅
```

### 2. HTML 파싱이 실패하는 이유

#### 원인 A: iframe 구조
네이버 카페는 복잡한 **iframe** 구조를 사용합니다:

```html
<html>
  <frameset>
    <frame name="top">
    <frame name="cafe_main">  <!-- 실제 게시글이 여기에 -->
      <div class="...">
        <table>
          <tr>게시글...</tr>
        </table>
      </div>
    </frame>
  </frameset>
</html>
```

크롤러가 `cafe_main` iframe을 찾지 못하면 메인 페이지만 파싱하게 됩니다.

#### 원인 B: 동적 로딩
네이버 카페는 JavaScript로 콘텐츠를 동적으로 로드합니다:
- 페이지 로딩 후 3초 대기 중이지만 충분하지 않을 수 있음
- 스크롤해야 추가 콘텐츠가 로드될 수 있음

#### 원인 C: 로그인 필요
독공사 카페가 **회원 전용 검색**일 경우:
- 로그인하지 않으면 검색 결과가 표시되지 않음
- "로그인이 필요합니다" 페이지가 표시될 수 있음

#### 원인 D: HTML 선택자 불일치
현재 사용 중인 선택자:
```javascript
'.article-board tbody tr'
'.board-list tbody tr'
'.list-box tr'
'table tbody tr'
```

실제 네이버 카페의 HTML 구조가 이와 다를 수 있습니다.

## 🔧 디버깅 단계

### 1단계: 브라우저 보이게 설정 ✅ 완료

파일: `server/services/naverCafeCrawler.js:18-19`

```javascript
headless: false,  // 브라우저 창을 실제로 열어서 확인
devtools: true    // 개발자 도구 자동 열기
```

### 2단계: HTML 파일 저장 ✅ 완료

파일: `server/services/naverCafeCrawler.js:179-188`

크롤러가 수집한 HTML을 `debug/naver_cafe_*.html` 파일로 저장합니다.

### 3단계: 실행 및 확인

1. **서버 재시작**:
   ```bash
   npm run server
   ```

2. **브라우저에서 데이터 수집**:
   - 네이버 로그인 사용 체크
   - 아이디/비밀번호 입력
   - "로그인하여 데이터 수집" 클릭

3. **브라우저 창 관찰**:
   - Chrome 브라우저 창이 자동으로 열림
   - 로그인 과정을 눈으로 확인
   - 카페 검색 페이지 확인

4. **HTML 파일 확인**:
   - `debug/naver_cafe_*.html` 파일 생성됨
   - 브라우저에서 열어서 내용 확인
   - 실제 게시글이 있는지 확인

5. **서버 로그 확인**:
   ```
   [Crawler] HTML length: XXXXX characters
   [Crawler] HTML saved to: C:\GIT\AcademyInsight\debug\naver_cafe_1234567890.html
   [Crawler] Found XX elements with selector: ...
   ```

## 📝 예상되는 시나리오

### 시나리오 1: 로그인 페이지가 저장됨
**HTML 파일에 "로그인이 필요합니다" 메시지가 있는 경우**

→ **해결**: 네이버 로그인 기능이 제대로 작동하지 않음
- 캡차 확인
- 2단계 인증 확인
- 로그인 선택자 수정 필요

### 시나리오 2: 빈 페이지가 저장됨
**HTML 길이가 매우 짧은 경우 (< 1000자)**

→ **해결**: 페이지 로딩 시간 부족
- `waitForTimeout` 시간 늘리기
- 특정 요소가 나타날 때까지 대기

### 시나리오 3: iframe 내용이 없음
**HTML에 `<frameset>`은 있지만 내용이 없는 경우**

→ **해결**: iframe 전환 실패
- iframe 이름 확인
- iframe 로딩 대기 추가

### 시나리오 4: 게시글이 있지만 선택자 불일치
**HTML에 게시글이 있지만 크롤러가 못 찾는 경우**

→ **해결**: HTML 구조 분석 후 선택자 수정
- 저장된 HTML 파일에서 실제 구조 확인
- 올바른 CSS 선택자 작성

## 🛠️ 해결 방법

### 방법 1: HTML 분석 후 선택자 수정

1. `debug/naver_cafe_*.html` 파일 열기
2. 게시글이 어떤 HTML 구조로 되어 있는지 확인
3. `naverCafeCrawler.js`의 선택자 수정

예시:
```javascript
// 실제 HTML 구조에 맞게 수정
$('#actual-table-id tbody tr').each(...)
$('.real-article-class').each(...)
```

### 방법 2: 대기 시간 조정

[naverCafeCrawler.js:168](server/services/naverCafeCrawler.js#L168):
```javascript
await this.page.waitForTimeout(5000);  // 3초 → 5초로 증가
```

또는 특정 요소가 나타날 때까지 대기:
```javascript
await this.page.waitForSelector('table tbody tr', { timeout: 10000 });
```

### 방법 3: 스크롤 추가

동적 로딩인 경우 스크롤 필요:
```javascript
await this.page.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight);
});
await this.page.waitForTimeout(2000);
```

### 방법 4: 네트워크 요청 확인

API 호출 방식인 경우:
```javascript
// 네트워크 요청 가로채기
await this.page.on('response', async (response) => {
  const url = response.url();
  if (url.includes('search') || url.includes('article')) {
    const data = await response.json();
    console.log('API Response:', data);
  }
});
```

## ✅ 다음 단계

### 1. 지금 바로 실행해보기

```bash
# 서버 재시작 (Ctrl+C 후)
npm run server
```

브라우저에서 데이터 수집 버튼 클릭 → Chrome 창이 열리고 과정을 볼 수 있습니다!

### 2. 결과 확인

- **브라우저 창**: 로그인 → 검색 과정 확인
- **서버 로그**: HTML 길이, 찾은 요소 수 확인
- **debug 폴더**: HTML 파일 열어서 구조 확인

### 3. 정보 제공

다음 정보를 확인하면 정확한 해결책을 드릴 수 있습니다:

1. **서버 로그**:
   ```
   [Crawler] HTML length: ?
   [Crawler] Found ? elements with selector: ...
   ```

2. **debug/naver_cafe_*.html 파일 내용**:
   - 로그인 페이지인지?
   - 검색 결과 페이지인지?
   - 게시글이 있는지?

3. **브라우저 창에서 본 것**:
   - 로그인 성공했는지?
   - 검색 페이지가 제대로 표시되는지?
   - 캡차나 추가 인증이 필요한지?

## 🎯 최종 목표

스크린샷과 같이:
- 실제 게시글 제목
- 정확한 작성 날짜 (2025.12.30 등)
- 실제 작성자 닉네임
- 정확한 조회수와 댓글 수
- 클릭 가능한 원문 링크

이 모든 것을 수집하는 것이 목표입니다!

---

**지금 바로 서버를 재시작하고 크롬 창에서 어떤 일이 일어나는지 확인해보세요!** 🚀
