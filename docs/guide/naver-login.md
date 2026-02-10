# 네이버 로그인 크롤링 가이드

## 🔐 개요

독공사 카페에서 실제 데이터를 수집하기 위해 네이버 로그인 기능이 추가되었습니다. 이제 본인의 네이버 계정으로 로그인하여 가입한 카페의 게시글을 수집할 수 있습니다.

## ✨ 새로운 기능

### 1. UI에서 직접 로그인
- 체크박스를 통해 로그인 기능 활성화
- 네이버 아이디와 비밀번호 입력
- 안전한 크롤링을 위한 자동 로그인

### 2. 환경 변수로 로그인 (선택)
- `.env` 파일에 네이버 계정 정보 저장
- 매번 입력하지 않고 자동으로 로그인

## 🚀 사용 방법

### 방법 1: UI에서 로그인 (추천)

1. **브라우저에서** `http://localhost:3000/willvis-crawler` 접속

2. **"네이버 로그인 사용하기"** 체크박스 클릭

3. **로그인 정보 입력**
   - 네이버 아이디 입력
   - 네이버 비밀번호 입력

4. **"🔐 로그인하여 데이터 수집"** 버튼 클릭

5. 서버 로그에서 로그인 진행 상황 확인:
   ```
   [Crawler] Starting Naver login...
   [Crawler] Credentials entered, clicking login button...
   [Crawler] ✅ Login successful!
   [Crawler] Searching for keyword: 윌비스
   ```

### 방법 2: 환경 변수 사용

1. **`.env` 파일 수정**
   ```env
   NAVER_ID=your_actual_naver_id
   NAVER_PASSWORD=your_actual_password
   ```

2. **서버 재시작**
   ```bash
   npm run server
   ```

3. **UI에서 로그인 체크 없이 수집**
   - 환경 변수에 계정 정보가 있으면 자동으로 로그인 시도
   - "📊 데이터 수집하기" 버튼만 클릭하면 됨

## 📊 로그인 프로세스

```
1. 브라우저 초기화
   ↓
2. 네이버 로그인 페이지 접속
   ↓
3. 아이디/비밀번호 입력
   ↓
4. 로그인 버튼 클릭
   ↓
5. 로그인 성공 확인
   ↓
6. 카페 접속 및 검색
   ↓
7. 게시글 수집
```

## ⚠️ 주의사항

### 1. 보안
- **로그인 정보는 서버에 저장되지 않습니다**
- 크롤링에만 일시적으로 사용됩니다
- `.env` 파일은 절대 GitHub에 업로드하지 마세요 (`.gitignore`에 포함됨)

### 2. 네이버 보안 정책
다음 경우 로그인이 실패할 수 있습니다:

#### ❌ 캡차 인증
자동 입력 방지 문자가 표시되는 경우:
```
[Crawler] ❌ Captcha detected - manual intervention required
```
**해결**: 평소 사용하는 기기/IP에서 실행하면 캡차 빈도가 줄어듭니다.

#### ❌ 2단계 인증 (OTP)
네이버에서 2단계 인증을 설정한 경우:
- SMS 인증
- OTP 인증
- 앱 인증

**해결**:
1. 네이버 설정에서 일시적으로 2단계 인증 해제
2. 또는 앱 비밀번호 생성하여 사용

#### ❌ 의심스러운 로그인 감지
새로운 위치/기기에서 로그인 시도:
```
로그인 확인이 필요합니다
```
**해결**:
1. 평소 사용하는 PC에서 실행
2. 네이버 이메일에서 로그인 확인 승인

### 3. 크롤링 제한
- **과도한 요청 금지**: 1시간에 1~2회 정도만 수집
- **IP 차단 가능성**: 너무 자주 크롤링하면 차단될 수 있음
- **카페 가입 필수**: 본인이 가입한 카페만 접근 가능

## 🔍 문제 해결

### 로그인이 계속 실패할 때

**1. 서버 로그 확인**
```bash
# 터미널에서 확인
[Crawler] Login error: ...
```

**2. 네이버 로그인 테스트**
- 브라우저에서 직접 https://naver.com 로그인 시도
- 캡차나 추가 인증이 필요한지 확인

**3. 헤드리스 모드 비활성화 (디버깅)**

