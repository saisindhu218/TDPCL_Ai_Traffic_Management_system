const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class Helpers {
    // JWT Token generation
    static generateToken(userId, role) {
        return jwt.sign(
            { userId, role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    // Password handling
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }

    static async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    // Random string generation
    static generateRandomString(length = 10) {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    static generateEmergencyId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 4);
        return `EMG${timestamp}${random}`.toUpperCase();
    }

    static generateSignalId() {
        const random = Math.floor(Math.random() * 900) + 100; // 100-999
        return `TS${random}`;
    }

    // Date formatting
    static formatDate(date, format = 'iso') {
        const d = new Date(date);
        
        switch (format) {
            case 'iso':
                return d.toISOString();
            case 'date':
                return d.toLocaleDateString();
            case 'time':
                return d.toLocaleTimeString();
            case 'datetime':
                return d.toLocaleString();
            case 'relative':
                return this.getRelativeTime(d);
            default:
                return d.toISOString();
        }
    }

    static getRelativeTime(date) {
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
    }

    // Distance calculation (Haversine formula)
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    static toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // ETA calculation
    static calculateETA(distanceKm, speedKmh = 40) {
        const timeHours = distanceKm / speedKmh;
        const timeMinutes = Math.ceil(timeHours * 60);
        
        const now = new Date();
        const arrival = new Date(now.getTime() + timeMinutes * 60000);
        
        return {
            minutes: timeMinutes,
            arrivalTime: arrival,
            formatted: `${timeMinutes} min`,
            arrivalFormatted: arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    }

    // Array and object utilities
    static paginate(array, page = 1, limit = 10) {
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        
        return {
            data: array.slice(startIndex, endIndex),
            pagination: {
                page,
                limit,
                total: array.length,
                pages: Math.ceil(array.length / limit)
            }
        };
    }

    static sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            
            if (order === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }

    static filterBy(array, filters) {
        return array.filter(item => {
            for (const key in filters) {
                if (filters[key] !== undefined && item[key] !== filters[key]) {
                    return false;
                }
            }
            return true;
        });
    }

    static groupBy(array, key) {
        return array.reduce((result, item) => {
            const groupKey = item[key];
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(item);
            return result;
        }, {});
    }

    // String utilities
    static truncate(str, length = 100) {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static sanitizeString(str) {
        return str.replace(/[<>"'&]/g, '');
    }

    // Number utilities
    static formatNumber(num, decimals = 2) {
        return Number(num).toFixed(decimals);
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Color utilities for UI
    static getColorByStatus(status) {
        const colors = {
            'active': '#1976d2', // Blue
            'completed': '#4caf50', // Green
            'cancelled': '#f44336', // Red
            'pending': '#ff9800', // Orange
            'inactive': '#9e9e9e' // Grey
        };
        return colors[status] || '#000000';
    }

    static getColorByLevel(level) {
        const colors = {
            'high': '#f44336', // Red
            'medium': '#ff9800', // Orange
            'low': '#4caf50', // Green
            'critical': '#d32f2f' // Dark Red
        };
        return colors[level] || '#9e9e9e';
    }

    // Time utilities
    static getCurrentTimestamp() {
        return new Date().toISOString();
    }

    static addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60000);
    }

    static subtractMinutes(date, minutes) {
        return new Date(date.getTime() - minutes * 60000);
    }

    static isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    static isThisWeek(date) {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() + 6));
        return date >= startOfWeek && date <= endOfWeek;
    }

    // Validation utilities
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static isValidPhone(phone) {
        const re = /^[\d\s\+\-\(\)]{10,15}$/;
        return re.test(phone);
    }

    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (_) {
            return false;
        }
    }

    static isValidCoordinate(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    // File utilities
    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }

    static isValidImageExtension(extension) {
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        return validExtensions.includes(extension.toLowerCase());
    }

    // Response formatting
    static successResponse(data = null, message = 'Success') {
        return {
            success: true,
            message,
            data,
            timestamp: this.getCurrentTimestamp()
        };
    }

    static errorResponse(message = 'An error occurred', errors = null, code = 'ERROR') {
        return {
            success: false,
            message,
            errors,
            code,
            timestamp: this.getCurrentTimestamp()
        };
    }

    static validationResponse(errors) {
        return this.errorResponse('Validation failed', errors, 'VALIDATION_ERROR');
    }

    // Logging utilities
    static logInfo(message, data = null) {
        console.log(`[INFO] ${this.getCurrentTimestamp()} - ${message}`, data || '');
    }

    static logError(message, error = null) {
        console.error(`[ERROR] ${this.getCurrentTimestamp()} - ${message}`, error || '');
    }

    static logWarning(message, data = null) {
        console.warn(`[WARN] ${this.getCurrentTimestamp()} - ${message}`, data || '');
    }

    // Performance monitoring
    static measurePerformance(fn, label = 'Function') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`⏱️ ${label} took ${(end - start).toFixed(2)}ms`);
        return result;
    }

    async measureAsyncPerformance(asyncFn, label = 'Async Function') {
        const start = performance.now();
        const result = await asyncFn();
        const end = performance.now();
        
        console.log(`⏱️ ${label} took ${(end - start).toFixed(2)}ms`);
        return result;
    }

    // Rate limiting simulation
    static createRateLimiter(limit, windowMs) {
        const requests = new Map();
        
        return (key) => {
            const now = Date.now();
            const windowStart = now - windowMs;
            
            if (!requests.has(key)) {
                requests.set(key, []);
            }
            
            const timestamps = requests.get(key);
            
            // Remove old timestamps
            while (timestamps.length && timestamps[0] <= windowStart) {
                timestamps.shift();
            }
            
            // Check if limit exceeded
            if (timestamps.length >= limit) {
                return false;
            }
            
            // Add current timestamp
            timestamps.push(now);
            return true;
        };
    }

    // Cache utilities
    static createCache(ttlMs = 60000) { // Default 1 minute
        const cache = new Map();
        
        return {
            set: (key, value) => {
                cache.set(key, {
                    value,
                    expiry: Date.now() + ttlMs
                });
            },
            
            get: (key) => {
                const item = cache.get(key);
                if (!item) return null;
                
                if (Date.now() > item.expiry) {
                    cache.delete(key);
                    return null;
                }
                
                return item.value;
            },
            
            delete: (key) => {
                cache.delete(key);
            },
            
            clear: () => {
                cache.clear();
            },
            
            size: () => {
                return cache.size;
            }
        };
    }

    // Mock data generation (for testing)
    static generateMockEmergency() {
        const hospitals = [
            'City General Hospital',
            'Government Medical College',
            'Apollo Hospital',
            'Fortis Hospital',
            'Manipal Hospital'
        ];

        const statuses = ['active', 'completed', 'cancelled'];
        const levels = ['low', 'medium', 'high'];

        return {
            emergencyId: this.generateEmergencyId(),
            ambulanceId: `AMB${Math.floor(Math.random() * 1000)}`,
            driverName: 'Driver ' + Math.floor(Math.random() * 100),
            hospitalName: hospitals[Math.floor(Math.random() * hospitals.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            startTime: new Date(Date.now() - Math.random() * 86400000), // Within last day
            estimatedTime: Math.floor(Math.random() * 30) + 10, // 10-40 minutes
            actualTime: Math.floor(Math.random() * 35) + 5, // 5-40 minutes
            priority: levels[Math.floor(Math.random() * levels.length)]
        };
    }

    static generateMockSignal() {
        const locations = [
            { lat: 12.9716, lng: 77.5946, address: 'MG Road Junction' },
            { lat: 12.9784, lng: 77.6408, address: 'Indiranagar Junction' },
            { lat: 12.9538, lng: 77.5736, address: 'Jaynagar Junction' },
            { lat: 13.0355, lng: 77.5970, address: 'Yeshwanthpur Junction' },
            { lat: 12.9279, lng: 77.6271, address: 'Banashankari Junction' }
        ];

        const congestionLevels = ['low', 'medium', 'high'];
        const location = locations[Math.floor(Math.random() * locations.length)];

        return {
            signalId: this.generateSignalId(),
            location,
            congestionLevel: congestionLevels[Math.floor(Math.random() * congestionLevels.length)],
            isPriority: Math.random() > 0.7,
            lastUpdated: new Date(Date.now() - Math.random() * 3600000) // Within last hour
        };
    }
}

module.exports = Helpers;