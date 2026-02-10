require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const crawlerRoutes = require('./routes/crawler');
const academyRoutes = require('./routes/academy');
const crawlSourceRoutes = require('./routes/crawlSource');
const postRoutes = require('./routes/post');
const dashboardRoutes = require('./routes/dashboard');
const seedRoutes = require('./routes/seed');

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB 연결 (필수 - 크롤러 데이터 저장에 필요)
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.log('MongoDB URI not configured - Auth features disabled, Crawler works without DB persistence');
}

// 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/academies', academyRoutes);
app.use('/api/crawl-sources', crawlSourceRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/seed', seedRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to AcademyInsight API' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
