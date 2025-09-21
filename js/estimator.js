// local estimator using haversine fallback
export function parseCoords(text) {
  const m = text.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  function toRad(x){return x*Math.PI/180;}
  const R = 6371;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.max(1, Math.round(R * c));
}

export function getSurgeMultiplier(dateValue) {
  if (!dateValue) return 1;
  const hr = new Date(dateValue).getHours();
  if (hr >= 7 && hr <= 9) return 1.4;
  if (hr >= 17 && hr <= 20) return 1.5;
  if (hr >= 0 && hr <= 4) return 1.2;
  return 1;
}

export async function estimateTrip(pickup, destination, dateValue) {
  const pickupCoords = parseCoords(pickup);
  const destCoords = parseCoords(destination);
  let kms = 5;
  if (pickupCoords && destCoords) kms = haversineDistance(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng);
  else {
    const len = Math.abs(pickup.length - destination.length) + (pickup.length + destination.length) / 30;
    kms = Math.min(Math.max(Math.round(len * 2), 2), 80);
  }
  const durationMins = Math.max(10, Math.round(kms * 2 + 5));
  const baseRate = 1.2;
  const timeMultiplier = getSurgeMultiplier(dateValue);
  const price = Math.max(3, Math.round(kms * baseRate * timeMultiplier * 100) / 100);
  return { kms, durationMins, price };
}
