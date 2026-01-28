// Form validation utilities
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validatePhone = (phone) => {
  const re = /^[\d\s\+\-\(\)]{10,15}$/;
  return re.test(phone);
};

export const validateVehicleNumber = (vehicleNumber) => {
  const re = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
  return re.test(vehicleNumber);
};

export const validateCoordinates = (lat, lng) => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

export const validateEmergencyId = (id) => {
  const re = /^EMG[A-Z0-9]+$/;
  return re.test(id);
};

export const validateSignalId = (id) => {
  const re = /^TS\d{3}$/;
  return re.test(id);
};

// Form field validators
export const formValidators = {
  required: (value) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value) => {
    if (value && !validateEmail(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  password: (value) => {
    if (value && value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  },

  confirmPassword: (password, confirmPassword) => {
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  },

  phone: (value) => {
    if (value && !validatePhone(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  vehicleNumber: (value) => {
    if (value && !validateVehicleNumber(value)) {
      return 'Please enter a valid vehicle number (e.g., KA01AB1234)';
    }
    return null;
  },

  numeric: (value) => {
    if (value && isNaN(value)) {
      return 'Please enter a valid number';
    }
    return null;
  },

  minValue: (value, min) => {
    if (value !== null && value !== undefined && parseFloat(value) < min) {
      return `Value must be at least ${min}`;
    }
    return null;
  },

  maxValue: (value, max) => {
    if (value !== null && value !== undefined && parseFloat(value) > max) {
      return `Value must be at most ${max}`;
    }
    return null;
  },

  minLength: (value, min) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value, max) => {
    if (value && value.length > max) {
      return `Must be at most ${max} characters`;
    }
    return null;
  },

  url: (value) => {
    if (value && !validateURL(value)) {
      return 'Please enter a valid URL';
    }
    return null;
  },

  latitude: (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < -90 || num > 90) {
      return 'Latitude must be between -90 and 90';
    }
    return null;
  },

  longitude: (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < -180 || num > 180) {
      return 'Longitude must be between -180 and 180';
    }
    return null;
  },

  date: (value) => {
    if (value && isNaN(Date.parse(value))) {
      return 'Please enter a valid date';
    }
    return null;
  },

  time: (value) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (value && !timeRegex.test(value)) {
      return 'Please enter a valid time (HH:MM)';
    }
    return null;
  }
};

// Validate complete form
export const validateForm = (formData, rules) => {
  const errors = {};
  let isValid = true;

  Object.keys(rules).forEach(field => {
    const value = formData[field];
    const fieldRules = rules[field];

    fieldRules.forEach(rule => {
      let error = null;

      if (typeof rule === 'function') {
        error = rule(value, formData);
      } else if (rule.validator) {
        error = rule.validator(value, formData, rule.params);
      }

      if (error) {
        errors[field] = error;
        isValid = false;
      }
    });
  });

  return { isValid, errors };
};

// Emergency form validation rules
export const emergencyValidationRules = {
  hospitalId: [
    formValidators.required
  ],
  patientCondition: [
    formValidators.required,
    (value) => value && value.length < 3 ? 'Please describe the condition' : null
  ],
  severity: [
    formValidators.required
  ]
};

// User registration validation rules
export const registrationValidationRules = {
  username: [
    formValidators.required,
    formValidators.minLength(3),
    formValidators.maxLength(30)
  ],
  email: [
    formValidators.required,
    formValidators.email
  ],
  password: [
    formValidators.required,
    formValidators.password
  ],
  role: [
    formValidators.required
  ],
  vehicleNumber: [
    (value, formData) => {
      if (formData.role === 'ambulance') {
        return formValidators.required(value) || formValidators.vehicleNumber(value);
      }
      return null;
    }
  ],
  hospitalName: [
    (value, formData) => {
      if (formData.role === 'hospital') {
        return formValidators.required(value);
      }
      return null;
    }
  ],
  stationName: [
    (value, formData) => {
      if (formData.role === 'police') {
        return formValidators.required(value);
      }
      return null;
    }
  ]
};

// Login validation rules
export const loginValidationRules = {
  email: [
    formValidators.required,
    formValidators.email
  ],
  password: [
    formValidators.required
  ]
};

// Congestion report validation rules
export const congestionValidationRules = {
  signalId: [
    formValidators.required,
    formValidators.signalId
  ],
  level: [
    formValidators.required
  ],
  description: [
    formValidators.minLength(10),
    formValidators.maxLength(500)
  ],
  imageUrl: [
    formValidators.url
  ]
};

// Route optimization validation rules
export const routeValidationRules = {
  startLat: [
    formValidators.required,
    formValidators.latitude
  ],
  startLng: [
    formValidators.required,
    formValidators.longitude
  ],
  endLat: [
    formValidators.required,
    formValidators.latitude
  ],
  endLng: [
    formValidators.required,
    formValidators.longitude
  ]
};

// Hospital capacity validation rules
export const capacityValidationRules = {
  bedsAvailable: [
    formValidators.required,
    formValidators.numeric,
    formValidators.minValue(0)
  ],
  icuBeds: [
    formValidators.required,
    formValidators.numeric,
    (value, formData) => {
      if (value > formData.bedsAvailable) {
        return 'ICU beds cannot exceed total beds';
      }
      return null;
    },
    formValidators.minValue(0)
  ]
};

// Sanitize input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>"'&]/g, '')
    .trim();
};

// Sanitize object
export const sanitizeObject = (obj) => {
  const sanitized = {};
  
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  });
  
  return sanitized;
};

