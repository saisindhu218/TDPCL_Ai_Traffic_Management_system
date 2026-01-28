// Google Maps Service Configuration
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Default center (Bangalore)
export const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
export const DEFAULT_ZOOM = 13;

// Map styles - Professional clean theme
export const mapStyles = [
    {
        featureType: 'all',
        elementType: 'geometry',
        stylers: [{ color: '#f5f5f5' }]
    },
    {
        featureType: 'all',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }]
    },
    {
        featureType: 'all',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#f5f5f5' }]
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#c9c9c9' }]
    },
    {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }]
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#dadada' }]
    },
    {
        featureType: 'road.arterial',
        elementType: 'geometry',
        stylers: [{ color: '#e0e0e0' }]
    },
    {
        featureType: 'road.local',
        elementType: 'geometry',
        stylers: [{ color: '#ffffff' }]
    }
];

// Map container style
export const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '500px',
    borderRadius: '8px',
    overflow: 'hidden'
};

// Map options
export const mapOptions = {
    styles: mapStyles,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    scaleControl: true,
    streetViewControl: true,
    rotateControl: true,
    fullscreenControl: true,
    gestureHandling: 'greedy'
};

// Load Google Maps script
export const loadGoogleMapsScript = () => {
    return new Promise((resolve) => {
        if (window.google && window.google.maps) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,directions,geometry`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            resolve();
        };
        
        script.onerror = () => {
            console.error('Failed to load Google Maps script');
            resolve();
        };
        
        document.head.appendChild(script);
    });
};

// Format coordinates for directions
export const formatLocation = (location) => {
    return {
        lat: location?.lat || DEFAULT_CENTER.lat,
        lng: location?.lng || DEFAULT_CENTER.lng
    };
};

// Calculate distance between two points
export const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return 0;
    
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
};

// Get address from coordinates (Reverse Geocoding)
export const getAddressFromCoords = async (lat, lng) => {
    if (!window.google || !window.google.maps) {
        return 'Loading Google Maps...';
    }

    try {
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat, lng };
        
        return new Promise((resolve) => {
            geocoder.geocode({ location: latlng }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].formatted_address);
                } else {
                    resolve(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }
            });
        });
    } catch (error) {
        return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
};