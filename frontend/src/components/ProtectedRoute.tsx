import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [],
  redirectTo = '/scanner'
}) => {
  const user = localStorage.getItem('user');
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  try {
    const userData = JSON.parse(user);
    const userRole = userData.role;

    // If no roles specified, allow all authenticated users
    if (allowedRoles.length === 0) {
      return <>{children}</>;
    }

    // Check if user's role is in allowed roles
    if (allowedRoles.includes(userRole)) {
      return <>{children}</>;
    }

    // User doesn't have permission, redirect
    return <Navigate to={redirectTo} replace />;
  } catch (error) {
    // Invalid user data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
};
