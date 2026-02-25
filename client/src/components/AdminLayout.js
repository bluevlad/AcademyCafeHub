import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import authService from '../services/authService';

const AdminLayout = () => {
  const token = authService.getToken();
  const [hubStatus, setHubStatus] = useState(null);

  const fetchHubStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/dashboard/health');
      if (res.data.success) setHubStatus(res.data.data);
    } catch {
      setHubStatus({ connected: false, url: '' });
    }
  }, []);

  useEffect(() => {
    if (token) fetchHubStatus();
  }, [token, fetchHubStatus]);

  if (!token) return <Navigate to="/login" />;

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>Admin</h3>
        </div>

        {/* TeacherHub 연결 상태 */}
        <div style={styles.statusCard}>
          <div style={styles.statusLabel}>데이터 서버</div>
          <div style={styles.statusRow}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: hubStatus?.connected ? '#28a745' : hubStatus === null ? '#ffc107' : '#dc3545'
            }} />
            <span style={{
              fontSize: '13px',
              color: hubStatus?.connected ? '#28a745' : hubStatus === null ? '#ffc107' : '#dc3545'
            }}>
              {hubStatus === null ? '확인 중...' : hubStatus.connected ? '연결됨' : '연결 실패'}
            </span>
          </div>
          {hubStatus?.url && (
            <div style={styles.statusUrl}>{hubStatus.url}</div>
          )}
        </div>

        {/* 서브 네비게이션 */}
        <nav style={styles.sideNav}>
          <NavLink
            to="/admin"
            end
            style={({ isActive }) => ({
              ...styles.sideNavItem,
              ...(isActive ? styles.sideNavItemActive : {})
            })}
          >
            시스템 상태
          </NavLink>
          <NavLink
            to="/admin/crawl-status"
            style={({ isActive }) => ({
              ...styles.sideNavItem,
              ...(isActive ? styles.sideNavItemActive : {})
            })}
          >
            크롤링 관리
          </NavLink>
          <NavLink
            to="/admin/sources"
            style={({ isActive }) => ({
              ...styles.sideNavItem,
              ...(isActive ? styles.sideNavItemActive : {})
            })}
          >
            소스 관리
            <span style={styles.badge}>준비중</span>
          </NavLink>
        </nav>
      </div>

      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

const styles = {
  layout: {
    display: 'flex',
    minHeight: 'calc(100vh - 58px)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  sidebar: {
    width: '220px',
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #dee2e6',
    padding: '16px 0',
    flexShrink: 0
  },
  sidebarHeader: {
    padding: '0 16px 12px',
    borderBottom: '1px solid #dee2e6'
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#333',
    fontWeight: '600'
  },
  statusCard: {
    margin: '12px 16px',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #dee2e6'
  },
  statusLabel: {
    fontSize: '11px',
    color: '#999',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: '6px'
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  statusUrl: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
    wordBreak: 'break-all'
  },
  sideNav: {
    padding: '8px 0'
  },
  sideNavItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    color: '#555',
    textDecoration: 'none',
    fontSize: '14px',
    borderLeft: '3px solid transparent'
  },
  sideNavItemActive: {
    color: '#007bff',
    backgroundColor: '#e7f1ff',
    borderLeftColor: '#007bff',
    fontWeight: '600'
  },
  badge: {
    fontSize: '10px',
    color: '#999',
    backgroundColor: '#e9ecef',
    padding: '2px 6px',
    borderRadius: '8px'
  },
  content: {
    flex: 1,
    padding: '20px',
    overflow: 'auto'
  }
};

export default AdminLayout;
