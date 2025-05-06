import React, { useState, useEffect } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Box,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { admin } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const SettingsManagement: React.FC = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    adminId: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const response = await admin.getAll();
      setAdmins(response.data);
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to fetch admins");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      await admin.add(newAdmin);
      setSuccess("Admin added successfully");
      setNewAdmin({ name: "", email: "", password: "" });
      fetchAdmins();
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to add admin");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    try {
      setIsLoading(true);
      await admin.delete(deleteDialog.adminId);
      setSuccess("Admin deleted successfully");
      fetchAdmins();
      setDeleteDialog({ open: false, adminId: "" });
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to delete admin");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      await admin.changePassword(
        passwordChange.currentPassword,
        passwordChange.newPassword
      );
      setSuccess("Password changed successfully");
      setPasswordChange({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Settings Management
        </Typography>
      </Grid>

      {(error || success) && (
        <Grid item xs={12}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Grid>
      )}

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Admin List
            </Typography>
            <List>
              {admins.map((admin) => (
                <ListItem key={admin._id} divider>
                  <ListItemText primary={admin.name} secondary={admin.email} />
                  {user?._id !== admin._id && (
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() =>
                          setDeleteDialog({ open: true, adminId: admin._id })
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
              {admins.length === 0 && (
                <ListItem>
                  <ListItemText primary="No admins found" />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Add New Admin
            </Typography>
            <form onSubmit={handleAddAdmin}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Name"
                  value={newAdmin.name}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, name: e.target.value })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="Email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, email: e.target.value })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, password: e.target.value })
                  }
                  fullWidth
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={isLoading}
                >
                  Add Admin
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <form onSubmit={handlePasswordChange}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Current Password"
                    type="password"
                    value={passwordChange.currentPassword}
                    onChange={(e) =>
                      setPasswordChange({
                        ...passwordChange,
                        currentPassword: e.target.value,
                      })
                    }
                    fullWidth
                    required
                  />
                  <TextField
                    label="New Password"
                    type="password"
                    value={passwordChange.newPassword}
                    onChange={(e) =>
                      setPasswordChange({
                        ...passwordChange,
                        newPassword: e.target.value,
                      })
                    }
                    fullWidth
                    required
                  />
                  <TextField
                    label="Confirm New Password"
                    type="password"
                    value={passwordChange.confirmPassword}
                    onChange={(e) =>
                      setPasswordChange({
                        ...passwordChange,
                        confirmPassword: e.target.value,
                      })
                    }
                    fullWidth
                    required
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={isLoading}
                  >
                    Change Password
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Box>
      </Grid>

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, adminId: "" })}
      >
        <DialogTitle>Delete Admin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this admin? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, adminId: "" })}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAdmin}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default SettingsManagement;
