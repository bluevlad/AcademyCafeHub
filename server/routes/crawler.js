const express = require('express');
const router = express.Router();
const NaverCafeCrawler = require('../services/naverCafeCrawler');
const CrawlerManager = require('../services/CrawlerManager');
const CrawlSource = require('../models/CrawlSource');
const CrawlJob = require('../models/CrawlJob');
const CrawlerFactory = require('../services/crawlers/CrawlerFactory');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/crawler/naver-cafe/search
 * @desc    네이버 카페에서 키워드로 게시글 검색 (네이버 검색 API)
 * @access  Public
 * @body    cafeUrl - 카페 URL (예: https://cafe.naver.com/m2school)
 * @body    keyword - 검색 키워드 (예: 윌비스)
 * @body    maxResults - 최대 결과 수 (기본값: 10)
 * @body    startDate - 시작 날짜 (YYYY-MM-DD)
 * @body    endDate - 종료 날짜 (YYYY-MM-DD)
 */
router.post('/naver-cafe/search', async (req, res) => {
  try {
    const { cafeUrl, keyword, maxResults = 10, startDate, endDate } = req.body;

    if (!cafeUrl) {
      return res.status(400).json({ success: false, error: 'cafeUrl 파라미터가 필요합니다.' });
    }
    if (!keyword) {
      return res.status(400).json({ success: false, error: 'keyword 파라미터가 필요합니다.' });
    }

    console.log(`[API] Crawling request - Cafe: ${cafeUrl}, Keyword: ${keyword}, Date: ${startDate} ~ ${endDate}`);

    const crawler = new NaverCafeCrawler(cafeUrl, {
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET
    });
    const posts = await crawler.searchPosts(keyword, parseInt(maxResults, 10), { startDate, endDate });

    res.json({
      success: true,
      data: { cafeUrl, keyword, startDate, endDate, totalResults: posts.length, posts },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Crawling error:', error);
    res.status(500).json({ success: false, error: '크롤링 중 오류가 발생했습니다.', message: error.message });
  }
});

/**
 * @route   GET /api/crawler/naver-cafe/post-detail
 * @desc    특정 게시글의 상세 정보 (API 기반 크롤러에서는 미지원)
 * @access  Public
 * @query   articleUrl - 게시글 URL
 */
router.get('/naver-cafe/post-detail', async (req, res) => {
  const { articleUrl } = req.query;

  if (!articleUrl) {
    return res.status(400).json({ success: false, error: 'articleUrl 파라미터가 필요합니다.' });
  }

  // 네이버 검색 API는 게시글 상세 조회를 지원하지 않음
  // link를 통해 직접 접근해야 함
  res.json({
    success: true,
    data: {
      url: articleUrl,
      message: '네이버 검색 API에서는 게시글 상세 조회를 지원하지 않습니다. link를 통해 직접 접근하세요.'
    },
    timestamp: new Date().toISOString()
  });
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
  try {
    const { cafeUrl, keywords, maxResults = 10 } = req.body;

    if (!cafeUrl) {
      return res.status(400).json({ success: false, error: 'cafeUrl이 필요합니다.' });
    }
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, error: 'keywords 배열이 필요합니다.' });
    }

    console.log(`[API] Batch crawling - Cafe: ${cafeUrl}, Keywords: ${keywords.join(', ')}`);

    const crawler = new NaverCafeCrawler(cafeUrl, {
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET
    });
    const results = {};

    for (const keyword of keywords) {
      try {
        const posts = await crawler.searchPosts(keyword, maxResults);
        results[keyword] = { success: true, totalResults: posts.length, posts };
      } catch (error) {
        results[keyword] = { success: false, error: error.message };
      }
    }

    res.json({
      success: true,
      data: { cafeUrl, keywords, results },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Batch crawling error:', error);
    res.status(500).json({ success: false, error: '배치 크롤링 중 오류가 발생했습니다.', message: error.message });
  }
});

// ============================================================
// 새로운 범용 엔드포인트
// ============================================================

/**
 * @route   POST /api/crawler/search
 * @desc    범용 크롤링 검색 (sourceType 지정, persist 옵션)
 * @body    sourceType, sourceUrl, keyword, maxResults, startDate, endDate, persist, academyId
 */
router.post('/search', protect, async (req, res) => {
  let crawler = null;

  try {
    const { sourceType, sourceUrl, keyword, maxResults = 10, startDate, endDate, persist, academyId } = req.body;

    if (!sourceType || !sourceUrl || !keyword) {
      return res.status(400).json({ success: false, error: 'sourceType, sourceUrl, keyword는 필수입니다' });
    }

    console.log(`[API] Universal search - Type: ${sourceType}, URL: ${sourceUrl}, Keyword: ${keyword}`);

    crawler = CrawlerFactory.create(sourceType, sourceUrl);
    const posts = await crawler.searchPosts(keyword, parseInt(maxResults, 10), { startDate, endDate });

    // persist 옵션이 있으면 DB에 저장
    if (persist && academyId) {
      const source = await CrawlSource.findOne({ sourceType, url: sourceUrl });
      if (source) {
        let saved = 0;
        for (const post of posts) {
          const result = await CrawlerManager.savePost(post, source._id, academyId);
          if (result === 'saved') saved++;
        }
        console.log(`[API] Persisted ${saved}/${posts.length} posts`);
      }
    }

    res.json({
      success: true,
      data: { sourceType, sourceUrl, keyword, startDate, endDate, totalResults: posts.length, posts },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Universal search error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (crawler && typeof crawler.close === 'function') {
      try { await crawler.close(); } catch (e) { /* ignore */ }
    }
  }
});

/**
 * @route   POST /api/crawler/crawl-academy/:academyId
 * @desc    학원 전체 크롤링
 */
router.post('/crawl-academy/:academyId', protect, async (req, res) => {
  try {
    const { academyId } = req.params;
    const { maxResults, startDate, endDate } = req.body;

    console.log(`[API] Crawling for academy: ${academyId}`);

    const result = await CrawlerManager.crawlForAcademy(academyId, {
      maxResults,
      startDate,
      endDate
    });

    res.json({ success: true, data: result, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('[API] Academy crawl error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/crawler/crawl-all
 * @desc    전체 학원 크롤링
 */
router.post('/crawl-all', protect, async (req, res) => {
  try {
    const { maxResults, startDate, endDate } = req.body;

    console.log('[API] Starting crawl-all');

    const result = await CrawlerManager.crawlAll({
      maxResults,
      startDate,
      endDate
    });

    res.json({ success: true, data: result, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('[API] Crawl-all error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/crawler/jobs
 * @desc    크롤 작업 목록 조회
 */
router.get('/jobs', async (req, res) => {
  try {
    const { status, academy, source, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (academy) filter.academy = academy;
    if (source) filter.source = source;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CrawlJob.countDocuments(filter);
    const jobs = await CrawlJob.find(filter)
      .populate('source', 'name sourceType')
      .populate('academy', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('[API] Jobs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
