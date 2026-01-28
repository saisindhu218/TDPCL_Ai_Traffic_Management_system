// Formatter Utilities for consistent data formatting

/**
 * Format date to display string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'display') => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  switch (format) {
    case 'date':
      return d.toLocaleDateString();
    
    case 'time':
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    case 'datetime':
      return d.toLocaleString();
    
    case 'relative':
      return getRelativeTime(d);
    
    case 'iso':
      return d.toISOString();
    
    case 'display':
    default:
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

/**
 * Get relative time string (e.g., "5 minutes ago")
 * @param {Date} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  return 'just now';
};

/**
 * Format distance in kilometers
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (distance === undefined || distance === null) return 'N/A';
  
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  }
  
  return `${distance.toFixed(1)} km`;
};

/**
 * Format time duration in minutes
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
export const formatTime = (minutes) => {
  if (minutes === undefined || minutes === null) return 'N/A';
  
  if (minutes < 1) {
    return '< 1 min';
  }
  
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${mins}m`;
};

/**
 * Format ETA with arrival time
 * @param {number} minutes - Minutes until arrival
 * @returns {object} ETA object with formatted strings
 */
export const formatETA = (minutes) => {
  if (!minutes || minutes <= 0) {
    return {
      minutes: 0,
      text: 'Arriving now',
      arrivalTime: new Date(),
      arrivalText: 'Now'
    };
  }
  
  const arrivalTime = new Date(Date.now() + minutes * 60000);
  
  return {
    minutes: Math.round(minutes),
    text: `${Math.round(minutes)} min`,
    arrivalTime,
    arrivalText: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
};

/**
 * Format percentage
 * @param {number} value - Percentage value (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 0) => {
  if (value === undefined || value === null) return 'N/A';
  
  const formatted = value.toFixed(decimals);
  return `${formatted}%`;
};

/**
 * Format large numbers with commas
 * @param {number} number - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (number) => {
  if (number === undefined || number === null) return 'N/A';
  
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
};

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format phone number
 * @param {string} phone - Phone number string
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 10) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
  }
  
  // Return original if format doesn't match
  return phone;
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: INR)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === undefined || amount === null) return 'N/A';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format emergency ID for display
 * @param {string} id - Emergency ID
 * @returns {string} Formatted emergency ID
 */
export const formatEmergencyId = (id) => {
  if (!id) return 'N/A';
  
  if (id.startsWith('EMG')) {
    return id;
  }
  
  // Extract last 8 characters for display
  const displayId = id.substring(id.length - 8).toUpperCase();
  return `EMG${displayId}`;
};

/**
 * Format vehicle number for display
 * @param {string} vehicleNumber - Vehicle number
 * @returns {string} Formatted vehicle number
 */
export const formatVehicleNumber = (vehicleNumber) => {
  if (!vehicleNumber) return 'N/A';
  
  // Add spaces for readability: KA01AB1234 -> KA 01 AB 1234
  return vehicleNumber
    .replace(/([A-Z]{2})(\d{2})([A-Z]{1,2})(\d{4})/, '$1 $2 $3 $4')
    .toUpperCase();
};

/**
 * Format coordinates for display
 * @param {object} coords - Coordinates object with lat and lng
 * @returns {string} Formatted coordinates string
 */
export const formatCoordinates = (coords) => {
  if (!coords || !coords.lat || !coords.lng) return 'N/A';
  
  return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
};

/**
 * Format AI confidence score
 * @param {number} score - Confidence score (0-100)
 * @returns {object} Formatted score with color and label
 */
export const formatConfidenceScore = (score) => {
  let color = '#f44336'; // Red
  let label = 'Low';
  
  if (score >= 80) {
    color = '#4caf50'; // Green
    label = 'High';
  } else if (score >= 60) {
    color = '#ff9800'; // Orange
    label = 'Medium';
  }
  
  return {
    score,
    color,
    label,
    formatted: `${score}%`
  };
};

/**
 * Format congestion level with color
 * @param {string} level - Congestion level (low/medium/high)
 * @returns {object} Formatted level with color and icon
 */
export const formatCongestionLevel = (level) => {
  const levels = {
    low: {
      color: '#4caf50',
      label: 'Low',
      icon: '✅'
    },
    medium: {
      color: '#ff9800',
      label: 'Medium',
      icon: '⚠️'
    },
    high: {
      color: '#f44336',
      label: 'High',
      icon: '🚨'
    }
  };
  
  return levels[level?.toLowerCase()] || levels.medium;
};

/**
 * Format emergency severity
 * @param {string} severity - Severity level (low/medium/high)
 * @returns {object} Formatted severity with color and icon
 */
export const formatEmergencySeverity = (severity) => {
  const severities = {
    low: {
      color: '#4caf50',
      label: 'Low - Stable',
      icon: '🟢'
    },
    medium: {
      color: '#ff9800',
      label: 'Medium - Urgent',
      icon: '🟡'
    },
    high: {
      color: '#f44336',
      label: 'High - Critical',
      icon: '🔴'
    }
  };
  
  return severities[severity?.toLowerCase()] || severities.medium;
};

/**
 * Format response time for display
 * @param {number} minutes - Response time in minutes
 * @returns {object} Formatted response time with color rating
 */
export const formatResponseTime = (minutes) => {
  let color = '#f44336'; // Red
  let rating = 'Poor';
  
  if (minutes <= 10) {
    color = '#4caf50'; // Green
    rating = 'Excellent';
  } else if (minutes <= 15) {
    color = '#8bc34a'; // Light Green
    rating = 'Good';
  } else if (minutes <= 20) {
    color = '#ff9800'; // Orange
    rating = 'Average';
  }
  
  return {
    minutes,
    formatted: `${minutes} min`,
    color,
    rating
  };
};

/**
 * Format signal status for display
 * @param {string} status - Signal status
 * @returns {object} Formatted status with color and icon
 */
export const formatSignalStatus = (status) => {
  const statuses = {
    normal: {
      color: '#757575',
      label: 'Normal',
      icon: '⚪'
    },
    cleared: {
      color: '#4caf50',
      label: 'Cleared',
      icon: '✅'
    },
    blocked: {
      color: '#f44336',
      label: 'Blocked',
      icon: '⛔'
    },
    priority: {
      color: '#2196f3',
      label: 'Priority',
      icon: '🚨'
    }
  };
  
  return statuses[status?.toLowerCase()] || statuses.normal;
};

/**
 * Format user role for display
 * @param {string} role - User role
 * @returns {object} Formatted role with color and icon
 */
export const formatUserRole = (role) => {
  const roles = {
    ambulance: {
      color: '#f44336',
      label: 'Ambulance Driver',
      icon: '🚑'
    },
    police: {
      color: '#1976d2',
      label: 'Traffic Police',
      icon: '🚓'
    },
    hospital: {
      color: '#4caf50',
      label: 'Hospital Staff',
      icon: '🏥'
    },
    admin: {
      color: '#9c27b0',
      label: 'Administrator',
      icon: '👑'
    }
  };
  
  return roles[role?.toLowerCase()] || { color: '#757575', label: 'User', icon: '👤' };
};

/**
 * Sanitize input string (prevent XSS)
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (str) => {
  if (!str) return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate a readable ID from string
 * @param {string} str - Input string
 * @returns {string} Readable ID
 */
export const generateReadableId = (str) => {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Format array to comma-separated string
 * @param {array} array - Array to format
 * @param {string} separator - Separator (default: ', ')
 * @returns {string} Comma-separated string
 */
export const arrayToString = (array, separator = ', ') => {
  if (!array || !Array.isArray(array)) return '';
  
  return array.filter(item => item).join(separator);
};

/**
 * Format object to key-value string
 * @param {object} obj - Object to format
 * @returns {string} Key-value string
 */
export const objectToString = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  
  return Object.entries(obj)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
};

/**
 * Format duration between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} Formatted duration
 */
export const formatDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Date';
  
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  
  return formatTime(diffMins);
};

