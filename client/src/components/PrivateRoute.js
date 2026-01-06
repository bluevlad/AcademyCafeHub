import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const PrivateRoute = ({ children }) => {
  const token = authService.getToken();
  return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
