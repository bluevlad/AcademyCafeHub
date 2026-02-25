import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import AcademyDetail from './components/AcademyDetail';
import AdminLayout from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import CrawlStatus from './components/CrawlStatus';
import authService from './services/authService';

const NewsletterPlaceholder = () => (
  <div style={{
    maxWidth: '800px', margin: '60px auto', padding: '40px', textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }}>
    <h2 style={{ color: '#333', marginBottom: '12px' }}>뉴스레터</h2>
    <p style={{ color: '#999', fontSize: '15px' }}>준비중입니다.</p>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = authService.getToken();
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Router>
      <div className="App">
        <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        <Routes>
          {/* 공개 페이지 */}
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/newsletter" element={<NewsletterPlaceholder />} />
          <Route path="/academy/:id" element={<AcademyDetail />} />

          {/* 인증 */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/admin" /> : <Login setIsAuthenticated={setIsAuthenticated} />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/admin" /> : <Register setIsAuthenticated={setIsAuthenticated} />
          } />

          {/* Admin 영역 (인증 필수) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="crawl-status" element={<CrawlStatus />} />
          </Route>

          {/* 기존 URL 리다이렉트 */}
          <Route path="/dashboard" element={<Navigate to="/admin" />} />
          <Route path="/crawl-status" element={<Navigate to="/admin/crawl-status" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
