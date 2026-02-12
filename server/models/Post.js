const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  source: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrawlSource',
    required: true
  },
  academy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Academy',
    required: true
  },
  keyword: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: '알 수 없음'
  },
  postUrl: {
    type: String,
    required: true,
    unique: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  postedAt: {
    type: Date,
    default: null
  },
  collectedAt: {
    type: Date,
    default: Date.now
  },
  sourceType: {
    type: String,
    enum: ['naver_cafe', 'daum_cafe', 'dcinside']
  },
  isSample: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

postSchema.index({ keyword: 1, postedAt: -1 });
postSchema.index({ academy: 1, postedAt: -1 });
postSchema.index({ source: 1, postedAt: -1 });
postSchema.index({ postedAt: -1 });

module.exports = mongoose.model('Post', postSchema);
