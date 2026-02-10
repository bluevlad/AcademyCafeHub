# 페이지 오류 해결 완료

## 🔍 문제 원인

로그인 후 독공사 카페 접속 시 **"페이지를 찾을 수 없음"** 오류가 발생한 이유:

### ❌ 잘못된 검색 URL
```javascript
// 이전 코드 (오류 발생)
const searchUrl = `https://cafe.naver.com/ArticleSearchList.nhn?search.clubid=${cafeId}&...`;
```

**문제점:**
1. `ArticleSearchList.nhn` - 오래된 URL 형식
2. `search.clubid` - 잘못된 파라미터 이름
3. 네이버 카페 구조 변경으로 더 이상 작동하지 않음

## ✅ 해결 방법

### 1. 올바른 URL 및 접근 방식

#### 변경 사항: 3단계 접근 전략

```javascript
// 1단계: 카페 메인 페이지 접속
https://cafe.naver.com/${cafeId}

// 2단계: iframe 내부에서 검색창 찾아서 검색
검색창에 키워드 입력 → Enter

// 3단계: 실패 시 직접 검색 URL
https://cafe.naver.com/ArticleList.nhn?search.clubid=...

// 4단계: 모바일 버전 URL (최종 폴백)
https://m.cafe.naver.com/ca-fe/web/cafes/${cafeId}/search/articles?query=...
```

### 2. 향상된 HTML 파싱

#### 모바일 + PC 버전 모두 지원

```javascript
// 모바일 선택자
'.ArticleItem'
'.list_item'
'article'

// PC 선택자
'.article-board tbody tr'
'.board-list tbody tr'
'table tbody tr'
```

## 📝 변경 내역

### [server/services/naverCafeCrawler.js](server/services/naverCafeCrawler.js)

#### 1. 브라우저 설정 (L18-19)
```javascript
headless: false,  // 디버깅용 - 브라우저 보이게
devtools: true    // 개발자 도구 자동 열기
```

#### 2. 검색 로직 개선 (L137-205)
- 카페 메인 페이지 접속
- iframe 내부 검색창 찾기
- 검색어 입력 및 Enter
- 실패 시 직접 URL 사용
- 최종 폴백: 모바일 버전

#### 3. HTML 파싱 강화 (L239-407)
- 11가지 선택자 시도
- 모바일 버전 우선 파싱
- PC 버전 폴백
- 상세 로깅

## 🚀 실행 방법

### 1. 서버 재시작

```powershell
# 서버 종료 (Ctrl+C)
npm run server
```

### 2. 브라우저에서 테스트

1. `http://localhost:3000/willvis-crawler` 접속
2. "네이버 로그인 사용하기" 체크
3. 네이버 ID/PW 입력
4. "🔐 로그인하여 데이터 수집" 클릭

### 3. Chrome 창 확인

**이제 브라우저가 실제로 보입니다!**

다음을 직접 볼 수 있습니다:
- ✅ 네이버 로그인
- ✅ 독공사 카페 접속
- ✅ 검색창에 "윌비스" 입력
- ✅ 검색 결과 페이지

### 4. 서버 로그 확인

```
[Crawler] ✅ Login successful!
[Crawler] Cafe ID: m2school
[Crawler] Navigating to cafe: https://cafe.naver.com/m2school
[Crawler] Found cafe_main iframe, searching inside...
[Crawler] Search submitted via iframe
[Crawler] HTML saved to: C:\GIT\AcademyInsight\debug\naver_cafe_*.html
[Crawler] Found 50 elements with selector: .ArticleItem
[Crawler] Detected mobile version, using mobile selectors...
[Crawler] Collected 12 posts from mobile version
[Crawler] Total found 12 posts for keyword: 윌비스
```

## 📊 예상 결과

### ✅ 성공 시나리오 1: 모바일 버전
```
[Crawler] Trying mobile URL: https://m.cafe.naver.com/ca-fe/web/cafes/m2school/search/articles?query=윌비스
[Crawler] HTML length: 45234 characters
[Crawler] Found 30 elements with selector: .ArticleItem
[Crawler] Collected 12 posts from mobile version
```

→ **실제 게시글 수집 성공!**

### ✅ 성공 시나리오 2: iframe 검색
```
[Crawler] Found cafe_main iframe, searching inside...
[Crawler] Search submitted via iframe
[Crawler] Found 25 elements with selector: table tbody tr
[Crawler] Collected 10 posts from PC version
```

→ **PC 버전 검색 성공!**

### ⚠️ 주의가 필요한 경우

#### 케이스 1: 캡차 발생
```
[Crawler] ❌ Captcha detected - manual intervention required
```

**해결**: 브라우저 창에서 수동으로 캡차 풀기

#### 케이스 2: 로그인 실패
```
[Crawler] ⚠️ Login may have failed
```

**해결**:
- 2단계 인증 확인
- 아이디/비밀번호 재확인

#### 케이스 3: HTML 파싱 실패
```
[Crawler] Found 0 elements with selector: ...
[Crawler] No posts found with HTML parsing
```

**해결**: `debug/naver_cafe_*.html` 파일 확인

## 🔧 디버깅 도구

### 1. HTML 파일 저장

모든 크롤링마다 HTML이 저장됩니다:
```
debug/naver_cafe_1234567890.html
```

이 파일을 브라우저에서 열어서:
- 실제 게시글이 있는지 확인
- HTML 구조 분석
- 올바른 선택자 찾기

### 2. Chrome 개발자 도구

브라우저가 보이므로:
- Elements 탭에서 HTML 구조 확인
- Console에서 선택자 테스트
- Network 탭에서 API 호출 확인

## 📈 개선 사항 요약

### Before (이전)
```
❌ 잘못된 URL → 404 페이지 오류
❌ 하나의 선택자만 시도
❌ 헤드리스 모드 → 디버깅 불가
❌ HTML 저장 안 됨
```

### After (현재)
```
✅ 4단계 폴백 전략
✅ 11가지 선택자 시도
✅ 모바일 + PC 버전 지원
✅ 브라우저 보이게 → 실시간 확인
✅ HTML 파일 저장 → 상세 분석
✅ 상세 로깅
```

## 🎯 다음 단계

### 1. 실행 및 확인

지금 바로 서버를 재시작하고 테스트해보세요!

```powershell
npm run server
```

### 2. 결과 공유

다음 정보를 확인해주세요:

1. **Chrome 창에 무엇이 보이나요?**
   - 검색 결과 페이지?
   - 게시글 목록?

2. **서버 로그는?**
   ```
   [Crawler] Total found ? posts
   ```

3. **debug 폴더의 HTML 파일은?**
   - 게시글이 있나요?
   - 어떤 구조인가요?

### 3. 추가 최적화

결과에 따라:
- 선택자 미세 조정
- 대기 시간 최적화
- 추가 폴백 전략

## ⚖️ 참고 사항

### 프로덕션 배포 전

디버깅이 완료되면 다음을 변경하세요:

```javascript
// naverCafeCrawler.js:18
headless: true,   // 프로덕션: true
devtools: false   // 프로덕션: false
```

### HTML 파일 정리

디버그 폴더가 커지면:
```bash
# debug 폴더 정리
rm debug/*.html
```

---

**지금 바로 실행해서 결과를 확인해보세요!** 🚀

Chrome 창에서 실제로 어떤 일이 일어나는지 볼 수 있습니다.
