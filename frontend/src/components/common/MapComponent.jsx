import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    GoogleMap,
    LoadScript,
    DirectionsRenderer,
    Marker,
    Polyline,
    InfoWindow,
    TrafficLayer
} from '@react-google-maps/api';
import {
    Box,
    CircularProgress,
    Paper,
    Typography,
    Chip,
    IconButton,
    Alert
} from '@mui/material';
import {
    LocationOn,
    LocalHospital,
    Traffic as TrafficIcon,
    Warning,
    Navigation
} from '@mui/icons-material';
import { 
    containerStyle, 
    mapOptions, 
    DEFAULT_CENTER, 
    DEFAULT_ZOOM,
    loadGoogleMapsScript,
    formatLocation 
} from '../../services/googleMapsService';

const GoogleMapComponent = ({
    currentLocation,
    destination,
    route,
    emergencyMode = false,
    showTraffic = true,
    onMapLoad,
    onDirectionsChanged
}) => {
    const [map, setMap] = useState(null);
    const [directions, setDirections] = useState(null);
    const [directionsLoading, setDirectionsLoading] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [trafficInfo, setTrafficInfo] = useState(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [mapError, setMapError] = useState(null);
    
    const directionsServiceRef = useRef(null);
    const trafficLayerRef = useRef(null);

    // Load Google Maps script
    useEffect(() => {
        loadGoogleMapsScript().then(() => {
            setScriptLoaded(true);
        }).catch(() => {
            setMapError('Failed to load Google Maps. Please check your API key.');
        });
    }, []);

    // Initialize directions service
    useEffect(() => {
        if (scriptLoaded && window.google) {
            directionsServiceRef.current = new window.google.maps.DirectionsService();
        }
    }, [scriptLoaded]);

    // Calculate directions when locations change
    useEffect(() => {
        if (!scriptLoaded || !directionsServiceRef.current || !currentLocation || !destination) {
            return;
        }

        const calculateRoute = async () => {
            setDirectionsLoading(true);
            
            try {
                const origin = formatLocation(currentLocation);
                const dest = formatLocation(destination);
                
                // AI-optimized route parameters
                const request = {
                    origin,
                    destination: dest,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                    drivingOptions: {
                        departureTime: new Date(),
                        trafficModel: 'bestguess'
                    },
                    optimizeWaypoints: true,
                    provideRouteAlternatives: true,
                    avoidFerries: true,
                    avoidTolls: false,
                    unitSystem: window.google.maps.UnitSystem.METRIC
                };

                // Add traffic avoidance for emergency mode
                if (emergencyMode) {
                    request.drivingOptions.trafficModel = 'optimistic';
                }

                const result = await directionsServiceRef.current.route(request);
                
                if (result && result.routes && result.routes[0]) {
                    setDirections(result);
                    
                    // Calculate ETA and distance
                    const route = result.routes[0];
                    const leg = route.legs[0];
                    
                    const routeInfo = {
                        distance: leg.distance.text,
                        duration: leg.duration.text,
                        durationInTraffic: leg.duration_in_traffic?.text || leg.duration.text,
                        startAddress: leg.start_address,
                        endAddress: leg.end_address,
                        steps: leg.steps
                    };

                    if (onDirectionsChanged) {
                        onDirectionsChanged(routeInfo);
                    }

                    // Calculate traffic congestion level
                    if (leg.duration_in_traffic && leg.duration) {
                        const normalTime = leg.duration.value;
                        const trafficTime = leg.duration_in_traffic.value;
                        const congestion = ((trafficTime - normalTime) / normalTime) * 100;
                        
                        let trafficLevel = 'Low';
                        if (congestion > 50) trafficLevel = 'High';
                        else if (congestion > 20) trafficLevel = 'Medium';
                        
                        setTrafficInfo({
                            level: trafficLevel,
                            delay: Math.round((trafficTime - normalTime) / 60), // minutes
                            congestion: Math.round(congestion)
                        });
                    }
                }
            } catch (error) {
                console.error('Error calculating directions:', error);
                setDirections(null);
            } finally {
                setDirectionsLoading(false);
            }
        };

        calculateRoute();
    }, [currentLocation, destination, emergencyMode, scriptLoaded, onDirectionsChanged]);

    // Fit map bounds to show all markers
    useEffect(() => {
        if (map && (currentLocation || destination)) {
            const bounds = new window.google.maps.LatLngBounds();
            
            if (currentLocation) {
                bounds.extend(formatLocation(currentLocation));
            }
            if (destination) {
                bounds.extend(formatLocation(destination));
            }
            
            if (!bounds.isEmpty()) {
                map.fitBounds(bounds);
                map.panToBounds(bounds);
            }
        }
    }, [map, currentLocation, destination]);

    // Handle map load
    const handleMapLoad = useCallback((mapInstance) => {
        setMap(mapInstance);
        if (onMapLoad) {
            onMapLoad(mapInstance);
        }
    }, [onMapLoad]);

    // Custom markers
    const ambulanceIcon = {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: emergencyMode ? '#ff0000' : '#1976d2',
        fillOpacity: 1,
        scale: 10,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        labelOrigin: new window.google.maps.Point(0, 0)
    };

    const hospitalIcon = {
        path: 'M12 2L2 22h20L12 2z M12 6l6 16h-2l-4-8-4 8H6l6-16z',
        fillColor: '#4CAF50',
        fillOpacity: 1,
        scale: 1.5,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        anchor: new window.google.maps.Point(12, 24)
    };

    // Render directions with custom styling for emergency mode
    const directionsOptions = emergencyMode ? {
        polylineOptions: {
            strokeColor: '#00ff00',
            strokeWeight: 6,
            strokeOpacity: 0.8
        },
        markerOptions: {
            visible: false
        }
    } : {
        polylineOptions: {
            strokeColor: '#1976d2',
            strokeWeight: 4,
            strokeOpacity: 0.7
        }
    };

    if (mapError) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Alert severity="error" sx={{ width: '100%' }}>
                    <Typography variant="h6" gutterBottom>
                        Google Maps Error
                    </Typography>
                    <Typography>
                        {mapError}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                        Please add your Google Maps API key to the .env file
                    </Typography>
                </Alert>
            </Paper>
        );
    }

    if (!scriptLoaded) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading Google Maps...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Map Status Overlay */}
            {directionsLoading && (
                <Box sx={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000
                }}>
                    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        <Typography variant="body2">
                            Calculating optimized route...
                        </Typography>
                    </Paper>
                </Box>
            )}

            {/* Traffic Info Overlay */}
            {trafficInfo && (
                <Box sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 1000
                }}>
                    <Paper sx={{ p: 1.5 }}>
                        <Box display="flex" alignItems="center">
                            <TrafficIcon 
                                sx={{ 
                                    mr: 1,
                                    color: trafficInfo.level === 'High' ? 'error.main' : 
                                           trafficInfo.level === 'Medium' ? 'warning.main' : 'success.main'
                                }} 
                            />
                            <Box>
                                <Typography variant="caption" display="block" color="textSecondary">
                                    Traffic: {trafficInfo.level}
                                </Typography>
                                <Typography variant="body2">
                                    Delay: {trafficInfo.delay} min
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            )}

            {/* Emergency Mode Indicator */}
            {emergencyMode && (
                <Box sx={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 1000
                }}>
                    <Paper sx={{ 
                        p: 1.5, 
                        bgcolor: 'error.main', 
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Warning sx={{ mr: 1 }} />
                        <Typography variant="body2" fontWeight="bold">
                            EMERGENCY MODE ACTIVE
                        </Typography>
                    </Paper>
                </Box>
            )}

            {/* Google Map */}
            <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={currentLocation ? formatLocation(currentLocation) : DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    options={mapOptions}
                    onLoad={handleMapLoad}
                >
                    {/* Traffic Layer */}
                    {showTraffic && <TrafficLayer />}

                    {/* Directions */}
                    {directions && (
                        <DirectionsRenderer
                            directions={directions}
                            options={directionsOptions}
                        />
                    )}

                    {/* Current Location Marker */}
                    {currentLocation && (
                        <Marker
                            position={formatLocation(currentLocation)}
                            icon={ambulanceIcon}
                            onClick={() => setSelectedMarker({
                                type: 'ambulance',
                                position: currentLocation,
                                title: '🚑 Ambulance Current Location',
                                description: emergencyMode ? 'EMERGENCY ACTIVE - Route optimized' : 'Ambulance standing by'
                            })}
                            label={{
                                text: 'A',
                                color: '#ffffff',
                                fontWeight: 'bold'
                            }}
                        />
                    )}

                    {/* Destination Marker */}
                    {destination && (
                        <Marker
                            position={formatLocation(destination)}
                            icon={hospitalIcon}
                            onClick={() => setSelectedMarker({
                                type: 'hospital',
                                position: destination,
                                title: '🏥 Hospital Destination',
                                description: 'Emergency destination - Preparing for arrival'
                            })}
                        />
                    )}

                    {/* Selected Marker Info Window */}
                    {selectedMarker && (
                        <InfoWindow
                            position={selectedMarker.position}
                            onCloseClick={() => setSelectedMarker(null)}
                        >
                            <Box sx={{ p: 1, maxWidth: 200 }}>
                                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                    {selectedMarker.title}
                                </Typography>
                                <Typography variant="body2">
                                    {selectedMarker.description}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                                    Lat: {selectedMarker.position.lat.toFixed(4)}, Lng: {selectedMarker.position.lng.toFixed(4)}
                                </Typography>
                            </Box>
                        </InfoWindow>
                    )}

                    {/* Custom Route if provided */}
                    {route && !directions && route.coordinates && (
                        <Polyline
                            path={route.coordinates}
                            options={{
                                strokeColor: emergencyMode ? '#00ff00' : '#1976d2',
                                strokeWeight: 4,
                                strokeOpacity: 0.7
                            }}
                        />
                    )}
                </GoogleMap>
            </LoadScript>

            {/* Map Controls */}
            <Box sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
            }}>
                <IconButton
                    sx={{ bgcolor: 'white', boxShadow: 2 }}
                    onClick={() => {
                        if (map && currentLocation) {
                            map.panTo(formatLocation(currentLocation));
                            map.setZoom(15);
                        }
                    }}
                    title="Center on Ambulance"
                >
                    <LocationOn color="primary" />
                </IconButton>
                
                <IconButton
                    sx={{ bgcolor: 'white', boxShadow: 2 }}
                    onClick={() => {
                        if (map && destination) {
                            map.panTo(formatLocation(destination));
                            map.setZoom(15);
                        }
                    }}
                    title="Center on Hospital"
                >
                    <LocalHospital color="success" />
                </IconButton>
                
                <IconButton
                    sx={{ bgcolor: 'white', boxShadow: 2 }}
                    onClick={() => {
                        if (map && currentLocation && destination) {
                            const bounds = new window.google.maps.LatLngBounds();
                            bounds.extend(formatLocation(currentLocation));
                            bounds.extend(formatLocation(destination));
                            map.fitBounds(bounds);
                        }
                    }}
                    title="Show Entire Route"
                >
                    <Navigation color="action" />
                </IconButton>
            </Box>
        </Box>
    );
};

export default GoogleMapComponent;