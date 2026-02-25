import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const Navbar = ({ isAuthenticated, setIsAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/" style={styles.logo}>
          AcademyInsight
        </Link>

        <div style={styles.menu}>
          <Link
            to="/"
            style={{
              ...styles.menuItem,
              ...(isActive('/') && !isActive('/admin') ? styles.menuItemActive : {})
            }}
          >
            대시보드
          </Link>
          <Link
            to="/newsletter"
            style={{
              ...styles.menuItem,
              ...(isActive('/newsletter') ? styles.menuItemActive : {})
            }}
          >
            뉴스레터
          </Link>
          {isAuthenticated && (
            <Link
              to="/admin"
              style={{
                ...styles.menuItem,
                ...(isActive('/admin') ? styles.menuItemActive : {})
              }}
            >
              Admin
            </Link>
          )}
        </div>

        <div style={styles.auth}>
          {isAuthenticated ? (
            <button onClick={handleLogout} style={styles.authButton}>
              로그아웃
            </button>
          ) : (
            <Link to="/login" style={styles.loginLink}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderBottom: '2px solid #333',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  inner: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    height: '56px'
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    textDecoration: 'none',
    marginRight: '32px',
    flexShrink: 0
  },
  menu: {
    display: 'flex',
    gap: '4px',
    flex: 1
  },
  menuItem: {
    padding: '8px 16px',
    color: '#666',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '4px',
    transition: 'background-color 0.15s'
  },
  menuItemActive: {
    color: '#333',
    backgroundColor: '#f0f0f0',
    fontWeight: '600'
  },
  auth: {
    flexShrink: 0
  },
  authButton: {
    padding: '6px 16px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  loginLink: {
    padding: '6px 16px',
    backgroundColor: '#007bff',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500'
  }
};

export default Navbar;
