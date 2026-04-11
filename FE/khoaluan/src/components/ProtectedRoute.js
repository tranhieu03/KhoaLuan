import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute - Bao ve route can xac thuc
 * @param {React.ReactNode} children - Component con can bao ve
 * @param {string|string[]} allowedRoles - Roles duoc phep truy cap (optional)
 * @param {string} redirectTo - Duong dan chuyen huong khi khong du quyen
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = null, 
  redirectTo = '/' 
}) => {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Đang kiểm tra đăng nhập..." />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role if specified
  if (allowedRoles && !hasRole(allowedRoles)) {
    // User doesn't have required role - redirect based on their actual role
    const userRole = user.role?.toLowerCase();
    let roleBasedRedirect = '/';
    
    switch (userRole) {
      case 'seller':
        roleBasedRedirect = '/restaurant/dashboard';
        break;
      case 'delivery':
        roleBasedRedirect = '/delivery/dashboard';
        break;
      case 'admin':
        roleBasedRedirect = '/admin/dashboard';
        break;
      case 'customer':
        roleBasedRedirect = '/all';
        break;
      default:
        roleBasedRedirect = '/';
    }
    
    return <Navigate to={roleBasedRedirect} replace />;
  }

  return children;
};

export default ProtectedRoute;
