const axios = require('axios');
const NodeCache = require('node-cache');

const TEACHERHUB_API_URL = process.env.TEACHERHUB_API_URL || 'http://host.docker.internal:9010';
const BASE = `${TEACHERHUB_API_URL}/api/v2`;

const client = axios.create({
  baseURL: BASE,
  timeout: 10000,
  headers: { 'Accept': 'application/json' }
});

// TTL (초 단위)
const TTL = {
  ANALYSIS: 600,      // 10분 - 일일 분석 데이터
  DAILY_REPORT: 1800,  // 30분 - 일간 리포트
  WEEKLY: 1800,        // 30분 - 주간 데이터
  ACADEMIES: 3600      // 1시간 - 정적 데이터
};

const cache = new NodeCache({ checkperiod: 120 });

function buildCacheKey(path, params) {
  return params ? `${path}:${JSON.stringify(params)}` : path;
}

async function safeGet(path, params) {
  try {
    const res = await client.get(path, { params });
    return res.data;
  } catch (err) {
    console.error(`[TeacherHub] GET ${path} failed:`, err.message);
    return null;
  }
}

async function cachedGet(path, params, ttl) {
  const key = buildCacheKey(path, params);
  const cached = cache.get(key);

  if (cached !== undefined) {
    console.log(`[Cache HIT] ${key}`);
    return cached;
  }

  console.log(`[Cache MISS] ${key}`);
  const data = await safeGet(path, params);

  if (data !== null) {
    cache.set(key, data, ttl);
  }

  return data;
}

/** 오늘 분석 요약 (totalMentions, avgSentimentScore, totalTeachers 등) */
async function getAnalysisSummary() {
  return cachedGet('/analysis/summary', undefined, TTL.ANALYSIS);
}

/** 학원별 통계 (멘션수, 감성점수, 상위 강사 등) */
async function getAcademyStats() {
  return cachedGet('/analysis/academy-stats', undefined, TTL.ANALYSIS);
}

/** 강사 랭킹 (멘션수 기준 상위 N명) */
async function getRanking(limit = 10) {
  return cachedGet('/analysis/ranking', { limit }, TTL.ANALYSIS);
}

/** 오늘 분석 리포트 전체 */
async function getAnalysisToday() {
  return cachedGet('/analysis/today', undefined, TTL.ANALYSIS);
}

/** 학원 목록 */
async function getAcademies() {
  return cachedGet('/academies', undefined, TTL.ACADEMIES);
}

/** 일간 리포트 (teacherSummaries 포함) */
async function getDailyReport(date) {
  return cachedGet('/reports/daily', date ? { date } : undefined, TTL.DAILY_REPORT);
}

/** 현재 주차 정보 (year, week, weekLabel, startDate, endDate) */
async function getCurrentWeek() {
  return cachedGet('/weekly/current', undefined, TTL.WEEKLY);
}

/** 주간 요약 통계 */
async function getWeeklySummary(year, week) {
  return cachedGet('/weekly/summary', { year, week }, TTL.WEEKLY);
}

/** 주간 강사 랭킹 (sourceDistribution 포함) */
async function getWeeklyRanking(year, week, limit = 20) {
  return cachedGet('/weekly/ranking', { year, week, limit }, TTL.WEEKLY);
}

/** 주간 리포트 전체 */
async function getWeeklyReport(year, week) {
  return cachedGet('/weekly/report', { year, week }, TTL.WEEKLY);
}

/** TeacherHub 연결 상태 확인 (캐싱 안 함) */
async function healthCheck() {
  try {
    await client.get('/academies', { timeout: 3000 });
    return { connected: true, url: TEACHERHUB_API_URL };
  } catch {
    return { connected: false, url: TEACHERHUB_API_URL };
  }
}

function getCacheStats() {
  const stats = cache.getStats();
  return {
    keys: cache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) + '%'
      : '0%'
  };
}

function clearCache() {
  cache.flushAll();
}

module.exports = {
  getAnalysisSummary,
  getAcademyStats,
  getRanking,
  getAnalysisToday,
  getAcademies,
  getDailyReport,
  getCurrentWeek,
  getWeeklySummary,
  getWeeklyRanking,
  getWeeklyReport,
  healthCheck,
  getCacheStats,
  clearCache
};
