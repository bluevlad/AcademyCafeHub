const BaseCrawler = require('./BaseCrawler');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * DC인사이드 갤러리 크롤러
 * Puppeteer 없이 axios + cheerio로 동작 (정적 HTML)
 */
class DCInsideCrawler extends BaseCrawler {
  constructor(galleryUrl, options = {}) {
    super(options);
    this.galleryUrl = galleryUrl;
    this.galleryId = this.extractGalleryId(galleryUrl);
    this.isMiniGallery = galleryUrl.includes('/mgallery/');
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://gall.dcinside.com/'
    };
  }

  extractGalleryId(url) {
    const match = url.match(/[?&]id=([^&]+)/);
    return match ? match[1] : '';
  }

  // Puppeteer 불필요 - no-op
  async initBrowser() {}
  async close() {}

  /**
   * 키워드로 게시글 검색
   */
  async searchPosts(keyword, maxResults = 10, options = {}) {
    try {
      console.log(`[DCInsideCrawler] Searching for keyword: ${keyword} in gallery: ${this.galleryId}`);

      // 방법 1: DC 갤러리 내부 검색
      let posts = await this.searchPostsInternal(keyword, maxResults, options);
      if (posts.length > 0) {
        console.log(`[DCInsideCrawler] Found ${posts.length} posts via internal search`);
        return posts;
      }

      // 방법 2: DC 검색 API
      console.log('[DCInsideCrawler] Internal search failed, trying search page...');
      posts = await this.searchPostsSearchPage(keyword, maxResults, options);
      if (posts.length > 0) {
        console.log(`[DCInsideCrawler] Found ${posts.length} posts via search page`);
        return posts;
      }

      // 방법 3: 샘플 데이터
      console.log('[DCInsideCrawler] All methods failed, generating sample data...');
      return this.generateSampleData(keyword, maxResults, options);

    } catch (error) {
      console.error('[DCInsideCrawler] Error during crawling:', error);
      return this.generateSampleData(keyword, maxResults, options);
    }
  }

  /**
   * DC 갤러리 내부 검색
   */
  async searchPostsInternal(keyword, maxResults, options) {
    try {
      const basePath = this.isMiniGallery ? 'mgallery/board' : 'board';
      const searchUrl = `https://gall.dcinside.com/${basePath}/lists/?id=${this.galleryId}&s_type=search_subject_memo&s_keyword=${encodeURIComponent(keyword)}`;

      console.log(`[DCInsideCrawler] Fetching: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        headers: this.headers,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const posts = [];

      $('.gall_list .ub-content').each((index, element) => {
        if (posts.length >= maxResults) return false;

        const $el = $(element);

        // 공지/AD 제외
        if ($el.hasClass('ub-notice') || $el.find('.icon_notice').length > 0) return true;

        const titleEl = $el.find('.gall_tit a').first();
        const title = titleEl.text().trim();
        const href = titleEl.attr('href');
        const author = $el.find('.gall_writer .nickname, .gall_writer em').text().trim() || '알 수 없음';
        const date = $el.find('.gall_date').text().trim() || $el.find('.gall_date').attr('title') || '';
        const viewCount = $el.find('.gall_count').text().trim();
        const commentCount = $el.find('.reply_numbox .reply_num').text().trim();

        if (title) {
          const postDate = this.parseDate(date);
          if (this.isWithinDateRange(postDate, options.startDate, options.endDate)) {
            const fullUrl = href ? (href.startsWith('http') ? href : `https://gall.dcinside.com${href}`) : '';
            posts.push({
              title,
              url: fullUrl,
              author,
              postedAt: date,
              postedAtDate: postDate,
              viewCount: this.parseNumber(viewCount),
              commentCount: this.parseNumber(commentCount),
              keyword,
              source: 'dcinside',
              cafeUrl: this.galleryUrl,
              collectedAt: new Date().toISOString()
            });
          }
        }
      });

      return posts;

    } catch (error) {
      console.error('[DCInsideCrawler] Internal search error:', error.message);
      return [];
    }
  }

  /**
   * DC 검색 페이지
   */
  async searchPostsSearchPage(keyword, maxResults, options) {
    try {
      const searchUrl = `https://search.dcinside.com/combine/q/${encodeURIComponent(keyword)}`;

      const response = await axios.get(searchUrl, {
        headers: this.headers,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const posts = [];

      $('.sch_result_list li, .result_list li').each((index, element) => {
        if (posts.length >= maxResults) return false;

        const $el = $(element);
        const titleEl = $el.find('a.tit').first();
        const title = titleEl.text().trim();
        const url = titleEl.attr('href');
        const date = $el.find('.date').text().trim();

        if (title && url && url.includes('dcinside.com')) {
          const postDate = this.parseDate(date);
          if (this.isWithinDateRange(postDate, options.startDate, options.endDate)) {
            posts.push({
              title,
              url,
              author: '알 수 없음',
              postedAt: date,
              postedAtDate: postDate,
              viewCount: 0,
              commentCount: 0,
              keyword,
              source: 'dcinside',
              cafeUrl: this.galleryUrl,
              collectedAt: new Date().toISOString()
            });
          }
        }
      });

      return posts;

    } catch (error) {
      console.error('[DCInsideCrawler] Search page error:', error.message);
      return [];
    }
  }

  /**
   * 게시글 상세 정보 가져오기
   */
  async getPostDetail(articleUrl) {
    try {
      console.log(`[DCInsideCrawler] Fetching post detail: ${articleUrl}`);

      const response = await axios.get(articleUrl, {
        headers: this.headers,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);

      const title = $('.title_subject').text().trim();
      const author = $('.gall_writer .nickname, .gall_writer em').first().text().trim();
      const postDate = $('.gall_date').first().text().trim() || $('.gall_date').first().attr('title') || '';
      const articleContent = $('.write_div').html() || '';
      const viewCountStr = $('.gall_count').first().text().trim();

      const comments = [];
      $('.reply_list li.ub-content').each((index, element) => {
        const $comment = $(element);
        const commentAuthor = $comment.find('.gall_writer .nickname, .gall_writer em').text().trim();
        const commentContent = $comment.find('.usertxt').text().trim();
        const commentDate = $comment.find('.date_time').text().trim();

        if (commentContent) {
          comments.push({
            author: commentAuthor,
            content: commentContent,
            commentedAt: commentDate
          });
        }
      });

      return { title, author, postedAt: postDate, content: articleContent, viewCount: this.parseNumber(viewCountStr), comments, url: articleUrl };

    } catch (error) {
      console.error('[DCInsideCrawler] Error fetching post detail:', error);
      throw error;
    }
  }

  /**
   * 샘플 데이터 생성
   */
  generateSampleData(keyword, maxResults, options) {
    console.log('[DCInsideCrawler] Generating sample data as fallback...');
    const posts = [];
    const now = new Date();

    for (let i = 0; i < Math.min(maxResults, 10); i++) {
      const randomDays = Math.floor(Math.random() * 90);
      const postDate = new Date(now);
      postDate.setDate(postDate.getDate() - randomDays);

      if (options.startDate) {
        const startDate = new Date(options.startDate);
        if (postDate < startDate) {
          postDate.setTime(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
        }
      }
      if (options.endDate) {
        const endDate = new Date(options.endDate);
        if (postDate > endDate) {
          const start = options.startDate ? new Date(options.startDate) : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          postDate.setTime(start.getTime() + Math.random() * (endDate.getTime() - start.getTime()));
        }
      }

      const dateStr = `${postDate.getFullYear()}.${(postDate.getMonth() + 1).toString().padStart(2, '0')}.${postDate.getDate().toString().padStart(2, '0')}`;

      posts.push({
        title: `[샘플] ${keyword} 관련 DC갤러리 게시글 ${i + 1}`,
        url: `${this.galleryUrl}&no=sample${i + 1}`,
        author: 'ㅇㅇ',
        postedAt: dateStr,
        postedAtDate: postDate,
        viewCount: Math.floor(Math.random() * 1000) + 100,
        commentCount: Math.floor(Math.random() * 30),
        keyword,
        source: 'dcinside',
        cafeUrl: this.galleryUrl,
        collectedAt: new Date().toISOString(),
        isSample: true
      });
    }

    console.log(`[DCInsideCrawler] Generated ${posts.length} sample posts`);
    return posts;
  }
}

module.exports = DCInsideCrawler;
