import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const AcademyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [academy, setAcademy] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchAcademy();
  }, [id]);

  useEffect(() => {
    if (academy) fetchPosts();
  }, [academy, currentPage]);

  const fetchAcademy = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/api/academies/${id}`);
      if (res.data.success) setAcademy(res.data.data);
    } catch (err) {
      setError('학원 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/posts?academy=${id}&page=${currentPage}&limit=20`);
      if (res.data.success) {
        setPosts(res.data.data.posts);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  const handleCrawl = async () => {
    if (!window.confirm(`${academy.name}의 모든 키워드에 대해 크롤링을 시작하시겠습니까?`)) return;
    setCrawling(true);
    setError(null);
    try {
      const res = await axios.post(`${apiUrl}/api/crawler/crawl-academy/${id}`, { maxResults: 10 });
      if (res.data.success) {
        const data = res.data.data;
        alert(`크롤링 완료!\n총 ${data.totalJobs}건 작업\n저장: ${data.totalPostsSaved}건`);
        fetchAcademy();
        fetchPosts();
      }
    } catch (err) {
      setError('크롤링 실패: ' + (err.response?.data?.error || err.message));
    } finally {
      setCrawling(false);
    }
  };

  const getSourceTypeLabel = (type) => {
    const labels = { naver_cafe: '네이버카페', daum_cafe: '다음카페', dcinside: 'DC인사이드' };
    return labels[type] || type;
  };

  if (loading) {
    return <div style={styles.container}><div style={styles.loading}>로딩 중...</div></div>;
  }

  if (!academy) {
    return <div style={styles.container}><div style={styles.error}>학원을 찾을 수 없습니다.</div></div>;
  }

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button onClick={() => navigate('/admin')} style={styles.backButton}>AcademyInsight</button>
        <h1 style={styles.title}>{academy.name}</h1>
        <span style={styles.slug}>{academy.nameEn} ({academy.slug})</span>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* 학원 정보 */}
      <div style={styles.infoSection}>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>키워드:</span>
          <div style={styles.keywords}>
            {academy.keywords?.map((kw, i) => (
              <span key={i} style={styles.keywordTag}>{kw}</span>
            ))}
          </div>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>수집 게시글:</span>
          <span style={styles.infoValue}>{academy.postCount || 0}개</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>상태:</span>
          <span style={{ color: academy.isActive ? '#5cb85c' : '#d9534f', fontWeight: 'bold' }}>
            {academy.isActive ? '활성' : '비활성'}
          </span>
        </div>
      </div>

      {/* 크롤링 소스 목록 */}
      <h2 style={styles.sectionTitle}>연결된 크롤링 소스</h2>
      <div style={styles.sourceList}>
        {academy.sources?.map((source) => (
          <div key={source._id} style={styles.sourceItem}>
            <span style={styles.sourceType}>{getSourceTypeLabel(source.sourceType)}</span>
            <span style={styles.sourceName}>{source.name}</span>
            <span style={styles.sourceId}>{source.sourceId}</span>
            {source.lastCrawledAt && (
              <span style={styles.sourceDate}>
                마지막: {new Date(source.lastCrawledAt).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 크롤링 버튼 */}
      <div style={styles.crawlSection}>
        <button onClick={handleCrawl} disabled={crawling} style={styles.crawlButton}>
          {crawling ? '크롤링 진행 중...' : `${academy.name} 크롤링 실행`}
        </button>
      </div>

      {/* 수집된 게시글 */}
      <h2 style={styles.sectionTitle}>
        수집된 게시글 {pagination ? `(총 ${pagination.total}건)` : ''}
      </h2>
      {posts.length > 0 ? (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>제목</th>
                <th style={styles.th}>소스</th>
                <th style={styles.th}>키워드</th>
                <th style={styles.th}>작성자</th>
                <th style={styles.th}>날짜</th>
                <th style={styles.th}>조회</th>
                <th style={styles.th}>댓글</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id} style={post.isSample ? { opacity: 0.6 } : {}}>
                  <td style={styles.td}>
                    {post.postUrl && post.postUrl.startsWith('http') ? (
                      <a href={post.postUrl} target="_blank" rel="noopener noreferrer" style={styles.postLink}>
                        {post.title}
                      </a>
                    ) : (
                      <span>{post.title}</span>
                    )}
                    {post.isSample && <span style={styles.sampleBadge}>샘플</span>}
                  </td>
                  <td style={styles.td}>{post.source?.name || '-'}</td>
                  <td style={styles.td}>{post.keyword}</td>
                  <td style={styles.td}>{post.author}</td>
                  <td style={styles.td}>
                    {post.postedAt ? new Date(post.postedAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td style={styles.tdNumber}>{(post.viewCount || 0).toLocaleString()}</td>
                  <td style={styles.tdNumber}>{post.commentCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이징 */}
          {pagination && pagination.totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={styles.pageButton}
              >
                이전
              </button>
              <span style={styles.pageInfo}>
                {currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                style={styles.pageButton}
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={styles.empty}>수집된 게시글이 없습니다. 크롤링을 실행해보세요.</div>
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
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    borderBottom: '2px solid #333',
    paddingBottom: '16px'
  },
  backButton: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  title: { margin: 0, fontSize: '24px', color: '#333' },
  slug: { fontSize: '14px', color: '#888' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  error: { textAlign: 'center', padding: '40px', color: '#d9534f' },
  errorBox: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px'
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  infoRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  infoLabel: { fontWeight: 'bold', color: '#555', minWidth: '100px' },
  infoValue: { color: '#333' },
  keywords: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  keywordTag: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px'
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#333',
    marginTop: '24px',
    marginBottom: '12px',
    borderBottom: '1px solid #dee2e6',
    paddingBottom: '8px'
  },
  sourceList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  sourceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '13px'
  },
  sourceType: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  sourceName: { fontWeight: 'bold' },
  sourceId: { color: '#888' },
  sourceDate: { color: '#999', fontSize: '12px', marginLeft: 'auto' },
  crawlSection: { margin: '20px 0' },
  crawlButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  th: {
    backgroundColor: '#f8f9fa',
    padding: '10px 8px',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#555'
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #eee',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  tdNumber: {
    padding: '8px',
    borderBottom: '1px solid #eee',
    textAlign: 'right'
  },
  postLink: { color: '#007bff', textDecoration: 'none' },
  sampleBadge: {
    backgroundColor: '#f0ad4e',
    color: '#fff',
    padding: '1px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    marginLeft: '6px'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    margin: '20px 0'
  },
  pageButton: {
    padding: '6px 16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  pageInfo: { fontSize: '14px', color: '#666' },
  empty: { textAlign: 'center', padding: '32px', color: '#999' }
};

export default AcademyDetail;