// Validate and sanitize form data
export const processFormData = (formData, rules) => {
  // First sanitize
  const sanitizedData = sanitizeObject(formData);
  
  // Then validate
  const { isValid, errors } = validateForm(sanitizedData, rules);
  
  return {
    data: sanitizedData,
    isValid,
    errors
  };
};

// Validate coordinates array
export const validateCoordinatesArray = (coordinates) => {
  if (!Array.isArray(coordinates)) {
    return 'Coordinates must be an array';
  }

  for (const coord of coordinates) {
    if (!coord || typeof coord !== 'object') {
      return 'Each coordinate must be an object';
    }
    
    const latError = formValidators.latitude(coord.lat);
    const lngError = formValidators.longitude(coord.lng);
    
    if (latError || lngError) {
      return latError || lngError;
    }
  }

  return null;
};

// Validate emergency data
export const validateEmergencyData = (data) => {
  const rules = {
    ambulanceId: [formValidators.required],
    hospitalId: [formValidators.required],
    patientInfo: [
      (value) => {
        if (!value || typeof value !== 'object') {
          return 'Patient info is required';
        }
        return null;
      }
    ],
    startLocation: [
      (value) => {
        if (!value || !value.lat || !value.lng) {
          return 'Start location is required';
        }
        return validateCoordinatesArray([value]);
      }
    ],
    destination: [
      (value) => {
        if (!value || !value.lat || !value.lng) {
          return 'Destination is required';
        }
        return validateCoordinatesArray([value]);
      }
    ]
  };

  return validateForm(data, rules);
};

// Validate signal data
export const validateSignalData = (data) => {
  const rules = {
    signalId: [
      formValidators.required,
      formValidators.signalId
    ],
    location: [
      (value) => {
        if (!value || !value.lat || !value.lng) {
          return 'Location is required';
        }
        return validateCoordinatesArray([value]);
      }
    ],
    address: [
      formValidators.required,
      formValidators.minLength(10)
    ]
  };

  return validateForm(data, rules);
};

// Validate user update data
export const validateUserUpdateData = (data) => {
  const rules = {
    username: [
      formValidators.minLength(3),
      formValidators.maxLength(30)
    ],
    email: [
      formValidators.email
    ],
    isActive: [
      (value) => {
        if (value !== undefined && typeof value !== 'boolean') {
          return 'isActive must be a boolean';
        }
        return null;
      }
    ]
  };

  // Only validate fields that are present
  const filteredRules = {};
  Object.keys(rules).forEach(key => {
    if (data[key] !== undefined) {
      filteredRules[key] = rules[key];
    }
  });

  return validateForm(data, filteredRules);
};

// Validate search filters
export const validateSearchFilters = (filters) => {
  const errors = {};

  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    
    if (end < start) {
      errors.dateRange = 'End date must be after start date';
    }
  }

  if (filters.page && (isNaN(filters.page) || filters.page < 1)) {
    errors.page = 'Page must be a positive number';
  }

  if (filters.limit && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    errors.limit = 'Limit must be between 1 and 100';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Debounce validation for real-time forms
export const debounceValidator = (validator, delay = 500) => {
  let timeout;
  
  return (...args) => {
    return new Promise((resolve) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        resolve(validator(...args));
      }, delay);
    });
  };
};

// Async validation for checking unique fields
export const asyncValidators = {
  checkUsernameUnique: async (username) => {
    try {
      // This would make an API call in real implementation
      return null; // Assume unique for now
    } catch (error) {
      return 'Error checking username availability';
    }
  },

  checkEmailUnique: async (email) => {
    try {
      // This would make an API call in real implementation
      return null; // Assume unique for now
    } catch (error) {
      return 'Error checking email availability';
    }
  },

  checkSignalIdUnique: async (signalId) => {
    try {
      // This would make an API call in real implementation
      return null; // Assume unique for now
    } catch (error) {
      return 'Error checking signal ID availability';
    }
  }
};

// Field validation decorator for forms
export const withValidation = (Component, validationRules) => {
  return function ValidatedComponent(props) {
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateField = (field, value, formData) => {
      const fieldRules = validationRules[field];
      if (!fieldRules) return null;

      for (const rule of fieldRules) {
        const error = typeof rule === 'function' 
          ? rule(value, formData)
          : rule.validator(value, formData, rule.params);
        
        if (error) return error;
      }

      return null;
    };

    const handleBlur = (field) => {
      setTouched(prev => ({ ...prev, [field]: true }));
    };

    const validateForm = (formData) => {
      const newErrors = {};
      let isValid = true;

      Object.keys(validationRules).forEach(field => {
        const error = validateField(field, formData[field], formData);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return { isValid, errors: newErrors };
    };

    return (
      <Component
        {...props}
        errors={errors}
        touched={touched}
        onBlur={handleBlur}
        validateForm={validateForm}
        validateField={validateField}
      />
    );
  };
};

// Export all validators
export default {
  validateEmail,
  validatePassword,
  validatePhone,
  validateVehicleNumber,
  validateCoordinates,
  validateURL,
  validateEmergencyId,
  validateSignalId,
  formValidators,
  validateForm,
  emergencyValidationRules,
  registrationValidationRules,
  loginValidationRules,
  congestionValidationRules,
  routeValidationRules,
  capacityValidationRules,
  sanitizeInput,
  sanitizeObject,
  processFormData,
  validateCoordinatesArray,
  validateEmergencyData,
  validateSignalData,
  validateUserUpdateData,
  validateSearchFilters,
  debounceValidator,
  asyncValidators,
  withValidation
};