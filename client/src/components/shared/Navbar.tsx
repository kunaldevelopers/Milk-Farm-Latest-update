import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "#4a5e6a", // --slate-gray
        borderBottom: "1px solid #a8d5ba", // --pasture-green
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            color: "#ede4d7", // --creamy-beige
            fontWeight: "bold",
            letterSpacing: 0.5,
          }}
        >
          Milk Farm CRM
        </Typography>
        {isAuthenticated ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            {user?.role === "admin" ? (
              <>
                <Button
                  color="inherit"
                  component={Link}
                  to="/admin"
                  sx={{
                    color: "#f5f6f5", // --milk-white
                    "&:hover": {
                      backgroundColor: "#a8d5ba", // --pasture-green
                      color: "#4a5e6a", // --slate-gray
                    },
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/admin/clients"
                  sx={{
                    color: "#f5f6f5", // --milk-white
                    "&:hover": {
                      backgroundColor: "#a8d5ba", // --pasture-green
                      color: "#4a5e6a", // --slate-gray
                    },
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  Clients
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/admin/staff"
                  sx={{
                    color: "#f5f6f5", // --milk-white
                    "&:hover": {
                      backgroundColor: "#a8d5ba", // --pasture-green
                      color: "#4a5e6a", // --slate-gray
                    },
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  Staff
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/admin/assignments"
                  sx={{
                    color: "#f5f6f5", // --milk-white
                    "&:hover": {
                      backgroundColor: "#a8d5ba", // --pasture-green
                      color: "#4a5e6a", // --slate-gray
                    },
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  Assignments
                </Button>
              </>
            ) : (
              <Button
                color="inherit"
                component={Link}
                to="/staff/dashboard"
                sx={{
                  color: "#f5f6f5", // --milk-white
                  "&:hover": {
                    backgroundColor: "#a8d5ba", // --pasture-green
                    color: "#4a5e6a", // --slate-gray
                  },
                  textTransform: "none",
                  fontWeight: 500,
                }}
              >
                Dashboard
              </Button>
            )}
            <Button
              color="inherit"
              onClick={handleLogout}
              sx={{
                color: "#f4a261", // --sunset-orange
                "&:hover": {
                  backgroundColor: "#a8d5ba", // --pasture-green
                  color: "#4a5e6a", // --slate-gray
                },
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Logout
            </Button>
          </Box>
        ) : (
          <Box>
            <Button
              color="inherit"
              component={Link}
              to="/login"
              sx={{
                color: "#6ab7d6", // --sky-blue
                "&:hover": {
                  backgroundColor: "#a8d5ba", // --pasture-green
                  color: "#4a5e6a", // --slate-gray
                },
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Login
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
