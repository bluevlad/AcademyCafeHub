import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import WillvisCrawler from './components/WillvisCrawler';
import PrivateRoute from './components/PrivateRoute';
import authService from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = authService.getToken();
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login setIsAuthenticated={setIsAuthenticated} />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Register setIsAuthenticated={setIsAuthenticated} />
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard setIsAuthenticated={setIsAuthenticated} />
            </PrivateRoute>
          } />
          <Route path="/willvis-crawler" element={<WillvisCrawler />} />
          <Route path="/" element={<Navigate to="/willvis-crawler" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
