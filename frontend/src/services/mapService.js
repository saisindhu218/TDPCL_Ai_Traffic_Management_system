import axios from 'axios';

class MapService {
  constructor() {
    this.googleMapsLoaded = false;
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  // Load Google Maps script
  loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
      if (this.googleMapsLoaded) {
        resolve();
        return;
      }

      if (!apiKey) {
        reject(new Error('Google Maps API key is required'));
        return;
      }

      if (window.google && window.google.maps) {
        this.googleMapsLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.googleMapsLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });
  }

  // Get current location
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let errorMessage;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'User denied the request for Geolocation';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'The request to get user location timed out';
              break;
            default:
              errorMessage = 'An unknown error occurred';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Watch location
  watchLocation(onSuccess, onError, options = {}) {
    if (!navigator.geolocation) {
      onError(new Error('Geolocation is not supported'));
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      onError,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
        ...options
      }
    );

    return watchId;
  }

  // Stop watching location
  stopWatchingLocation(watchId) {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
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

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Calculate ETA
  calculateETA(distanceKm, speedKmh = 40) {
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

  // Reverse geocoding (coordinates to address)
  async reverseGeocode(lat, lng) {
    const cacheKey = `reverse_${lat}_${lng}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );

      const address = response.data.display_name;
      this.setCache(cacheKey, address);
      
      return address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  // Forward geocoding (address to coordinates)
  async forwardGeocode(address) {
    const cacheKey = `forward_${address}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );

      if (response.data && response.data.length > 0) {
        const result = {
          lat: parseFloat(response.data[0].lat),
          lng: parseFloat(response.data[0].lon),
          address: response.data[0].display_name
        };
        
        this.setCache(cacheKey, result);
        return result;
      }
      
      throw new Error('Address not found');
    } catch (error) {
      console.error('Forward geocoding error:', error);
      throw error;
    }
  }

  // Get route between two points (using OpenRouteService - free alternative)
  async getRoute(start, end, profile = 'driving-car') {
    const cacheKey = `route_${JSON.stringify(start)}_${JSON.stringify(end)}_${profile}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-car',
        {
          coordinates: [
            [start.lng, start.lat],
            [end.lng, end.lat]
          ],
          instructions: false,
          geometry: true
        },
        {
          headers: {
            'Authorization': process.env.REACT_APP_OPENROUTE_API_KEY || '',
            'Content-Type': 'application/json'
          }
        }
      );

      const route = response.data.routes[0];
      const result = {
        distance: route.summary.distance / 1000, // Convert to km
        duration: route.summary.duration / 60, // Convert to minutes
        geometry: route.geometry,
        coordinates: this.decodePolyline(route.geometry)
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Route calculation error:', error);
      
      // Fallback to straight line distance
      const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
      return {
        distance,
        duration: (distance / 40) * 60, // Assuming 40 km/h average speed
        coordinates: [start, end],
        isFallback: true
      };
    }
  }

  // Decode polyline geometry (for OpenRouteService)
  decodePolyline(encoded) {
    if (!encoded) return [];
    
    // This is a simplified polyline decoder
    // In production, use a proper library like '@mapbox/polyline'
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0, lng = 0;
    
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      
      points.push([lat * 1e-5, lng * 1e-5]);
    }
    
    return points.map(p => ({ lat: p[0], lng: p[1] }));
  }

  // Cache management
  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clearCache() {
    this.cache.clear();
  }

  // Get traffic data (mock implementation)
  getTrafficData(lat, lng, radius = 5) {
    // Mock traffic data - in production, use a real traffic API
    const congestionLevels = ['low', 'medium', 'high'];
    const randomLevel = congestionLevels[Math.floor(Math.random() * congestionLevels.length)];
    
    return {
      congestion: randomLevel,
      speed: randomLevel === 'high' ? 20 : randomLevel === 'medium' ? 40 : 60,
      incidents: Math.floor(Math.random() * 3),
      updatedAt: new Date().toISOString()
    };
  }

  // Get nearby hospitals
  async getNearbyHospitals(lat, lng, radius = 10) {
    const cacheKey = `hospitals_${lat}_${lng}_${radius}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Using Overpass API to get hospitals
      const query = `
        [out:json];
        (
          node["amenity"="hospital"](around:${radius * 1000},${lat},${lng});
          way["amenity"="hospital"](around:${radius * 1000},${lat},${lng});
          relation["amenity"="hospital"](around:${radius * 1000},${lat},${lng});
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        query,
        {
          headers: {
            'Content-Type': 'text/plain'
          }
        }
      );

      const hospitals = response.data.elements
        .filter(element => element.tags && element.tags.name)
        .map(element => {
          const distance = this.calculateDistance(lat, lng, element.lat, element.lon);
          return {
            id: element.id,
            name: element.tags.name,
            lat: element.lat,
            lng: element.lon,
            address: element.tags['addr:full'] || element.tags['addr:street'] || '',
            distance: distance.toFixed(2),
            phone: element.tags.phone || '',
            emergency: element.tags.emergency || 'yes',
            beds: element.tags.beds ? parseInt(element.tags.beds) : null
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10); // Return top 10 nearest

      this.setCache(cacheKey, hospitals);
      return hospitals;
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      
      // Return mock hospitals for demo
      return this.getMockHospitals(lat, lng);
    }
  }

  // Mock hospitals for demo
  getMockHospitals(lat, lng) {
    const hospitals = [];
    const names = [
      'City General Hospital',
      'Government Medical College',
      'Apollo Hospital',
      'Fortis Hospital',
      'Manipal Hospital',
      'Narayana Hospital',
      'Columbia Asia Hospital',
      'Bangalore Medical College',
      'St. John\'s Hospital',
      'Victoria Hospital'
    ];

    for (let i = 0; i < 5; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.1;
      const offsetLng = (Math.random() - 0.5) * 0.1;
      
      hospitals.push({
        id: `hospital_${i}`,
        name: names[i],
        lat: lat + offsetLat,
        lng: lng + offsetLng,
        address: `${i + 1} Medical Street, Bangalore`,
        distance: (Math.random() * 10 + 1).toFixed(2),
        phone: '080-1234567' + i,
        emergency: 'yes',
        beds: Math.floor(Math.random() * 100) + 50,
        specialties: ['Emergency', 'Trauma', 'Cardiology']
      });
    }

    return hospitals.sort((a, b) => a.distance - b.distance);
  }

  // Get traffic signals (mock)
  getTrafficSignals(route) {
    if (!route || route.length < 2) return [];
    
    const signals = [];
    const numSignals = Math.floor(route.length / 5);
    
    for (let i = 0; i < numSignals; i++) {
      const index = Math.floor((i + 1) * (route.length / (numSignals + 1)));
      if (index >= route.length) break;
      
      const point = route[index];
      signals.push({
        id: `TS${String(i + 1).padStart(3, '0')}`,
        lat: point.lat,
        lng: point.lng,
        status: Math.random() > 0.7 ? 'cleared' : 'normal',
        congestion: Math.random() > 0.5 ? 'low' : Math.random() > 0.3 ? 'medium' : 'high',
        lastUpdated: new Date(Date.now() - Math.random() * 3600000) // Within last hour
      });
    }
    
    return signals;
  }

  // Validate coordinates
  isValidCoordinate(lat, lng) {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  }

  // Format coordinates
  formatCoordinates(lat, lng, format = 'decimal') {
    if (!this.isValidCoordinate(lat, lng)) {
      return 'Invalid coordinates';
    }

    switch (format) {
      case 'dms':
        return this.toDMS(lat, lng);
      case 'utm':
        return this.toUTM(lat, lng);
      default:
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  toDMS(lat, lng) {
    const latDirection = lat >= 0 ? 'N' : 'S';
    const lngDirection = lng >= 0 ? 'E' : 'W';
    
    const latAbs = Math.abs(lat);
    const lngAbs = Math.abs(lng);
    
    const latDeg = Math.floor(latAbs);
    const latMin = Math.floor((latAbs - latDeg) * 60);
    const latSec = ((latAbs - latDeg - latMin/60) * 3600).toFixed(2);
    
    const lngDeg = Math.floor(lngAbs);
    const lngMin = Math.floor((lngAbs - lngDeg) * 60);
    const lngSec = ((lngAbs - lngDeg - lngMin/60) * 3600).toFixed(2);
    
    return `${latDeg}°${latMin}'${latSec}"${latDirection} ${lngDeg}°${lngMin}'${lngSec}"${lngDirection}`;
  }

  toUTM(lat, lng) {
    // Simplified UTM conversion
    // In production, use a proper UTM conversion library
    const zone = Math.floor((lng + 180) / 6) + 1;
    const hemisphere = lat >= 0 ? 'N' : 'S';
    
    return `Zone ${zone}${hemisphere}`;
  }
}

// Create a singleton instance
const mapService = new MapService();

export { MapService };
export default mapService;