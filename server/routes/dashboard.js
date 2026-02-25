const express = require('express');
const router = express.Router();
const teacherHub = require('../services/teacherHubClient');

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const [summary, academyStats, academies] = await Promise.all([
      teacherHub.getAnalysisSummary(),
      teacherHub.getAcademyStats(),
      teacherHub.getAcademies()
    ]);

    const topAcademy = academyStats && academyStats.length > 0
      ? { name: academyStats[0].academyName, count: academyStats[0].totalMentions }
      : { name: '-', count: 0 };

    res.json({
      success: true,
      data: {
        todayMentions: summary?.totalMentions ?? 0,
        avgSentimentScore: summary?.avgSentimentScore ?? 0,
        topAcademy,
        totalTeachers: summary?.totalTeachers ?? 0,
        totalAcademies: academies?.length ?? 0,
        positiveRatio: summary?.positiveRatio ?? 0,
        date: summary?.date ?? null
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
    const [academyStats, currentWeek] = await Promise.all([
      teacherHub.getAcademyStats(),
      teacherHub.getCurrentWeek()
    ]);

    if (!academyStats) {
      return res.json({ success: true, data: [] });
    }

    // 주간 데이터 가져오기 (현재 주차가 있을 때)
    let weeklyReport = [];
    if (currentWeek) {
      weeklyReport = await teacherHub.getWeeklyReport(currentWeek.year, currentWeek.week) || [];
    }

    // 학원별 주간 멘션 합산
    const weeklyByAcademy = {};
    for (const r of weeklyReport) {
      const name = r.academyName;
      if (!weeklyByAcademy[name]) weeklyByAcademy[name] = 0;
      weeklyByAcademy[name] += r.mentionCount || 0;
    }

    const ranking = academyStats.map((a) => ({
      name: a.academyName,
      todayMentions: a.totalMentions,
      weekMentions: weeklyByAcademy[a.academyName] || 0,
      avgSentimentScore: a.avgSentimentScore ?? 0,
      positiveRatio: a.positiveRatio ?? 0,
      topTeacher: a.topTeacherName || '-',
      teacherCount: a.totalTeachersMentioned || 0
    }));

    res.json({ success: true, data: ranking });
  } catch (err) {
    console.error('Academy ranking error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/teacher-ranking
router.get('/teacher-ranking', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const ranking = await teacherHub.getRanking(limit);

    if (!ranking) {
      return res.json({ success: true, data: [] });
    }

    const data = ranking.map((r, index) => ({
      rank: index + 1,
      teacherName: r.teacherName,
      academyName: r.academyName,
      subjectName: r.subjectName || '-',
      mentionCount: r.mentionCount,
      avgSentimentScore: r.avgSentimentScore ?? 0,
      positiveCount: r.positiveCount ?? 0,
      negativeCount: r.negativeCount ?? 0,
      recommendationCount: r.recommendationCount ?? 0,
      summary: r.summary || ''
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Teacher ranking error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/source-activity
router.get('/source-activity', async (req, res) => {
  try {
    const currentWeek = await teacherHub.getCurrentWeek();
    if (!currentWeek) {
      return res.json({ success: true, data: [] });
    }

    const weeklyRanking = await teacherHub.getWeeklyRanking(
      currentWeek.year, currentWeek.week, 100
    );

    if (!weeklyRanking || weeklyRanking.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 소스별 주간 멘션 합산
    const sourceMap = {};
    for (const r of weeklyRanking) {
      if (!r.sourceDistribution) continue;
      for (const [source, count] of Object.entries(r.sourceDistribution)) {
        if (!sourceMap[source]) sourceMap[source] = 0;
        sourceMap[source] += count;
      }
    }

    const data = Object.entries(sourceMap)
      .map(([name, weekCount]) => ({ name, weekCount }))
      .sort((a, b) => b.weekCount - a.weekCount);

    res.json({
      success: true,
      data,
      meta: {
        weekLabel: currentWeek.weekLabel,
        startDate: currentWeek.startDate,
        endDate: currentWeek.endDate
      }
    });
  } catch (err) {
    console.error('Source activity error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/trending-posts
router.get('/trending-posts', async (req, res) => {
  try {
    const dailyReport = await teacherHub.getDailyReport();

    if (!dailyReport || !dailyReport.teacherSummaries) {
      return res.json({ success: true, data: [], meta: {} });
    }

    const data = dailyReport.teacherSummaries.map((t) => ({
      teacherName: t.teacherName,
      academyName: t.academyName,
      subjectName: t.subjectName || '-',
      mentionCount: t.mentionCount,
      positiveCount: t.positiveCount,
      negativeCount: t.negativeCount,
      neutralCount: t.neutralCount,
      recommendationCount: t.recommendationCount ?? 0,
      avgSentimentScore: t.avgSentimentScore ?? 0
    }));

    res.json({
      success: true,
      data,
      meta: {
        periodLabel: dailyReport.periodLabel,
        periodType: dailyReport.periodType,
        totalTeachers: dailyReport.totalTeachers,
        totalMentions: dailyReport.totalMentions
      }
    });
  } catch (err) {
    console.error('Trending posts error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/health
router.get('/health', async (req, res) => {
  try {
    const status = await teacherHub.healthCheck();
    res.json({ success: true, data: status });
  } catch (err) {
    res.json({ success: false, data: { connected: false, url: '' } });
  }
});

// GET /api/dashboard/cache-stats
router.get('/cache-stats', (req, res) => {
  res.json({ success: true, data: teacherHub.getCacheStats() });
});

// POST /api/dashboard/cache-clear
router.post('/cache-clear', (req, res) => {
  teacherHub.clearCache();
  res.json({ success: true, message: 'Cache cleared' });
});

module.exports = router;
