import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Divider,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { clients } from '../../services/api';
import { Client, DeliveryRecord } from '../../types';

const ClientView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [deliveryStatus, setDeliveryStatus] = useState<'Delivered' | 'Not Delivered'>('Delivered');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      if (!id) return;
      const response = await clients.getAll(); // This would be getById in a real implementation
      const clientData = response.data.find((c: Client) => c._id === id);
      if (clientData) {
        setClient(clientData);
        setQuantity(clientData.quantity);
      }
    } catch (error) {
      setError('Error fetching client data');
    }
  };

  const handleDeliveryUpdate = async () => {
    try {
      if (!id || !client) return;

      const updateData = {
        deliveryStatus,
        quantity,
        reason: deliveryStatus === 'Not Delivered' ? reason : undefined,
        deliveryHistory: [
          ...client.deliveryHistory,
          {
            date: new Date(),
            status: deliveryStatus,
            quantity,
            reason: deliveryStatus === 'Not Delivered' ? reason : undefined
          }
        ]
      };

      await clients.update(id, updateData);
      setSuccess('Delivery status updated successfully');
      fetchClientData();
    } catch (error) {
      setError('Error updating delivery status');
    }
  };

  if (!client) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Client Details
        </Typography>
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      {success && (
        <Grid item xs={12}>
          <Alert severity="success">{success}</Alert>
        </Grid>
      )}

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">Name</Typography>
              <Typography>{client.name}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">Contact Number</Typography>
              <Typography>{client.number}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">Location</Typography>
              <Typography>{client.location}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">Time Shift</Typography>
              <Typography>{client.timeShift}</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Delivery Update
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity (Litres)"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Delivery Status</InputLabel>
                  <Select
                    value={deliveryStatus}
                    onChange={(e) => setDeliveryStatus(e.target.value as 'Delivered' | 'Not Delivered')}
                    label="Delivery Status"
                  >
                    <MenuItem value="Delivered">Delivered</MenuItem>
                    <MenuItem value="Not Delivered">Not Delivered</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {deliveryStatus === 'Not Delivered' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    multiline
                    rows={2}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleDeliveryUpdate}
                >
                  Update Delivery
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Delivery History
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {client.deliveryHistory.map((record: DeliveryRecord, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>{record.status}</TableCell>
                      <TableCell align="right">{record.quantity}L</TableCell>
                      <TableCell>{record.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ClientView;