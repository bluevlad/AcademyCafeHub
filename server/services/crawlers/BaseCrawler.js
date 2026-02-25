const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Stealth 플러그인 적용 (봇 감지 우회)
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class BaseCrawler {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.options = options;
  }

  /**
   * 브라우저 초기화 (Stealth 모드)
   */
  async initBrowser() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--lang=ko-KR,ko'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    this.page = await this.browser.newPage();

    await this.page.setViewport({ width: 1920, height: 1080 });

    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    });

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
    });

    console.log(`[${this.constructor.name}] Browser initialized with stealth mode`);
  }

  /**
   * 랜덤 딜레이 (인간처럼 행동)
   */
  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 숫자 파싱
   */
  parseNumber(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }

  /**
   * 날짜 파싱 (한국어 날짜 형식 지원)
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    const today = new Date();
    const currentYear = today.getFullYear();

    // "2025.10.15" 형식 (4자리 연도)
    const fullDateMatch = dateStr.match(/(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
    if (fullDateMatch) {
      const [, year, month, day] = fullDateMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // "26/02/09" 형식 (2자리 연도) - DC인사이드 등
    const shortYearMatch = dateStr.match(/(\d{2})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
    if (shortYearMatch) {
      const [, shortYear, month, day] = shortYearMatch;
      return new Date(2000 + parseInt(shortYear), parseInt(month) - 1, parseInt(day));
    }

    // "10.15" 또는 "10.15." 형식 (올해)
    const shortDateMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
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

    // "N시간 전"
    const hoursMatch = dateStr.match(/(\d+)\s*시간\s*전/);
    if (hoursMatch) {
      const date = new Date(today);
      date.setHours(date.getHours() - parseInt(hoursMatch[1]));
      return date;
    }

    // "N분 전"
    const minutesMatch = dateStr.match(/(\d+)\s*분\s*전/);
    if (minutesMatch) {
      const date = new Date(today);
      date.setMinutes(date.getMinutes() - parseInt(minutesMatch[1]));
      return date;
    }

    // "N일 전"
    const daysMatch = dateStr.match(/(\d+)\s*일\s*전/);
    if (daysMatch) {
      const date = new Date(today);
      date.setDate(date.getDate() - parseInt(daysMatch[1]));
      return date;
    }

    return null;
  }

  /**
   * 날짜 범위 체크
   */
  isWithinDateRange(postDate, startDate, endDate) {
    if (!startDate && !endDate) return true;
    if (!postDate) return true;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && postDate < start) return false;
    if (end && postDate > end) return false;

    return true;
  }

  /**
   * 자동 스크롤 (lazy loading 대응)
   */
  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 3000) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
    await this.randomDelay(1000, 2000);
  }

  /**
   * 디버그용 HTML 저장
   */
  saveDebugHtml(content, prefix) {
    try {
      const debugDir = path.join(__dirname, '../../../debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const htmlFile = path.join(debugDir, `${prefix}_${Date.now()}.html`);
      fs.writeFileSync(htmlFile, content, 'utf8');
      console.log(`[${this.constructor.name}] HTML saved to: ${htmlFile}`);
    } catch (e) {
      // 디버그 저장 실패는 무시
    }
  }

  /**
   * 게시글 검색 (서브클래스에서 구현)
   */
  async searchPosts(keyword, maxResults, options) {
    throw new Error('searchPosts must be implemented by subclass');
  }

  /**
   * 게시글 상세 조회 (서브클래스에서 구현)
   */
  async getPostDetail(url) {
    throw new Error('getPostDetail must be implemented by subclass');
  }

  /**
   * 브라우저 종료
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log(`[${this.constructor.name}] Browser closed`);
    }
  }
}

module.exports = BaseCrawler;
