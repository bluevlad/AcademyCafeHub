/**
 * 2단계: DC인사이드 갤러리 백필 크롤링
 * 5개 학원 × 11개 키워드 × 2개 DC갤러리 소스
 * 페이지네이션 + 날짜 범위 필터링 지원
 *
 * 실행 방법:
 *   docker exec academyinsight-backend node server/scripts/backfillDCInside.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Academy = require('../models/Academy');
const CrawlSource = require('../models/CrawlSource');
const CrawlJob = require('../models/CrawlJob');
const Post = require('../models/Post');

// 설정
const START_DATE = '2026-02-01';
const END_DATE = '2026-02-09';
const MAX_PAGES = 5;           // 갤러리당 최대 페이지 수
const REQUEST_DELAY_MS = 1500; // 요청 간 딜레이 (ms)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://gall.dcinside.com/'
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 날짜 파싱 (DC인사이드 형식)
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  const currentYear = today.getFullYear();

  // "2026.02.05" or "2026/02/05" 형식 (4자리 연도)
  const fullMatch = dateStr.match(/(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
  if (fullMatch) {
    return new Date(parseInt(fullMatch[1]), parseInt(fullMatch[2]) - 1, parseInt(fullMatch[3]));
  }

  // "26/02/09" or "26.02.09" 형식 (2자리 연도) - DC인사이드 형식
  const shortYearMatch = dateStr.match(/(\d{2})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
  if (shortYearMatch) {
    const year = 2000 + parseInt(shortYearMatch[1]);
    return new Date(year, parseInt(shortYearMatch[2]) - 1, parseInt(shortYearMatch[3]));
  }

  // "02.05" 형식 (올해, 구분자가 . 인 경우만)
  const shortMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
  if (shortMatch) {
    return new Date(currentYear, parseInt(shortMatch[1]) - 1, parseInt(shortMatch[2]));
  }

  // "N시간 전"
  const hoursMatch = dateStr.match(/(\d+)\s*시간\s*전/);
  if (hoursMatch) {
    const d = new Date(today);
    d.setHours(d.getHours() - parseInt(hoursMatch[1]));
    return d;
  }

  // "N분 전"
  const minutesMatch = dateStr.match(/(\d+)\s*분\s*전/);
  if (minutesMatch) {
    const d = new Date(today);
    d.setMinutes(d.getMinutes() - parseInt(minutesMatch[1]));
    return d;
  }

  return null;
}

function parseNumber(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function isWithinDateRange(postDate, startDate, endDate) {
  if (!postDate) return false; // 날짜 없는 게시글은 제외
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // endDate 당일 포함
  return postDate >= start && postDate <= end;
}

function isBeforeStartDate(postDate, startDate) {
  if (!postDate) return false;
  return postDate < new Date(startDate);
}

/**
 * DC 갤러리 내부 검색 (페이지네이션 지원)
 */
