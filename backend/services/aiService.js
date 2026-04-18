const { haversineDistanceKm, createLinearRoute } = require('../utils/geo');

const DEFAULT_HOSPITAL = { lat: 12.9816, lng: 77.6046 };
const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

function buildSignalAndLanePlan(congestionLevel) {
  if (congestionLevel > 70) {
    return [
      { id: 'Signal A', status: 'Green' },
      { id: 'Signal C', status: 'Green' },
      { id: 'Lane 2', status: 'Clear' },
      { id: 'Emergency Lane', status: 'Reserved' }
    ];
  }

  if (congestionLevel > 40) {
    return [
      { id: 'Signal A', status: 'Green' },
      { id: 'Lane 2', status: 'Clear' }
    ];
  }

  return [
    { id: 'Signal A', status: 'Green' },
    { id: 'Lane 1', status: 'Clear' }
  ];
}

function getFallbackRoute(startLoc, endLoc) {
  return createLinearRoute(startLoc, endLoc || DEFAULT_HOSPITAL, 12);
}

function normalizeOSRMGeometry(geometry = {}) {
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  return coordinates
    .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function trafficPenaltyForPoint(point, nearbyTraffic) {
  if (!nearbyTraffic.length) {
    return 25;
  }

  let weightedTotal = 0;
  let weightedFactor = 0;

  nearbyTraffic.forEach((entry) => {
    const dist = haversineDistanceKm(point, entry.location);
    if (dist > 3) {
      return;
    }

    const weight = 1 / Math.max(0.12, dist);
    weightedTotal += entry.congestion_level * weight;
    weightedFactor += weight;
  });

  if (!weightedFactor) {
    return 30;
  }

  return weightedTotal / weightedFactor;
}

function scoreRoadRoute(route, nearbyTraffic) {
  const points = route.route;
  const congestionScore = points.length
    ? points.reduce((acc, point) => acc + trafficPenaltyForPoint(point, nearbyTraffic), 0) / points.length
    : 100;

  // Keep road distance as a mild penalty and congestion as main factor.
  const weightedScore = congestionScore + (route.distanceKm * 3);

  return {
    ...route,
    congestionScore,
    weightedScore
  };
}

async function fetchRoadRoutes(startLoc, endLoc) {
  const url = `${OSRM_BASE_URL}/route/v1/driving/${startLoc.lng},${startLoc.lat};${endLoc.lng},${endLoc.lat}?overview=full&geometries=geojson&alternatives=true&steps=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM route request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error('OSRM returned no routes');
  }

  return data.routes
    .map((route) => ({
      route: normalizeOSRMGeometry(route.geometry),
      distanceKm: (route.distance || 0) / 1000,
      durationMin: (route.duration || 0) / 60
    }))
    .filter((route) => route.route.length >= 2);
}

async function optimizeEmergencyRoute({ startLoc, endLoc, nearbyTraffic = [] }) {
  const destination = endLoc || DEFAULT_HOSPITAL;

  let candidateRoutes = [];
  try {
    candidateRoutes = await fetchRoadRoutes(startLoc, destination);
  } catch (err) {
    console.warn('OSRM unavailable, using fallback route:', err.message);
    // Fallback keeps app usable if OSRM is unavailable.
    const fallbackRoute = getFallbackRoute(startLoc, destination);
    candidateRoutes = [{
      route: fallbackRoute,
      distanceKm: haversineDistanceKm(startLoc, destination),
      durationMin: (haversineDistanceKm(startLoc, destination) / 35) * 60
    }];
  }

  const scoredCandidates = candidateRoutes.map((route) => scoreRoadRoute(route, nearbyTraffic));
  scoredCandidates.sort((a, b) => a.weightedScore - b.weightedScore);

  const bestRoute = scoredCandidates[0];
  const congestionLevel = Math.max(0, Math.min(100, Math.round(bestRoute.congestionScore)));

  // Use road-routing ETA and adjust by predicted congestion.
  const etaMinutes = Math.max(2, Math.round(bestRoute.durationMin * (1 + (congestionLevel / 250))));

  return {
    congestionLevel,
    route: bestRoute.route,
    eta: `${etaMinutes} min`,
    cleared_signals: buildSignalAndLanePlan(congestionLevel),
    aiWorkflow: [
      'Collect ambulance location and selected hospital destination',
      'Request real road routes from OSRM directions engine',
      'Score route alternatives using nearby traffic congestion inputs',
      'Select lower-congestion road route and compute ETA',
      'Dispatch signal and lane clearance plan'
    ]
  };
}

module.exports = {
  optimizeEmergencyRoute
};
