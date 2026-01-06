const express = require('express');
const router = express.Router();
const NaverCafeCrawler = require('../services/naverCafeCrawler');

/**
 * @route   POST /api/crawler/naver-cafe/search
 * @desc    네이버 카페에서 키워드로 게시글 검색 (로그인 지원)
 * @access  Public
 * @body    cafeUrl - 카페 URL (예: https://cafe.naver.com/m2school)
 * @body    keyword - 검색 키워드 (예: 윌비스)
 * @body    maxResults - 최대 결과 수 (기본값: 10)
 * @body    startDate - 시작 날짜 (YYYY-MM-DD)
 * @body    endDate - 종료 날짜 (YYYY-MM-DD)
 * @body    credentials - 네이버 로그인 정보 { username, password } (선택)
 */
router.post('/naver-cafe/search', async (req, res) => {
  let crawler = null;

  try {
    const { cafeUrl, keyword, maxResults = 10, startDate, endDate, credentials } = req.body;

    // 필수 파라미터 검증
    if (!cafeUrl) {
      return res.status(400).json({
        success: false,
        error: 'cafeUrl 파라미터가 필요합니다.'
      });
    }

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword 파라미터가 필요합니다.'
      });
    }

    console.log(`[API] Crawling request - Cafe: ${cafeUrl}, Keyword: ${keyword}, Date: ${startDate} ~ ${endDate}`);
    console.log(`[API] Login credentials provided: ${credentials ? 'Yes' : 'No'}`);

    // 환경 변수에서 네이버 계정 정보 가져오기 (credentials가 없는 경우)
    const finalCredentials = credentials || (
      process.env.NAVER_ID && process.env.NAVER_PASSWORD &&
      process.env.NAVER_ID !== 'your_naver_id' ? {
        username: process.env.NAVER_ID,
        password: process.env.NAVER_PASSWORD
      } : null
    );

    // 크롤러 인스턴스 생성 (로그인 정보 포함)
    crawler = new NaverCafeCrawler(cafeUrl, finalCredentials);
    const posts = await crawler.searchPosts(keyword, parseInt(maxResults, 10), {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: {
        cafeUrl,
        keyword,
        startDate,
        endDate,
        totalResults: posts.length,
        posts
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Crawling error:', error);
    res.status(500).json({
      success: false,
      error: '크롤링 중 오류가 발생했습니다.',
      message: error.message
    });
  } finally {
    // 브라우저 정리
    if (crawler) {
      await crawler.close();
    }
  }
});

/**
 * @route   GET /api/crawler/naver-cafe/post-detail
 * @desc    특정 게시글의 상세 정보 가져오기
 * @access  Public
 * @query   articleUrl - 게시글 URL
 */
router.get('/naver-cafe/post-detail', async (req, res) => {
  let crawler = null;

  try {
    const { articleUrl } = req.query;

    if (!articleUrl) {
      return res.status(400).json({
        success: false,
        error: 'articleUrl 파라미터가 필요합니다.'
      });
    }

    console.log(`[API] Fetching post detail: ${articleUrl}`);

    // 카페 URL 추출 (articleUrl에서)
    const cafeUrlMatch = articleUrl.match(/(https:\/\/cafe\.naver\.com\/[^/]+)/);
    const cafeUrl = cafeUrlMatch ? cafeUrlMatch[1] : 'https://cafe.naver.com';

    crawler = new NaverCafeCrawler(cafeUrl);
    const postDetail = await crawler.getPostDetail(articleUrl);

    res.json({
      success: true,
      data: postDetail,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching post detail:', error);
    res.status(500).json({
      success: false,
      error: '게시글 상세 정보를 가져오는 중 오류가 발생했습니다.',
      message: error.message
    });
  } finally {
    if (crawler) {
      await crawler.close();
    }
  }
});

/**
 * @route   POST /api/crawler/naver-cafe/batch-search
 * @desc    여러 키워드로 동시에 검색
 * @access  Public
 * @body    cafeUrl - 카페 URL
 * @body    keywords - 검색 키워드 배열 (예: ["윌비스", "메가공무원"])
 * @body    maxResults - 키워드당 최대 결과 수
 */
router.post('/naver-cafe/batch-search', async (req, res) => {
  let crawler = null;

  try {
    const { cafeUrl, keywords, maxResults = 10 } = req.body;

    if (!cafeUrl) {
      return res.status(400).json({
        success: false,
        error: 'cafeUrl이 필요합니다.'
      });
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'keywords 배열이 필요합니다.'
      });
    }

    console.log(`[API] Batch crawling - Cafe: ${cafeUrl}, Keywords: ${keywords.join(', ')}`);

    crawler = new NaverCafeCrawler(cafeUrl);
    const results = {};

    // 각 키워드별로 순차 검색
    for (const keyword of keywords) {
      try {
        const posts = await crawler.searchPosts(keyword, maxResults);
        results[keyword] = {
          success: true,
          totalResults: posts.length,
          posts
        };
      } catch (error) {
        results[keyword] = {
          success: false,
          error: error.message
        };
      }
    }

    res.json({
      success: true,
      data: {
        cafeUrl,
        keywords,
        results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Batch crawling error:', error);
    res.status(500).json({
      success: false,
      error: '배치 크롤링 중 오류가 발생했습니다.',
      message: error.message
    });
  } finally {
    if (crawler) {
      await crawler.close();
    }
  }
});

module.exports = router;
