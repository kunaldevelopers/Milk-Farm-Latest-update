import React, { useState, useEffect } from "react";
import {
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
} from "@mui/material";
import { admin } from "../../services/api";
import styles from "./Dashboard.module.css";

interface DashboardData {
  counts: {
    totalClients: number;
    totalStaff: number;
  };
  today: {
    date: string;
    quantity: number;
    revenue: number;
    successRate: number;
  };
  monthly: {
    quantity: number;
    revenue: number;
  };
  deliverySummary: {
    totalDeliveries: number;
    delivered: number;
    successRate: number;
    totalQuantity: number;
    totalRevenue: number;
  };
  assignmentStatus: {
    totalQuantityAssigned: number;
  };
  priorityClients: PriorityClient[]; // Added priority clients array
  deliveryRecords: DeliveryRecord[];
  staffPerformance: StaffPerformance[];
  shiftAnalytics: ShiftAnalytic[];
}

interface DeliveryRecord {
  clientName: string;
  location: string;
  staff: string;
  shift: string;
  quantity: number;
  price: number;
  status: string;
}

interface StaffPerformance {
  staffName: string;
  deliveredCount: number;
  notDeliveredCount: number;
  totalQuantity: number;
  totalRevenue: number;
  successRate: number;
}

interface ShiftAnalytic {
  shift: string;
  deliveryCount: number;
  deliveredCount: number;
  successRate: number;
  totalQuantity: number;
  totalRevenue: number;
}

// Added interface for priority clients
interface PriorityClient {
  _id: string;
  name: string;
  location: string;
  timeShift: string;
  quantity: number;
  deliveryStatus: string;
}

