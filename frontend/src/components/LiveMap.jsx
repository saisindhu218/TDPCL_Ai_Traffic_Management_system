import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
import { MapContainer, Marker as LeafletMarker, Polyline as LeafletPolyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const coordinateShape = PropTypes.shape({
  lat: PropTypes.number,
  lng: PropTypes.number
});

// Fix default leaflet marker icon
// eslint-disable-next-line no-underscore-dangle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

const ambulanceIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/883/883393.png',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

const MapUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center?.lat && center?.lng) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);

  return null;
};

function normalizeRoute(route = []) {
  return route
    .map((point) => ({
      lat: Number(point?.lat),
      lng: Number(point?.lng)
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function getFallbackRoute(ambulanceCoords, hospitalCoords) {
  if (!ambulanceCoords || !hospitalCoords) {
    return [];
  }

  return [
    { lat: Number(ambulanceCoords.lat), lng: Number(ambulanceCoords.lng) },
    { lat: Number(hospitalCoords.lat), lng: Number(hospitalCoords.lng) }
  ].filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

const MAP_TYPE_OPTIONS = [
  { value: 'road', label: 'Road' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'terrain', label: 'Terrain' }
];

const LEAFLET_LAYER_CONFIG = {
  road: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
    labelsUrl: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    labelsAttribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    labelsSubdomains: 'abcd'
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17
  }
};

const GoogleMapView = ({ center, route, ambulanceCoords, hospitalCoords, mapType }) => {
  const googleCenter = { lat: center.lat || center[0], lng: center.lng || center[1] };
  const normalizedRoute = normalizeRoute(route);
  const routePath = normalizedRoute.length >= 2
    ? normalizedRoute
    : getFallbackRoute(ambulanceCoords, hospitalCoords);
  const googleMapTypeId = mapType === 'road' ? 'roadmap' : mapType;

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={googleCenter}
      zoom={13}
      options={{
        disableDefaultUI: false,
        mapTypeId: googleMapTypeId,
        styles: googleMapTypeId === 'roadmap' ? [
          { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1120' }] }
        ] : undefined
      }}
    >
      {routePath.length >= 2 && (
        <Polyline
          path={routePath}
          options={{ strokeColor: '#10b981', strokeOpacity: 0.85, strokeWeight: 5 }}
        />
      )}

      {ambulanceCoords && <Marker position={ambulanceCoords} />}
      {hospitalCoords && <Marker position={hospitalCoords} />}
    </GoogleMap>
  );
};

const LeafletMapView = ({ center, route, ambulanceCoords, hospitalCoords, mapType }) => {
  const normalizedRoute = normalizeRoute(route);
  const fallbackRoute = getFallbackRoute(ambulanceCoords, hospitalCoords);
  const polylinePositions = (normalizedRoute.length >= 2 ? normalizedRoute : fallbackRoute)
    .map((point) => [point.lat, point.lng]);
  const layerConfig = LEAFLET_LAYER_CONFIG[mapType] || LEAFLET_LAYER_CONFIG.road;

  return (
    <MapContainer
      center={[center.lat || center[0], center.lng || center[1]]}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution={layerConfig.attribution}
        url={layerConfig.url}
        maxZoom={layerConfig.maxZoom}
      />

      {layerConfig.labelsUrl && (
        <TileLayer
          attribution={layerConfig.labelsAttribution}
          url={layerConfig.labelsUrl}
          subdomains={layerConfig.labelsSubdomains}
          maxZoom={19}
        />
      )}

      {ambulanceCoords && <MapUpdater center={ambulanceCoords} />}

      {polylinePositions.length >= 2 && (
        <LeafletPolyline positions={polylinePositions} color="#10b981" weight={6} opacity={0.7} />
      )}

      {ambulanceCoords && (
        <LeafletMarker position={[ambulanceCoords.lat, ambulanceCoords.lng]} icon={ambulanceIcon}>
          <Popup>Ambulance Location</Popup>
        </LeafletMarker>
      )}

      {hospitalCoords && (
        <LeafletMarker position={[hospitalCoords.lat, hospitalCoords.lng]} icon={hospitalIcon}>
          <Popup>Target Hospital</Popup>
        </LeafletMarker>
      )}
    </MapContainer>
  );
};

const LiveMap = ({ route = [], ambulanceCoords = null, hospitalCoords = null }) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const defaultCenter = [12.9716, 77.5946];
  const [mapType, setMapType] = useState(() => {
    const storedMapType = localStorage.getItem('preferredMapType');
    return MAP_TYPE_OPTIONS.some((option) => option.value === storedMapType) ? storedMapType : 'road';
  });
  const normalizedRoute = normalizeRoute(route);
  const center = ambulanceCoords || (normalizedRoute.length > 0 ? normalizedRoute[0] : null) || defaultCenter;
  const shouldUseGoogleMaps = Boolean(googleMapsApiKey);

  useEffect(() => {
    localStorage.setItem('preferredMapType', mapType);
  }, [mapType]);

  const mapContent = useMemo(() => {
    if (shouldUseGoogleMaps) {
      return (
        <LoadScript googleMapsApiKey={googleMapsApiKey}>
          <GoogleMapView
            center={center}
            route={normalizedRoute}
            ambulanceCoords={ambulanceCoords}
            hospitalCoords={hospitalCoords}
            mapType={mapType}
          />
        </LoadScript>
      );
    }

    return (
      <LeafletMapView
        center={center}
        route={normalizedRoute}
        ambulanceCoords={ambulanceCoords}
        hospitalCoords={hospitalCoords}
        mapType={mapType}
      />
    );
  }, [ambulanceCoords, center, googleMapsApiKey, hospitalCoords, mapType, normalizedRoute, shouldUseGoogleMaps]);

  return (
    <div className="map-shell w-full h-full min-h-[400px] overflow-hidden relative z-0">
      {mapContent}

      <div className="absolute top-3 right-3 z-[999] flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur">
        <span className="font-semibold uppercase tracking-wide">Map View</span>
        <select
          value={mapType}
          onChange={(event) => setMapType(event.target.value)}
          className="rounded-lg border border-white/20 bg-slate-900/90 px-2 py-1 text-xs text-slate-100"
        >
          {MAP_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {!shouldUseGoogleMaps && (
        <div className="absolute bottom-3 left-3 z-[999] rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-[11px] text-slate-200 shadow-lg backdrop-blur">
          OSM fallback active (set VITE_GOOGLE_MAPS_API_KEY for Google Maps)
        </div>
      )}
    </div>
  );
};

MapUpdater.propTypes = {
  center: coordinateShape
};

GoogleMapView.propTypes = {
  center: PropTypes.oneOfType([coordinateShape, PropTypes.arrayOf(PropTypes.number)]).isRequired,
  route: PropTypes.arrayOf(coordinateShape),
  ambulanceCoords: coordinateShape,
  hospitalCoords: coordinateShape,
  mapType: PropTypes.oneOf(['road', 'satellite', 'hybrid', 'terrain'])
};

GoogleMapView.defaultProps = {
  route: [],
  ambulanceCoords: null,
  hospitalCoords: null,
  mapType: 'road'
};

LeafletMapView.propTypes = {
  center: PropTypes.oneOfType([coordinateShape, PropTypes.arrayOf(PropTypes.number)]).isRequired,
  route: PropTypes.arrayOf(coordinateShape),
  ambulanceCoords: coordinateShape,
  hospitalCoords: coordinateShape,
  mapType: PropTypes.oneOf(['road', 'satellite', 'hybrid', 'terrain'])
};

LeafletMapView.defaultProps = {
  route: [],
  ambulanceCoords: null,
  hospitalCoords: null,
  mapType: 'road'
};

LiveMap.propTypes = {
  route: PropTypes.arrayOf(coordinateShape),
  ambulanceCoords: coordinateShape,
  hospitalCoords: coordinateShape
};

LiveMap.defaultProps = {
  route: [],
  ambulanceCoords: null,
  hospitalCoords: null
};

export default LiveMap;
