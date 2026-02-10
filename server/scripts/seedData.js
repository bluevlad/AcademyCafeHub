/**
 * 시드 데이터 초기화 스크립트
 * 실행: node server/scripts/seedData.js
 * 멱등성 보장 - 중복 실행 시 기존 데이터 유지
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Academy = require('../models/Academy');
const CrawlSource = require('../models/CrawlSource');

const academies = [
  {
    name: '박문각',
    nameEn: 'PMG',
    slug: 'pmg',
    keywords: ['박문각', 'PMG', '박문각공무원'],
    isActive: true
  },
  {
    name: '에듀윌',
    nameEn: 'Eduwill',
    slug: 'eduwill',
    keywords: ['에듀윌', '에듀윌공무원'],
    isActive: true
  },
  {
    name: '해커스공무원',
    nameEn: 'Hackers',
    slug: 'hackers',
    keywords: ['해커스공무원', '해커스패스'],
    isActive: true
  },
  {
    name: '공단기',
    nameEn: 'Gongdangi',
    slug: 'gongdangi',
    keywords: ['공단기', '공단기닷컴'],
    isActive: true
  },
  {
    name: '윌비스',
    nameEn: 'Willbes',
    slug: 'willbes',
    keywords: ['윌비스', '윌비스공무원'],
    isActive: true
  }
];

const crawlSources = [
  {
    name: '독공사',
    url: 'https://cafe.naver.com/m2school',
    sourceType: 'naver_cafe',
    sourceId: 'm2school',
    isActive: true,
    crawlConfig: { requiresLogin: true, minDelay: 2000, maxDelay: 4000 }
  },
  {
    name: '공드림',
    url: 'https://cafe.naver.com/gongdream',
    sourceType: 'naver_cafe',
    sourceId: 'gongdream',
    isActive: true,
    crawlConfig: { requiresLogin: true, minDelay: 2000, maxDelay: 4000 }
  },
  {
    name: '9급공무원',
    url: 'https://cafe.naver.com/9gong',
    sourceType: 'naver_cafe',
    sourceId: '9gong',
    isActive: true,
    crawlConfig: { requiresLogin: true, minDelay: 2000, maxDelay: 4000 }
  },
  {
    name: '공무원시험',
    url: 'https://cafe.daum.net/gongmuwon',
    sourceType: 'daum_cafe',
    sourceId: 'gongmuwon',
    isActive: true,
    crawlConfig: { requiresLogin: false, minDelay: 1500, maxDelay: 3000 }
  },
  {
    name: '공무원갤',
    url: 'https://gall.dcinside.com/mgallery/board/lists/?id=gongmuwon',
    sourceType: 'dcinside',
    sourceId: 'gongmuwon',
    isActive: true,
    crawlConfig: { requiresLogin: false, minDelay: 1000, maxDelay: 2000 }
  },
  {
    name: '공시생갤',
    url: 'https://gall.dcinside.com/mgallery/board/lists/?id=gongsisaeng',
    sourceType: 'dcinside',
    sourceId: 'gongsisaeng',
    isActive: true,
    crawlConfig: { requiresLogin: false, minDelay: 1000, maxDelay: 2000 }
  }
];

async function seedData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academyinsight';

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB 연결 성공');

    // 학원 데이터 upsert
    let academyCreated = 0;
    let academySkipped = 0;
    for (const academy of academies) {
      const existing = await Academy.findOne({ slug: academy.slug });
      if (!existing) {
        await Academy.create(academy);
        academyCreated++;
        console.log(`  [+] 학원 생성: ${academy.name}`);
      } else {
        academySkipped++;
        console.log(`  [=] 학원 이미 존재: ${academy.name}`);
      }
    }
    console.log(`학원: ${academyCreated}개 생성, ${academySkipped}개 스킵\n`);

    // 크롤링 소스 upsert
    let sourceCreated = 0;
    let sourceSkipped = 0;
    for (const source of crawlSources) {
      const existing = await CrawlSource.findOne({
        sourceType: source.sourceType,
        sourceId: source.sourceId
      });
      if (!existing) {
        await CrawlSource.create(source);
        sourceCreated++;
        console.log(`  [+] 소스 생성: ${source.name} (${source.sourceType})`);
      } else {
        sourceSkipped++;
        console.log(`  [=] 소스 이미 존재: ${source.name} (${source.sourceType})`);
      }
    }
    console.log(`크롤링 소스: ${sourceCreated}개 생성, ${sourceSkipped}개 스킵\n`);

    // 결과 요약
    const totalAcademies = await Academy.countDocuments();
    const totalSources = await CrawlSource.countDocuments();
    console.log('=== 시드 데이터 완료 ===');
    console.log(`전체 학원: ${totalAcademies}개`);
    console.log(`전체 크롤링 소스: ${totalSources}개`);

  } catch (error) {
    console.error('시드 데이터 오류:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
}

// 직접 실행 시
if (require.main === module) {
  seedData();
}

module.exports = seedData;