async function searchDCGallery(source, keyword, startDate, endDate) {
  const galleryId = extractGalleryId(source.url);
  // 소스 URL에서 직접 base path 추출 (이미 detectGalleryPath로 수정됨)
  const pathMatch = source.url.match(/dcinside\.com\/(.+?)\/lists/);
  const basePath = pathMatch ? pathMatch[1] : 'mini/board';
  const allPosts = [];
  let reachedOlderPosts = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (reachedOlderPosts) break;

    const searchUrl = `https://gall.dcinside.com/${basePath}/lists/?id=${galleryId}&s_type=search_subject_memo&s_keyword=${encodeURIComponent(keyword)}&page=${page}`;

    try {
      const response = await axios.get(searchUrl, {
        headers: HEADERS,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      let postsOnPage = 0;

      $('.gall_list .ub-content').each((index, element) => {
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

        if (!title) return true;

        const postDate = parseDate(date);
        postsOnPage++;

        // 날짜가 시작일보다 이전이면 더 이상 페이지를 넘길 필요 없음
        if (isBeforeStartDate(postDate, startDate)) {
          reachedOlderPosts = true;
          return false;
        }

        if (isWithinDateRange(postDate, startDate, endDate)) {
          const fullUrl = href ? (href.startsWith('http') ? href : `https://gall.dcinside.com${href}`) : '';
          allPosts.push({
            title,
            url: fullUrl,
            author,
            postedAt: date,
            postedAtDate: postDate,
            viewCount: parseNumber(viewCount),
            commentCount: parseNumber(commentCount),
            keyword,
            source: 'dcinside',
            cafeUrl: source.url,
            collectedAt: new Date().toISOString(),
            isSample: false
          });
        }
      });

      if (postsOnPage === 0) break; // 빈 페이지면 종료

      console.log(`    page ${page}: ${postsOnPage}건 확인, ${allPosts.length}건 범위 내`);

    } catch (error) {
      console.error(`    page ${page} 오류: ${error.message}`);
      break;
    }

    await delay(REQUEST_DELAY_MS);
  }

  return allPosts;
}

function extractGalleryId(url) {
  const match = url.match(/[?&]id=([^&]+)/);
  return match ? match[1] : '';
}

/**
 * 게시글 저장 (중복 방지)
 */
async function savePost(postData, sourceId, academyId) {
  try {
    const postUrl = postData.url || `dcinside_${postData.title}_${postData.postedAt}`;
    const existing = await Post.findOne({ postUrl });

    if (existing) {
      if (postData.viewCount > existing.viewCount || postData.commentCount > existing.commentCount) {
        existing.viewCount = Math.max(existing.viewCount, postData.viewCount || 0);
        existing.commentCount = Math.max(existing.commentCount, postData.commentCount || 0);
        await existing.save();
        return 'updated';
      }
      return 'duplicate';
    }

    await Post.create({
      source: sourceId,
      academy: academyId,
      keyword: postData.keyword,
      title: postData.title,
      content: postData.content || '',
      author: postData.author || '알 수 없음',
      postUrl,
      viewCount: postData.viewCount || 0,
      commentCount: postData.commentCount || 0,
      postedAt: postData.postedAtDate || null,
      collectedAt: new Date(),
      sourceType: 'dcinside',
      isSample: false
    });

    return 'saved';
  } catch (error) {
    if (error.code === 11000) return 'duplicate';
    console.error('    저장 오류:', error.message);
    return 'error';
  }
}

/**
 * DC 갤러리 URL 자동 감지 - mini/mgallery/board 경로를 직접 확인
 */
async function detectGalleryPath(galleryId) {
  const paths = [
    { path: 'mini/board', label: 'mini' },
    { path: 'mgallery/board', label: 'mgallery' },
    { path: 'board', label: 'board' }
  ];

  for (const { path, label } of paths) {
    const testUrl = `https://gall.dcinside.com/${path}/lists/?id=${galleryId}`;
    try {
      const res = await axios.get(testUrl, {
        headers: HEADERS,
        timeout: 10000,
        validateStatus: (s) => s < 500
      });
      if (res.status === 200) {
        console.log(`  [감지] ${galleryId} → /${path}/lists/ (${label}갤러리)`);
        return path;
      }
    } catch (e) { /* next */ }
  }
  return null;
}

async function backfillDCInside() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academyinsight';

  try {
    await mongoose.connect(mongoUri);
    console.log(`MongoDB 연결 성공: ${mongoUri.replace(/\/\/.*@/, '//*****@')}`);
  } catch (error) {
    console.error('MongoDB 연결 실패:', error.message);
    process.exit(1);
  }

  const academies = await Academy.find({ isActive: true }).sort({ name: 1 });
  let dcSources = await CrawlSource.find({ sourceType: 'dcinside', isActive: true });

  if (academies.length === 0 || dcSources.length === 0) {
    console.error('학원 또는 DC인사이드 소스가 없습니다.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // 소스 URL 자동 수정: 실제 접근 가능한 경로로 업데이트
  console.log('\n[DC갤러리 경로 감지 중...]');
  for (const source of dcSources) {
    const galleryId = extractGalleryId(source.url);
    const detectedPath = await detectGalleryPath(galleryId);

    if (detectedPath) {
      const correctUrl = `https://gall.dcinside.com/${detectedPath}/lists/?id=${galleryId}`;
      if (source.url !== correctUrl) {
        console.log(`  [수정] ${source.name}: ${source.url} → ${correctUrl}`);
        source.url = correctUrl;
        await source.save();
      }
    } else {
      // galleryId가 틀린 경우 대안 시도
      const altIds = { 'gongsisaeng': 'gongsi' };
      const altId = altIds[galleryId];
      if (altId) {
        const altPath = await detectGalleryPath(altId);
        if (altPath) {
          const correctUrl = `https://gall.dcinside.com/${altPath}/lists/?id=${altId}`;
          console.log(`  [수정] ${source.name}: ${source.url} → ${correctUrl} (ID 변경: ${galleryId}→${altId})`);
          source.url = correctUrl;
          source.sourceId = altId;
          await source.save();
        } else {
          console.log(`  [경고] ${source.name}: 접근 불가 (${galleryId}, ${altId} 모두 실패)`);
          source.isActive = false;
          await source.save();
        }
      } else {
        console.log(`  [경고] ${source.name}: 접근 불가 → 비활성화`);
        source.isActive = false;
        await source.save();
      }
    }
    await delay(500);
  }

  // 활성 소스만 다시 조회
  dcSources = await CrawlSource.find({ sourceType: 'dcinside', isActive: true });

  const totalKeywords = academies.reduce((sum, a) => sum + a.keywords.length, 0);
  const totalJobs = totalKeywords * dcSources.length;

  console.log('\n========================================');
  console.log('  2단계: DC인사이드 백필 크롤링');
  console.log('========================================');
  console.log(`기간: ${START_DATE} ~ ${END_DATE}`);
  console.log(`학원: ${academies.map(a => a.name).join(', ')}`);
  console.log(`소스: ${dcSources.map(s => `${s.name}(${extractGalleryId(s.url)})`).join(', ')}`);
  console.log(`총 작업 수: ${totalJobs}건 (${totalKeywords} 키워드 × ${dcSources.length} 소스)`);
  console.log(`페이지당 최대: ${MAX_PAGES}페이지, 요청 간격: ${REQUEST_DELAY_MS}ms`);
  console.log('========================================\n');

  const allResults = [];
  let jobCount = 0;
  const startTime = Date.now();

  for (const academy of academies) {
    console.log(`\n--- ${academy.name} (${academy.keywords.join(', ')}) ---`);

    for (const keyword of academy.keywords) {
      for (const source of dcSources) {
        jobCount++;
        const progress = `[${jobCount}/${totalJobs}]`;
        const galleryName = source.name;

        console.log(`${progress} ${academy.name} | "${keyword}" | ${galleryName}`);

        // CrawlJob 기록
        const job = await CrawlJob.create({
          source: source._id,
          academy: academy._id,
          keyword,
          status: 'running',
          startedAt: new Date()
        });

        try {
          const posts = await searchDCGallery(source, keyword, START_DATE, END_DATE);
          job.postsFound = posts.length;

          let saved = 0, duplicates = 0;
          for (const post of posts) {
            const result = await savePost(post, source._id, academy._id);
            if (result === 'saved') saved++;
            else if (result === 'duplicate' || result === 'updated') duplicates++;
          }

          job.postsSaved = saved;
          job.duplicatesSkipped = duplicates;
          job.status = 'completed';
          job.completedAt = new Date();
          await job.save();

          allResults.push({
            academy: academy.name,
            keyword,
            source: galleryName,
            status: 'completed',
            found: posts.length,
            saved,
            duplicates
          });

          console.log(`  => found=${posts.length}, saved=${saved}, dup=${duplicates}`);

        } catch (error) {
          job.status = 'failed';
          job.error = error.message;
          job.completedAt = new Date();
          await job.save();

          allResults.push({
            academy: academy.name,
            keyword,
            source: galleryName,
            status: 'failed',
            found: 0,
            saved: 0,
            duplicates: 0,
            error: error.message
          });

          console.log(`  => FAILED: ${error.message}`);
        }

        // 소스 간 딜레이
        await delay(REQUEST_DELAY_MS);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 결과 요약
  console.log('\n========================================');
  console.log('  크롤링 결과 요약');
  console.log('========================================');

  const completed = allResults.filter(r => r.status === 'completed');
  const failed = allResults.filter(r => r.status !== 'completed');
  const totalSaved = allResults.reduce((sum, r) => sum + r.saved, 0);
  const totalFound = allResults.reduce((sum, r) => sum + r.found, 0);
  const totalDuplicates = allResults.reduce((sum, r) => sum + r.duplicates, 0);

  console.log(`기간: ${START_DATE} ~ ${END_DATE}`);
  console.log(`소요 시간: ${elapsed}초`);
  console.log(`전체 작업: ${allResults.length}건 (성공: ${completed.length}, 실패: ${failed.length})`);
  console.log(`발견 게시글: ${totalFound}건`);
  console.log(`저장된 게시글: ${totalSaved}건 (신규)`);
  console.log(`중복 스킵: ${totalDuplicates}건`);

  // 학원별 요약
  console.log('\n[학원별 수집 결과]');
  for (const academy of academies) {
    const results = allResults.filter(r => r.academy === academy.name);
    const saved = results.reduce((sum, r) => sum + r.saved, 0);
    const found = results.reduce((sum, r) => sum + r.found, 0);
    console.log(`  ${academy.name}: ${found}건 발견 → ${saved}건 저장`);
  }

  // 소스별 요약
  console.log('\n[소스별 수집 결과]');
  for (const source of dcSources) {
    const results = allResults.filter(r => r.source === source.name);
    const saved = results.reduce((sum, r) => sum + r.saved, 0);
    const found = results.reduce((sum, r) => sum + r.found, 0);
    console.log(`  ${source.name}: ${found}건 발견 → ${saved}건 저장`);
  }

  if (failed.length > 0) {
    console.log('\n[실패 작업]');
    for (const f of failed) {
      console.log(`  ${f.academy} | "${f.keyword}" | ${f.source}: ${f.error}`);
    }
  }

  console.log('\n========================================');
  console.log('  백필 완료');
  console.log('========================================\n');

  await mongoose.disconnect();
  console.log('MongoDB 연결 종료');
}

backfillDCInside().catch(error => {
  console.error('치명적 오류:', error);
  process.exit(1);
});
