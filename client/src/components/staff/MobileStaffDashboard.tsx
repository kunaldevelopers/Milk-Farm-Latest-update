import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  useTheme,
  useMediaQuery,
  CircularProgress,
  AppBar,
  Toolbar,
  Alert,
  Snackbar,
} from "@mui/material";
import { clients, staff } from "../../services/api";
import { Client } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import LogoutIcon from "@mui/icons-material/Logout";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { generateBillPDF, BillData } from "../../utils/pdfUtils";

const MobileStaffDashboard: React.FC = () => {
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [notDeliveredReason, setNotDeliveredReason] = useState("");
  const [showShiftSelector, setShowShiftSelector] = useState(true);
  const [selectedShift, setSelectedShift] = useState<"AM" | "PM" | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [staffId, setStaffId] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (user?._id) {
      fetchStaffData();
    } else {
      console.log("No user ID available for fetching clients");
      setError("User authentication issue. Please login again.");
      setLoading(false);
    }
  }, [user?._id, selectedDate]);

  const fetchStaffData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?._id) {
        throw new Error("Authentication required. Please login again.");
      }

      const staffResponse = await staff.getByUserId(user._id);
      const staffData = staffResponse.data;
      setStaffId(staffData._id);

      // For admin view or when shift isn't required, get all clients
      if (user.role === "admin") {
        const clientsResponse = await clients.getAssignedToStaff(
          staffData._id,
          true
        );
        const initialClients = clientsResponse.data.map((client: any) => ({
          ...client,
          deliveryStatus: "Pending",
        }));
        setAssignedClients(initialClients);
        return;
      }

      // Get daily delivery records for the selected date for staff view
      const dailyDeliveriesResponse = await staff.getDailyDeliveries(
        staffData._id,
        selectedDate
      );

      if (dailyDeliveriesResponse.data?.deliveries?.length > 0) {
        const deliveriesWithClientData =
          dailyDeliveriesResponse.data.deliveries.map((delivery: any) => ({
            ...delivery.clientId,
            deliveryStatus: delivery.deliveryStatus,
            dailyDeliveryId: delivery._id,
          }));
        setAssignedClients(deliveriesWithClientData);
      } else {
        // If no delivery records exist for this date, get assigned clients for current shift
        const clientsResponse = await clients.getAssignedToStaff(staffData._id);
        const initialClients = clientsResponse.data.map((client: any) => ({
          ...client,
          deliveryStatus: "Pending",
        }));
        setAssignedClients(initialClients);
      }
    } catch (error: any) {
      console.error("[CLIENT DEBUG] Staff fetch error:", error);

      // Enhanced error debugging, especially for 404s
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          console.error(
            "[CLIENT DEBUG] 404 details:",
            JSON.stringify(error.response.data)
          );
          setError("Staff profile not found. Please contact support.");
        } else if (status === 400) {
          console.error(
            "[CLIENT DEBUG] 400 details:",
            JSON.stringify(error.response.data)
          );
          setError("Invalid user ID. Authentication error.");
        } else if (status === 401) {
          console.error(
            "[CLIENT DEBUG] 401 details:",
            JSON.stringify(error.response.data)
          );
          setError("Authentication required. Please login again.");
          // Force logout on auth errors
          setTimeout(() => logout(), 2000);
        } else if (status === 403) {
          console.error(
            "[CLIENT DEBUG] 403 details:",
            JSON.stringify(error.response.data)
          );
          setError(
            "Access denied. You don't have permission to view this data."
          );
        } else {
          console.error(
            "[CLIENT DEBUG] Error details:",
            JSON.stringify(error.response.data)
          );
          setError(`Server error (${status}). Please try again later.`);
        }
      } else {
        console.error("[CLIENT DEBUG] Network error details:", error.message);
        setError("Connection error. Please check your network and try again.");
      }

      throw error; // Re-throw to prevent further processing
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryStatusChange = async (
    client: Client,
    status: "Delivered" | "Not Delivered"
  ) => {
    if (!staffId) {
      setNotification({
        message: "Staff ID not found. Please try logging in again.",
        type: "error",
      });
      return;
    }

    if (status === "Not Delivered") {
      setSelectedClient(client);
      setOpenDialog(true);
      return;
    }

    try {
      await staff.markDailyDelivered(staffId, client._id);
      setNotification({
        message: "Successfully marked as delivered",
        type: "success",
      });
      fetchStaffData();
    } catch (error: any) {
      console.error("Error marking delivery:", error);
      setNotification({
        message: error.message || "Failed to update delivery status",
        type: "error",
      });
    }
  };

  const confirmNotDelivered = async () => {
    if (!selectedClient || !staffId) {
      setNotification({
        message: "Missing required information. Please try again.",
        type: "error",
      });
      return;
    }

    try {
      await staff.markDailyUndelivered(
        staffId,
        selectedClient._id,
        notDeliveredReason
      );
      setOpenDialog(false);
      setNotDeliveredReason("");
      setNotification({
        message: "Successfully marked as not delivered",
        type: "success",
      });
      fetchStaffData();
    } catch (error: any) {
      console.error("Error marking non-delivery:", error);
      setNotification({
        message: error.message || "Failed to update delivery status",
        type: "error",
      });
    }
  };

  const handlePrintBill = (client: Client) => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Filter and map delivery history to billing entries
      const entries = client.deliveryHistory
        .filter((record) => {
          const recordDate = new Date(record.date);
          return recordDate >= startOfMonth && recordDate <= today;
        })
        .map((record) => ({
          date: new Date(record.date),
          quantity: record.quantity,
          pricePerLiter: client.pricePerLitre,
          subtotal: record.quantity * client.pricePerLitre,
        }));

      // Calculate total amount
      const totalAmount = entries.reduce(
        (sum, entry) => sum + entry.subtotal,
        0
      );

      const billData: BillData = {
        clientName: client.name,
        clientLocation: client.location,
        clientPhone: client.number,
        billingPeriod: {
          start: startOfMonth,
          end: today,
        },
        entries,
        totalAmount,
      };

      console.log("[CLIENT DEBUG] Generating bill for client:", client.name);
      console.log("[CLIENT DEBUG] Total bill amount:", totalAmount);

      // Generate and download PDF
      const doc = generateBillPDF(billData);
      doc.save(
        `invoice-${client.name}-${today.toISOString().split("T")[0]}.pdf`
      );

      setNotification({
        message: `Bill generated for ${client.name}`,
        type: "success",
      });
    } catch (error) {
      console.error("[CLIENT DEBUG] Error generating bill:", error);
      setNotification({
        message: "Failed to generate bill. Please try again.",
        type: "error",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "#4caf50";
      case "Not Delivered":
        return "#f44336";
      default:
        return "#ff9800";
    }
  };

  const refreshData = () => {
    fetchStaffData();
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  // Add shift selection handler
  const handleShiftSelect = async (shift: "AM" | "PM") => {
    try {
      if (!user?._id) return;

      // Get staff data first
      const staffResponse = await staff.getByUserId(user._id);
      const staffId = staffResponse.data._id;

      // Select shift
      await staff.selectShift(staffId, shift);
      setSelectedShift(shift);
      setShowShiftSelector(false);

      // Refresh data
      fetchStaffData();

      setNotification({
        message: `Successfully selected ${shift} shift`,
        type: "success",
      });
    } catch (error: any) {
      setError(error.message || "Failed to select shift");
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  if (showShiftSelector) {
    return (
      <Box sx={{ pb: 7, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
        <AppBar position="sticky" sx={{ bgcolor: "#5c6bc0" }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Select Shift
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="sm" sx={{ mt: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                Select Your Shift for Today
              </Typography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={() => handleShiftSelect("AM")}
                    sx={{ py: 2 }}
                  >
                    AM Shift
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    onClick={() => handleShiftSelect("PM")}
                    sx={{ py: 2 }}
                  >
                    PM Shift
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 7, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <AppBar position="sticky" sx={{ bgcolor: "#5c6bc0" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Milk Delivery Staff
          </Typography>
          <IconButton color="inherit" onClick={refreshData}>
            <RefreshIcon />
          </IconButton>
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 2 }}>
        <Box sx={{ mb: 2, px: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Welcome, {user?.name}
          </Typography>
          <TextField
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            fullWidth
            sx={{ mt: 2, mb: 1 }}
            InputLabelProps={{ shrink: true }}
          />

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setError(null)}
                >
                  DISMISS
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
            </Box>
          ) : assignedClients.length === 0 ? (
            <Card sx={{ borderRadius: 2, mb: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    py: 2,
                  }}
                >
                  <ErrorOutlineIcon
                    sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
                  />
                  <Typography align="center">
                    No clients assigned for today.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1, px: 1 }}>
                Assigned Clients ({assignedClients.length})
              </Typography>
              {assignedClients.map((client) => (
                <Card
                  key={client._id}
                  sx={{ mb: 2, borderRadius: 2, boxShadow: 2 }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6">{client.name}</Typography>
                      <Chip
                        label={client.deliveryStatus}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(client.deliveryStatus),
                          color: "white",
                          fontWeight: 500,
                        }}
                      />
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                      <LocationOnIcon
                        fontSize="small"
                        sx={{ color: "text.secondary", mr: 0.5 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {client.location}
                      </Typography>
                    </Box>

                    {client.number && (
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
                      >
                        <LocalPhoneIcon
                          fontSize="small"
                          sx={{ color: "text.secondary", mr: 0.5 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {client.number}
                        </Typography>
                      </Box>
                    )}

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: 1.5,
                        mb: 0.5,
                        pb: 1,
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <Typography variant="subtitle2">
                        Daily Quantity:
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {client.quantity} L
                      </Typography>
                    </Box>

                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          startIcon={<CheckCircleIcon />}
                          variant="contained"
                          color="success"
                          disabled={client.deliveryStatus === "Delivered"}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            boxShadow: 1,
                          }}
                          onClick={() =>
                            handleDeliveryStatusChange(client, "Delivered")
                          }
                        >
                          Delivered
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          startIcon={<CancelIcon />}
                          variant="outlined"
                          color="error"
                          disabled={client.deliveryStatus === "Not Delivered"}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                          }}
                          onClick={() =>
                            handleDeliveryStatusChange(client, "Not Delivered")
                          }
                        >
                          Not Delivered
                        </Button>
                      </Grid>
                      <Grid item xs={12} sx={{ mt: 1 }}>
                        <Button
                          fullWidth
                          startIcon={<PrintIcon />}
                          variant="outlined"
                          color="primary"
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                          }}
                          onClick={() => handlePrintBill(client)}
                        >
                          Print Bill
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </Box>
      </Container>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Why was delivery not completed?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide a reason for the missed delivery.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Reason"
            fullWidth
            variant="outlined"
            value={notDeliveredReason}
            onChange={(e) => setNotDeliveredReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={confirmNotDelivered} color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ mb: 2 }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type || "info"}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {notification?.message || ""}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MobileStaffDashboard;
