const { haversineDistanceKm, createLinearRoute } = require('../utils/geo');

const DEFAULT_HOSPITAL = { lat: 12.9816, lng: 77.6046 };
const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
const OSRM_FETCH_TIMEOUT_MS = Number(process.env.OSRM_FETCH_TIMEOUT_MS || 3500);
const SIGNAL_MATCH_RADIUS_KM = 1.5;

const SIGNAL_NODES = [
  { name: 'Jayanagar', lat: 12.925, lng: 77.5938 },
  { name: 'Banashankari', lat: 12.9152, lng: 77.5739 },
  { name: 'Silk Board', lat: 12.9174, lng: 77.6224 },
  { name: 'BTM Layout', lat: 12.9166, lng: 77.6101 },
  { name: 'JP Nagar', lat: 12.9063, lng: 77.5857 },
  { name: 'Koramangala', lat: 12.9345, lng: 77.6146 },
  { name: 'Lalbagh', lat: 12.9507, lng: 77.5848 },
  { name: 'Richmond Circle', lat: 12.9632, lng: 77.5957 },
  { name: 'MG Road', lat: 12.9756, lng: 77.6066 },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { name: 'Domlur', lat: 12.9609, lng: 77.6387 },
  { name: 'Hebbal', lat: 13.0358, lng: 77.597 },
  { name: 'Yeshwanthpur', lat: 13.0285, lng: 77.54 },
  { name: 'Rajajinagar', lat: 12.9916, lng: 77.5537 },
  { name: 'Majestic', lat: 12.9762, lng: 77.5727 }
];

function nearestSignalNode(point) {
  let bestNode = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  SIGNAL_NODES.forEach((node) => {
    const dist = haversineDistanceKm(point, node);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestNode = node;
    }
  });

  return {
    node: bestNode,
    distanceKm: bestDistance
  };
}

function routeIndexForNode(route, node) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  route.forEach((point, index) => {
    const dist = haversineDistanceKm(point, node);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestIndex = index;
    }
  });

  return {
    nearestIndex,
    nearestDistance
  };
}

function buildSignalAndLanePlan(route, startLoc, endLoc, congestionLevel) {
  const routePoints = Array.isArray(route) && route.length ? route : createLinearRoute(startLoc, endLoc || DEFAULT_HOSPITAL, 10);

  const candidates = SIGNAL_NODES
    .map((node) => {
      const { nearestIndex, nearestDistance } = routeIndexForNode(routePoints, node);
      return {
        node,
        nearestIndex,
        nearestDistance
      };
    })
    .filter((entry) => entry.nearestDistance <= SIGNAL_MATCH_RADIUS_KM)
    .sort((a, b) => a.nearestIndex - b.nearestIndex);

  const orderedNodes = [];
  let lastIndex = -5;
  candidates.forEach((entry) => {
    if (entry.nearestIndex - lastIndex < 3) {
      return;
    }

    if (orderedNodes.some((n) => n.name === entry.node.name)) {
      return;
    }

    orderedNodes.push({
      name: entry.node.name,
      index: entry.nearestIndex
    });
    lastIndex = entry.nearestIndex;
  });

  const startNearest = nearestSignalNode(startLoc || routePoints[0]);
  const destinationNearest = nearestSignalNode(endLoc || routePoints.at(-1));

  if (startNearest.node && (orderedNodes.length === 0 || orderedNodes[0].name !== startNearest.node.name)) {
    orderedNodes.unshift({ name: startNearest.node.name, index: -1 });
  }

  if (
    destinationNearest.node
    && !orderedNodes.some((node) => node.name === destinationNearest.node.name)
    && destinationNearest.distanceKm <= SIGNAL_MATCH_RADIUS_KM * 2
  ) {
    orderedNodes.push({ name: destinationNearest.node.name, index: routePoints.length + 1 });
  }

  const uniqueOrderedNames = orderedNodes.map((node) => node.name);
  if (uniqueOrderedNames.length < 2) {
    const fromLabel = startNearest.node?.name || 'Current Location';
    const toLabel = destinationNearest.node?.name || 'Destination';
    return [
      {
        id: `${fromLabel} Signal - ${fromLabel} to ${toLabel}`,
        signal_name: `${fromLabel} Signal`,
        lane_direction: `${fromLabel} to ${toLabel}`,
        from: fromLabel,
        to: toLabel,
        sequence: 1,
        status: congestionLevel > 55 ? 'Priority' : 'Pending'
      }
    ];
  }

  const checkpoints = [];
  for (let index = 0; index < uniqueOrderedNames.length - 1; index += 1) {
    const from = uniqueOrderedNames[index];
    const to = uniqueOrderedNames[index + 1];
    if (from === to) {
      continue;
    }

    checkpoints.push({
      id: `${from} Signal - ${from} to ${to}`,
      signal_name: `${from} Signal`,
      lane_direction: `${from} to ${to}`,
      from,
      to,
      sequence: checkpoints.length + 1,
      status: 'Pending'
    });
  }

  return checkpoints;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, OSRM_FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

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
    cleared_signals: buildSignalAndLanePlan(bestRoute.route, startLoc, destination, congestionLevel),
    aiWorkflow: [
      'Collect ambulance location and selected hospital destination',
      'Request real road routes from OSRM directions engine',
      'Score route alternatives using nearby traffic congestion inputs',
      'Select lower-congestion road route and compute ETA',
      'Dispatch signal and lane clearance plan'
    ]
  };
}

function generateClearancePlan({ route = [], startLoc, endLoc, congestionLevel = 50 }) {
  return buildSignalAndLanePlan(route, startLoc, endLoc, congestionLevel);
}

module.exports = {
  optimizeEmergencyRoute,
  generateClearancePlan
};
