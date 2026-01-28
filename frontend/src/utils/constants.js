// Application Constants

export const APP_CONFIG = {
  NAME: 'Smart Traffic Management System',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-Powered Emergency Response Coordination Platform - MCA Final Year Project',
  AUTHOR: 'MCA Final Year Project Team',
  YEAR: '2024'
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile'
  },
  AMBULANCE: {
    EMERGENCY_START: '/ambulance/emergency/start',
    EMERGENCY_END: '/ambulance/emergency/end',
    UPDATE_LOCATION: '/ambulance/emergency/update-location',
    GET_HOSPITALS: '/ambulance/hospitals',
    GET_STATUS: '/ambulance/status',
    REQUEST_CLEARANCE: '/ambulance/signal/request-clearance'
  },
  POLICE: {
    ACTIVE_EMERGENCIES: '/police/emergencies/active',
    GET_SIGNALS: '/police/signals',
    CLEAR_SIGNAL: '/police/signals',
    REPORT_CONGESTION: '/police/congestion/report',
    DASHBOARD_STATS: '/police/dashboard/stats'
  },
  HOSPITAL: {
    INCOMING_EMERGENCIES: '/hospital/emergencies/incoming',
    ACKNOWLEDGE_EMERGENCY: '/hospital/emergencies',
    GET_PROFILE: '/hospital/profile',
    UPDATE_CAPACITY: '/hospital/capacity/update'
  },
  ADMIN: {
    GET_USERS: '/admin/users',
    CREATE_USER: '/admin/users',
    UPDATE_USER: '/admin/users',
    DELETE_USER: '/admin/users',
    SYSTEM_OVERVIEW: '/admin/analytics/overview'
  },
  AI: {
    OPTIMIZE_ROUTE: '/ai/optimize-route',
    PREDICT_CONGESTION: '/ai/predict-congestion',
    GET_RECOMMENDATIONS: '/ai/recommendations'
  },
  EMERGENCY: {
    GET_ACTIVE: '/emergency/active',
    GET_BY_ID: '/emergency',
    UPDATE_STATUS: '/emergency'
  }
};

// Role Types
export const ROLES = {
  AMBULANCE: 'ambulance',
  POLICE: 'police',
  HOSPITAL: 'hospital',
  ADMIN: 'admin'
};

export const ROLE_LABELS = {
  ambulance: '🚑 Ambulance Driver',
  police: '🚓 Traffic Police',
  hospital: '🏥 Hospital Staff',
  admin: '👑 Administrator'
};

export const ROLE_COLORS = {
  ambulance: '#f44336',
  police: '#1976d2',
  hospital: '#4caf50',
  admin: '#9c27b0'
};

// Emergency Status
export const EMERGENCY_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const EMERGENCY_STATUS_COLORS = {
  active: '#1976d2',
  completed: '#4caf50',
  cancelled: '#f44336'
};

// Congestion Levels
export const CONGESTION_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const CONGESTION_COLORS = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336'
};

// Traffic Signal Status
export const SIGNAL_STATUS = {
  NORMAL: 'normal',
  CLEARED: 'cleared',
  BLOCKED: 'blocked',
  PRIORITY: 'priority'
};

export const SIGNAL_STATUS_COLORS = {
  normal: '#757575',
  cleared: '#4caf50',
  blocked: '#f44336',
  priority: '#2196f3'
};

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const PRIORITY_COLORS = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#d32f2f'
};

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: { lat: 12.9716, lng: 77.5946 }, // Bangalore
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18
};

// Route Types
export const ROUTE_TYPES = {
  HIGHWAY: 'highway',
  CITY: 'city',
  BALANCED: 'balanced',
  EMERGENCY: 'emergency',
  ALTERNATIVE: 'alternative'
};

export const ROUTE_COLORS = {
  highway: '#1976d2',
  city: '#4caf50',
  balanced: '#ff9800',
  emergency: '#f44336',
  alternative: '#9c27b0'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  EMERGENCY: 'emergency',
  POLICE: 'police',
  SYSTEM: 'system',
  ALERT: 'alert',
  INFO: 'info'
};

// Time Constants
export const TIME_CONSTANTS = {
  ONE_MINUTE: 60000,
  FIVE_MINUTES: 300000,
  THIRTY_MINUTES: 1800000,
  ONE_HOUR: 3600000,
  ONE_DAY: 86400000
};

// AI Configuration
export const AI_CONFIG = {
  PREDICTION_CONFIDENCE_THRESHOLD: 0.7,
  OPTIMIZATION_SCORE_THRESHOLD: 70,
  ROUTE_CACHE_DURATION: 300000, // 5 minutes
  TRAFFIC_UPDATE_INTERVAL: 30000 // 30 seconds
};

