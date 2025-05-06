import React, { useState, useEffect } from "react";
import {
  Grid,
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { staff } from "../../services/api";
import { Staff } from "../../types";

interface FormData {
  name: string;
  username: string;
  password: string;
  contactNumber: string;
  location: string;
  role: "staff";
}

const initialFormData: FormData = {
  name: "",
  username: "",
  password: "",
  contactNumber: "",
  location: "",
  role: "staff",
};

const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await staff.getAll();
      setStaffList(response.data);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setError("Failed to fetch staff members");
      setIsSnackbarOpen(true);
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }

    if (!editingId) {
      if (!formData.username.trim()) {
        setError("Username is required");
        return false;
      }

      if (!formData.password.trim()) {
        setError("Password is required");
        return false;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    // Validate form inputs
    if (!validateForm()) {
      setIsSnackbarOpen(true);
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        await staff.update(editingId, {
          name: formData.name,
          contactNumber: formData.contactNumber,
          location: formData.location,
        });

        setSuccess("Staff updated successfully");
        fetchStaff();
        setFormData(initialFormData);
        setEditingId(null);
      } else {
        // Create new staff
        const staffData = {
          name: formData.name.trim(),
          username: formData.username.trim(),
          password: formData.password,
          contactNumber: formData.contactNumber.trim(),
          location: formData.location.trim(),
          role: "staff",
        };

        try {
          const response = await staff.add(staffData);
          console.log("Staff creation response:", response);
          setSuccess("Staff added successfully");
          fetchStaff();
          setFormData(initialFormData);
        } catch (err: any) {
          if (err.message === "Invalid token") {
            // Handle token error
            window.location.href = "/login";
            return;
          }
          throw err;
        }
      }
    } catch (error: any) {
      console.error("Error saving staff:", error);
      let errorMessage = "Failed to save staff member";

      if (error.details) {
        errorMessage = `${error.message}: ${error.details}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Handle common errors
      if (
        errorMessage.includes("username") &&
        errorMessage.includes("exists")
      ) {
        errorMessage =
          "Username already exists. Please choose a different username.";
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
      setIsSnackbarOpen(true);
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setFormData({
      name: staffMember.name,
      username: staffMember.username || "",
      password: "",
      contactNumber: staffMember.contactNumber || "",
      location: staffMember.location || "",
      role: "staff",
    });
    setEditingId(staffMember._id);
  };

  const handleDelete = async (id: string) => {
    try {
      await staff.delete(id);
      setSuccess("Staff deleted successfully");
      fetchStaff();
    } catch (error: any) {
      let errorMessage = "Failed to delete staff member";
      if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setIsSnackbarOpen(true);
    }
  };

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "username", headerName: "Username", flex: 1 },
    { field: "contactNumber", headerName: "Contact", flex: 1 },
    { field: "location", headerName: "Location", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Button onClick={() => handleEdit(params.row)} sx={{ mr: 1 }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(params.row._id)} color="error">
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  const handleCloseSnackbar = () => {
    setIsSnackbarOpen(false);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Staff Management
        </Typography>
      </Grid>

      <Snackbar
        open={isSnackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={error ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {error || success}
        </Alert>
      </Snackbar>

      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              {!editingId && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      helperText="Username must be unique"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      helperText="Password must be at least 6 characters"
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contact Number"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : editingId ? (
                    "Update Staff"
                  ) : (
                    "Add Staff"
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper>
          <DataGrid
            rows={staffList}
            columns={columns}
            getRowId={(row) => row._id}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            autoHeight
          />
        </Paper>
      </Grid>
    </Grid>
  );
};

export default StaffManagement;
