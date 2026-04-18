function haversineDistanceKm(pointA, pointB) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const earthRadiusKm = 6371;
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLng = toRad(pointB.lng - pointA.lng);

  const lat1 = toRad(pointA.lat);
  const lat2 = toRad(pointB.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function createLinearRoute(startLoc, endLoc, steps = 10) {
  const route = [];
  for (let i = 0; i <= steps; i += 1) {
    route.push({
      lat: startLoc.lat + ((endLoc.lat - startLoc.lat) * (i / steps)),
      lng: startLoc.lng + ((endLoc.lng - startLoc.lng) * (i / steps))
    });
  }
  return route;
}

module.exports = {
  haversineDistanceKm,
  createLinearRoute
};
