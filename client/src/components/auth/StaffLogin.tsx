import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import { LoginCredentials } from "../../types";

const StaffLogin: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const credentials: LoginCredentials = { username, password };
      await login(credentials);
      // If we reach here, login was successful
      // Navigation is handled in AuthContext
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mb: 2,
        }}
      >
        {/* Logo/Image would go here */}
        <Typography
          variant={isMobile ? "h5" : "h4"}
          align="center"
          sx={{
            color: "#5c6bc0",
            fontWeight: "bold",
            mb: 1,
          }}
        >
          Milk Delivery Staff
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          sx={{
            color: "#7986cb",
            mb: 2,
          }}
        >
          Mobile Delivery Portal
        </Typography>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: isMobile ? 3 : 4,
          borderRadius: "16px",
          backgroundColor: "#ffffff",
          border: "1px solid #e0e0e0",
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Staff Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
            autoComplete="username"
            InputProps={{
              sx: { borderRadius: "8px" },
            }}
          />
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
            InputProps={{
              sx: { borderRadius: "8px" },
            }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              backgroundColor: "#5c6bc0",
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: 600,
              "&:hover": {
                backgroundColor: "#3f51b5",
              },
            }}
          >
            Sign In
          </Button>
        </form>
        <Box
          sx={{
            mt: 2,
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            component="a"
            href="#"
            sx={{
              color: "#5c6bc0",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Forgot Password?
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default StaffLogin;
