require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const crawlerRoutes = require('./routes/crawler');
const academyRoutes = require('./routes/academy');
const crawlSourceRoutes = require('./routes/crawlSource');
const postRoutes = require('./routes/post');
const dashboardRoutes = require('./routes/dashboard');
const seedRoutes = require('./routes/seed');
const scheduler = require('./services/scheduler');

// JWT_SECRET 필수 검증
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 환경변수가 설정되지 않았습니다. 서버를 시작할 수 없습니다.');
  process.exit(1);
}

const app = express();

// 보안 헤더
app.use(helmet());

// CORS
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Rate Limiting - 인증 엔드포인트
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Rate Limiting - 크롤러 엔드포인트
const crawlerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many crawler requests, please try again later.' }
});

// Rate Limiting - 일반 API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

/**
 * 자동 시드: Academy/CrawlSource 컬렉션이 비어있으면 초기 데이터 삽입
 */
async function autoSeed() {
  const Academy = require('./models/Academy');
  const CrawlSource = require('./models/CrawlSource');
  const { academies, crawlSources } = require('./scripts/seedData');

  try {
    const academyCount = await Academy.countDocuments();
    if (academyCount === 0) {
      console.log('[AutoSeed] Academy 컬렉션이 비어있음 - 초기 데이터 삽입');
      for (const academy of academies) {
        const existing = await Academy.findOne({ slug: academy.slug });
        if (!existing) {
          await Academy.create(academy);
          console.log(`[AutoSeed]   학원 생성: ${academy.name}`);
        }
      }
      const total = await Academy.countDocuments();
      console.log(`[AutoSeed] 학원 ${total}개 준비 완료`);
    }

    const sourceCount = await CrawlSource.countDocuments();
    if (sourceCount === 0) {
      console.log('[AutoSeed] CrawlSource 컬렉션이 비어있음 - 초기 데이터 삽입');
      for (const source of crawlSources) {
        const existing = await CrawlSource.findOne({
          sourceType: source.sourceType,
          sourceId: source.sourceId
        });
        if (!existing) {
          await CrawlSource.create(source);
          console.log(`[AutoSeed]   소스 생성: ${source.name} (${source.sourceType})`);
        }
      }
      const total = await CrawlSource.countDocuments();
      console.log(`[AutoSeed] 크롤링 소스 ${total}개 준비 완료`);
    }
  } catch (error) {
    console.error('[AutoSeed] 자동 시드 오류:', error.message);
  }
}

// MongoDB 연결 (필수 - 크롤러 데이터 저장에 필요)
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log('MongoDB connected successfully');
      await autoSeed();
      scheduler.start();
    })
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.log('MongoDB URI not configured - Auth features disabled, Crawler works without DB persistence');
}

// 라우트 등록
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/crawler', crawlerLimiter, crawlerRoutes);
app.use('/api/academies', apiLimiter, academyRoutes);
app.use('/api/crawl-sources', apiLimiter, crawlSourceRoutes);
app.use('/api/posts', apiLimiter, postRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/seed', apiLimiter, seedRoutes);

// 스케줄러 상태 엔드포인트
app.get('/api/scheduler/status', (req, res) => {
  res.json(scheduler.getStatus());
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to AcademyInsight API' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
