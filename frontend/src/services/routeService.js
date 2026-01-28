// Route Optimization Service using Google Maps Directions API
import { loadGoogleMapsScript } from './googleMapsService';

class RouteService {
    constructor() {
        this.directionsService = null;
        this.geocoder = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        await loadGoogleMapsScript();
        
        if (window.google && window.google.maps) {
            this.directionsService = new window.google.maps.DirectionsService();
            this.geocoder = new window.google.maps.Geocoder();
            this.initialized = true;
        }
    }

    async optimizeRoute(origin, destination, options = {}) {
        await this.initialize();
        
        if (!this.directionsService) {
            throw new Error('Google Maps not loaded');
        }

        const request = {
            origin: this.formatLocation(origin),
            destination: this.formatLocation(destination),
            travelMode: window.google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(),
                trafficModel: 'bestguess'
            },
            optimizeWaypoints: true,
            provideRouteAlternatives: true,
            avoidFerries: true,
            avoidTolls: false,
            unitSystem: window.google.maps.UnitSystem.METRIC,
            ...options
        };

        try {
            const response = await this.directionsService.route(request);
            
            if (response && response.routes && response.routes.length > 0) {
                return this.processRouteResponse(response);
            }
            
            throw new Error('No routes found');
        } catch (error) {
            console.error('Route optimization error:', error);
            throw error;
        }
    }

    processRouteResponse(response) {
        const routes = response.routes.map((route, index) => {
            const leg = route.legs[0];
            
            return {
                id: index + 1,
                summary: route.summary,
                distance: leg.distance,
                duration: leg.duration,
                durationInTraffic: leg.duration_in_traffic,
                steps: leg.steps,
                coordinates: this.extractCoordinates(route),
                warnings: route.warnings || [],
                fare: route.fare,
                bounds: route.bounds
            };
        });

        // Sort by duration (shortest first)
        routes.sort((a, b) => a.duration.value - b.duration.value);

        return {
            bestRoute: routes[0],
            alternativeRoutes: routes.slice(1),
            request: response.request,
            status: response.status
        };
    }

    extractCoordinates(route) {
        const coordinates = [];
        const path = route.overview_path || route.legs[0].steps.flatMap(step => step.path);
        
        path.forEach(point => {
            coordinates.push({
                lat: point.lat(),
                lng: point.lng()
            });
        });
        
        return coordinates;
    }

    formatLocation(location) {
        if (typeof location === 'string') {
            return location; // Address string
        }
        
        if (location && location.lat && location.lng) {
            return { lat: location.lat, lng: location.lng };
        }
        
        throw new Error('Invalid location format');
    }

    async geocodeAddress(address) {
        await this.initialize();
        
        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng(),
                        address: results[0].formatted_address,
                        placeId: results[0].place_id
                    });
                } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        });
    }

    async reverseGeocode(lat, lng) {
        await this.initialize();
        
        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].formatted_address);
                } else {
                    reject(new Error(`Reverse geocoding failed: ${status}`));
                }
            });
        });
    }

    calculateETA(route, currentTime = new Date()) {
        if (!route || !route.durationInTraffic) {
            return null;
        }

        const arrivalTime = new Date(currentTime.getTime() + route.durationInTraffic.value * 1000);
        
        return {
            arrivalTime,
            minutes: Math.ceil(route.durationInTraffic.value / 60),
            text: route.durationInTraffic.text,
            isDelayed: route.durationInTraffic.value > route.duration.value
        };
    }

    // AI-based route scoring (mock implementation)
    calculateRouteScore(route, emergencyLevel = 'medium') {
        let score = 100; // Base score
        
        // Deduct points based on factors
        if (route.warnings && route.warnings.length > 0) {
            score -= route.warnings.length * 5;
        }
        
        // Traffic delay penalty
        if (route.durationInTraffic && route.duration) {
            const delayPercentage = ((route.durationInTraffic.value - route.duration.value) / route.duration.value) * 100;
            if (delayPercentage > 50) score -= 30;
            else if (delayPercentage > 20) score -= 15;
            else if (delayPercentage > 10) score -= 5;
        }
        
        // Emergency mode bonus
        if (emergencyLevel === 'high') {
            // Prioritize routes with fewer turns for emergency vehicles
            const turnCount = route.steps.filter(step => 
                step.maneuver && (step.maneuver.includes('turn') || step.maneuver.includes('ramp'))
            ).length;
            score -= turnCount * 2;
        }
        
        return Math.max(0, Math.min(100, score));
    }
}

export default new RouteService();