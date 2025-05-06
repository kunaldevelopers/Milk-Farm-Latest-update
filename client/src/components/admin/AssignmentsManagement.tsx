import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { staff, clients } from "../../services/api";

interface Staff {
  _id: string;
  name: string;
}

interface Client {
  _id: string;
  name: string;
  timeShift: "AM" | "PM";
}

interface Assignment {
  staff: Staff;
  client: Client;
}

interface StaffSummary {
  staff: Staff;
  amClients: Client[];
  pmClients: Client[];
}

// Create interfaces for the data structure returned by the getAllAssignments API
interface StaffAssignment {
  staff: Staff;
  clients: Client[];
}

const AssignmentsManagement = () => {
  const [staffList, setStaff] = useState<Staff[]>([]);
  const [clientsList, setClients] = useState<Client[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staffSummaries, setStaffSummaries] = useState<StaffSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchClients();
    fetchAssignments();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await staff.getAll();
      setStaff(response.data);
    } catch (error) {
      setError("Failed to fetch staff");
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clients.getAll();
      setClients(response.data);
    } catch (error) {
      setError("Failed to fetch clients");
    }
  };

  const fetchAssignments = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("[DEBUG] Starting to fetch assignments data");

      // Get all staff and clients for the dropdown menus
      const [staffResponse, clientsResponse] = await Promise.all([
        staff.getAll(),
        clients.getAll(),
      ]);

      const staffList = staffResponse.data || [];
      const clientsList = clientsResponse.data || [];

      console.log(
        `[DEBUG] Fetched ${staffList.length} staff and ${clientsList.length} clients`
      );

      // Set the raw lists in state for the dropdown menus
      setStaff(staffList);
      setClients(clientsList);

      if (staffList.length === 0) {
        setError("No staff members found. Please add staff members first.");
        setIsLoading(false);
        return;
      }

      if (clientsList.length === 0) {
        setError("No clients found. Please add clients first.");
        setIsLoading(false);
        return;
      }

      // NEW: Use the getAllAssignments endpoint to get all assignments at once
      const allAssignmentsResponse = await staff.getAllAssignments();
      const staffAssignments = allAssignmentsResponse.data || [];

      console.log(
        `[DEBUG] Fetched assignments data for ${staffAssignments.length} staff members`
      );

      const assignments: Assignment[] = [];
      const summaries: StaffSummary[] = [];

      // Process the assignments data
      staffAssignments.forEach((item: StaffAssignment) => {
        const currentStaff = item.staff;
        const currentClients = item.clients || [];

        // Initialize arrays for AM/PM shifts
        const amClients: Client[] = [];
        const pmClients: Client[] = [];

        // Sort clients by shift
        currentClients.forEach((client: Client) => {
          // Add to assignments list
          assignments.push({
            staff: currentStaff,
            client,
          });

          // Sort into AM/PM arrays
          if (client.timeShift === "AM") {
            amClients.push(client);
          } else if (client.timeShift === "PM") {
            pmClients.push(client);
          }
        });

        // Add to staff summaries
        summaries.push({
          staff: currentStaff,
          amClients,
          pmClients,
        });
      });

      setAssignments(assignments);
      setStaffSummaries(summaries);

      if (assignments.length === 0) {
        setSuccess(
          "No assignments found. Use the form below to assign clients to staff."
        );
      } else {
        setSuccess(
          `Found ${assignments.length} assignments across ${summaries.length} staff members.`
        );
      }
    } catch (error: any) {
      console.error("[DEBUG] Error in fetchAssignments:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch assignments. Please check your connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const assignClient = async () => {
    if (!selectedStaff || !selectedClient) {
      setError("Please select both staff and client");
      return;
    }

    try {
      // First find if the client is already assigned
      const existingAssignment = assignments.find(
        (a) => a.client._id === selectedClient
      );

      if (existingAssignment) {
        setError(
          `This client is already assigned to ${existingAssignment.staff.name}`
        );
        return;
      }

      await staff.assignClient(selectedStaff, selectedClient);

      await fetchAssignments(); // Refresh the assignments list
      setSelectedStaff("");
      setSelectedClient("");
      setSuccess("Client assigned successfully");
      setError("");
    } catch (error: any) {
      console.error("[DEBUG] Error assigning client:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to assign client"
      );
      setSuccess("");
    }
  };

  const handleRemoveAssignment = async (staffId: string, clientId: string) => {
    try {
      await staff.unassignClient(staffId, clientId);
      setSuccess("Assignment removed successfully");
      fetchAssignments();
    } catch (error) {
      setError("Failed to remove assignment");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Assignments Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={3}>
              {staffSummaries.map((summary) => (
                <Grid item xs={12} md={6} lg={4} key={summary.staff._id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {summary.staff.name}
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="subtitle2"
                          color="primary"
                          gutterBottom
                        >
                          AM Shift ({summary.amClients.length})
                        </Typography>
                        {summary.amClients.map((client) => (
                          <Box
                            key={client._id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            <Chip
                              label={client.name}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleRemoveAssignment(
                                  summary.staff._id,
                                  client._id
                                )
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>

                      <Box>
                        <Typography
                          variant="subtitle2"
                          color="secondary"
                          gutterBottom
                        >
                          PM Shift ({summary.pmClients.length})
                        </Typography>
                        {summary.pmClients.map((client) => (
                          <Box
                            key={client._id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            <Chip
                              label={client.name}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleRemoveAssignment(
                                  summary.staff._id,
                                  client._id
                                )
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>

                      <Box
                        sx={{
                          mt: 2,
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" color="textSecondary">
                          Total Clients:{" "}
                          {summary.amClients.length + summary.pmClients.length}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box sx={{ mb: 4, display: "flex", gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Select Staff</MenuItem>
                {staffList.map((s: any) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Select Client</MenuItem>
                {clientsList.map((client: any) => (
                  <MenuItem key={client._id} value={client._id}>
                    {client.name} ({client.timeShift} shift)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={assignClient}
              disabled={!selectedStaff || !selectedClient}
            >
              Assign
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((assignment: Assignment) => (
                  <TableRow
                    key={`${assignment.staff._id}-${assignment.client._id}`}
                  >
                    <TableCell>{assignment.staff.name}</TableCell>
                    <TableCell>{assignment.client.name}</TableCell>
                    <TableCell>{assignment.client.timeShift}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="error"
                        onClick={() =>
                          handleRemoveAssignment(
                            assignment.staff._id,
                            assignment.client._id
                          )
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default AssignmentsManagement;
