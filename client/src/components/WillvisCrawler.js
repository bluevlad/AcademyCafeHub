import React, { useState } from 'react';
import axios from 'axios';
import './WillvisCrawler.css';
import HelpModal from './HelpModal';

const WillvisCrawler = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [naverId, setNaverId] = useState('');
  const [naverPassword, setNaverPassword] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // 기본 설정
  const CAFE_URL = 'https://cafe.naver.com/m2school';
  const KEYWORD = '윌비스';
  const START_DATE = '2025-10-01';
  const END_DATE = '2025-12-31';

  const fetchPosts = async (useLogin = false) => {
    setLoading(true);
    setError(null);

    try {
      const requestData = {
        cafeUrl: CAFE_URL,
        keyword: KEYWORD,
        startDate: START_DATE,
        endDate: END_DATE,
        maxResults: 100
      };

      // 로그인 정보 추가
      if (useLogin && naverId && naverPassword) {
        requestData.credentials = {
          username: naverId,
          password: naverPassword
        };
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${apiUrl}/api/crawler/naver-cafe/search`, requestData);

      if (response.data.success) {
        const fetchedPosts = response.data.data.posts;
        setPosts(fetchedPosts);

        // 통계 계산
        calculateStats(fetchedPosts);
      } else {
        setError('데이터를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('서버 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (posts) => {
    const monthlyData = {
      '10월': [],
      '11월': [],
      '12월': []
    };

    posts.forEach(post => {
      if (post.postedAtDate) {
        const date = new Date(post.postedAtDate);
        const month = date.getMonth() + 1;

        if (month === 10) monthlyData['10월'].push(post);
        else if (month === 11) monthlyData['11월'].push(post);
        else if (month === 12) monthlyData['12월'].push(post);
      }
    });

    // 통계 계산
    const totalViews = posts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.commentCount || 0), 0);
    const avgViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0;
    const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0;

    setStats({
      total: posts.length,
      monthly: {
        '10월': monthlyData['10월'].length,
        '11월': monthlyData['11월'].length,
        '12월': monthlyData['12월'].length
      },
      totalViews,
      totalComments,
      avgViews,
      avgComments,
      topPost: posts.sort((a, b) => b.viewCount - a.viewCount)[0]
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '날짜 정보 없음';
    return dateStr;
  };

  const getMonthFromDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월`;
  };

  return (
    <div className="willvis-crawler">
      <div className="header">
        <div className="header-content">
          <h1>🎯 윌비스 게시글 분석</h1>
          <p className="subtitle">독공사 카페 | 2025년 10월 ~ 12월</p>
        </div>
        <button
          className="help-button-header"
          onClick={() => setShowHelp(true)}
          title="도움말"
        >
          ?
        </button>
      </div>

      {/* 도움말 모달 */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <div className="search-section">
        <div className="search-info">
          <div className="info-item">
            <span className="label">📍 카페:</span>
            <span className="value">독공사 (m2school)</span>
          </div>
          <div className="info-item">
            <span className="label">🔍 키워드:</span>
            <span className="value">윌비스</span>
          </div>
          <div className="info-item">
            <span className="label">📅 기간:</span>
            <span className="value">2025.10.01 ~ 2025.12.31</span>
          </div>
        </div>

        <div className="login-toggle">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showLoginForm}
              onChange={(e) => setShowLoginForm(e.target.checked)}
            />
            <span>네이버 로그인 사용하기 (실제 데이터 수집)</span>
          </label>
        </div>

        {showLoginForm && (
          <div className="login-form">
            <div className="form-group">
              <label htmlFor="naverId">네이버 아이디</label>
              <input
                type="text"
                id="naverId"
                value={naverId}
                onChange={(e) => setNaverId(e.target.value)}
                placeholder="네이버 아이디를 입력하세요"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="naverPassword">네이버 비밀번호</label>
              <input
                type="password"
                id="naverPassword"
                value={naverPassword}
                onChange={(e) => setNaverPassword(e.target.value)}
                placeholder="네이버 비밀번호를 입력하세요"
                className="form-input"
              />
            </div>
            <div className="login-notice">
              <p>⚠️ 주의사항:</p>
              <ul>
                <li>로그인 정보는 크롤링에만 사용되며 저장되지 않습니다</li>
                <li>2단계 인증이 설정된 경우 작동하지 않을 수 있습니다</li>
                <li>캡차 인증이 필요한 경우 실패할 수 있습니다</li>
              </ul>
            </div>
          </div>
        )}

        <button
          onClick={() => fetchPosts(showLoginForm)}
          disabled={loading || (showLoginForm && (!naverId || !naverPassword))}
          className="search-button"
        >
          {loading ? '🔄 수집 중...' : showLoginForm ? '🔐 로그인하여 데이터 수집' : '📊 데이터 수집하기'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {stats && (
        <div className="stats-section">
          <h2>📈 통계 요약</h2>

          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">전체 게시글</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.monthly['10월']}</div>
              <div className="stat-label">10월</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.monthly['11월']}</div>
              <div className="stat-label">11월</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.monthly['12월']}</div>
              <div className="stat-label">12월</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.totalViews.toLocaleString()}</div>
              <div className="stat-label">총 조회수</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.avgViews.toLocaleString()}</div>
              <div className="stat-label">평균 조회수</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.totalComments}</div>
              <div className="stat-label">총 댓글수</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.avgComments}</div>
              <div className="stat-label">평균 댓글수</div>
            </div>
          </div>

          {stats.topPost && (
            <div className="top-post">
              <h3>🏆 최다 조회 게시글</h3>
              <div className="top-post-content">
                <div className="top-post-title">{stats.topPost.title}</div>
                <div className="top-post-meta">
                  <span>👁️ {stats.topPost.viewCount.toLocaleString()}</span>
                  <span>💬 {stats.topPost.commentCount}</span>
                  <span>✍️ {stats.topPost.author}</span>
                  <span>📅 {formatDate(stats.topPost.postedAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {posts.length > 0 && (
        <div className="posts-section">
          <h2>📝 게시글 목록 ({posts.length}개)</h2>

          <div className="posts-list">
            {posts.map((post, index) => (
              <div key={index} className="post-card">
                <div className="post-header">
                  <div className="post-number">#{index + 1}</div>
                  <div className="post-month">{getMonthFromDate(post.postedAtDate)}</div>
                </div>

                <h3 className="post-title">
                  {post.url ? (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="post-link"
                    >
                      {post.title}
                    </a>
                  ) : (
                    post.title
                  )}
                </h3>

                <div className="post-meta">
                  <span className="meta-item">
                    <span className="meta-icon">✍️</span>
                    {post.author}
                  </span>
                  <span className="meta-item">
                    <span className="meta-icon">📅</span>
                    {formatDate(post.postedAt)}
                  </span>
                  <span className="meta-item">
                    <span className="meta-icon">👁️</span>
                    {post.viewCount.toLocaleString()}
                  </span>
                  <span className="meta-item">
                    <span className="meta-icon">💬</span>
                    {post.commentCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && posts.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>데이터 수집 버튼을 눌러 게시글을 가져오세요</p>
        </div>
      )}
    </div>
  );
};

export default WillvisCrawler;