// Socket Events
export const SOCKET_EVENTS = {
  // Emit Events
  EMERGENCY_START: 'emergency-start',
  EMERGENCY_END: 'emergency-end',
  LOCATION_UPDATE: 'location-update',
  SIGNAL_CLEARANCE: 'signal-clearance',
  CONGESTION_REPORT: 'congestion-report',
  NOTIFICATION: 'notification',
  
  // Listen Events
  EMERGENCY_STARTED: 'emergency-started',
  EMERGENCY_ENDED: 'emergency-ended',
  LOCATION_UPDATED: 'location-updated',
  SIGNAL_CLEARED: 'signal-cleared',
  CONGESTION_REPORTED: 'congestion-reported',
  NEW_NOTIFICATION: 'new-notification',
  POLICE_ALERT: 'police-alert',
  HOSPITAL_ALERT: 'hospital-alert',
  SYSTEM_ALERT: 'system-alert'
};

// Validation Constants
export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 100
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PHONE: {
    PATTERN: /^[\d\s\+\-\(\)]{10,15}$/
  },
  VEHICLE_NUMBER: {
    PATTERN: /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/
  }
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
  RECENT_SEARCHES: 'recent_searches'
};

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  SUCCESS: '#4caf50',
  WARNING: '#ff9800',
  ERROR: '#f44336',
  INFO: '#2196f3'
};

// Demo Credentials (For Testing/Viva)
export const DEMO_CREDENTIALS = [
  {
    role: 'ambulance',
    email: 'driver01@hospital.gov',
    password: 'driver123',
    description: 'Ambulance Driver - Can start emergencies and get AI routes'
  },
  {
    role: 'police',
    email: 'traffic@police.gov',
    password: 'police123',
    description: 'Traffic Police - Can clear signals and monitor emergencies'
  },
  {
    role: 'hospital',
    email: 'emergency@cityhospital.gov',
    password: 'hospital123',
    description: 'Hospital Staff - Receives alerts and tracks ambulances'
  },
  {
    role: 'admin',
    email: 'admin@traffic.gov',
    password: 'admin123',
    description: 'Administrator - Full system access and analytics'
  }
];

// Hospital Specialties
export const HOSPITAL_SPECIALTIES = [
  'Trauma Center',
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Burn Care',
  'General Surgery',
  'ICU',
  'Emergency Medicine',
  'Radiology'
];

// Traffic Signal Causes
export const CONGESTION_CAUSES = [
  'Accident',
  'Road Construction',
  'Public Event',
  'Bad Weather',
  'Vehicle Breakdown',
  'Road Closure',
  'Traffic Signal Failure',
  'Rally/Protest',
  'Festival Crowd',
  'Normal Traffic'
];

// Emergency Severity Levels
export const EMERGENCY_SEVERITY = [
  { level: 'low', label: 'Low - Stable Condition', color: '#4caf50' },
  { level: 'medium', label: 'Medium - Urgent Care Needed', color: '#ff9800' },
  { level: 'high', label: 'High - Critical Condition', color: '#f44336' }
];

// Performance Metrics
export const PERFORMANCE_METRICS = {
  RESPONSE_TIME_GOOD: 10, // minutes
  RESPONSE_TIME_AVERAGE: 15,
  RESPONSE_TIME_POOR: 20,
  CLEARANCE_RATE_GOOD: 90, // percentage
  CLEARANCE_RATE_AVERAGE: 80,
  CLEARANCE_RATE_POOR: 70
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_TIME: 'hh:mm A',
  DISPLAY_DATETIME: 'DD/MM/YYYY hh:mm A',
  API_DATE: 'YYYY-MM-DD',
  API_DATETIME: 'YYYY-MM-DDTHH:mm:ssZ'
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMIT_OPTIONS: [5, 10, 25, 50, 100]
};

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf', 'application/msword', 'text/plain']
};

// Chart Colors
export const CHART_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'
];

// Export this as default for easy import
export default {
  APP_CONFIG,
  API_ENDPOINTS,
  ROLES,
  EMERGENCY_STATUS,
  CONGESTION_LEVELS,
  SIGNAL_STATUS,
  PRIORITY_LEVELS,
  MAP_CONFIG,
  ROUTE_TYPES,
  NOTIFICATION_TYPES,
  TIME_CONSTANTS,
  AI_CONFIG,
  SOCKET_EVENTS,
  VALIDATION,
  STORAGE_KEYS,
  THEME_COLORS,
  DEMO_CREDENTIALS,
  HOSPITAL_SPECIALTIES,
  CONGESTION_CAUSES,
  EMERGENCY_SEVERITY,
  PERFORMANCE_METRICS,
  DATE_FORMATS,
  PAGINATION,
  UPLOAD_LIMITS,
  CHART_COLORS
};