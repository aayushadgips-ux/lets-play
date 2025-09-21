// Mapbox service helpers (minimal) - correct path
const parseCoords = (text) => {
  const m = text.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
};

export async function geocodeText(text, token) {
  const coords = parseCoords(text);
  if (coords) return coords;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${token}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocode failed');
  const data = await res.json();
  const f = data.features && data.features[0];
  if (!f) throw new Error('No geocode result');
  return { lat: f.center[1], lng: f.center[0] };
}

export async function estimateWithMapbox(pickup, destination, token) {
  const p1 = await geocodeText(pickup, token);
  const p2 = await geocodeText(destination, token);
    const m = text.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?access_token=${token}&overview=full&geometries=geojson`;
  const dr = await fetch(directionsUrl);
  if (!dr.ok) throw new Error('Directions failed');
  const drj = await dr.json();
  const route = drj.routes && drj.routes[0];
  if (!route) throw new Error('No route');

  const meters = route.distance || 0;
  const seconds = route.duration || 0;
  const kms = Math.max(1, Math.round(meters / 1000));
  const durationMins = Math.max(5, Math.round(seconds / 60));
  const baseRate = 1.2;
  const timeMultiplier = 1; // caller will apply surge if needed
  const price = Math.max(3, Math.round(kms * baseRate * timeMultiplier * 100) / 100);
  return { kms, durationMins, price };
    return { kms, durationMins, price, pickupCoords: p1, destCoords: p2 };
}
