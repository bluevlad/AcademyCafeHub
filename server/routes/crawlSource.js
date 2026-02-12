const express = require('express');
const router = express.Router();
const CrawlSource = require('../models/CrawlSource');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/crawl-sources
 * @desc    크롤링 소스 목록 조회 (sourceType 필터)
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.sourceType) {
      filter.sourceType = req.query.sourceType;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const sources = await CrawlSource.find(filter).sort({ sourceType: 1, name: 1 });
    res.json({ success: true, data: sources });
  } catch (error) {
    console.error('[CrawlSource] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/crawl-sources
 * @desc    크롤링 소스 등록
 */
router.post('/', protect, async (req, res) => {
  try {
    const { name, url, sourceType, sourceId, crawlConfig } = req.body;

    if (!name || !url || !sourceType || !sourceId) {
      return res.status(400).json({ success: false, error: 'name, url, sourceType, sourceId는 필수입니다' });
    }

    const source = await CrawlSource.create({ name, url, sourceType, sourceId, crawlConfig });
    res.status(201).json({ success: true, data: source });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: '이미 존재하는 소스입니다' });
    }
    console.error('[CrawlSource] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PUT /api/crawl-sources/:id
 * @desc    크롤링 소스 수정
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, url, sourceType, sourceId, isActive, crawlConfig } = req.body;

    const source = await CrawlSource.findByIdAndUpdate(
      req.params.id,
      { name, url, sourceType, sourceId, isActive, crawlConfig },
      { new: true, runValidators: true }
    );

    if (!source) {
      return res.status(404).json({ success: false, error: '소스를 찾을 수 없습니다' });
    }

    res.json({ success: true, data: source });
  } catch (error) {
    console.error('[CrawlSource] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
