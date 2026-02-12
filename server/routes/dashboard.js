const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Academy = require('../models/Academy');
const CrawlSource = require('../models/CrawlSource');

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getYesterdayRange() {
  const today = getTodayRange();
  const start = new Date(today.start);
  start.setDate(start.getDate() - 1);
  return { start, end: today.start };
}

function getWeekStart() {
  const today = getTodayRange();
  const start = new Date(today.start);
  start.setDate(start.getDate() - 7);
  return start;
}

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const today = getTodayRange();
    const yesterday = getYesterdayRange();

    const [todayCount, yesterdayCount, topAcademy, topSource, activeAcademyCount] = await Promise.all([
      Post.countDocuments({ postedAt: { $gte: today.start, $lt: today.end } }),
      Post.countDocuments({ postedAt: { $gte: yesterday.start, $lt: yesterday.end } }),
      Post.aggregate([
        { $match: { postedAt: { $gte: today.start, $lt: today.end } } },
        { $group: { _id: '$academy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'academies', localField: '_id', foreignField: '_id', as: 'academy' } },
        { $unwind: { path: '$academy', preserveNullAndEmptyArrays: true } }
      ]),
      Post.aggregate([
        { $match: { postedAt: { $gte: today.start, $lt: today.end } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'crawlsources', localField: '_id', foreignField: '_id', as: 'source' } },
        { $unwind: { path: '$source', preserveNullAndEmptyArrays: true } }
      ]),
      Academy.countDocuments({ isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        todayPosts: todayCount,
        yesterdayPosts: yesterdayCount,
        topAcademy: topAcademy.length > 0
          ? { name: topAcademy[0].academy?.name || '-', count: topAcademy[0].count }
          : { name: '-', count: 0 },
        topSource: topSource.length > 0
          ? { name: topSource[0].source?.name || '-', sourceType: topSource[0].source?.sourceType || '', count: topSource[0].count }
          : { name: '-', sourceType: '', count: 0 },
        activeAcademies: activeAcademyCount
      }
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/academy-ranking
router.get('/academy-ranking', async (req, res) => {
  try {
    const today = getTodayRange();
    const yesterday = getYesterdayRange();
    const weekStart = getWeekStart();

    const ranking = await Post.aggregate([
      { $match: { postedAt: { $gte: weekStart, $lt: today.end } } },
      { $group: {
          _id: '$academy',
          todayCount: {
            $sum: { $cond: [{ $gte: ['$postedAt', today.start] }, 1, 0] }
          },
          yesterdayCount: {
            $sum: {
              $cond: [{
                $and: [
                  { $gte: ['$postedAt', yesterday.start] },
                  { $lt: ['$postedAt', today.start] }
                ]
              }, 1, 0]
            }
          },
          weekCount: { $sum: 1 }
        }
      },
      { $lookup: {
          from: 'academies',
          localField: '_id',
          foreignField: '_id',
          as: 'academy'
        }
      },
      { $unwind: { path: '$academy', preserveNullAndEmptyArrays: true } },
      { $match: { 'academy.isActive': { $ne: false } } },
      { $project: {
          _id: 1,
          name: '$academy.name',
          todayCount: 1,
          yesterdayCount: 1,
          weekCount: 1,
          change: { $subtract: ['$todayCount', '$yesterdayCount'] }
        }
      },
      { $sort: { todayCount: -1 } }
    ]);

    res.json({ success: true, data: ranking });
  } catch (err) {
    console.error('Academy ranking error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/source-activity
router.get('/source-activity', async (req, res) => {
  try {
    const today = getTodayRange();
    const yesterday = getYesterdayRange();
    const weekStart = getWeekStart();

    const activity = await Post.aggregate([
      { $match: { postedAt: { $gte: weekStart, $lt: today.end } } },
      { $group: {
          _id: '$source',
          todayCount: {
            $sum: { $cond: [{ $gte: ['$postedAt', today.start] }, 1, 0] }
          },
          yesterdayCount: {
            $sum: {
              $cond: [{
                $and: [
                  { $gte: ['$postedAt', yesterday.start] },
                  { $lt: ['$postedAt', today.start] }
                ]
              }, 1, 0]
            }
          },
          weekCount: { $sum: 1 }
        }
      },
      { $lookup: {
          from: 'crawlsources',
          localField: '_id',
          foreignField: '_id',
          as: 'source'
        }
      },
      { $unwind: { path: '$source', preserveNullAndEmptyArrays: true } },
      { $match: { 'source.isActive': { $ne: false } } },
      { $project: {
          _id: 1,
          name: '$source.name',
          sourceType: '$source.sourceType',
          todayCount: 1,
          yesterdayCount: 1,
          changeRate: {
            $cond: [
              { $gt: ['$yesterdayCount', 0] },
              { $round: [{ $multiply: [{ $divide: [{ $subtract: ['$todayCount', '$yesterdayCount'] }, '$yesterdayCount'] }, 100] }, 0] },
              { $cond: [{ $gt: ['$todayCount', 0] }, 100, 0] }
            ]
          },
          weekAvg: { $round: [{ $divide: ['$weekCount', 7] }, 1] }
        }
      },
      { $sort: { todayCount: -1 } }
    ]);

    res.json({ success: true, data: activity });
  } catch (err) {
    console.error('Source activity error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/trending-posts
router.get('/trending-posts', async (req, res) => {
  try {
    const weekStart = getWeekStart();
    const today = getTodayRange();

    const posts = await Post.aggregate([
      { $match: { postedAt: { $gte: weekStart, $lt: today.end } } },
      { $addFields: { engagement: { $add: ['$viewCount', '$commentCount'] } } },
      { $sort: { engagement: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'academies', localField: 'academy', foreignField: '_id', as: 'academyInfo' } },
      { $unwind: { path: '$academyInfo', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'crawlsources', localField: 'source', foreignField: '_id', as: 'sourceInfo' } },
      { $unwind: { path: '$sourceInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          author: 1,
          postUrl: 1,
          viewCount: 1,
          commentCount: 1,
          engagement: 1,
          postedAt: 1,
          academyName: '$academyInfo.name',
          sourceName: '$sourceInfo.name',
          sourceType: '$sourceInfo.sourceType'
        }
      }
    ]);

    res.json({ success: true, data: posts });
  } catch (err) {
    console.error('Trending posts error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
