import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";

import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/shared/Navbar";
import Footer from "./components/shared/Footer";
import AdminLayout from "./components/shared/AdminLayout";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import Login from "./components/auth/Login";
import StaffLogin from "./components/auth/StaffLogin";
import Register from "./components/auth/Register";
import AdminDashboard from "./components/admin/Dashboard";
import StaffDashboard from "./components/staff/Dashboard";
import MobileStaffDashboard from "./components/staff/MobileStaffDashboard";
import ClientManagement from "./components/admin/ClientManagement";
import StaffManagement from "./components/admin/StaffManagement";
import AssignmentsManagement from "./components/admin/AssignmentsManagement";
import SettingsManagement from "./components/admin/SettingsManagement";
import ClientView from "./components/staff/ClientView";

// Create a wrapper component to use location
const AppContent: React.FC = () => {
  const location = useLocation();

  // Check if the user is on a mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // Check if current path is staff mobile or login
  const isStaffMobilePath =
    location.pathname === "/staff-mobile" ||
    location.pathname === "/staff-login";

  return (
    <AuthProvider>
      <CssBaseline />
      <Box
        sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        {/* Only show Navbar on non-staff-mobile pages */}
        {!isStaffMobilePath && <Navbar />}

        <Box
          component="main"
          sx={{ flexGrow: 1, p: isStaffMobilePath ? 0 : 3 }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/staff-login" element={<StaffLogin />} />
            <Route path="/register" element={<Register />} />

            {/* Admin Routes - Protected */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <ClientManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <StaffManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assignments"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <AssignmentsManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <SettingsManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Staff Routes - Protected */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRole="staff">
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff-mobile"
              element={
                <ProtectedRoute allowedRole="staff">
                  <MobileStaffDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/clients/:id"
              element={
                <ProtectedRoute allowedRole="staff">
                  <ClientView />
                </ProtectedRoute>
              }
            />

            {/* Default Routes */}
            <Route
              path="/"
              element={
                isMobileDevice() ? (
                  <Navigate to="/staff-login" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </Box>

        {/* Only show Footer on non-staff-mobile pages */}
        {!isStaffMobilePath && <Footer />}
      </Box>
    </AuthProvider>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
