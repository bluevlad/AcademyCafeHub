const axios = require('axios');
const cheerio = require('cheerio');

class NaverCafeCrawler {
  /**
   * @param {string} cafeUrl - 카페 URL (예: https://cafe.naver.com/m2school)
   * @param {object} apiKeys - { clientId, clientSecret } 네이버 검색 API 키
   */
  constructor(cafeUrl, apiKeys = {}) {
    this.cafeUrl = cafeUrl;
    this.cafeId = this.extractCafeId(cafeUrl);
    this.clientId = apiKeys.clientId || process.env.NAVER_CLIENT_ID;
    this.clientSecret = apiKeys.clientSecret || process.env.NAVER_CLIENT_SECRET;

    this.webHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.naver.com/'
    };
  }

  /**
   * 키워드로 카페 게시글 검색 (병합 전략)
   * 1순위: 네이버 통합검색 웹 스크래핑 (날짜/카페명 포함, 2~4개)
   * 2순위: 네이버 검색 API (대량, 날짜 없음)
   * 3순위: 샘플 데이터 (최후 수단)
   * → 1+2 병합하여 반환
   */
  async searchPosts(keyword, maxResults = 20, options = {}) {
    try {
      console.log(`[NaverCafeCrawler] Searching for keyword: "${keyword}" in cafe: ${this.cafeId || '전체'}`);

      // 1단계: 웹 스크래핑으로 인기 카페글 수집 (날짜/카페명 포함)
      let webPosts = [];
      try {
        webPosts = await this.searchPostsWebScraping(keyword, options);
        if (webPosts.length > 0) {
          console.log(`[NaverCafeCrawler] Web scraping: ${webPosts.length} posts with dates`);
        }
      } catch (e) {
        console.log(`[NaverCafeCrawler] Web scraping failed: ${e.message}`);
      }

      // 2단계: API로 추가 결과 수집
      let apiPosts = [];
      if (this.clientId && this.clientSecret) {
        const apiMaxResults = Math.max(maxResults - webPosts.length, maxResults);
        apiPosts = await this.searchPostsApi(keyword, apiMaxResults, options);
        console.log(`[NaverCafeCrawler] API: ${apiPosts.length} posts`);
      }

      // 3단계: 병합 (웹 스크래핑 결과 우선, URL 기준 중복 제거)
      const merged = this.mergePosts(webPosts, apiPosts, maxResults);
      console.log(`[NaverCafeCrawler] Merged: ${merged.length} posts (${webPosts.length} with dates)`);

      if (merged.length > 0) return merged;

      // 4단계: 모든 방법 실패 시 샘플 데이터
      console.log('[NaverCafeCrawler] All methods returned 0, generating sample data');
      return this.generateSampleData(keyword, Math.min(maxResults, 5));

    } catch (error) {
      console.error('[NaverCafeCrawler] Error during crawling:', error.message);
      return this.generateSampleData(keyword, Math.min(maxResults, 5));
    }
  }

  /**
   * 네이버 통합검색 웹 스크래핑 (entry.bootstrap JSON 파싱)
   * "인기 카페글" 섹션에서 날짜/카페명 포함 게시글 추출
   */
  async searchPostsWebScraping(keyword, options = {}) {
    const posts = [];
    const searchUrl = this.buildSearchUrl(keyword);
    console.log(`[NaverCafeCrawler] Web scraping: ${searchUrl}`);

    const response = await axios.get(searchUrl, {
      headers: this.webHeaders,
      timeout: 15000
    });

    if (response.status !== 200) return posts;

    const $ = cheerio.load(response.data);

    // <script> 태그에서 entry.bootstrap() JSON 추출
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      let searchStart = 0;

      while (true) {
        const idx = content.indexOf('entry.bootstrap(', searchStart);
        if (idx === -1) break;
        searchStart = idx + 1;

        const braceStart = content.indexOf('{', idx);
        if (braceStart === -1) continue;

        let braceCount = 0;
        let endPos = braceStart;
        for (let j = braceStart; j < content.length; j++) {
          if (content[j] === '{') braceCount++;
          if (content[j] === '}') braceCount--;
          if (braceCount === 0) { endPos = j + 1; break; }
        }

        try {
          const data = JSON.parse(content.substring(braceStart, endPos));
          this.extractCafeArticlesFromJson(data.body, keyword, options, posts);
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
      }
    });

    return posts;
  }

  /**
   * JSON 데이터에서 카페 게시글 재귀 추출
   */
  extractCafeArticlesFromJson(obj, keyword, options, results) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(item => this.extractCafeArticlesFromJson(item, keyword, options, results));
      return;
    }

    if (obj.props) {
      const p = obj.props;

      // type=searchBasic + titleHref에 cafe.naver.com 포함 → 카페 게시글
      if (p.type === 'searchBasic' && p.titleHref &&
          typeof p.titleHref === 'string' && p.titleHref.includes('cafe.naver.com')) {

        const title = this.stripHtml(p.title || '');
        const url = this.cleanCafeUrl(p.titleHref);
        const content = this.stripHtml(p.content || '');
        const cafeName = p.sourceProfile ? p.sourceProfile.title || '' : '';
        const dateStr = p.sourceProfile ? p.sourceProfile.createdDate || '' : '';
        const postedAtDate = this.parseDate(dateStr);

        // URL에서 cafeId 추출하여 필터링
        const articleCafeId = this.extractCafeIdFromUrl(url);
        if (this.cafeId && articleCafeId && articleCafeId !== this.cafeId) {
          return; // 다른 카페 게시글 제외
        }

        // 날짜 범위 필터링
        if (!this.isWithinDateRange(postedAtDate, options.startDate, options.endDate)) {
          return;
        }

        if (title) {
          results.push({
            title,
            url,
            author: '알 수 없음',
            content,
            postedAt: dateStr,
            postedAtDate,
            viewCount: 0,
            commentCount: 0,
            keyword,
            source: 'naver_cafe',
            cafeUrl: p.sourceProfile ? p.sourceProfile.titleHref || this.cafeUrl : this.cafeUrl,
            cafeName,
            collectedAt: new Date().toISOString(),
            isSample: false
          });
        }
      }

      this.extractCafeArticlesFromJson(p.children, keyword, options, results);
    }

    for (const key of Object.keys(obj)) {
      if (key !== 'props' && typeof obj[key] === 'object') {
        this.extractCafeArticlesFromJson(obj[key], keyword, options, results);
      }
    }
  }

  /**
   * 네이버 검색 API (기존 로직)
   */
  async searchPostsApi(keyword, maxResults = 20, options = {}) {
    if (!this.clientId || !this.clientSecret) {
      console.error('[NaverCafeCrawler] NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
      return [];
    }

    try {
      const display = Math.min(maxResults, 100);
      const posts = [];
      let start = 1;
      const maxStart = 1000;

      while (posts.length < maxResults && start <= maxStart) {
        const currentDisplay = Math.min(display, maxResults - posts.length, 100);

        const response = await axios.get('https://openapi.naver.com/v1/search/cafearticle', {
          params: {
            query: keyword,
            display: currentDisplay,
            start,
            sort: 'date'
          },
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret
          }
        });

        const items = response.data.items;
        if (!items || items.length === 0) break;

        for (const item of items) {
          if (posts.length >= maxResults) break;

          const post = this.parseApiItem(item, keyword);

          // 카페 ID 필터링
          if (this.cafeId && post.cafeName) {
            const itemCafeUrl = item.cafeurl || '';
            const matchesCafe = itemCafeUrl.includes(this.cafeId) ||
                                post.url.includes(this.cafeId);
            if (!matchesCafe) continue;
          }

          // 날짜 범위 필터링
          if (this.isWithinDateRange(post.postedAtDate, options.startDate, options.endDate)) {
            posts.push(post);
          }
        }

        start += items.length;
        if (items.length < currentDisplay) break;

        await this.delay(100);
      }

      return posts;

    } catch (error) {
      if (error.response) {
        console.error(`[NaverCafeCrawler] API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(`[NaverCafeCrawler] API error: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * 웹 스크래핑 + API 결과 병합 (URL 기준 중복 제거, 웹 스크래핑 우선)
   */
  mergePosts(webPosts, apiPosts, maxResults) {
    const urlSet = new Set();
    const merged = [];

    // 웹 스크래핑 결과 먼저 추가 (날짜 데이터 있음)
    for (const post of webPosts) {
      const normalizedUrl = this.normalizeUrl(post.url);
      if (!urlSet.has(normalizedUrl)) {
        urlSet.add(normalizedUrl);
        merged.push(post);
      }
    }

    // API 결과 추가 (중복 제외)
    for (const post of apiPosts) {
      if (merged.length >= maxResults) break;
      const normalizedUrl = this.normalizeUrl(post.url);
      if (!urlSet.has(normalizedUrl)) {
        urlSet.add(normalizedUrl);
        merged.push(post);
      }
    }

    return merged.slice(0, maxResults);
  }

  /**
   * 샘플 데이터 생성 (최후 수단)
   */
  generateSampleData(keyword, count = 5) {
    console.log('[NaverCafeCrawler] Generating sample data as fallback');
    const posts = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const randomDays = Math.floor(Math.random() * 30);
      const postDate = new Date(now);
      postDate.setDate(postDate.getDate() - randomDays);

      posts.push({
        title: `[샘플] ${keyword} 관련 네이버카페 게시글 ${i + 1}`,
        url: `${this.cafeUrl || 'https://cafe.naver.com'}?sample_${keyword}_${i + 1}`,
        author: '샘플사용자',
        content: `${keyword}에 대한 샘플 게시글입니다.`,
        postedAt: `${postDate.getFullYear()}.${String(postDate.getMonth() + 1).padStart(2, '0')}.${String(postDate.getDate()).padStart(2, '0')}.`,
        postedAtDate: postDate,
        viewCount: Math.floor(Math.random() * 500) + 50,
        commentCount: Math.floor(Math.random() * 20),
        keyword,
        source: 'naver_cafe',
        cafeUrl: this.cafeUrl,
        cafeName: this.cafeId || '',
        collectedAt: new Date().toISOString(),
        isSample: true
      });
    }

    return posts;
  }

  /**
   * 통합검색 URL 구성
   */
  buildSearchUrl(keyword) {
    const params = new URLSearchParams({
      where: 'article',
      query: keyword,
      sm: 'tab_viw'
    });

    if (this.cafeId) {
      params.set('cafe_url', this.cafeId);
    }

    return `https://search.naver.com/search.naver?${params.toString()}`;
  }

  /**
   * API 응답 item을 포맷으로 변환
   */
  parseApiItem(item, keyword) {
    const title = this.stripHtml(item.title);
    const description = this.stripHtml(item.description);

    return {
      title,
      url: item.link,
      author: '알 수 없음',
      content: description,
      postedAt: '',
      postedAtDate: null,
      viewCount: 0,
      commentCount: 0,
      keyword,
      source: 'naver_cafe',
      cafeUrl: item.cafeurl || this.cafeUrl,
      cafeName: item.cafename || '',
      collectedAt: new Date().toISOString(),
      isSample: false
    };
  }

  /**
   * 카페 게시글 URL에서 ?art= 이후 토큰 제거
   */
  cleanCafeUrl(url) {
    if (!url) return '';
    const artIdx = url.indexOf('?art=');
    return artIdx !== -1 ? url.substring(0, artIdx) : url;
  }

  /**
   * URL 정규화 (중복 비교용)
   */
  normalizeUrl(url) {
    if (!url) return '';
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^(m\.)?cafe\.naver\.com/, 'cafe.naver.com')
      .replace(/\?.*$/, '')
      .replace(/\/$/, '');
  }

  /**
   * URL에서 카페 ID 추출
   */
  extractCafeIdFromUrl(url) {
    if (!url) return '';
    const match = url.match(/cafe\.naver\.com\/([^/?#]+)/);
    return match ? match[1] : '';
  }

  /**
   * HTML 태그 제거
   */
  stripHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  }

  /**
   * 카페 ID 추출 (URL에서)
   */
  extractCafeId(url) {
    if (!url) return '';
    const match = url.match(/cafe\.naver\.com\/([^/?]+)/);
    return match ? match[1] : '';
  }

  /**
   * 날짜 파싱 (한국어 날짜 형식 지원)
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    const today = new Date();
    const currentYear = today.getFullYear();

    // "2025.10.15" 또는 "2025.10.15." 형식
    const fullDateMatch = dateStr.match(/(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
    if (fullDateMatch) {
      return new Date(parseInt(fullDateMatch[1]), parseInt(fullDateMatch[2]) - 1, parseInt(fullDateMatch[3]));
    }

    // "26.02.09" 형식 (2자리 연도)
    const shortYearMatch = dateStr.match(/^(\d{2})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
    if (shortYearMatch) {
      return new Date(2000 + parseInt(shortYearMatch[1]), parseInt(shortYearMatch[2]) - 1, parseInt(shortYearMatch[3]));
    }

    // "10.15" 또는 "10.15." 형식 (올해)
    const shortDateMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
    if (shortDateMatch) {
      return new Date(currentYear, parseInt(shortDateMatch[1]) - 1, parseInt(shortDateMatch[2]));
    }

    // "어제"
    if (dateStr.includes('어제')) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d;
    }

    // "N시간 전"
    const hoursMatch = dateStr.match(/(\d+)\s*시간\s*전/);
    if (hoursMatch) {
      const d = new Date(today);
      d.setHours(d.getHours() - parseInt(hoursMatch[1]));
      return d;
    }

    // "N분 전"
    const minutesMatch = dateStr.match(/(\d+)\s*분\s*전/);
    if (minutesMatch) {
      const d = new Date(today);
      d.setMinutes(d.getMinutes() - parseInt(minutesMatch[1]));
      return d;
    }

    // "N일 전"
    const daysMatch = dateStr.match(/(\d+)\s*일\s*전/);
    if (daysMatch) {
      const d = new Date(today);
      d.setDate(d.getDate() - parseInt(daysMatch[1]));
      return d;
    }

    // "N주 전"
    const weeksMatch = dateStr.match(/(\d+)\s*주\s*전/);
    if (weeksMatch) {
      const d = new Date(today);
      d.setDate(d.getDate() - parseInt(weeksMatch[1]) * 7);
      return d;
    }

    // "N개월 전"
    const monthsMatch = dateStr.match(/(\d+)\s*개월\s*전/);
    if (monthsMatch) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - parseInt(monthsMatch[1]));
      return d;
    }

    return null;
  }

  /**
   * 날짜 범위 체크
   */
  isWithinDateRange(postDate, startDate, endDate) {
    if (!startDate && !endDate) return true;
    if (!postDate) return true;

    const date = new Date(postDate);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  }

  /**
   * close() - 정리할 리소스 없음 (인터페이스 호환용)
   */
  async close() {
    // No browser to close - HTTP/API based crawler
  }

  /**
   * 딜레이
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = NaverCafeCrawler;