/**
 * Format speed for display
 * @param {number} kmh - Speed in km/h
 * @returns {string} Formatted speed string
 */
export const formatSpeed = (kmh) => {
  if (kmh === undefined || kmh === null) return 'N/A';
  
  return `${Math.round(kmh)} km/h`;
};

/**
 * Format boolean for display
 * @param {boolean} value - Boolean value
 * @param {object} options - Display options
 * @returns {string} Formatted boolean string
 */
export const formatBoolean = (value, options = {}) => {
  const {
    trueText = 'Yes',
    falseText = 'No',
    trueColor = '#4caf50',
    falseColor = '#f44336'
  } = options;
  
  return {
    value,
    text: value ? trueText : falseText,
    color: value ? trueColor : falseColor
  };
};

/**
 * Format error message for display
 * @param {Error|string} error - Error object or string
 * @returns {string} User-friendly error message
 */
export const formatErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An error occurred. Please try again.';
};

/**
 * Format validation errors for display
 * @param {array} errors - Validation errors array
 * @returns {string} Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (!errors || !Array.isArray(errors)) return '';
  
  return errors
    .map(error => `${error.field}: ${error.message}`)
    .join(', ');
};

// Export all formatters as default object
export default {
  formatDate,
  getRelativeTime,
  formatDistance,
  formatTime,
  formatETA,
  formatPercentage,
  formatNumber,
  formatFileSize,
  truncateText,
  capitalizeWords,
  formatPhone,
  formatCurrency,
  formatEmergencyId,
  formatVehicleNumber,
  formatCoordinates,
  formatConfidenceScore,
  formatCongestionLevel,
  formatEmergencySeverity,
  formatResponseTime,
  formatSignalStatus,
  formatUserRole,
  sanitizeInput,
  generateReadableId,
  arrayToString,
  objectToString,
  formatDuration,
  formatSpeed,
  formatBoolean,
  formatErrorMessage,
  formatValidationErrors
};