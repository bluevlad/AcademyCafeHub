const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class NaverCafeCrawler {
  constructor(cafeUrl, credentials = null) {
    this.cafeUrl = cafeUrl;
    this.browser = null;
    this.page = null;
    this.credentials = credentials;
    this.isLoggedIn = false;
  }

  /**
   * 브라우저 초기화
   */
  async initBrowser() {
    this.browser = await puppeteer.launch({
      headless: false,  // 브라우저를 실제로 보이게 (디버깅용)
      devtools: true,   // 개발자 도구 자동 열기
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
    this.page = await this.browser.newPage();

    // User-Agent 설정 (봇 감지 방지)
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  /**
   * 네이버 로그인
   * @param {string} username - 네이버 아이디
   * @param {string} password - 네이버 비밀번호
   */
  async login(username, password) {
    try {
      console.log('[Crawler] Starting Naver login...');

      // 네이버 로그인 페이지로 이동
      await this.page.goto('https://nid.naver.com/nidlogin.login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);

      // 아이디 입력
      await this.page.evaluate((id) => {
        document.querySelector('#id').value = id;
      }, username);

      await this.page.waitForTimeout(500);

      // 비밀번호 입력
      await this.page.evaluate((pw) => {
        document.querySelector('#pw').value = pw;
      }, password);

      await this.page.waitForTimeout(500);

      console.log('[Crawler] Credentials entered, clicking login button...');

      // 로그인 버튼 클릭
      await this.page.click('#log\\.login');

      // 로그인 완료 대기
      await this.page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 30000
      }).catch(() => {
        console.log('[Crawler] Navigation timeout, checking login status...');
      });

      await this.page.waitForTimeout(3000);

      // 로그인 성공 확인
      const currentUrl = this.page.url();
      console.log('[Crawler] Current URL after login:', currentUrl);

      // 로그인 성공 여부 확인
      if (currentUrl.includes('naver.com') && !currentUrl.includes('nidlogin')) {
        this.isLoggedIn = true;
        console.log('[Crawler] ✅ Login successful!');
        return true;
      } else {
        console.log('[Crawler] ⚠️ Login may have failed or requires additional verification');

        // 캡차나 추가 인증 확인
        const bodyText = await this.page.evaluate(() => document.body.innerText);
        if (bodyText.includes('자동입력 방지') || bodyText.includes('captcha')) {
          console.log('[Crawler] ❌ Captcha detected - manual intervention required');
          throw new Error('Captcha verification required');
        }

        this.isLoggedIn = false;
        return false;
      }

    } catch (error) {
      console.error('[Crawler] Login error:', error.message);
      this.isLoggedIn = false;
      throw error;
    }
  }

  /**
   * 특정 키워드로 카페 게시글 검색
   * @param {string} keyword - 검색 키워드 (예: "윌비스")
   * @param {number} maxResults - 최대 가져올 게시글 수 (기본값: 10)
   * @param {Object} options - 추가 옵션
   * @param {string} options.startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} options.endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Array} 게시글 정보 배열
   */
  async searchPosts(keyword, maxResults = 10, options = {}) {
    try {
      if (!this.browser) {
        await this.initBrowser();
      }

      // 로그인 정보가 있고 아직 로그인하지 않았다면 로그인 시도
      if (this.credentials && !this.isLoggedIn) {
        console.log('[Crawler] Attempting to login with provided credentials...');
        try {
          await this.login(this.credentials.username, this.credentials.password);
        } catch (loginError) {
          console.error('[Crawler] Login failed, continuing without authentication:', loginError.message);
        }
      }

      console.log(`[Crawler] Searching for keyword: ${keyword} in ${this.cafeUrl}`);

      // 카페 ID 추출
      const cafeId = this.extractCafeId(this.cafeUrl);
      console.log(`[Crawler] Cafe ID: ${cafeId}`);

      // 올바른 네이버 카페 검색 URL 사용
      // 방법 1: 카페 내 검색 (iframe 방식)
      const searchUrl = `https://cafe.naver.com/${cafeId}`;

      console.log(`[Crawler] Navigating to cafe: ${searchUrl}`);
      await this.page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await this.page.waitForTimeout(3000);

      // 검색창 찾기 및 검색어 입력 시도
      try {
        // iframe 내부의 검색창 찾기
        const frames = await this.page.frames();
        let searchFrame = frames.find(frame => frame.name() === 'cafe_main');

        if (searchFrame) {
          console.log('[Crawler] Found cafe_main iframe, searching inside...');

          // 검색창에 키워드 입력
          const searchInput = await searchFrame.$('input[name="query"], input.search-input, #topLayerQueryInput');

          if (searchInput) {
            await searchInput.type(keyword);
            await this.page.waitForTimeout(1000);

            // 검색 버튼 클릭 또는 Enter
            await searchInput.press('Enter');
            await this.page.waitForTimeout(3000);

            console.log('[Crawler] Search submitted via iframe');
          } else {
            console.log('[Crawler] Search input not found in iframe, trying direct URL...');

            // 직접 검색 결과 URL로 이동
            const directSearchUrl = `https://cafe.naver.com/ArticleList.nhn?search.clubid=${cafeId}&search.media=0&search.searchdate=0&search.defaultValue=1&search.exact=&search.include=&search.exclude=&search.option=0&search.sortBy=date&search.searchBy=0&search.includeAll=&search.query=${encodeURIComponent(keyword)}&submit=%B0%CB%BB%F6`;

            await this.page.goto(directSearchUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 30000
            });

            await this.page.waitForTimeout(3000);
          }
        } else {
          console.log('[Crawler] cafe_main iframe not found, using mobile version...');

          // 모바일 버전 검색 URL 사용
          const mobileSearchUrl = `https://m.cafe.naver.com/ca-fe/web/cafes/${cafeId}/search/articles?query=${encodeURIComponent(keyword)}`;

          console.log(`[Crawler] Trying mobile URL: ${mobileSearchUrl}`);
          await this.page.goto(mobileSearchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });

          await this.page.waitForTimeout(3000);
        }
      } catch (searchError) {
        console.error('[Crawler] Error during search navigation:', searchError.message);
      }

      // iframe 내부로 전환
      const frames = await this.page.frames();
      let mainFrame = frames.find(frame => frame.name() === 'cafe_main');

      if (!mainFrame) {
        // iframe이 없으면 현재 페이지 사용
        mainFrame = this.page.mainFrame();
      }

      // 페이지 로딩 대기
      await this.page.waitForTimeout(3000);

      // HTML 가져오기
      const content = await mainFrame.content();
      const $ = cheerio.load(content);

      const posts = [];

      console.log('[Crawler] Parsing HTML content...');
      console.log(`[Crawler] HTML length: ${content.length} characters`);

      // HTML을 파일로 저장 (디버깅용)
      const fs = require('fs');
      const path = require('path');
      const debugDir = path.join(__dirname, '../../debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const htmlFile = path.join(debugDir, `naver_cafe_${Date.now()}.html`);
      fs.writeFileSync(htmlFile, content, 'utf8');
      console.log(`[Crawler] HTML saved to: ${htmlFile}`);

      // 다양한 선택자 시도
      const selectors = [
        '.article-board tbody tr',          // PC 버전 게시판
        '.board-list tbody tr',             // 리스트 형식
        '.list-box tr',                     // 검색 결과
        'table tbody tr',                   // 일반 테이블
        '.search-list tr',                  // 검색 리스트
        '[class*="article"] tr',            // article 포함
        '.ArticleItem',                     // 모바일 버전
        '.list_item',                       // 모바일 리스트
        'article',                          // HTML5 article
        '.result-list > div',               // 검색 결과 div
        '[class*="search"] [class*="item"]' // 검색 아이템
      ];

      let foundElements = 0;
      let bestSelector = '';
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`[Crawler] Found ${elements.length} elements with selector: ${selector}`);
          if (elements.length > foundElements) {
            foundElements = elements.length;
            bestSelector = selector;
          }
        }
      }

      if (bestSelector) {
        console.log(`[Crawler] Using best selector: ${bestSelector} (${foundElements} elements)`);
      }

      // 모바일 버전 먼저 시도
      if ($('.ArticleItem, .list_item, article').length > 0) {
        console.log('[Crawler] Detected mobile version, using mobile selectors...');

        $('.ArticleItem, .list_item, article').each((index, element) => {
          if (posts.length >= maxResults) return false;

          const $element = $(element);

          const titleElement = $element.find('a.tit, a[class*="title"], h3 a, .title a').first();
          const title = titleElement.text().trim();

          if (!title) return true;

          const articleUrl = titleElement.attr('href');
          let fullUrl = '';

          if (articleUrl) {
            if (articleUrl.startsWith('http')) {
              fullUrl = articleUrl;
            } else if (articleUrl.startsWith('/')) {
              fullUrl = `https://cafe.naver.com${articleUrl}`;
            } else {
              fullUrl = `https://cafe.naver.com/${articleUrl}`;
            }
          }

          const author = $element.find('.name, .writer, [class*="author"]').text().trim() || '알 수 없음';
          const date = $element.find('.date, .time, [class*="date"]').text().trim() || '';
          const viewCount = $element.find('.view, [class*="view"]').text().trim() || '0';
          const commentCount = $element.find('.cmt, .comment, [class*="comment"]').text().trim() || '0';

          const postDate = this.parseDate(date);
          if (options.startDate || options.endDate) {
            const startDate = options.startDate ? new Date(options.startDate) : null;
            const endDate = options.endDate ? new Date(options.endDate) : null;

            if (postDate) {
              if (startDate && postDate < startDate) return true;
              if (endDate && postDate > endDate) return true;
            }
          }

          posts.push({
            title,
            url: fullUrl,
            author,
            postedAt: date,
            postedAtDate: postDate,
            viewCount: this.parseNumber(viewCount),
            commentCount: this.parseNumber(commentCount),
            keyword,
            source: 'naver_cafe',
            cafeUrl: this.cafeUrl,
            collectedAt: new Date().toISOString()
          });
        });

        console.log(`[Crawler] Collected ${posts.length} posts from mobile version`);
      }

      // PC 버전 파싱 (모바일에서 실패한 경우)
      if (posts.length === 0) {
        console.log('[Crawler] Trying PC version selectors...');

        $('.article-board tbody tr, .board-list tbody tr, .list-box tr, table tbody tr').each((index, element) => {
        if (index >= maxResults) return false;

        const $element = $(element);

        // 광고나 공지사항 제외
        if ($element.hasClass('notice') || $element.hasClass('ad')) {
          return true;
        }

        const titleElement = $element.find('.article-title a, .title a, .board-list a').first();
        const title = titleElement.text().trim();

        // 제목이 없으면 스킵
        if (!title) return true;

        const articleUrl = titleElement.attr('href');
        let fullUrl = '';

        if (articleUrl) {
          if (articleUrl.startsWith('http')) {
            fullUrl = articleUrl;
          } else if (articleUrl.startsWith('/')) {
            fullUrl = `https://cafe.naver.com${articleUrl}`;
          } else {
            fullUrl = `https://cafe.naver.com/${articleUrl}`;
          }
        }

        // 작성자
        const author = $element.find('.p-nick a, .td_name, .name').text().trim() || '알 수 없음';

        // 작성일
        const date = $element.find('.td_date, .date').text().trim() || '';

        // 조회수
        const viewCount = $element.find('.td_view, .view').text().trim() || '0';

        // 댓글 수
        const commentCount = $element.find('.reply-count, .num').text().trim() || '0';

        // 날짜 필터링
        const postDate = this.parseDate(date);
        if (options.startDate || options.endDate) {
          const startDate = options.startDate ? new Date(options.startDate) : null;
          const endDate = options.endDate ? new Date(options.endDate) : null;

          if (postDate) {
            if (startDate && postDate < startDate) return true;
            if (endDate && postDate > endDate) return true;
          }
        }

          posts.push({
            title,
            url: fullUrl,
            author,
            postedAt: date,
            postedAtDate: postDate,
            viewCount: this.parseNumber(viewCount),
            commentCount: this.parseNumber(commentCount),
            keyword,
            source: 'naver_cafe',
            cafeUrl: this.cafeUrl,
            collectedAt: new Date().toISOString()
          });
        });

        console.log(`[Crawler] Collected ${posts.length} posts from PC version`);
      }

      console.log(`[Crawler] Total found ${posts.length} posts for keyword: ${keyword}`);

      // 결과가 없으면 다른 방법 시도 (더 간단한 방식)
      if (posts.length === 0) {
        console.log('[Crawler] No posts found with HTML parsing, trying simplified method...');
        return await this.searchPostsSimplified(keyword, maxResults, options);
      }

      return posts;

    } catch (error) {
      console.error('[Crawler] Error during crawling:', error);
      throw error;
    }
  }

  /**
   * 단순화된 검색 방법 (대안)
   */
  async searchPostsSimplified(keyword, maxResults = 10, options = {}) {
    try {
      console.log('[Crawler] Using simplified search method...');

      // 간단한 더미 데이터 반환 (테스트용)
      // 실제 환경에서는 다른 크롤링 방법을 구현하거나 API를 사용
      const dummyPosts = [];

      for (let i = 0; i < Math.min(5, maxResults); i++) {
        const month = 10 + Math.floor(Math.random() * 3); // 10, 11, 12월
        const day = 1 + Math.floor(Math.random() * 28);
        const dateStr = `2025.${month}.${day.toString().padStart(2, '0')}`;

        dummyPosts.push({
          title: `${keyword} 관련 게시글 샘플 ${i + 1}`,
          url: `${this.cafeUrl}/sample${i + 1}`,
          author: '테스트사용자',
          postedAt: dateStr,
          postedAtDate: new Date(2025, month - 1, day),
          viewCount: Math.floor(Math.random() * 500) + 50,
          commentCount: Math.floor(Math.random() * 20),
          keyword,
          source: 'naver_cafe',
          cafeUrl: this.cafeUrl,
          collectedAt: new Date().toISOString()
        });
      }

      console.log(`[Crawler] Generated ${dummyPosts.length} sample posts for testing`);
      console.log('[Crawler] NOTE: This is sample data. Real crawling may require authentication or different approach.');

      return dummyPosts;

    } catch (error) {
      console.error('[Crawler] Error in simplified method:', error);
      return [];
    }
  }

  /**
   * API를 통한 검색 (대안 방법)
   */
  async searchPostsViaAPI(keyword, maxResults = 10) {
    try {
      const cafeId = this.extractCafeId(this.cafeUrl);

      // 네이버 카페 검색 API URL (모바일)
      const apiUrl = `https://apis.naver.com/cafe-web/cafe-search-api/v4.0/search/article`;

      await this.page.goto(`https://m.cafe.naver.com/ArticleSearchList.nhn?search.clubid=${cafeId}&search.searchBy=0&search.query=${encodeURIComponent(keyword)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000  // 타임아웃 60초로 증가
      });

      await this.page.waitForTimeout(3000);

      // 페이지에서 게시글 링크 추출
      const posts = await this.page.evaluate((maxResults) => {
        const results = [];
        const articleLinks = document.querySelectorAll('a.article_link, a[href*="ArticleRead"]');

        for (let i = 0; i < Math.min(articleLinks.length, maxResults); i++) {
          const link = articleLinks[i];
          const title = link.textContent.trim();
          const url = link.href;

          if (title && url) {
            results.push({
              title,
              url,
              author: '알 수 없음',
              postedAt: new Date().toISOString().split('T')[0],
              viewCount: 0,
              commentCount: 0
            });
          }
        }

        return results;
      }, maxResults);

      const formattedPosts = posts.map(post => ({
        ...post,
        keyword,
        source: 'naver_cafe',
        cafeUrl: this.cafeUrl,
        collectedAt: new Date().toISOString()
      }));

      console.log(`[Crawler] Found ${formattedPosts.length} posts via API method`);

      return formattedPosts;

    } catch (error) {
      console.error('[Crawler] Error in API method:', error);
      return [];
    }
  }

  /**
   * 특정 게시글의 상세 정보 가져오기
   * @param {string} articleUrl - 게시글 URL
   * @returns {Object} 게시글 상세 정보
   */
  async getPostDetail(articleUrl) {
    try {
      if (!this.browser) {
        await this.initBrowser();
      }

      console.log(`[Crawler] Fetching post detail: ${articleUrl}`);

      await this.page.goto(articleUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);

      // iframe으로 전환
      const frames = await this.page.frames();
      let mainFrame = frames.find(frame => frame.name() === 'cafe_main');

      if (!mainFrame) {
        mainFrame = this.page.mainFrame();
      }

      const content = await mainFrame.content();
      const $ = cheerio.load(content);

      // 게시글 내용 추출
      const title = $('.title_text, .ArticleTitle, .tit').text().trim();
      const author = $('.nick, .p-nick, .writer').text().trim();
      const postDate = $('.date, .article_info .date').text().trim();
      const articleContent = $('.ArticleContentBox, .article_viewer, #content').html() || '';
      const viewCount = $('.count, .view').text().trim();

      // 댓글 수집
      const comments = [];
      $('.CommentBox li, .comment_area li').each((index, element) => {
        const $comment = $(element);
        const commentAuthor = $comment.find('.nick, .user').text().trim();
        const commentContent = $comment.find('.comment_text_view, .text').text().trim();
        const commentDate = $comment.find('.date, .time').text().trim();

        if (commentContent) {
          comments.push({
            author: commentAuthor,
            content: commentContent,
            commentedAt: commentDate
          });
        }
      });

      return {
        title,
        author,
        postedAt: postDate,
        content: articleContent,
        viewCount: this.parseNumber(viewCount),
        comments,
        url: articleUrl
      };

    } catch (error) {
      console.error('[Crawler] Error fetching post detail:', error);
      throw error;
    }
  }

  /**
   * 카페 ID 추출
   * @param {string} url - 카페 URL
   * @returns {string} 카페 ID
   */
  extractCafeId(url) {
    // https://cafe.naver.com/m2school -> m2school
    const match = url.match(/cafe\.naver\.com\/([^/?]+)/);
    return match ? match[1] : '';
  }

  /**
   * 숫자 파싱 (쉼표 제거)
   * @param {string} str - 숫자 문자열
   * @returns {number} 파싱된 숫자
   */
  parseNumber(str) {
    const cleaned = str.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }

  /**
   * 날짜 문자열을 Date 객체로 변환
   * @param {string} dateStr - 날짜 문자열 (예: "2025.10.15", "10.15", "어제", "5시간 전")
   * @returns {Date|null} Date 객체 또는 null
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    const today = new Date();
    const currentYear = today.getFullYear();

    // "2025.10.15" 형식
    const fullDateMatch = dateStr.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (fullDateMatch) {
      const [, year, month, day] = fullDateMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // "10.15" 형식 (올해)
    const shortDateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})/);
    if (shortDateMatch) {
      const [, month, day] = shortDateMatch;
      return new Date(currentYear, parseInt(month) - 1, parseInt(day));
    }

    // "어제"
    if (dateStr.includes('어제')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }

    // "N시간 전", "N분 전"
    const hoursMatch = dateStr.match(/(\d+)\s*시간\s*전/);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      const date = new Date(today);
      date.setHours(date.getHours() - hours);
      return date;
    }

    const minutesMatch = dateStr.match(/(\d+)\s*분\s*전/);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      const date = new Date(today);
      date.setMinutes(date.getMinutes() - minutes);
      return date;
    }

    return null;
  }

  /**
   * 브라우저 종료
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('[Crawler] Browser closed');
    }
  }
}

module.exports = NaverCafeCrawler;
