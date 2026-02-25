import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [academyRanking, setAcademyRanking] = useState([]);
  const [teacherRanking, setTeacherRanking] = useState([]);
  const [sourceActivity, setSourceActivity] = useState([]);
  const [sourceMeta, setSourceMeta] = useState(null);
  const [dailyAnalysis, setDailyAnalysis] = useState([]);
  const [dailyMeta, setDailyMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, academyRes, teacherRes, sourceRes, trendingRes] = await Promise.all([
        axios.get(`${apiUrl}/api/dashboard/summary`),
        axios.get(`${apiUrl}/api/dashboard/academy-ranking`),
        axios.get(`${apiUrl}/api/dashboard/teacher-ranking`),
        axios.get(`${apiUrl}/api/dashboard/source-activity`),
        axios.get(`${apiUrl}/api/dashboard/trending-posts`)
      ]);

      if (summaryRes.data.success) setSummary(summaryRes.data.data);
      if (academyRes.data.success) setAcademyRanking(academyRes.data.data);
      if (teacherRes.data.success) setTeacherRanking(teacherRes.data.data);
      if (sourceRes.data.success) {
        setSourceActivity(sourceRes.data.data);
        setSourceMeta(sourceRes.data.meta || null);
      }
      if (trendingRes.data.success) {
        setDailyAnalysis(trendingRes.data.data);
        setDailyMeta(trendingRes.data.meta || null);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('데이터를 불러오는데 실패했습니다. 데이터 서버 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSentimentColor = (score) => {
    if (score >= 0.6) return '#28a745';
    if (score >= 0.4) return '#ffc107';
    return '#dc3545';
  };

  const getSentimentLabel = (score) => {
    if (score >= 0.6) return '긍정';
    if (score >= 0.4) return '중립';
    return '부정';
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

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>AcademyInsight</h1>
          <p style={styles.subtitle}>Academy Analytics Platform</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchData} style={styles.refreshButton}>
            새로고침
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* 요약 카드 */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary?.todayMentions ?? 0}</div>
          <div style={styles.summaryLabel}>오늘 멘션</div>
          {summary?.date && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{summary.date}</div>
          )}
        </div>
        <div style={styles.summaryCard}>
          <div style={{
            ...styles.summaryValue,
            color: getSentimentColor(summary?.avgSentimentScore ?? 0)
          }}>
            {summary?.avgSentimentScore != null ? summary.avgSentimentScore.toFixed(2) : '-'}
          </div>
          <div style={styles.summaryLabel}>평균 감성 점수</div>
          <div style={{ fontSize: '13px', color: '#007bff', marginTop: '4px' }}>
            긍정 {summary?.positiveRatio ?? 0}%
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary?.totalTeachers ?? 0}</div>
          <div style={styles.summaryLabel}>모니터링 강사</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary?.topAcademy?.name ?? '-'}</div>
          <div style={styles.summaryLabel}>최다 멘션 학원</div>
          <div style={{ fontSize: '13px', color: '#007bff', marginTop: '4px' }}>
            {summary?.topAcademy?.count ?? 0}건
          </div>
        </div>
      </div>

      {/* 강사 멘션 랭킹 */}
      <h2 style={styles.sectionTitle}>강사 멘션 랭킹 (오늘)</h2>
      {teacherRanking.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '50px' }}>순위</th>
                <th style={styles.th}>강사명</th>
                <th style={styles.th}>학원</th>
                <th style={{ ...styles.th, width: '80px', textAlign: 'right' }}>멘션</th>
                <th style={{ ...styles.th, width: '90px', textAlign: 'right' }}>감성점수</th>
                <th style={{ ...styles.th, width: '70px', textAlign: 'right' }}>추천</th>
              </tr>
            </thead>
            <tbody>
              {teacherRanking.map((item, index) => (
                <tr key={index}>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{getRankBadge(index)}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.teacherName}</td>
                  <td style={styles.td}>
                    <span style={{
                      backgroundColor: '#e9ecef', padding: '2px 8px',
                      borderRadius: '12px', fontSize: '12px', color: '#495057'
                    }}>
                      {item.academyName}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{item.mentionCount}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: getSentimentColor(item.avgSentimentScore), fontWeight: 'bold' }}>
                    {item.avgSentimentScore?.toFixed(2) ?? '-'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#007bff' }}>{item.recommendationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.empty}>데이터가 없습니다.</div>
      )}

      {/* 학원 랭킹 */}
      <h2 style={styles.sectionTitle}>학원별 현황</h2>
      {academyRanking.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '50px' }}>순위</th>
                <th style={styles.th}>학원명</th>
                <th style={{ ...styles.th, width: '90px', textAlign: 'right' }}>오늘 멘션</th>
                <th style={{ ...styles.th, width: '90px', textAlign: 'right' }}>주간 멘션</th>
                <th style={{ ...styles.th, width: '90px', textAlign: 'right' }}>감성점수</th>
                <th style={{ ...styles.th, width: '100px' }}>상위 강사</th>
                <th style={{ ...styles.th, width: '80px', textAlign: 'right' }}>강사 수</th>
              </tr>
            </thead>
            <tbody>
              {academyRanking.map((item, index) => (
                <tr key={index}>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{getRankBadge(index)}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.name}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{item.todayMentions}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#666' }}>{item.weekMentions}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: getSentimentColor(item.avgSentimentScore), fontWeight: 'bold' }}>
                    {item.avgSentimentScore?.toFixed(2) ?? '-'}
                  </td>
                  <td style={{ ...styles.td, fontSize: '13px' }}>{item.topTeacher}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#666' }}>{item.teacherCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.empty}>데이터가 없습니다.</div>
      )}

      {/* 소스별 활동 현황 */}
      <h2 style={styles.sectionTitle}>
        소스별 활동 현황
        {sourceMeta?.weekLabel && (
          <span style={{ fontSize: '13px', color: '#999', fontWeight: 'normal', marginLeft: '12px' }}>
            {sourceMeta.weekLabel}
          </span>
        )}
      </h2>
      {sourceActivity.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>소스명</th>
                <th style={{ ...styles.th, width: '120px', textAlign: 'right' }}>주간 멘션</th>
              </tr>
            </thead>
            <tbody>
              {sourceActivity.map((item, index) => (
                <tr key={index}>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.name}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{item.weekCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.empty}>데이터가 없습니다.</div>
      )}

      {/* 오늘 강사 분석 현황 */}
      <h2 style={styles.sectionTitle}>
        오늘 강사 분석 현황
        {dailyMeta?.periodLabel && (
          <span style={{ fontSize: '13px', color: '#999', fontWeight: 'normal', marginLeft: '12px' }}>
            {dailyMeta.periodLabel} | 강사 {dailyMeta.totalTeachers}명 | 멘션 {dailyMeta.totalMentions}건
          </span>
        )}
      </h2>
      {dailyAnalysis.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>강사명</th>
                <th style={styles.th}>학원</th>
                <th style={{ ...styles.th, width: '80px', textAlign: 'right' }}>멘션</th>
                <th style={{ ...styles.th, width: '70px', textAlign: 'right' }}>긍정</th>
                <th style={{ ...styles.th, width: '70px', textAlign: 'right' }}>부정</th>
                <th style={{ ...styles.th, width: '90px', textAlign: 'right' }}>감성점수</th>
                <th style={{ ...styles.th, width: '70px', textAlign: 'right' }}>추천</th>
              </tr>
            </thead>
            <tbody>
              {dailyAnalysis.map((item, index) => (
                <tr key={index}>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.teacherName}</td>
                  <td style={styles.td}>
                    <span style={{
                      backgroundColor: '#e9ecef', padding: '2px 8px',
                      borderRadius: '12px', fontSize: '12px', color: '#495057'
                    }}>
                      {item.academyName}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{item.mentionCount}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#28a745' }}>{item.positiveCount}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#dc3545' }}>{item.negativeCount}</td>
                  <td style={{
                    ...styles.td, textAlign: 'right', fontWeight: 'bold',
                    color: getSentimentColor(item.avgSentimentScore)
                  }}>
                    {item.avgSentimentScore?.toFixed(2) ?? '-'}
                    <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '4px' }}>
                      ({getSentimentLabel(item.avgSentimentScore)})
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#007bff' }}>{item.recommendationCount}</td>
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
  empty: { textAlign: 'center', padding: '32px', color: '#999', fontSize: '14px' }
};

export default AdminDashboard;
