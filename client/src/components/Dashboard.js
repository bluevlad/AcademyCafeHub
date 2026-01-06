import React from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const Dashboard = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to Academy Cafe Hub</h1>
        <div style={styles.userInfo}>
          <h2 style={styles.greeting}>Hello, {user?.username}!</h2>
          <p style={styles.email}>{user?.email}</p>
        </div>
        <div style={styles.content}>
          <p style={styles.text}>You are successfully logged in.</p>
          <p style={styles.text}>This is a protected dashboard that only authenticated users can access.</p>
        </div>
        <button onClick={handleLogout} style={styles.button}>
          Logout
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '600px',
    textAlign: 'center'
  },
  title: {
    color: '#333',
    marginBottom: '30px'
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '30px'
  },
  greeting: {
    color: '#007bff',
    marginBottom: '10px'
  },
  email: {
    color: '#666',
    fontSize: '14px'
  },
  content: {
    marginBottom: '30px'
  },
  text: {
    color: '#555',
    marginBottom: '10px'
  },
  button: {
    padding: '12px 30px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer'
  }
};

export default Dashboard;
