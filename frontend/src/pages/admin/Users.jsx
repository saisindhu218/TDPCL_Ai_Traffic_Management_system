import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  InputAdornment,
  Menu
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Search,
  FilterList,
  MoreVert,
  PersonAdd,
  PersonRemove,
  Lock,
  LockOpen,
  Email,
  Phone,
  Badge
} from '@mui/icons-material';
import api from '../../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
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

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, roleFilter, statusFilter]);

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

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.vehicleNumber && user.vehicleNumber.toLowerCase().includes(term)) ||
        (user.hospitalName && user.hospitalName.toLowerCase().includes(term)) ||
        (user.stationName && user.stationName.toLowerCase().includes(term))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const active = statusFilter === 'active';
      filtered = filtered.filter(user => user.isActive === active);
    }

    setFilteredUsers(filtered);
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
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
    } else {
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
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
  };

  const handleSaveUser = async () => {
    try {
      if (selectedUser) {
        // Update existing user
        await api.put(`/api/admin/users/${selectedUser._id}`, userForm);
      } else {
        // Create new user
        await api.post('/api/admin/users', userForm);
      }
      
      loadUsers();
      handleCloseDialog();
      alert(`User ${selectedUser ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await api.delete(`/api/admin/users/${selectedUser._id}`);
      loadUsers();
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const action = user.isActive ? 'deactivate' : 'activate';
      await api.post(`/api/admin/users/${user._id}/${action}`);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u._id === user._id ? { ...u, isActive: !u.isActive } : u
      ));
      
      alert(`User ${action}d successfully`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#9c27b0';
      case 'ambulance': return '#f44336';
      case 'police': return '#1976d2';
      case 'hospital': return '#4caf50';
      default: return '#757575';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'ambulance': return '🚑';
      case 'police': return '🚓';
      case 'hospital': return '🏥';
      default: return '👤';
    }
  };

  const getRoleSpecificField = () => {
    switch (userForm.role) {
      case 'ambulance':
        return (
          <TextField
            fullWidth
            label="Vehicle Number"
            value={userForm.vehicleNumber}
            onChange={(e) => setUserForm({...userForm, vehicleNumber: e.target.value})}
            margin="normal"
            required
            placeholder="KA01AB1234"
          />
        );
      case 'hospital':
        return (
          <TextField
            fullWidth
            label="Hospital Name"
            value={userForm.hospitalName}
            onChange={(e) => setUserForm({...userForm, hospitalName: e.target.value})}
            margin="normal"
            required
            placeholder="City General Hospital"
          />
        );
      case 'police':
        return (
          <TextField
            fullWidth
            label="Station Name"
            value={userForm.stationName}
            onChange={(e) => setUserForm({...userForm, stationName: e.target.value})}
            margin="normal"
            required
            placeholder="Central Traffic Control"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          👥 User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add New User
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {users.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {users.filter(u => u.isActive).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" style={{ color: '#f44336' }}>
                {users.filter(u => u.role === 'ambulance').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Ambulance Drivers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" style={{ color: '#1976d2' }}>
                {users.filter(u => u.role === 'police').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Police Officers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search Users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
              placeholder="Search by name, email, or ID..."
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Role"
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="ambulance">Ambulance</MenuItem>
                <MenuItem value="police">Police</MenuItem>
                <MenuItem value="hospital">Hospital</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" gap={1}>
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
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Refresh />}
                onClick={loadUsers}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box textAlign="center" py={4}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="textSecondary">
              Loading users...
            </Typography>
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Alert severity="info">
            <Typography variant="body2">
              No users found matching your criteria.
            </Typography>
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.username}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ID: {user._id.substring(0, 8)}...
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role.toUpperCase()}
                        size="small"
                        sx={{ 
                          bgcolor: getRoleColor(user.role),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                        icon={<span>{getRoleIcon(user.role)}</span>}
                      />
                      {user.role === 'ambulance' && user.vehicleNumber && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          🚗 {user.vehicleNumber}
                        </Typography>
                      )}
                      {user.role === 'hospital' && user.hospitalName && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          🏥 {user.hospitalName}
                        </Typography>
                      )}
                      {user.role === 'police' && user.stationName && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          🚓 {user.stationName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" display="flex" alignItems="center" gap={0.5}>
                          <Email fontSize="small" />
                          {user.email}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={user.isActive ? 'ACTIVE' : 'INACTIVE'}
                          size="small"
                          color={user.isActive ? 'success' : 'error'}
                          variant="outlined"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={user.isActive}
                              onChange={() => handleToggleStatus(user)}
                              size="small"
                            />
                          }
                          label=""
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(user.createdAt).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" justifyContent="flex-end" gap={1}>
                        <Tooltip title="Edit User">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="More Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, user)}
                          >
                            <MoreVert />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination would go here */}
        {filteredUsers.length > 0 && (
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 3, p: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Showing {filteredUsers.length} of {users.length} users
            </Typography>
            <Box display="flex" gap={1}>
              <Button size="small" disabled>Previous</Button>
              <Button size="small" variant="contained">1</Button>
              <Button size="small">2</Button>
              <Button size="small">3</Button>
              <Button size="small">Next</Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* User Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleOpenDialog(selectedUser);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 2 }} />
          Edit User
        </MenuItem>
        <MenuItem onClick={() => {
          handleToggleStatus(selectedUser);
          handleMenuClose();
        }}>
          {selectedUser?.isActive ? (
            <>
              <PersonRemove sx={{ mr: 2 }} />
              Deactivate User
            </>
          ) : (
            <>
              <PersonAdd sx={{ mr: 2 }} />
              Activate User
            </>
          )}
        </MenuItem>
        <MenuItem onClick={() => {
          setDeleteDialogOpen(true);
          handleMenuClose();
        }}>
          <Delete sx={{ mr: 2, color: '#f44336' }} />
          <Typography color="error">Delete User</Typography>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Badge sx={{ mr: 2 }} />
          View Details
        </MenuItem>
      </Menu>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Create user accounts for ambulance drivers, police officers, hospital staff, or administrators.
          </Alert>

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
            label="Email Address"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({...userForm, email: e.target.value})}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({...userForm, password: e.target.value})}
            margin="normal"
            required={!selectedUser}
            placeholder={selectedUser ? "Leave empty to keep current" : ""}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Role *</InputLabel>
            <Select
              value={userForm.role}
              onChange={(e) => setUserForm({...userForm, role: e.target.value})}
              label="Role *"
            >
              <MenuItem value="ambulance">Ambulance Driver</MenuItem>
              <MenuItem value="police">Traffic Police</MenuItem>
              <MenuItem value="hospital">Hospital Staff</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>

          {getRoleSpecificField()}

          <FormControlLabel
            control={
              <Switch
                checked={userForm.isActive}
                onChange={(e) => setUserForm({...userForm, isActive: e.target.checked})}
              />
            }
            label="Active Account"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
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
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to delete this user? This action cannot be undone.
          </Alert>
          {selectedUser && (
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {selectedUser.username}
              </Typography>
              <Typography variant="caption" display="block">
                {selectedUser.email} • {selectedUser.role}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteUser}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Users;