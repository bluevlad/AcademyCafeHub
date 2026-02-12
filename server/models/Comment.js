const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: String,
    default: '알 수 없음'
  },
  content: {
    type: String,
    required: true
  },
  commentedAt: {
    type: Date,
    default: null
  },
  collectedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

commentSchema.index({ post: 1, commentedAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
