import { BloodType } from '../types';
import { BLOOD_COMPATIBILITY_TABLE } from './bloodCompatibility';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodedLocality {
  name: string;
  coords: Coordinates;
  zone: string;
}

// Comprehensive Delhi NCR Reference Coordinates Dictionary
export const DELHI_NCR_LOCALITIES: Record<string, Coordinates> = {
  'Connaught Place, Central Delhi': { latitude: 28.6315, longitude: 77.2167 },
  'South Extension, South Delhi': { latitude: 28.5724, longitude: 77.2228 },
  'Rohini Sector 7, North West Delhi': { latitude: 28.7126, longitude: 77.1189 },
  'Dwarka Sector 10, South West Delhi': { latitude: 28.5815, longitude: 77.0607 },
  'Karol Bagh, Central Delhi': { latitude: 28.6514, longitude: 77.1907 },
  'Saket, South Delhi': { latitude: 28.5245, longitude: 77.2066 },
  'Lajpat Nagar, South Delhi': { latitude: 28.5677, longitude: 77.2433 },
  'Hauz Khas, South Delhi': { latitude: 28.5494, longitude: 77.2001 },
  'Janakpuri, West Delhi': { latitude: 28.6219, longitude: 77.0878 },
  'Pitampura, North West Delhi': { latitude: 28.6989, longitude: 77.1384 },
  'Vasant Kunj, South West Delhi': { latitude: 28.5284, longitude: 77.1542 },
  'Mayur Vihar, East Delhi': { latitude: 28.6083, longitude: 77.2958 },
  'Chandni Chowk, North Delhi': { latitude: 28.6506, longitude: 77.2303 },
  'Okhla, South East Delhi': { latitude: 28.5355, longitude: 77.2750 },
  'AIIMS Ansari Nagar, South Delhi': { latitude: 28.5672, longitude: 77.2100 },
  'Safdarjung Enclave, South Delhi': { latitude: 28.5670, longitude: 77.1950 },
  'Noida Sector 18': { latitude: 28.5708, longitude: 77.3260 },
  'Gurgaon Cyber City': { latitude: 28.4950, longitude: 77.0890 },
};

export const DELHI_LOCALITY_NAMES = Object.keys(DELHI_NCR_LOCALITIES);

// Default fallback reference coordinate (Central Delhi)
export const DEFAULT_DELHI_COORDS: Coordinates = {
  latitude: 28.6315,
  longitude: 77.2167,
};

/**
 * High-Precision Haversine Distance Formula
 * Calculates great-circle distance between two GPS coordinate points in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place (e.g. 3.4 km)
}

/**
 * Resolves coordinates from a free-text location string or locality dictionary.
 */
export function resolveCoordinatesForLocation(locationStr?: string): Coordinates {
  if (!locationStr) return DEFAULT_DELHI_COORDS;

  const clean = locationStr.trim().toLowerCase();

  // 1. Direct locality key lookup
  for (const [name, coords] of Object.entries(DELHI_NCR_LOCALITIES)) {
    if (name.toLowerCase().includes(clean) || clean.includes(name.toLowerCase())) {
      return coords;
    }
  }

  // 2. Keyword substring matching
  const keywords: Record<string, Coordinates> = {
    'connaught': { latitude: 28.6315, longitude: 77.2167 },
    'cp': { latitude: 28.6315, longitude: 77.2167 },
    'south ext': { latitude: 28.5724, longitude: 77.2228 },
    'rohini': { latitude: 28.7126, longitude: 77.1189 },
    'dwarka': { latitude: 28.5815, longitude: 77.0607 },
    'karol bagh': { latitude: 28.6514, longitude: 77.1907 },
    'saket': { latitude: 28.5245, longitude: 77.2066 },
    'lajpat': { latitude: 28.5677, longitude: 77.2433 },
    'hauz khas': { latitude: 28.5494, longitude: 77.2001 },
    'janakpuri': { latitude: 28.6219, longitude: 77.0878 },
    'pitampura': { latitude: 28.6989, longitude: 77.1384 },
    'vasant': { latitude: 28.5284, longitude: 77.1542 },
    'mayur': { latitude: 28.6083, longitude: 77.2958 },
    'chandni': { latitude: 28.6506, longitude: 77.2303 },
    'okhla': { latitude: 28.5355, longitude: 77.2750 },
    'aiims': { latitude: 28.5672, longitude: 77.2100 },
    'noida': { latitude: 28.5708, longitude: 77.3260 },
    'gurgaon': { latitude: 28.4950, longitude: 77.0890 },
    'delhi': { latitude: 28.6315, longitude: 77.2167 },
  };

  for (const [kw, coords] of Object.entries(keywords)) {
    if (clean.includes(kw)) {
      return coords;
    }
  }

  // 3. Fallback deterministic offset based on hash of string so donors don't all stack on one point
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) - 50) * 0.0018;
  const lonOffset = (((Math.abs(hash) >> 2) % 100) - 50) * 0.0018;

  return {
    latitude: DEFAULT_DELHI_COORDS.latitude + latOffset,
    longitude: DEFAULT_DELHI_COORDS.longitude + lonOffset,
  };
}

/**
 * Returns list of blood types that can safely donate red cells to a patient with recipientType.
 */
export function getCompatibleDonorTypes(recipientType: BloodType): BloodType[] {
  const info = BLOOD_COMPATIBILITY_TABLE[recipientType];
  return info ? info.canReceiveFrom : [recipientType];
}

/**
 * Categorizes proximity into visual clinical urgency tiers.
 */
export function getProximityTier(distanceKm: number): {
  label: string;
  badgeClass: string;
  textColor: string;
  dotColor: string;
} {
  if (distanceKm <= 3.0) {
    return {
      label: 'Immediate Proximity (0–3 km)',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      textColor: 'text-emerald-700',
      dotColor: 'bg-emerald-500',
    };
  }
  if (distanceKm <= 10.0) {
    return {
      label: 'Mid-Radius Corridor (3–10 km)',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      textColor: 'text-amber-700',
      dotColor: 'bg-amber-500',
    };
  }
  return {
    label: 'Extended Radius (>10 km)',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    textColor: 'text-slate-700',
    dotColor: 'bg-slate-500',
  };
}
