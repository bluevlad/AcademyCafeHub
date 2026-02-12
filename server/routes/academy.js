const express = require('express');
const router = express.Router();
const Academy = require('../models/Academy');
const Post = require('../models/Post');
const CrawlSource = require('../models/CrawlSource');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/academies
 * @desc    학원 목록 조회
 */
router.get('/', async (req, res) => {
  try {
    const academies = await Academy.find().sort({ name: 1 });

    // 각 학원별 수집 게시글 수 집계
    const result = await Promise.all(academies.map(async (academy) => {
      const postCount = await Post.countDocuments({ academy: academy._id });
      return {
        ...academy.toObject(),
        postCount
      };
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Academy] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/academies/:id
 * @desc    학원 상세 조회
 */
router.get('/:id', async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id);
    if (!academy) {
      return res.status(404).json({ success: false, error: '학원을 찾을 수 없습니다' });
    }

    const postCount = await Post.countDocuments({ academy: academy._id });
    const sources = await CrawlSource.find({ isActive: true });

    res.json({
      success: true,
      data: {
        ...academy.toObject(),
        postCount,
        sources
      }
    });
  } catch (error) {
    console.error('[Academy] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/academies
 * @desc    학원 등록
 */
router.post('/', protect, async (req, res) => {
  try {
    const { name, nameEn, slug, keywords } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'name과 slug는 필수입니다' });
    }

    const academy = await Academy.create({ name, nameEn, slug, keywords: keywords || [] });
    res.status(201).json({ success: true, data: academy });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: '이미 존재하는 학원입니다' });
    }
    console.error('[Academy] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PUT /api/academies/:id
 * @desc    학원 수정
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, nameEn, slug, keywords, isActive } = req.body;

    const academy = await Academy.findByIdAndUpdate(
      req.params.id,
      { name, nameEn, slug, keywords, isActive },
      { new: true, runValidators: true }
    );

    if (!academy) {
      return res.status(404).json({ success: false, error: '학원을 찾을 수 없습니다' });
    }

    res.json({ success: true, data: academy });
  } catch (error) {
    console.error('[Academy] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
