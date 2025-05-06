import React, { useState, useEffect } from 'react';
import {
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Paper,
  Typography,
  Box
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { clients } from '../../services/api';
import { Client } from '../../types';
import { SelectChangeEvent } from '@mui/material';

interface FormData {
  name: string;
  number: string;
  location: string;
  timeShift: 'AM' | 'PM';
  pricePerLitre: number;
  quantity: number;
  priorityStatus: boolean;
}

const initialFormData: FormData = {
  name: '',
  number: '',
  location: '',
  timeShift: 'AM',
  pricePerLitre: 0,
  quantity: 0,
  priorityStatus: false
};

const ClientManagement: React.FC = () => {
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clients.getAll();
      setClientsList(response.data);
    } catch (error) {
      setError('Failed to fetch clients');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      priorityStatus: event.target.checked
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingId) {
        await clients.update(editingId, formData);
      } else {
        await clients.add(formData);
      }
      fetchClients();
      setFormData(initialFormData);
      setEditingId(null);
    } catch (error) {
      setError('Failed to save client');
    }
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      number: client.number,
      location: client.location,
      timeShift: client.timeShift,
      pricePerLitre: client.pricePerLitre,
      quantity: client.quantity,
      priorityStatus: client.priorityStatus
    });
    setEditingId(client._id);
  };

  const handleDelete = async (id: string) => {
    try {
      await clients.delete(id);
      fetchClients();
    } catch (error) {
      setError('Failed to delete client');
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'number', headerName: 'Number', flex: 1 },
    { field: 'location', headerName: 'Location', flex: 1 },
    { field: 'timeShift', headerName: 'Time Shift', flex: 1 },
    { field: 'pricePerLitre', headerName: 'Price/Litre', flex: 1 },
    { field: 'quantity', headerName: 'Quantity', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Button onClick={() => handleEdit(params.row)}>Edit</Button>
          <Button onClick={() => handleDelete(params.row._id)} color="error">
            Delete
          </Button>
        </Box>
      )
    }
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Client Management
        </Typography>
      </Grid>

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
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Number"
                  name="number"
                  value={formData.number}
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
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Time Shift</InputLabel>
                  <Select
                    name="timeShift"
                    value={formData.timeShift}
                    onChange={handleSelectChange}
                    label="Time Shift"
                  >
                    <MenuItem value="AM">AM</MenuItem>
                    <MenuItem value="PM">PM</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Price per Litre"
                  name="pricePerLitre"
                  value={formData.pricePerLitre}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.priorityStatus}
                      onChange={handleSwitchChange}
                      name="priorityStatus"
                    />
                  }
                  label="Priority Status"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                >
                  {editingId ? 'Update Client' : 'Add Client'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ height: 400 }}>
          <DataGrid
            rows={clientsList}
            columns={columns}
            getRowId={(row) => row._id}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
          />
        </Paper>
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Typography color="error">{error}</Typography>
        </Grid>
      )}
    </Grid>
  );
};

export default ClientManagement;