const initialDashboardData: DashboardData = {
  counts: {
    totalClients: 0,
    totalStaff: 0,
  },
  today: {
    date: new Date().toISOString(),
    quantity: 0,
    revenue: 0,
    successRate: 0,
  },
  monthly: {
    quantity: 0,
    revenue: 0,
  },
  deliverySummary: {
    totalDeliveries: 0,
    delivered: 0,
    successRate: 0,
    totalQuantity: 0,
    totalRevenue: 0,
  },
  assignmentStatus: {
    totalQuantityAssigned: 0,
  },
  priorityClients: [], // Initialize empty array for priority clients
  deliveryRecords: [],
  staffPerformance: [],
  shiftAnalytics: [],
};

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedShift, setSelectedShift] = useState<string>(""); // Empty string means 'All'
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialDashboardData);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log(
        `Fetching dashboard data for date: ${selectedDate}, shift: ${
          selectedShift || "All"
        }`
      );
      const response = await admin.getDashboardData(
        selectedDate,
        selectedShift
      );
      setDashboardData(response.data);
      console.log("Dashboard data fetched:", response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData(initialDashboardData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, selectedShift]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleShiftChange = (event: SelectChangeEvent) => {
    setSelectedShift(event.target.value);
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case "AM":
        return "primary";
      case "PM":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "success";
      case "Not Delivered":
        return "error";
      default:
        return "warning";
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Admin Dashboard</div>
        <div className={styles.headerControls}>
          <div className={styles.datePickerContainer}>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className={styles.datePicker}
            />
          </div>
          <FormControl sx={{ minWidth: 120, mx: 2 }} size="small">
            <InputLabel id="shift-select-label">Shift</InputLabel>
            <Select
              labelId="shift-select-label"
              id="shift-select"
              value={selectedShift}
              label="Shift"
              onChange={handleShiftChange}
            >
              <MenuItem value="">All Shifts</MenuItem>
              <MenuItem value="AM">AM Shift</MenuItem>
              <MenuItem value="PM">PM Shift</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleRefresh}
            className={styles.refreshButton}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statsCard} ${styles.cardGreen}`}>
          <div className={styles.metricLabel}>Total Clients</div>
          <div className={styles.metric}>
            {dashboardData.counts.totalClients}
          </div>
        </div>

        <div className={`${styles.statsCard} ${styles.cardBlue}`}>
          <div className={styles.metricLabel}>Total Staff</div>
          <div className={styles.metric}>{dashboardData.counts.totalStaff}</div>
        </div>

        <div className={`${styles.statsCard} ${styles.cardGray}`}>
          <div className={styles.metricLabel}>Today's Delivery (L)</div>
          <div className={styles.metric}>
            {dashboardData.today.quantity.toFixed(1)}
          </div>
          <div className={styles.amount}>
            {formatCurrency(dashboardData.today.revenue)}
          </div>
        </div>

        <div className={`${styles.statsCard} ${styles.cardOrange}`}>
          <div className={styles.metricLabel}>Monthly Total (L)</div>
          <div className={styles.metric}>
            {dashboardData.monthly.quantity.toFixed(1)}
          </div>
          <div className={styles.amount}>
            {formatCurrency(dashboardData.monthly.revenue)}
          </div>
        </div>
      </div>

      {/* Priority Clients Section - Added to restore old functionality */}
      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              Priority Clients
              <Chip
                label="High Priority"
                color="error"
                size="small"
                sx={{ ml: 2 }}
              />
            </Typography>
            {dashboardData.priorityClients &&
            dashboardData.priorityClients.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.deliveryTable}>
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>Location</th>
                      <th>Shift</th>
                      <th>Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.priorityClients.map((client, index) => (
                      <tr key={index}>
                        <td>{client.name}</td>
                        <td>{client.location}</td>
                        <td>
                          <Chip
                            label={client.timeShift}
                            color={getShiftColor(client.timeShift)}
                            size="small"
                          />
                        </td>
                        <td>{client.quantity.toFixed(1)} L</td>
                        <td>
                          <Chip
                            label={client.deliveryStatus}
                            color={getStatusColor(client.deliveryStatus)}
                            size="small"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Typography align="center" sx={{ py: 3 }}>
                No priority clients found.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {new Date(selectedDate).toLocaleDateString()} Delivery Summary
                  {selectedShift && (
                    <Chip
                      label={`${selectedShift} Shift`}
                      color={getShiftColor(selectedShift)}
                      sx={{ ml: 2 }}
                    />
                  )}
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Total Deliveries
                    </Typography>
                    <Typography variant="h6">
                      {dashboardData.deliverySummary.totalDeliveries}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Delivered
                    </Typography>
                    <Typography variant="h6">
                      {dashboardData.deliverySummary.delivered} (
                      {Number(
                        dashboardData.deliverySummary.successRate
                      ).toFixed(1)}
                      %)
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Total Quantity
                    </Typography>
                    <Typography variant="h6">
                      {dashboardData.deliverySummary.totalQuantity.toFixed(1)} L
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Total Revenue
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(
                        dashboardData.deliverySummary.totalRevenue
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Assignment Status
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Total Quantity Assigned
                  </Typography>
                  <Typography variant="h6">
                    {dashboardData.assignmentStatus.totalQuantityAssigned.toFixed(
                      1
                    )}{" "}
                    L
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {dashboardData.staffPerformance.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Staff Performance
              </Typography>
              <div className={styles.tableContainer}>
                <table className={styles.deliveryTable}>
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Delivered</th>
                      <th>Not Delivered</th>
                      <th>Success Rate</th>
                      <th>Total Quantity</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.staffPerformance.map((staff, index) => (
                      <tr key={index}>
                        <td>{staff.staffName}</td>
                        <td>{staff.deliveredCount}</td>
                        <td>{staff.notDeliveredCount}</td>
                        <td>{staff.successRate.toFixed(1)}%</td>
                        <td>{staff.totalQuantity.toFixed(1)} L</td>
                        <td>{formatCurrency(staff.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Delivery Records
              {selectedShift && (
                <Chip
                  label={`${selectedShift} Shift`}
                  color={getShiftColor(selectedShift)}
                  sx={{ ml: 2 }}
                />
              )}
            </Typography>
            {dashboardData.deliveryRecords.length === 0 ? (
              <Typography align="center" sx={{ py: 3 }}>
                No delivery records found for this date and shift.
              </Typography>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.deliveryTable}>
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>Location</th>
                      <th>Staff</th>
                      <th>Shift</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.deliveryRecords.map((delivery, index) => (
                      <tr key={index}>
                        <td>{delivery.clientName}</td>
                        <td>{delivery.location}</td>
                        <td>{delivery.staff}</td>
                        <td>
                          <Chip
                            label={delivery.shift}
                            color={getShiftColor(delivery.shift)}
                            size="small"
                          />
                        </td>
                        <td>{delivery.quantity.toFixed(1)} L</td>
                        <td>{formatCurrency(delivery.price)}</td>
                        <td>
                          <Chip
                            label={delivery.status}
                            color={
                              delivery.status === "Delivered"
                                ? "success"
                                : "default"
                            }
                            size="small"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Box>

      {dashboardData.shiftAnalytics.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shift Analytics
              </Typography>
              <div className={styles.tableContainer}>
                <table className={styles.deliveryTable}>
                  <thead>
                    <tr>
                      <th>Shift</th>
                      <th>Delivery Count</th>
                      <th>Success Rate</th>
                      <th>Total Quantity</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.shiftAnalytics.map((shift, index) => (
                      <tr key={index}>
                        <td>
                          <Chip
                            label={shift.shift}
                            color={getShiftColor(shift.shift)}
                            size="small"
                          />
                        </td>
                        <td>{shift.deliveryCount}</td>
                        <td>{shift.successRate.toFixed(1)}%</td>
                        <td>{shift.totalQuantity.toFixed(1)} L</td>
                        <td>{formatCurrency(shift.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Box>
      )}
    </div>
  );
};

export default Dashboard;
