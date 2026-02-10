import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [sourceActivity, setSourceActivity] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const apiUrl = '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, rankingRes, sourceRes, trendingRes] = await Promise.all([
        axios.get(`${apiUrl}/api/dashboard/summary`),
        axios.get(`${apiUrl}/api/dashboard/academy-ranking`),
        axios.get(`${apiUrl}/api/dashboard/source-activity`),
        axios.get(`${apiUrl}/api/dashboard/trending-posts`)
      ]);

      if (summaryRes.data.success) setSummary(summaryRes.data.data);
      if (rankingRes.data.success) setRanking(rankingRes.data.data);
      if (sourceRes.data.success) setSourceActivity(sourceRes.data.data);
      if (trendingRes.data.success) setTrendingPosts(trendingRes.data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('데이터를 불러오는데 실패했습니다. 서버를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSeedData = async () => {
    try {
      const res = await axios.post(`${apiUrl}/api/seed/init`);
      if (res.data.success) {
        alert(`초기화 완료! 학원: ${res.data.totals.academies}개, 소스: ${res.data.totals.sources}개`);
        fetchData();
      }
    } catch (err) {
      alert('초기화 실패: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCrawlAll = async () => {
    if (!window.confirm('전체 학원 크롤링을 시작하시겠습니까? 시간이 오래 걸릴 수 있습니다.')) return;
    setCrawling(true);
    try {
      const res = await axios.post(`${apiUrl}/api/crawler/crawl-all`, { maxResults: 10 });
      if (res.data.success) {
        alert('전체 크롤링 완료!');
        fetchData();
      }
    } catch (err) {
      alert('크롤링 실패: ' + (err.response?.data?.error || err.message));
    } finally {
      setCrawling(false);
    }
  };

  const getSourceTypeLabel = (type) => {
    const labels = { naver_cafe: '네이버카페', daum_cafe: '다음카페', dcinside: 'DC인사이드' };
    return labels[type] || type;
  };

  const getSourceTypeBadgeColor = (type) => {
    const colors = { naver_cafe: '#03C75A', daum_cafe: '#FF6600', dcinside: '#1E6EFF' };
    return colors[type] || '#6c757d';
  };

  const getChangeDisplay = (change) => {
    if (change > 0) return { text: `+${change}`, color: '#28a745' };
    if (change < 0) return { text: `${change}`, color: '#dc3545' };
    return { text: '0', color: '#6c757d' };
  };

  const getRateDisplay = (rate) => {
    if (rate > 0) return { text: `+${rate}%`, color: '#28a745' };
    if (rate < 0) return { text: `${rate}%`, color: '#dc3545' };
    return { text: '0%', color: '#6c757d' };
  };

  const getRankBadge = (index) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    if (index < 3) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '24px', height: '24px', borderRadius: '50%',
          backgroundColor: colors[index], color: index === 0 ? '#333' : '#fff',
          fontSize: '12px', fontWeight: 'bold'
        }}>
          {index + 1}
        </span>
      );
    }
    return <span style={{ display: 'inline-block', width: '24px', textAlign: 'center', color: '#999', fontSize: '13px' }}>{index + 1}</span>;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>데이터를 불러오는 중...</div>
      </div>
    );
  }

  const postChange = summary ? summary.todayPosts - summary.yesterdayPosts : 0;
  const postChangeDisplay = getChangeDisplay(postChange);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>AcademyInsight</h1>
          <p style={styles.subtitle}>학원 온라인 평판 모니터링 대시보드</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate('/crawl-status')} style={styles.linkButton}>
            크롤 작업 현황
          </button>
          <button onClick={() => setShowAdmin(!showAdmin)} style={{
            ...styles.linkButton,
            backgroundColor: showAdmin ? '#495057' : '#6c757d'
          }}>
            관리 패널
          </button>
          <button onClick={fetchData} style={styles.refreshButton}>
            새로고침
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* 요약 카드 */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary?.todayPosts ?? 0}</div>
          <div style={styles.summaryLabel}>오늘 수집 게시글</div>
          <div style={{ fontSize: '13px', color: postChangeDisplay.color, marginTop: '4px' }}>
            전일 대비 {postChangeDisplay.text}
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary?.topAcademy?.name ?? '-'}</div>
          <div style={styles.summaryLabel}>오늘 최다 언급 학원</div>
          <div style={{ fontSize: '13px', color: '#007bff', marginTop: '4px' }}>
            {summary?.topAcademy?.count ?? 0}건
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{
            ...styles.summaryValue,
            fontSize: summary?.topSource?.name?.length > 6 ? '20px' : '28px'
          }}>
            {summary?.topSource?.name ?? '-'}
          </div>
          <div style={styles.summaryLabel}>오늘 최다 활동 소스</div>
          {summary?.topSource?.sourceType && (
            <span style={{
              display: 'inline-block', marginTop: '4px',
              backgroundColor: getSourceTypeBadgeColor(summary.topSource.sourceType),
              color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px'
            }}>
              {getSourceTypeLabel(summary.topSource.sourceType)}
            </span>
          )}
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary?.activeAcademies ?? 0}</div>
          <div style={styles.summaryLabel}>모니터링 학원</div>
        </div>
      </div>

      {/* 관리 패널 (접이식) */}
      {showAdmin && (
        <div style={styles.adminPanel}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#495057' }}>관리 도구</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleSeedData} style={styles.seedButton}>
              초기 데이터 생성
            </button>
            <button onClick={handleCrawlAll} disabled={crawling} style={styles.crawlAllButton}>
              {crawling ? '크롤링 중...' : '전체 크롤링 실행'}
            </button>
          </div>
        </div>
      )}

      {/* 학원 언급 랭킹 */}
      <h2 style={styles.sectionTitle}>학원 언급 랭킹</h2>
      {ranking.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '60px' }}>순위</th>
                <th style={styles.th}>학원명</th>
                <th style={{ ...styles.th, width: '100px', textAlign: 'right' }}>오늘</th>
                <th style={{ ...styles.th, width: '100px', textAlign: 'right' }}>이번 주</th>
                <th style={{ ...styles.th, width: '100px', textAlign: 'right' }}>변화</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => {
                const changeDisplay = getChangeDisplay(item.change);
                return (
                  <tr
                    key={item._id}
                    style={styles.clickableRow}
                    onClick={() => navigate(`/academy/${item._id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td style={{ ...styles.td, textAlign: 'center' }}>{getRankBadge(index)}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{item.todayCount}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{item.weekCount}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: changeDisplay.color, fontWeight: 'bold' }}>
                      {changeDisplay.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.empty}>데이터가 없습니다.</div>
      )}

      {/* 소스별 활동 현황 */}
      <h2 style={styles.sectionTitle}>소스별 활동 현황</h2>
      {sourceActivity.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>소스명</th>
                <th style={{ ...styles.th, width: '100px' }}>유형</th>
                <th style={{ ...styles.th, width: '80px', textAlign: 'right' }}>오늘</th>
                <th style={{ ...styles.th, width: '80px', textAlign: 'right' }}>어제</th>
                <th style={{ ...styles.th, width: '100px', textAlign: 'right' }}>변화율</th>
                <th style={{ ...styles.th, width: '100px', textAlign: 'right' }}>주간 평균</th>
              </tr>
            </thead>
            <tbody>
              {sourceActivity.map((item) => {
                const rateDisplay = getRateDisplay(item.changeRate);
                return (
                  <tr key={item._id}>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.name}</td>
                    <td style={styles.td}>
                      <span style={{
                        backgroundColor: getSourceTypeBadgeColor(item.sourceType),
                        color: '#fff', padding: '2px 8px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: 'bold'
                      }}>
                        {getSourceTypeLabel(item.sourceType)}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{item.todayCount}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{item.yesterdayCount}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: rateDisplay.color, fontWeight: 'bold' }}>
                      {rateDisplay.text}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#666' }}>{item.weekAvg}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.empty}>데이터가 없습니다.</div>
      )}

      {/* 트렌딩 게시글 */}
      <h2 style={styles.sectionTitle}>트렌딩 게시글 (최근 7일)</h2>
      {trendingPosts.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>제목</th>
                <th style={{ ...styles.th, width: '100px' }}>학원</th>
                <th style={{ ...styles.th, width: '100px' }}>소스</th>
                <th style={{ ...styles.th, width: '80px' }}>작성자</th>
                <th style={{ ...styles.th, width: '90px' }}>날짜</th>
                <th style={{ ...styles.th, width: '70px', textAlign: 'right' }}>조회</th>
                <th style={{ ...styles.th, width: '60px', textAlign: 'right' }}>댓글</th>
              </tr>
            </thead>
            <tbody>
              {trendingPosts.map((post) => (
                <tr key={post._id}>
                  <td style={styles.td}>
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#007bff', textDecoration: 'none' }}
                      title={post.title}
                    >
                      {post.title.length > 40 ? post.title.substring(0, 40) + '...' : post.title}
                    </a>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      backgroundColor: '#e9ecef', padding: '2px 8px',
                      borderRadius: '12px', fontSize: '12px', color: '#495057'
                    }}>
                      {post.academyName || '-'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontSize: '13px', color: '#666' }}>{post.sourceName || '-'}</span>
                  </td>
                  <td style={{ ...styles.td, fontSize: '13px', color: '#666' }}>{post.author || '-'}</td>
                  <td style={{ ...styles.td, fontSize: '12px', color: '#999' }}>
                    {post.postedAt ? new Date(post.postedAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontSize: '13px' }}>{post.viewCount ?? 0}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontSize: '13px' }}>{post.commentCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.empty}>데이터가 없습니다.</div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '2px solid #333',
    paddingBottom: '16px'
  },
  title: { margin: 0, fontSize: '24px', color: '#333', fontWeight: 'bold' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#888' },
  headerActions: { display: 'flex', gap: '8px' },
  linkButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid #dee2e6'
  },
  summaryValue: { fontSize: '28px', fontWeight: 'bold', color: '#333', wordBreak: 'break-all' },
  summaryLabel: { fontSize: '14px', color: '#666', marginTop: '4px' },
  adminPanel: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px'
  },
  seedButton: {
    padding: '10px 20px',
    backgroundColor: '#17a2b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px'
  },
  crawlAllButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px'
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#333',
    marginTop: '32px',
    marginBottom: '12px',
    borderBottom: '1px solid #dee2e6',
    paddingBottom: '8px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #dee2e6',
    backgroundColor: '#f8f9fa',
    color: '#495057',
    fontSize: '13px',
    fontWeight: '600'
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #eee'
  },
  clickableRow: {
    cursor: 'pointer',
    transition: 'background-color 0.15s'
  },
  empty: { textAlign: 'center', padding: '32px', color: '#999', fontSize: '14px' }
};

export default AdminDashboard;
