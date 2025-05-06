import React, { useState, useEffect } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Box,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import { clients, staff, dailyDeliveries } from "../../services/api";
import { Client, DailyDelivery, StaffSession, Staff } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

const StaffDashboard: React.FC = () => {
  const [staffData, setStaffData] = useState<Staff | null>(null);
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [showShiftSelector, setShowShiftSelector] = useState(true); // Force shift selection on load
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedShift, setSelectedShift] = useState<"AM" | "PM" | null>(null);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [reasonDialog, setReasonDialog] = useState<{
    open: boolean;
    clientId: string | null;
    reason: string;
  }>({
    open: false,
    clientId: null,
    reason: "",
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user?._id) {
      fetchStaffData().then(() => {
        checkStaffSession(); // Ensure session check runs after fetching staff data
      });
    }
  }, [user?._id]);

  const fetchStaffData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user?._id) return;

      const response = await staff.getByUserId(user._id);
      setStaffData(response.data);
      console.log(`[STAFF DEBUG] Fetched staff data: ${response.data._id}`);
    } catch (error: any) {
      console.error("Error fetching staff data:", error);
      if (
        error.response?.status === 404 ||
        error.message.includes("not found")
      ) {
        setError(
          "Your account is not linked to a staff profile. Contact the admin."
        );
        setNotification({
          message:
            "Your account is not linked to a staff profile. Contact the admin.",
          type: "error",
        });
      } else {
        setError(error.message || "Failed to load staff data");
        setNotification({
          message: error.message || "Failed to load staff data",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const checkStaffSession = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!staffData?._id) return;

      const response = await staff.getSessionByDate(
        staffData._id,
        selectedDate
      );
      setStaffSession(response.data);
      setSelectedShift(response.data.shift);
      setShowShiftSelector(false);
      await updateAssignedClients(response.data.shift);
      fetchDailyDeliveries();
    } catch (error: any) {
      console.log("No shift selected yet for today, showing selector");
      setShowShiftSelector(true);
      fetchAssignedClients();
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedClients = async () => {
    setLoading(true);

    try {
      if (!staffData?._id) return;

      const response = await clients.getAssignedToStaff(staffData._id);
      setAssignedClients(response.data);
    } catch (error: any) {
      console.error("Error fetching assigned clients:", error);
      if (
        error.response?.status === 404 ||
        error.message.includes("not found")
      ) {
        setAssignedClients([]);
        setError("You have no assigned clients. Contact the admin.");
      } else {
        setError(error.message || "Failed to load assigned clients");
        setNotification({
          message: error.message || "Failed to load assigned clients",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateAssignedClients = async (shift: "AM" | "PM") => {
    try {
      if (!staffData?._id) return;

      await staff.selectShift(staffData._id, shift);
      const response = await clients.getAssignedToStaff(staffData._id);
      setAssignedClients(response.data);
    } catch (error: any) {
      console.error("Error updating assigned clients:", error);
      setError("Failed to update assigned clients based on shift.");
      setNotification({
        message: "Failed to update assigned clients based on shift.",
        type: "error",
      });
    }
  };

  const fetchDailyDeliveries = async () => {
    setLoading(true);

    try {
      if (!staffData?._id) return;

      const response = await dailyDeliveries.getStaffDeliveries(
        staffData._id,
        selectedDate
      );
      setDailyRecords(response.data.deliveries || []);
    } catch (error: any) {
      console.error("Error fetching daily deliveries:", error);
      if (error.response?.data?.requireShiftSelection) {
        setShowShiftSelector(true);
        if (error.response?.data?.clientsByShift) {
          const allClients = [
            ...(error.response.data.clientsByShift.AM || []),
            ...(error.response.data.clientsByShift.PM || []),
          ];
          setAssignedClients(allClients);
        } else {
          fetchAssignedClients();
        }
        return;
      }
      if (
        error.response?.status === 404 ||
        error.message.includes("not found")
      ) {
        setDailyRecords([]);
        setError(
          "No delivery data available for this date. Contact the admin if this is unexpected."
        );
      } else {
        setError(error.message || "Failed to load daily deliveries");
        setNotification({
          message: error.message || "Failed to load daily deliveries",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShift = async (shift: "AM" | "PM") => {
    try {
      if (!staffData?._id) return;

      await staff.selectShift(staffData._id, shift);
      setSelectedShift(shift);
      setShowShiftSelector(false);
      await updateAssignedClients(shift);
      checkStaffSession();
      setNotification({
        message: `Successfully selected ${shift} shift`,
        type: "success",
      });
    } catch (error: any) {
      console.error("Error selecting shift:", error);
      setNotification({
        message: error.message || "Failed to select shift",
        type: "error",
      });
    }
  };

  const handleMarkDelivered = async (clientId: string) => {
    try {
      if (!staffData?._id) return;
      await staff.markDailyDelivered(staffData._id, clientId);
      setNotification({
        message: "Successfully marked as delivered",
        type: "success",
      });
      fetchDailyDeliveries();
    } catch (error: any) {
      console.error("Error marking delivery:", error);
      setNotification({
        message: error.message || "Failed to update delivery status",
        type: "error",
      });
    }
  };

  const handleOpenReasonDialog = (clientId: string) => {
    setReasonDialog({
      open: true,
      clientId,
      reason: "",
    });
  };

  const handleCloseReasonDialog = () => {
    setReasonDialog({
      ...reasonDialog,
      open: false,
    });
  };

  const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setReasonDialog({
      ...reasonDialog,
      reason: event.target.value,
    });
  };

  const handleMarkUndelivered = async () => {
    try {
      if (!staffData?._id || !reasonDialog.clientId) return;
      await staff.markDailyUndelivered(
        staffData._id,
        reasonDialog.clientId,
        reasonDialog.reason
      );
      handleCloseReasonDialog();
      setNotification({
        message: "Successfully marked as not delivered",
        type: "success",
      });
      fetchDailyDeliveries();
    } catch (error: any) {
      console.error("Error marking non-delivery:", error);
      setNotification({
        message: error.message || "Failed to update delivery status",
        type: "error",
      });
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const getClientsByShift = () => {
    const result = {
      AM: assignedClients.filter((client) => client.timeShift === "AM"),
      PM: assignedClients.filter((client) => client.timeShift === "PM"),
    };
    return result;
  };

  if (!loading && !staffData && error) {
    return (
      <Grid
        container
        spacing={3}
        justifyContent="center"
        alignItems="center"
        sx={{ minHeight: "80vh" }}
      >
        <Grid item xs={12} md={6}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      </Grid>
    );
  }

  if (showShiftSelector) {
    return (
      <Grid
        container
        spacing={3}
        justifyContent="center"
        alignItems="center"
        sx={{ minHeight: "80vh" }}
      >
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h5" gutterBottom>
                Select Your Shift for Today
              </Typography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={() => handleSelectShift("AM")}
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
                    onClick={() => handleSelectShift("PM")}
                    sx={{ py: 2 }}
                  >
                    PM Shift
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid container item xs={12}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            alignItems: "center",
          }}
        >
          <Typography variant="h4">
            Staff Dashboard
            {selectedShift && (
              <Chip
                label={`${selectedShift} Shift`}
                color={selectedShift === "AM" ? "primary" : "secondary"}
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <TextField
              label="Date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              sx={{ mr: 2, minWidth: "200px" }}
              InputLabelProps={{ shrink: true }}
            />
            {selectedShift && (
              <Button
                variant="outlined"
                onClick={() => setShowShiftSelector(true)}
              >
                Change Shift
              </Button>
            )}
          </Box>
        </Box>
      </Grid>
      {error && (
        <Grid item xs={12}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Grid>
      )}
      <Grid container item xs={12}>
        <Card sx={{ width: "100%" }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">
                Today's Deliveries
                {selectedDate === new Date().toISOString().split("T")[0]
                  ? ""
                  : ` (${selectedDate})`}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={fetchDailyDeliveries}
              >
                Refresh
              </Button>
            </Box>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : dailyRecords.length === 0 ? (
              <Typography align="center" sx={{ py: 3 }}>
                No clients assigned for this shift today.
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell align="right">Quantity (L)</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dailyRecords.map((delivery) => (
                      <TableRow key={delivery._id.toString()}>
                        <TableCell>
                          {(delivery.clientId as any)?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {(delivery.clientId as any)?.location || "Unknown"}
                        </TableCell>
                        <TableCell align="right">
                          {(delivery.clientId as any)?.quantity || 0}
                        </TableCell>
                        <TableCell align="right">
                          ₹{(delivery.price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              delivery.deliveryStatus === "Delivered"
                                ? "Delivered"
                                : "Not Delivered"
                            }
                            color={
                              delivery.deliveryStatus === "Delivered"
                                ? "success"
                                : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() =>
                                handleMarkDelivered(
                                  (delivery.clientId as any)?._id
                                )
                              }
                              disabled={delivery.deliveryStatus === "Delivered"}
                            >
                              Mark Delivered
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() =>
                                handleOpenReasonDialog(
                                  (delivery.clientId as any)?._id
                                )
                              }
                              disabled={
                                delivery.deliveryStatus === "Not Delivered"
                              }
                            >
                              Not Delivered
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Dialog open={reasonDialog.open} onClose={handleCloseReasonDialog}>
        <DialogTitle>Reason for Non-Delivery</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason"
            fullWidth
            variant="outlined"
            value={reasonDialog.reason}
            onChange={handleReasonChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReasonDialog}>Cancel</Button>
          <Button onClick={handleMarkUndelivered} color="error">
            Mark Not Delivered
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type || "info"}
          sx={{ width: "100%" }}
        >
          {notification?.message || ""}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default StaffDashboard;
