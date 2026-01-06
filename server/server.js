require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const crawlerRoutes = require('./routes/crawler');

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB 연결 (선택적 - 크롤러 기능은 MongoDB 없이도 작동)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error (크롤러는 정상 작동):', err));
} else {
  console.log('MongoDB URI not configured - Auth features disabled, Crawler works fine');
}

app.use('/api/auth', authRoutes);
app.use('/api/crawler', crawlerRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Academy Cafe Hub API' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