[server/services/naverCafeCrawler.js:17](server/services/naverCafeCrawler.js#L17)에서:
```javascript
this.browser = await puppeteer.launch({
  headless: false,  // 브라우저 창을 보이게 설정
  devtools: true    // 개발자 도구 자동 열기
});
```

이렇게 하면 실제 로그인 과정을 눈으로 확인할 수 있습니다.

### 게시글이 수집되지 않을 때

**로그인은 성공했지만 게시글이 0개:**

1. **카페 가입 확인**
   - https://cafe.naver.com/m2school 접속
   - 카페에 가입되어 있는지 확인
   - 정회원 승인이 필요한지 확인

2. **키워드 확인**
   - 카페 내에서 "윌비스" 검색
   - 실제 게시글이 있는지 확인

3. **기간 확인**
   - 2025년 10월~12월 게시글이 실제로 있는지 확인

## 📈 실제 데이터 vs 샘플 데이터

### 샘플 데이터 (로그인 없이)
```
전체 게시글: 5개
10월: 1~2개
11월: 1~2개
12월: 1~2개
조회수: 랜덤 (50~550)
```

### 실제 데이터 (로그인 후)
```
전체 게시글: 실제 검색 결과 수
월별 게시글: 실제 분포
조회수/댓글: 실제 데이터
작성자: 실제 닉네임
원문 링크: 클릭 가능한 실제 URL
```

## 🎯 성공적인 크롤링 체크리스트

- [ ] 네이버 계정이 활성화되어 있음
- [ ] 독공사 카페(m2school)에 가입됨
- [ ] 2단계 인증이 해제되어 있음 (또는 앱 비밀번호 사용)
- [ ] 평소 사용하는 PC/네트워크에서 실행
- [ ] 캡차가 뜨지 않는 상태
- [ ] 서버가 정상 실행 중 (`npm run server`)
- [ ] 클라이언트가 정상 실행 중 (`npm start`)

## 💡 팁

### 1. 첫 실행 시
처음 로그인할 때는 네이버에서 추가 확인을 요구할 수 있습니다. 브라우저를 보이게 하고(`headless: false`) 수동으로 인증을 완료한 후, 다음부터는 자동으로 됩니다.

### 2. 로그인 세션 유지
한 번 로그인하면 브라우저를 닫기 전까지 세션이 유지됩니다. 여러 번 크롤링해도 다시 로그인할 필요가 없습니다.

### 3. 안전한 사용
- 본인 계정만 사용
- 타인의 계정 정보는 절대 사용 금지
- 법적 책임은 사용자에게 있음

## 📝 예제: 전체 실행 과정

### 1. 환경 설정
```bash
# .env 파일 수정
NAVER_ID=myid
NAVER_PASSWORD=mypassword

# 서버 시작
npm run server
```

### 2. 클라이언트 실행
```bash
cd client
npm start
```

### 3. 브라우저 조작
```
1. http://localhost:3000/willvis-crawler 접속
2. "네이버 로그인 사용하기" 체크
3. 아이디/비밀번호 입력
4. "🔐 로그인하여 데이터 수집" 클릭
5. 30초~1분 대기
6. 결과 확인!
```

### 4. 서버 로그 예시
```
[Crawler] Starting Naver login...
[Crawler] Credentials entered, clicking login button...
[Crawler] Current URL after login: https://www.naver.com/
[Crawler] ✅ Login successful!
[Crawler] Searching for keyword: 윌비스 in https://cafe.naver.com/m2school
[Crawler] Navigating to search URL: ...
[Crawler] Parsing HTML content...
[Crawler] HTML length: 52341 characters
[Crawler] Found 15 elements with selector: table tbody tr
[Crawler] Found 12 posts for keyword: 윌비스
```

## 🆘 자주 묻는 질문 (FAQ)

### Q1: 로그인 정보가 저장되나요?
**A**: 아니요. 메모리에서만 사용되며 크롤링이 끝나면 사라집니다.

### Q2: 환경 변수 방식이 더 안전한가요?
**A**: 둘 다 안전합니다. 환경 변수는 매번 입력하지 않아도 되어 편리하지만, `.env` 파일을 안전하게 관리해야 합니다.

### Q3: 다른 카페도 크롤링 가능한가요?
**A**: 네, [WillvisCrawler.js:15](client/src/components/WillvisCrawler.js#L15)에서 `CAFE_URL`을 변경하면 됩니다.

### Q4: 로그인 후에도 샘플 데이터만 나와요
**A**: 네이버 카페의 HTML 구조가 예상과 다를 수 있습니다. 헤드리스 모드를 끄고 확인해보세요.

### Q5: 캡차를 우회할 수 있나요?
**A**: 불가능하며, 우회 시도는 네이버 정책 위반입니다. 캡차가 뜨면 수동으로 해결하거나 나중에 다시 시도하세요.

## 📚 관련 문서

- [CRAWLER_GUIDE.md](CRAWLER_GUIDE.md) - 기본 크롤러 사용법
- [WILLVIS_FEATURE_GUIDE.md](WILLVIS_FEATURE_GUIDE.md) - 윌비스 기능 상세 가이드
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 문제 해결 가이드

## ⚖️ 법적 고지

- 본인의 계정으로만 사용하세요
- 네이버 이용약관을 준수하세요
- 수집한 데이터의 상업적 이용은 저작권 문제가 있을 수 있습니다
- 과도한 크롤링은 서비스 약관 위반입니다
- 법적 책임은 사용자 본인에게 있습니다

---

**Happy Crawling! 🎉**
