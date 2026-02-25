import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import authService from '../services/authService';

const Dashboard = () => {
  const user = authService.getCurrentUser();
  const [hubStatus, setHubStatus] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const [healthRes, summaryRes] = await Promise.all([
        axios.get('/api/dashboard/health'),
        axios.get('/api/dashboard/summary')
      ]);
      if (healthRes.data.success) setHubStatus(healthRes.data.data);
      if (summaryRes.data.success) setSystemInfo(summaryRes.data.data);
    } catch {
      setHubStatus({ connected: false, url: '' });
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>시스템 상태</h2>
        <button onClick={fetchSystemInfo} style={styles.refreshButton}>새로고침</button>
      </div>

      {/* 사용자 정보 */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>로그인 정보</h3>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>사용자</span>
          <span style={styles.infoValue}>{user?.username || '-'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>이메일</span>
          <span style={styles.infoValue}>{user?.email || '-'}</span>
        </div>
      </div>

      {/* 데이터 서버 연결 상태 */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>데이터 서버 연결</h3>
        <div style={styles.statusRow}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: hubStatus?.connected ? '#28a745' : hubStatus === null ? '#ffc107' : '#dc3545'
          }} />
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: hubStatus?.connected ? '#28a745' : hubStatus === null ? '#ffc107' : '#dc3545'
          }}>
            {hubStatus === null ? '확인 중...' : hubStatus.connected ? '연결됨' : '연결 실패'}
          </span>
          {hubStatus?.url && (
            <span style={styles.statusUrl}>{hubStatus.url}</span>
          )}
        </div>
      </div>

      {/* 시스템 요약 */}
      {systemInfo && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>데이터 요약</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{systemInfo.todayMentions ?? 0}</div>
              <div style={styles.statLabel}>오늘 멘션</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{systemInfo.totalTeachers ?? 0}</div>
              <div style={styles.statLabel}>모니터링 강사</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>
                {systemInfo.avgSentimentScore != null ? systemInfo.avgSentimentScore.toFixed(2) : '-'}
              </div>
              <div style={styles.statLabel}>평균 감성점수</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{systemInfo.topAcademy?.name ?? '-'}</div>
              <div style={styles.statLabel}>최다 멘션 학원</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    color: '#333'
  },
  refreshButton: {
    padding: '6px 14px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px'
  },
  cardTitle: {
    margin: '0 0 16px 0',
    fontSize: '15px',
    color: '#495057',
    fontWeight: '600',
    borderBottom: '1px solid #eee',
    paddingBottom: '8px'
  },
  infoRow: {
    display: 'flex',
    padding: '6px 0',
    fontSize: '14px'
  },
  infoLabel: {
    width: '80px',
    color: '#999',
    fontWeight: '500'
  },
  infoValue: {
    color: '#333'
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusDot: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  statusUrl: {
    fontSize: '12px',
    color: '#999',
    marginLeft: '8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px'
  },
  statItem: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    wordBreak: 'break-all'
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px'
  }
};

export default Dashboard;
