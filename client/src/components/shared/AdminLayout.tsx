import React from "react";
import { Box } from "@mui/material";
import AdminSidebar from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: "flex" }}>
      <AdminSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          ml: { sm: "240px" },
        }}
      >
        <Box sx={{ mt: 8 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
