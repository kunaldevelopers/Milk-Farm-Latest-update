import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
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
  const [forceShiftSelection, setForceShiftSelection] = useState(true);
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Single useEffect for initialization
  useEffect(() => {
    // Only initialize once when component mounts
    const initialize = async () => {
      try {
        // Clear any previously selected shift
        console.log("[CLIENT DEBUG] Clearing previous shift selection");
        localStorage.removeItem("selectedShift");

        // Always force shift selection on fresh login
        setShowShiftSelector(true);
        setForceShiftSelection(true);

        if (!user?._id) {
          console.log("[CLIENT DEBUG] No user ID available");
          setError("Authentication required. Please login again.");
          setLoading(false);
          return;
        }

        // Only get the staff ID, nothing else
        await getStaffIdOnly();
      } catch (error: any) {
        console.error("[CLIENT DEBUG] Error in initialization:", error);
        setError("Failed to initialize. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initialize();

    // Cleanup function to prevent state updates after unmount
    return () => {
      // Cleanup code if needed
    };
  }, [user?._id]); // Only depend on user ID

  // Simplified function that only gets staff ID
  const getStaffIdOnly = async () => {
    try {
      if (!user?._id) return;

      setLoading(true);
      console.log("[CLIENT DEBUG] Getting staff ID only");

      const staffResponse = await staff.getByUserId(user._id);
      const staffId = staffResponse.data._id;
      setStaffId(staffId);

      console.log("[CLIENT DEBUG] Got staff ID:", staffId);

      // CRITICAL: Force showing the shift selector no matter what
      setShowShiftSelector(true);
      return staffId;
    } catch (error: any) {
      console.error("[CLIENT DEBUG] Error fetching staff ID:", error);
      setError("Failed to load your staff profile. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to handle shift selection
  const handleShiftSelect = async (shift: "AM" | "PM") => {
    try {
      if (!staffId) {
        const newStaffId = await getStaffIdOnly();
        if (!newStaffId) {
          setError("Could not retrieve staff ID. Please try again.");
          return;
        }
      }

      console.log(
        `[CLIENT DEBUG] Selecting ${shift} shift for staff ${staffId}`
      );
      setLoading(true);

      // Select shift on server - this creates a new session
      await staff.selectShift(staffId!, shift);

      // Store the shift in localStorage
      localStorage.setItem("selectedShift", shift);
      setSelectedShift(shift);

      // Don't show shift selector anymore
      setShowShiftSelector(false);
      setForceShiftSelection(false);

      // Get all assigned clients and filter by shift
      const clientsResponse = await clients.getAssignedToStaff(staffId!, true);
      const filteredClients = clientsResponse.data.filter(
        (client: any) => client.timeShift === shift
      );

      console.log(
        `[CLIENT DEBUG] Filtered ${clientsResponse.data.length} clients to ${filteredClients.length} clients matching ${shift} shift`
      );
      setAssignedClients(filteredClients);

      setNotification({
        message: `Successfully selected ${shift} shift. Showing ${filteredClients.length} clients.`,
        type: "success",
      });
    } catch (error: any) {
      console.error("[CLIENT DEBUG] Error selecting shift:", error);
      setError(error.message || "Failed to select shift");
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
      refreshData(); // Changed from fetchStaffData() to refreshData()
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
      refreshData(); // Changed from fetchStaffData() to refreshData()
    } catch (error: any) {
      console.error("Error marking non-delivery:", error);
      setNotification({
        message: error.message || "Failed to update delivery status",
        type: "error",
      });
    }
  };

  const handlePrintBill = async (client: Client) => {
    try {
      console.log("[CLIENT DEBUG] Starting bill generation for:", client.name);

      // Fetch full client data to ensure we have delivery history
      console.log(
        "[CLIENT DEBUG] Fetching complete client data for:",
        client._id
      );
      let clientWithHistory = client;

      try {
        const response = await clients.getById(client._id);
        clientWithHistory = response.data;
        console.log("[CLIENT DEBUG] Successfully fetched complete client data");
      } catch (fetchError) {
        console.error("[CLIENT DEBUG] Error fetching client data:", fetchError);
        setNotification({
          message: "Failed to get client delivery history. Please try again.",
          type: "error",
        });
        return;
      }

      if (
        !clientWithHistory.deliveryHistory ||
        !Array.isArray(clientWithHistory.deliveryHistory) ||
        clientWithHistory.deliveryHistory.length === 0
      ) {
        console.error(
          "[CLIENT DEBUG] No delivery history available for client"
        );
        setNotification({
          message: "No delivery history available for this client",
          type: "error",
        });
        return;
      }

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      console.log("[CLIENT DEBUG] Filtering delivery history");

      // Create a map of all days in the billing period
      const allDaysInPeriod = new Map();

      // Generate all dates from start of month to today
      let currentDate = new Date(startOfMonth);
      while (currentDate <= today) {
        const dateString = currentDate.toISOString().split("T")[0];
        allDaysInPeriod.set(dateString, {
          date: new Date(currentDate),
          notTaken: true, // Initially mark all as not taken
        });
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update the map with actual delivery data
      clientWithHistory.deliveryHistory
        .filter((record) => {
          const recordDate = new Date(record.date);
          return recordDate >= startOfMonth && recordDate <= today;
        })
        .forEach((record) => {
          const dateString = new Date(record.date).toISOString().split("T")[0];

          // If the delivery was made (status is "Delivered"), update the map
          if (record.status === "Delivered") {
            allDaysInPeriod.set(dateString, {
              date: new Date(record.date),
              quantity: record.quantity,
              pricePerLiter: clientWithHistory.pricePerLitre,
              subtotal: record.quantity * clientWithHistory.pricePerLitre,
              notTaken: false,
            });
          } else {
            // If delivery was marked as "Not Delivered", keep the notTaken flag true
            allDaysInPeriod.set(dateString, {
              date: new Date(record.date),
              notTaken: true,
            });
          }
        });

      // Convert the map to an array for bill entries
      const entries = Array.from(allDaysInPeriod.values());

      if (entries.length === 0) {
        console.error("[CLIENT DEBUG] No entries available for this month");
        setNotification({
          message: "No entries found for this month",
          type: "error",
        });
        return;
      }

      // Calculate total amount (only from entries where milk was delivered)
      const totalAmount = entries.reduce(
        (sum, entry) => sum + (entry.notTaken ? 0 : entry.subtotal || 0),
        0
      );

      const billData: BillData = {
        clientName: clientWithHistory.name,
        clientLocation: clientWithHistory.location,
        clientPhone: clientWithHistory.number || "N/A",
        billingPeriod: {
          start: startOfMonth,
          end: today,
        },
        entries,
        totalAmount,
      };

      console.log(
        "[CLIENT DEBUG] Generating bill for client:",
        clientWithHistory.name
      );
      console.log("[CLIENT DEBUG] Total bill amount:", totalAmount);

      // Generate PDF
      const doc = generateBillPDF(billData);
      const fileName = `invoice-${clientWithHistory.name}-${
        today.toISOString().split("T")[0]
      }.pdf`;

      // For mobile compatibility, use blob and object URL approach
      try {
        const pdfBlob = doc.output("blob");
        const blobUrl = URL.createObjectURL(pdfBlob);

        console.log("[CLIENT DEBUG] Created blob URL for PDF");

        // Create a link element and trigger download
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);

        // Show notification before download is triggered
        setNotification({
          message: `Preparing bill for ${clientWithHistory.name}. Download should start automatically.`,
          type: "info",
        });

        // Slight delay to ensure notification is shown before download dialog
        setTimeout(() => {
          console.log("[CLIENT DEBUG] Triggering download click");
          link.click();
          document.body.removeChild(link);

          // Clean up the blob URL
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);

            setNotification({
              message: `Bill generated for ${clientWithHistory.name}`,
              type: "success",
            });
          }, 100);
        }, 300);
      } catch (blobError) {
        console.error("[CLIENT DEBUG] Blob approach failed:", blobError);

        // Fallback to data URL approach if blob approach fails
        try {
          const pdfData = doc.output("datauristring");
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(
              `<iframe width='100%' height='100%' src='${pdfData}'></iframe>`
            );
            setNotification({
              message: `Bill opened in new tab for ${clientWithHistory.name}`,
              type: "success",
            });
          } else {
            throw new Error("Popup blocked");
          }
        } catch (dataUrlError) {
          console.error(
            "[CLIENT DEBUG] Data URI approach failed:",
            dataUrlError
          );
          throw new Error(
            "Could not open PDF: " +
              (dataUrlError instanceof Error
                ? dataUrlError.message
                : "Unknown error")
          );
        }
      }
    } catch (error: any) {
      console.error("[CLIENT DEBUG] Error generating bill:", error);
      setNotification({
        message:
          "Failed to generate bill: " + (error.message || "Unknown error"),
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
    // Only refresh client data without checking sessions
    if (!staffId || !selectedShift) return;

    const refreshClients = async () => {
      try {
        setLoading(true);

        // Format date to ensure consistent format: YYYY-MM-DD
        const formattedDate = new Date(selectedDate)
          .toISOString()
          .split("T")[0];
        console.log(
          `[CLIENT DEBUG] Refreshing data for formatted date: ${formattedDate}`
        );

        // Pass the properly formatted date to the API call
        const clientsResponse = await clients.getAssignedToStaff(
          staffId,
          true,
          formattedDate // Pass the formatted date to filter by date
        );

        const filteredClients = clientsResponse.data.filter(
          (client: any) => client.timeShift === selectedShift
        );

        console.log(
          `[CLIENT DEBUG] Received ${filteredClients.length} clients with date ${formattedDate}`
        );
        setAssignedClients(filteredClients);
      } catch (error: any) {
        console.error("[CLIENT DEBUG] Error refreshing data:", error);
        setError("Failed to refresh data");
      } finally {
        setLoading(false);
      }
    };

    refreshClients();
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  // Always show shift selector if forceShiftSelection is true
  if (showShiftSelector || forceShiftSelection) {
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
                    disabled={loading}
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
                    disabled={loading}
                  >
                    PM Shift
                  </Button>
                </Grid>
              </Grid>

              {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                  <CircularProgress />
                </Box>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  // Regular dashboard view
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
