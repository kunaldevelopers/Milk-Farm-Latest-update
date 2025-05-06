import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: "admin" | "staff";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRole,
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Check if the user is on a mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  if (!isAuthenticated || !user) {
    // Redirect to appropriate login page based on device type
    const loginPath = isMobileDevice() ? "/staff-login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (user.role !== allowedRole) {
    // If staff trying to access admin route or vice versa
    if (user.role === "staff") {
      const staffPath = isMobileDevice() ? "/staff-mobile" : "/staff";
      return <Navigate to={staffPath} replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
