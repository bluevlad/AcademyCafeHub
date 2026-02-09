import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const [academies, setAcademies] = useState([]);
  const [sources, setSources] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [academyRes, sourceRes, jobRes] = await Promise.all([
        axios.get(`${apiUrl}/api/academies`),
        axios.get(`${apiUrl}/api/crawl-sources`),
        axios.get(`${apiUrl}/api/crawler/jobs?limit=10`)
      ]);

      if (academyRes.data.success) setAcademies(academyRes.data.data);
      if (sourceRes.data.success) setSources(sourceRes.data.data);
      if (jobRes.data.success) setRecentJobs(jobRes.data.data.jobs);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('데이터를 불러오는데 실패했습니다. 서버를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusBadge = (status) => {
    const colors = { pending: '#f0ad4e', running: '#5bc0de', completed: '#5cb85c', failed: '#d9534f' };
    const labels = { pending: '대기', running: '실행중', completed: '완료', failed: '실패' };
    return (
      <span style={{
        backgroundColor: colors[status] || '#999',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>AcademyInsight</h1>
          <p style={styles.subtitle}>학원 온라인 평판 분석 대시보드</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate('/crawl-status')} style={styles.linkButton}>
            크롤 작업 현황
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* 요약 카드 */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{academies.length}</div>
          <div style={styles.summaryLabel}>등록 학원</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{sources.length}</div>
          <div style={styles.summaryLabel}>크롤링 소스</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>
            {academies.reduce((sum, a) => sum + (a.postCount || 0), 0)}
          </div>
          <div style={styles.summaryLabel}>수집 게시글</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>
            {recentJobs.filter(j => j.status === 'completed').length}
          </div>
          <div style={styles.summaryLabel}>최근 완료 작업</div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={styles.actions}>
        <button onClick={handleSeedData} style={styles.seedButton}>
          초기 데이터 생성
        </button>
        <button onClick={handleCrawlAll} disabled={crawling} style={styles.crawlAllButton}>
          {crawling ? '크롤링 중...' : '전체 크롤링 실행'}
        </button>
        <button onClick={fetchData} style={styles.refreshButton}>
          새로고침
        </button>
      </div>

      {/* 학원 카드 목록 */}
      <h2 style={styles.sectionTitle}>학원 목록</h2>
      <div style={styles.academyGrid}>
        {academies.map((academy) => (
          <div
            key={academy._id}
            style={styles.academyCard}
            onClick={() => navigate(`/academy/${academy._id}`)}
          >
            <div style={styles.academyName}>{academy.name}</div>
            <div style={styles.academySlug}>{academy.nameEn} ({academy.slug})</div>
            <div style={styles.academyKeywords}>
              {academy.keywords?.map((kw, i) => (
                <span key={i} style={styles.keywordTag}>{kw}</span>
              ))}
            </div>
            <div style={styles.academyStats}>
              <span>게시글: {academy.postCount || 0}개</span>
              <span style={{ color: academy.isActive ? '#5cb85c' : '#d9534f' }}>
                {academy.isActive ? '활성' : '비활성'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {academies.length === 0 && (
        <div style={styles.empty}>
          학원 데이터가 없습니다. "초기 데이터 생성" 버튼을 클릭해주세요.
        </div>
      )}

      {/* 크롤링 소스 목록 */}
      <h2 style={styles.sectionTitle}>크롤링 소스</h2>
      <div style={styles.sourceList}>
        {sources.map((source) => (
          <div key={source._id} style={styles.sourceItem}>
            <span style={styles.sourceType}>{getSourceTypeLabel(source.sourceType)}</span>
            <span style={styles.sourceName}>{source.name}</span>
            <span style={styles.sourceId}>{source.sourceId}</span>
            <span style={{ color: source.isActive ? '#5cb85c' : '#d9534f', fontSize: '12px' }}>
              {source.isActive ? '활성' : '비활성'}
            </span>
          </div>
        ))}
      </div>

      {/* 최근 크롤 작업 */}
      <h2 style={styles.sectionTitle}>최근 크롤 작업</h2>
      {recentJobs.length > 0 ? (
        <div style={styles.jobList}>
          {recentJobs.map((job) => (
            <div key={job._id} style={styles.jobItem}>
              {getStatusBadge(job.status)}
              <span style={styles.jobSource}>{job.source?.name || '-'}</span>
              <span style={styles.jobKeyword}>{job.keyword}</span>
              <span style={styles.jobStats}>
                {job.postsFound}건 발견 / {job.postsSaved}건 저장
              </span>
              <span style={styles.jobDate}>
                {job.createdAt ? new Date(job.createdAt).toLocaleString('ko-KR') : '-'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.empty}>크롤 작업 이력이 없습니다.</div>
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
  summaryValue: { fontSize: '32px', fontWeight: 'bold', color: '#333' },
  summaryLabel: { fontSize: '14px', color: '#666', marginTop: '4px' },
  actions: { display: 'flex', gap: '12px', marginBottom: '24px' },
  seedButton: {
    padding: '10px 20px',
    backgroundColor: '#17a2b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  crawlAllButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#333',
    marginTop: '32px',
    marginBottom: '12px',
    borderBottom: '1px solid #dee2e6',
    paddingBottom: '8px'
  },
  academyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  academyCard: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s'
  },
  academyName: { fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '4px' },
  academySlug: { fontSize: '13px', color: '#888', marginBottom: '8px' },
  academyKeywords: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' },
  keywordTag: {
    backgroundColor: '#e9ecef',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#495057'
  },
  academyStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#666',
    borderTop: '1px solid #eee',
    paddingTop: '8px'
  },
  sourceList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  sourceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '14px'
  },
  sourceType: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    minWidth: '80px',
    textAlign: 'center'
  },
  sourceName: { fontWeight: 'bold', color: '#333', minWidth: '100px' },
  sourceId: { color: '#888', fontSize: '13px' },
  jobList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  jobItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '13px'
  },
  jobSource: { fontWeight: 'bold', minWidth: '80px' },
  jobKeyword: { color: '#007bff', minWidth: '80px' },
  jobStats: { color: '#666', flex: 1 },
  jobDate: { color: '#999', fontSize: '12px' },
  empty: { textAlign: 'center', padding: '32px', color: '#999', fontSize: '14px' }
};

export default AdminDashboard;
