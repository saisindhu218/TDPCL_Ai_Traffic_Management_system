import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Switch,
  Menu
} from '@mui/material';
import {
  Edit,
  Delete,
  PersonAdd,
  Search,
  FilterList,
  Refresh,
  Block,
  CheckCircle,
  Person,
  LocalHospital,
  Traffic,
  Emergency
} from '@mui/icons-material';
import api from '../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'ambulance',
    vehicleNumber: '',
    hospitalName: '',
    stationName: '',
    isActive: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.vehicleNumber && user.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.hospitalName && user.hospitalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.stationName && user.stationName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleAddUser = () => {
    setUserForm({
      username: '',
      email: '',
      password: '',
      role: 'ambulance',
      vehicleNumber: '',
      hospitalName: '',
      stationName: '',
      isActive: true
    });
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      vehicleNumber: user.vehicleNumber || '',
      hospitalName: user.hospitalName || '',
      stationName: user.stationName || '',
      isActive: user.isActive
    });
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setDeleteDialog(true);
  };

  const handleToggleStatus = async (user) => {
    try {
      await api.post(`/api/admin/users/${user._id}/${user.isActive ? 'deactivate' : 'activate'}`);
      loadUsers(); // Refresh the list
      alert(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleSaveUser = async () => {
    try {
      if (selectedUser) {
        // Update existing user
        await api.put(`/api/admin/users/${selectedUser._id}`, userForm);
        alert('User updated successfully');
      } else {
        // Create new user
        await api.post('/api/admin/users', userForm);
        alert('User created successfully');
      }
      
      setDialogOpen(false);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/api/admin/users/${selectedUser._id}`);
      alert('User deleted successfully');
      setDeleteDialog(false);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ambulance': return <Emergency color="error" />;
      case 'police': return <Traffic color="primary" />;
      case 'hospital': return <LocalHospital color="success" />;
      case 'admin': return <Person color="secondary" />;
      default: return <Person />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ambulance': return '#f44336';
      case 'police': return '#1976d2';
      case 'hospital': return '#4caf50';
      case 'admin': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ambulance': return 'Ambulance Driver';
      case 'police': return 'Traffic Police';
      case 'hospital': return 'Hospital Staff';
      case 'admin': return 'Administrator';
      default: return 'User';
    }
  };

  const getUserStats = () => {
    const stats = {
      total: users.length,
      ambulance: users.filter(u => u.role === 'ambulance').length,
      police: users.filter(u => u.role === 'police').length,
      hospital: users.filter(u => u.role === 'hospital').length,
      admin: users.filter(u => u.role === 'admin').length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length
    };
    return stats;
  };

  const stats = getUserStats();

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          👥 User Management
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadUsers} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h5">{stats.total}</Typography>
              <Typography variant="caption" color="textSecondary">Total Users</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h5" color="success.main">{stats.active}</Typography>
              <Typography variant="caption" color="textSecondary">Active</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Emergency color="error" sx={{ fontSize: 30, mb: 1 }} />
              <Typography variant="h5">{stats.ambulance}</Typography>
              <Typography variant="caption" color="textSecondary">Ambulance</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Traffic color="primary" sx={{ fontSize: 30, mb: 1 }} />
              <Typography variant="h5">{stats.police}</Typography>
              <Typography variant="caption" color="textSecondary">Police</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <LocalHospital color="success" sx={{ fontSize: 30, mb: 1 }} />
              <Typography variant="h5">{stats.hospital}</Typography>
              <Typography variant="caption" color="textSecondary">Hospital</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Person color="secondary" sx={{ fontSize: 30, mb: 1 }} />
              <Typography variant="h5">{stats.admin}</Typography>
              <Typography variant="caption" color="textSecondary">Admin</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Role</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Filter by Role"
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="ambulance">Ambulance</MenuItem>
                <MenuItem value="police">Police</MenuItem>
                <MenuItem value="hospital">Hospital</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Filter by Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Users Table */}
      {loading ? (
        <Box textAlign="center" py={4}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="textSecondary">
            Loading users...
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getRoleIcon(user.role)}
                        <Box sx={{ ml: 1.5 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {user.username}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {user._id.substring(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        size="small"
                        sx={{
                          color: getRoleColor(user.role),
                          borderColor: getRoleColor(user.role)
                        }}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {user.role === 'ambulance' && `🚑 ${user.vehicleNumber}`}
                        {user.role === 'police' && `🚓 ${user.stationName}`}
                        {user.role === 'hospital' && `🏥 ${user.hospitalName}`}
                        {user.role === 'admin' && `👑 Administrator`}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Created: {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Switch
                          checked={user.isActive}
                          onChange={() => handleToggleStatus(user)}
                          size="small"
                          color={user.isActive ? "success" : "default"}
                        />
                        <Chip
                          label={user.isActive ? "ACTIVE" : "INACTIVE"}
                          size="small"
                          color={user.isActive ? "success" : "default"}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Edit User">
                          <IconButton size="small" onClick={() => handleEditUser(user)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </>
      )}

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={userForm.username}
            onChange={(e) => setUserForm({...userForm, username: e.target.value})}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({...userForm, email: e.target.value})}
            margin="normal"
            required
          />
          
          {!selectedUser && (
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({...userForm, password: e.target.value})}
              margin="normal"
              required
              helperText="Minimum 6 characters"
            />
          )}
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={userForm.role}
              onChange={(e) => setUserForm({...userForm, role: e.target.value})}
              label="Role"
            >
              <MenuItem value="ambulance">Ambulance Driver</MenuItem>
              <MenuItem value="police">Traffic Police</MenuItem>
              <MenuItem value="hospital">Hospital Staff</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
          
          {userForm.role === 'ambulance' && (
            <TextField
              fullWidth
              label="Vehicle Number"
              value={userForm.vehicleNumber}
              onChange={(e) => setUserForm({...userForm, vehicleNumber: e.target.value})}
              margin="normal"
              required
              placeholder="e.g., KA01AB1234"
            />
          )}
          
          {userForm.role === 'police' && (
            <TextField
              fullWidth
              label="Station Name"
              value={userForm.stationName}
              onChange={(e) => setUserForm({...userForm, stationName: e.target.value})}
              margin="normal"
              required
              placeholder="e.g., Central Traffic Control"
            />
          )}
          
          {userForm.role === 'hospital' && (
            <TextField
              fullWidth
              label="Hospital Name"
              value={userForm.hospitalName}
              onChange={(e) => setUserForm({...userForm, hospitalName: e.target.value})}
              margin="normal"
              required
              placeholder="e.g., City General Hospital"
            />
          )}
          
          <Box display="flex" alignItems="center" mt={2}>
            <Switch
              checked={userForm.isActive}
              onChange={(e) => setUserForm({...userForm, isActive: e.target.checked})}
              color="primary"
            />
            <Typography variant="body2">
              {userForm.isActive ? 'User is Active' : 'User is Inactive'}
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveUser}
            disabled={!userForm.username || !userForm.email || (!selectedUser && !userForm.password)}
          >
            {selectedUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to delete user "{selectedUser?.username}"?
          </Alert>
          <Typography variant="body2">
            This action cannot be undone. All data associated with this user will be removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserManagement;