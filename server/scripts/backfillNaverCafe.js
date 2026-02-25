/**
 * 1단계: 네이버 카페 소스 백필 크롤링
 * 5개 학원 × 11개 키워드 × 3개 네이버 카페 소스
 *
 * 실행 방법:
 *   1) Docker 내부에서 실행 (권장):
 *      docker exec -e NAVER_CLIENT_ID=xxx -e NAVER_CLIENT_SECRET=yyy \
 *        academyinsight-backend node server/scripts/backfillNaverCafe.js
 *
 *   2) 로컬에서 실행 (MongoDB 접근 가능 시):
 *      NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=yyy \
 *      MONGODB_URI=mongodb://localhost:27017/academyinsight \
 *        node server/scripts/backfillNaverCafe.js
 *
 * 참고:
 *   - Naver Search API cafearticle 응답에 날짜 필드가 없어 postedAt은 null로 저장됨
 *   - API sort=date로 최신순 정렬되므로 최근 게시글 위주로 수집됨
 *   - maxResults=100으로 키워드당 최대 100건 수집
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Academy = require('../models/Academy');
const CrawlSource = require('../models/CrawlSource');
const CrawlerManager = require('../services/CrawlerManager');

const MAX_RESULTS = 100;

async function backfillNaverCafe() {
  // 환경 변수 확인
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    console.error('❌ NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수가 필요합니다.');
    console.error('   설정 방법: https://developers.naver.com 에서 애플리케이션 등록 후 발급');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academyinsight';

  try {
    await mongoose.connect(mongoUri);
    console.log(`MongoDB 연결 성공: ${mongoUri.replace(/\/\/.*@/, '//*****@')}`);
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    process.exit(1);
  }

  // 학원 및 소스 조회
  const academies = await Academy.find({ isActive: true }).sort({ name: 1 });
  const naverSources = await CrawlSource.find({ sourceType: 'naver_cafe', isActive: true });

  if (academies.length === 0) {
    console.error('❌ 활성화된 학원이 없습니다. seedData를 먼저 실행하세요.');
    await mongoose.disconnect();
    process.exit(1);
  }
  if (naverSources.length === 0) {
    console.error('❌ 활성화된 네이버 카페 소스가 없습니다.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('  1단계: 네이버 카페 백필 크롤링');
  console.log('========================================');
  console.log(`학원: ${academies.map(a => a.name).join(', ')}`);
  console.log(`소스: ${naverSources.map(s => `${s.name}(${s.sourceId})`).join(', ')}`);
  console.log(`키워드당 최대: ${MAX_RESULTS}건`);

  const totalKeywords = academies.reduce((sum, a) => sum + a.keywords.length, 0);
  const totalJobs = totalKeywords * naverSources.length;
  console.log(`총 작업 수: ${totalJobs}건 (${totalKeywords} 키워드 × ${naverSources.length} 소스)`);
  console.log('========================================\n');

  const allResults = [];
  let jobCount = 0;
  const startTime = Date.now();

  for (const academy of academies) {
    console.log(`\n--- ${academy.name} (${academy.keywords.join(', ')}) ---`);

    for (const keyword of academy.keywords) {
      for (const source of naverSources) {
        jobCount++;
        const progress = `[${jobCount}/${totalJobs}]`;

        console.log(`${progress} ${academy.name} | "${keyword}" | ${source.name}...`);

        try {
          const job = await CrawlerManager.executeCrawlJob(source, keyword, academy._id, {
            maxResults: MAX_RESULTS
          });

          const result = {
            academy: academy.name,
            keyword,
            source: source.name,
            status: job.status,
            found: job.postsFound || 0,
            saved: job.postsSaved || 0,
            duplicates: job.duplicatesSkipped || 0,
            error: job.error || ''
          };
          allResults.push(result);

          if (job.status === 'completed') {
            console.log(`  ✓ found=${result.found}, saved=${result.saved}, dup=${result.duplicates}`);
          } else {
            console.log(`  ✗ FAILED: ${result.error}`);
          }

        } catch (error) {
          allResults.push({
            academy: academy.name,
            keyword,
            source: source.name,
            status: 'error',
            found: 0,
            saved: 0,
            duplicates: 0,
            error: error.message
          });
          console.log(`  ✗ ERROR: ${error.message}`);
        }
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

  console.log(`소요 시간: ${elapsed}초`);
  console.log(`전체 작업: ${allResults.length}건 (성공: ${completed.length}, 실패: ${failed.length})`);
  console.log(`발견 게시글: ${totalFound}건`);
  console.log(`저장된 게시글: ${totalSaved}건 (신규)`);
  console.log(`중복 스킵: ${totalDuplicates}건`);

  // 학원별 요약
  console.log('\n[학원별 수집 결과]');
  for (const academy of academies) {
    const academyResults = allResults.filter(r => r.academy === academy.name);
    const saved = academyResults.reduce((sum, r) => sum + r.saved, 0);
    const found = academyResults.reduce((sum, r) => sum + r.found, 0);
    console.log(`  ${academy.name}: ${found}건 발견 → ${saved}건 저장`);
  }

  // 실패 작업 상세
  if (failed.length > 0) {
    console.log('\n[실패 작업 상세]');
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

backfillNaverCafe().catch(error => {
  console.error('치명적 오류:', error);
  process.exit(1);
});
