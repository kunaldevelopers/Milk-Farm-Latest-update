import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Toolbar,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SettingsIcon from "@mui/icons-material/Settings";

const drawerWidth = 240;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/admin" },
  { text: "Client Management", icon: <PeopleIcon />, path: "/admin/clients" },
  { text: "Staff Management", icon: <PersonIcon />, path: "/admin/staff" },
  { text: "Assignments", icon: <AssignmentIcon />, path: "/admin/assignments" },
  { text: "Settings", icon: <SettingsIcon />, path: "/admin/settings" },
];

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#4a5e6a", // --slate-gray (matches Navbar)
          borderRight: "1px solid #a8d5ba", // --pasture-green (matches Navbar/Footer)
          color: "#f5f6f5", // --milk-white (matches Navbar text)
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: "auto" }}>
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                color: "#f5f6f5", // --milk-white (matches Navbar buttons)
                "&.Mui-selected": {
                  backgroundColor: "#a8d5ba", // --pasture-green (matches Navbar hover)
                  color: "#4a5e6a", // --slate-gray (matches Navbar hover text)
                  "& .MuiListItemIcon-root": {
                    color: "#4a5e6a", // --slate-gray
                  },
                  "&:hover": {
                    backgroundColor: "#6ab7d6", // --sky-blue (matches Navbar hover variation)
                  },
                },
                "&:hover": {
                  backgroundColor: "#a8d5ba", // --pasture-green (matches Navbar hover)
                  color: "#4a5e6a", // --slate-gray
                  "& .MuiListItemIcon-root": {
                    color: "#4a5e6a", // --slate-gray
                  },
                },
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? "#4a5e6a" // --slate-gray (matches selected state)
                      : "#f5f6f5", // --milk-white (matches Navbar buttons)
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default AdminSidebar;
