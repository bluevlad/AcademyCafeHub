import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CrawlStatus = () => {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, currentPage]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let url = `${apiUrl}/api/crawler/jobs?page=${currentPage}&limit=30`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await axios.get(url);
      if (res.data.success) {
        setJobs(res.data.data.jobs);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = { pending: '#f0ad4e', running: '#5bc0de', completed: '#5cb85c', failed: '#d9534f' };
    const labels = { pending: '대기', running: '실행중', completed: '완료', failed: '실패' };
    return (
      <span style={{
        backgroundColor: colors[status] || '#999',
        color: '#fff',
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    const ms = new Date(end) - new Date(start);
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}초`;
    return `${Math.floor(ms / 60000)}분 ${Math.floor((ms % 60000) / 1000)}초`;
  };

  const statusOptions = [
    { value: '', label: '전체' },
    { value: 'pending', label: '대기' },
    { value: 'running', label: '실행중' },
    { value: 'completed', label: '완료' },
    { value: 'failed', label: '실패' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/admin')} style={styles.backButton}>AcademyInsight</button>
          <h1 style={styles.title}>크롤 작업 현황</h1>
        </div>
        <button onClick={fetchJobs} style={styles.refreshButton}>새로고침</button>
      </div>

      {/* 필터 */}
      <div style={styles.filterBar}>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setCurrentPage(1); }}
            style={{
              ...styles.filterButton,
              backgroundColor: statusFilter === opt.value ? '#007bff' : '#e9ecef',
              color: statusFilter === opt.value ? '#fff' : '#333'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 통계 요약 */}
      {pagination && (
        <div style={styles.statsBar}>
          전체 {pagination.total}건
          {statusFilter && ` (${statusOptions.find(o => o.value === statusFilter)?.label} 필터)`}
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>불러오는 중...</div>
      ) : jobs.length > 0 ? (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>소스</th>
                <th style={styles.th}>학원</th>
                <th style={styles.th}>키워드</th>
                <th style={styles.th}>발견</th>
                <th style={styles.th}>저장</th>
                <th style={styles.th}>중복</th>
                <th style={styles.th}>소요시간</th>
                <th style={styles.th}>실행일시</th>
                <th style={styles.th}>오류</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td style={styles.td}>{getStatusBadge(job.status)}</td>
                  <td style={styles.td}>{job.source?.name || '-'}</td>
                  <td style={styles.td}>{job.academy?.name || '-'}</td>
                  <td style={styles.td}>{job.keyword}</td>
                  <td style={styles.tdNumber}>{job.postsFound || 0}</td>
                  <td style={styles.tdNumber}>{job.postsSaved || 0}</td>
                  <td style={styles.tdNumber}>{job.duplicatesSkipped || 0}</td>
                  <td style={styles.td}>{formatDuration(job.startedAt, job.completedAt)}</td>
                  <td style={styles.td}>
                    {job.createdAt ? new Date(job.createdAt).toLocaleString('ko-KR') : '-'}
                  </td>
                  <td style={{ ...styles.td, color: '#d9534f', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {job.error || '-'}
                  </td>
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
        <div style={styles.empty}>크롤 작업 이력이 없습니다.</div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #333',
    paddingBottom: '16px'
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  title: { margin: 0, fontSize: '24px', color: '#333' },
  backButton: {
    padding: '6px 12px',
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
    cursor: 'pointer'
  },
  filterBar: { display: 'flex', gap: '8px', marginBottom: '16px' },
  filterButton: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  statsBar: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '12px'
  },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
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
    color: '#555',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap'
  },
  tdNumber: {
    padding: '8px',
    borderBottom: '1px solid #eee',
    textAlign: 'right'
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
  empty: { textAlign: 'center', padding: '40px', color: '#999' }
};

export default CrawlStatus;
