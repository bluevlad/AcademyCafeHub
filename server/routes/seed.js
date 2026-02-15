const express = require('express');
const router = express.Router();
const Academy = require('../models/Academy');
const CrawlSource = require('../models/CrawlSource');
const { protect } = require('../middleware/auth');

const academies = [
  { name: '박문각', nameEn: 'PMG', slug: 'pmg', keywords: ['박문각', '박문각공무원', '박문각 후기', '신영식 행정법', '김중규 헌법'] },
  { name: '에듀윌', nameEn: 'Eduwill', slug: 'eduwill', keywords: ['에듀윌', '에듀윌공무원', '에듀윌 후기', '에듀윌 환불'] },
  { name: '해커스공무원', nameEn: 'Hackers', slug: 'hackers', keywords: ['해커스공무원', '해커스패스', '해커스 공무원 후기', '해커스공무원 인강'] },
  { name: '공단기', nameEn: 'Gongdangi', slug: 'gongdangi', keywords: ['공단기', '공단기닷컴', '공단기 후기', '공단기 환불'] },
  { name: '윌비스', nameEn: 'Willvis', slug: 'willvis', keywords: ['윌비스', '윌비스공무원', '윌비스 후기'] }
];

const crawlSources = [
  { name: '독공사', url: 'https://cafe.naver.com/m2school', sourceType: 'naver_cafe', sourceId: 'm2school', crawlConfig: { requiresLogin: true, minDelay: 2000, maxDelay: 4000 } },
  { name: '공드림', url: 'https://cafe.naver.com/gongdream', sourceType: 'naver_cafe', sourceId: 'gongdream', crawlConfig: { requiresLogin: true, minDelay: 2000, maxDelay: 4000 } },
  { name: '9급공무원', url: 'https://cafe.naver.com/9gong', sourceType: 'naver_cafe', sourceId: '9gong', crawlConfig: { requiresLogin: true, minDelay: 2000, maxDelay: 4000 } },
  { name: '공무원시험', url: 'https://cafe.daum.net/gongmuwon', sourceType: 'daum_cafe', sourceId: 'gongmuwon', crawlConfig: { requiresLogin: false, minDelay: 1500, maxDelay: 3000 } },
  { name: '공무원갤', url: 'https://gall.dcinside.com/mgallery/board/lists/?id=gongmuwon', sourceType: 'dcinside', sourceId: 'gongmuwon', crawlConfig: { requiresLogin: false, minDelay: 1000, maxDelay: 2000 } },
  { name: '공시생갤', url: 'https://gall.dcinside.com/mgallery/board/lists/?id=gongsisaeng', sourceType: 'dcinside', sourceId: 'gongsisaeng', crawlConfig: { requiresLogin: false, minDelay: 1000, maxDelay: 2000 } }
];

/**
 * @route   POST /api/seed/init
 * @desc    초기 데이터 시딩 (멱등)
 */
router.post('/init', protect, async (req, res) => {
  try {
    const results = { academies: { created: 0, skipped: 0, updated: 0 }, sources: { created: 0, skipped: 0 } };

    for (const academy of academies) {
      const existing = await Academy.findOne({ slug: academy.slug });
      if (!existing) {
        await Academy.create(academy);
        results.academies.created++;
      } else {
        const newKeywords = academy.keywords.filter(kw => !existing.keywords.includes(kw));
        if (newKeywords.length > 0) {
          await Academy.findByIdAndUpdate(existing._id, {
            $addToSet: { keywords: { $each: academy.keywords } }
          });
          results.academies.updated++;
        } else {
          results.academies.skipped++;
        }
      }
    }

    for (const source of crawlSources) {
      const existing = await CrawlSource.findOne({ sourceType: source.sourceType, sourceId: source.sourceId });
      if (!existing) {
        await CrawlSource.create(source);
        results.sources.created++;
      } else {
        results.sources.skipped++;
      }
    }

    const totalAcademies = await Academy.countDocuments();
    const totalSources = await CrawlSource.countDocuments();

    res.json({
      success: true,
      message: '시드 데이터 초기화 완료',
      results,
      totals: { academies: totalAcademies, sources: totalSources }
    });
  } catch (error) {
    console.error('[Seed] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
