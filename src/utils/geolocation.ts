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

// Global Metro Areas & Major Cities Reference Dictionary (Worldwide)
export const GLOBAL_METRO_LOCALITIES: Record<string, Coordinates> = {
  // India Metros & Regions
  'Mumbai, Maharashtra, India': { latitude: 19.0760, longitude: 72.8777 },
  'Bandra West, Mumbai': { latitude: 19.0596, longitude: 72.8295 },
  'Andheri East, Mumbai': { latitude: 19.1136, longitude: 72.8697 },
  'Bengaluru, Karnataka, India': { latitude: 12.9716, longitude: 77.5946 },
  'Koramangala, Bengaluru': { latitude: 12.9352, longitude: 77.6245 },
  'Indiranagar, Bengaluru': { latitude: 12.9784, longitude: 77.6408 },
  'Hyderabad, Telangana, India': { latitude: 17.3850, longitude: 78.4867 },
  'HITEC City, Hyderabad': { latitude: 17.4435, longitude: 78.3772 },
  'Chennai, Tamil Nadu, India': { latitude: 13.0827, longitude: 80.2707 },
  'Kolkata, West Bengal, India': { latitude: 22.5726, longitude: 88.3639 },
  'Pune, Maharashtra, India': { latitude: 18.5204, longitude: 73.8567 },
  'Ahmedabad, Gujarat, India': { latitude: 23.0225, longitude: 72.5714 },
  'Jaipur, Rajasthan, India': { latitude: 26.9124, longitude: 75.7873 },
  'Lucknow, Uttar Pradesh, India': { latitude: 26.8467, longitude: 80.9462 },
  'Chandigarh, India': { latitude: 30.7333, longitude: 76.7794 },
  'Kochi, Kerala, India': { latitude: 9.9312, longitude: 76.2673 },

  // Middle East & Asia
  'Dubai, United Arab Emirates': { latitude: 25.2048, longitude: 55.2708 },
  'Abu Dhabi, United Arab Emirates': { latitude: 24.4539, longitude: 54.3773 },
  'Riyadh, Saudi Arabia': { latitude: 24.7136, longitude: 46.6753 },
  'Doha, Qatar': { latitude: 25.2854, longitude: 51.5310 },
  'Singapore': { latitude: 1.3521, longitude: 103.8198 },
  'Tokyo, Japan': { latitude: 35.6762, longitude: 139.6503 },
  'Seoul, South Korea': { latitude: 37.5665, longitude: 126.9780 },
  'Bangkok, Thailand': { latitude: 13.7563, longitude: 100.5018 },
  'Kuala Lumpur, Malaysia': { latitude: 3.1390, longitude: 101.6869 },

  // Europe
  'London, United Kingdom': { latitude: 51.5074, longitude: -0.1278 },
  'Manchester, United Kingdom': { latitude: 53.4808, longitude: -2.2426 },
  'Paris, France': { latitude: 48.8566, longitude: 2.3522 },
  'Berlin, Germany': { latitude: 52.5200, longitude: 13.4050 },
  'Amsterdam, Netherlands': { latitude: 52.3676, longitude: 4.9041 },
  'Frankfurt, Germany': { latitude: 50.1109, longitude: 8.6821 },
  'Dublin, Ireland': { latitude: 53.3498, longitude: -6.2603 },

  // North America
  'New York City, NY, USA': { latitude: 40.7128, longitude: -74.0060 },
  'Brooklyn, NY, USA': { latitude: 40.6782, longitude: -73.9442 },
  'Los Angeles, CA, USA': { latitude: 34.0522, longitude: -118.2437 },
  'Chicago, IL, USA': { latitude: 41.8781, longitude: -87.6298 },
  'Houston, TX, USA': { latitude: 29.7604, longitude: -95.3698 },
  'San Francisco, CA, USA': { latitude: 37.7749, longitude: -122.4194 },
  'Toronto, Ontario, Canada': { latitude: 43.6532, longitude: -79.3832 },
  'Vancouver, BC, Canada': { latitude: 49.2827, longitude: -123.1207 },

  // Australia & Others
  'Sydney, Australia': { latitude: -33.8688, longitude: 151.2093 },
  'Melbourne, Australia': { latitude: -37.8136, longitude: 144.9631 },
  'Johannesburg, South Africa': { latitude: -26.2041, longitude: 28.0473 },
};

export const ALL_COMBINED_LOCALITIES: Record<string, Coordinates> = {
  ...DELHI_NCR_LOCALITIES,
  ...GLOBAL_METRO_LOCALITIES,
};

export const DELHI_LOCALITY_NAMES = Object.keys(DELHI_NCR_LOCALITIES);
export const GLOBAL_LOCALITY_NAMES = Object.keys(ALL_COMBINED_LOCALITIES);

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
 * Worldwide Reverse Geocoding with Fast Fallback to Closest Reference Metros
 * Translates GPS (latitude, longitude) anywhere in the world into a verified area/neighborhood and nearby locality pills.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number
): Promise<{
  primaryLocality: string;
  nearestPills: string[];
  displayName?: string;
  country?: string;
  city?: string;
}> {
  // 1. Attempt OpenStreetMap Nominatim reverse geocode (with 3.5s timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const sub = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || '';
        const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
        const state = addr.state || addr.region || '';
        const country = addr.country || '';

        const primaryParts = [sub, city, country].filter(Boolean);
        const primaryLocality = primaryParts.join(', ') || data.display_name.split(',').slice(0, 3).join(', ');

        const dynamicPills: string[] = [];
        if (sub) dynamicPills.push(sub);
        if (city && city !== sub) dynamicPills.push(city);
        if (addr.neighbourhood && addr.neighbourhood !== sub) dynamicPills.push(addr.neighbourhood);
        if (addr.suburb && addr.suburb !== sub) dynamicPills.push(addr.suburb);
        if (state && state !== city) dynamicPills.push(state);
        if (country) dynamicPills.push(country);

        // Deduplicate
        const uniquePills = Array.from(new Set(dynamicPills)).slice(0, 6);

        if (uniquePills.length > 0) {
          return {
            primaryLocality,
            nearestPills: uniquePills,
            displayName: data.display_name || primaryLocality,
            country,
            city,
          };
        }
      }
    }
  } catch {
    // Graceful offline fallback
  }

  // 2. High-precision Mathematical Proximity Fallback across Global Reference Metros
  const rankedMetros = Object.entries(ALL_COMBINED_LOCALITIES)
    .map(([name, coords]) => ({
      name,
      distance: calculateHaversineDistance(lat, lon, coords.latitude, coords.longitude),
    }))
    .sort((a, b) => a.distance - b.distance);

  const closest = rankedMetros[0];
  const primaryLocality = closest.distance <= 40 
    ? closest.name 
    : `Coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;

  const nearestPills = rankedMetros.slice(0, 6).map((m) => {
    const shortName = m.name.split(',')[0].trim();
    return shortName;
  });

  return {
    primaryLocality,
    nearestPills,
    displayName: primaryLocality,
  };
}

/**
 * Resolves coordinates from a free-text location string, locality dictionary, or embedded GPS coords.
 */
export function resolveCoordinatesForLocation(locationStr?: string): Coordinates {
  if (!locationStr) return DEFAULT_DELHI_COORDS;

  const clean = locationStr.trim().toLowerCase();

  // 1. Direct GPS coordinate string check e.g. "28.5694, 77.2850" or "(28.5694°, 77.2850°)"
  const coordRegex = /(-?\d+\.\d+)[\s,°]+(-?\d+\.\d+)/;
  const match = clean.match(coordRegex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { latitude: lat, longitude: lon };
    }
  }

  // 2. Direct locality key lookup in combined dictionary
  for (const [name, coords] of Object.entries(ALL_COMBINED_LOCALITIES)) {
    if (name.toLowerCase() === clean || name.toLowerCase().includes(clean) || clean.includes(name.toLowerCase())) {
      return coords;
    }
  }

  // 3. Keyword substring matching across global metros
  const keywords: Record<string, Coordinates> = {
    // Delhi NCR
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

    // Indian Metros
    'mumbai': { latitude: 19.0760, longitude: 72.8777 },
    'bandra': { latitude: 19.0596, longitude: 72.8295 },
    'andheri': { latitude: 19.1136, longitude: 72.8697 },
    'bangalore': { latitude: 12.9716, longitude: 77.5946 },
    'bengaluru': { latitude: 12.9716, longitude: 77.5946 },
    'koramangala': { latitude: 12.9352, longitude: 77.6245 },
    'indiranagar': { latitude: 12.9784, longitude: 77.6408 },
    'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
    'chennai': { latitude: 13.0827, longitude: 80.2707 },
    'kolkata': { latitude: 22.5726, longitude: 88.3639 },
    'pune': { latitude: 18.5204, longitude: 73.8567 },
    'ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
    'jaipur': { latitude: 26.9124, longitude: 75.7873 },
    'lucknow': { latitude: 26.8467, longitude: 80.9462 },
    'chandigarh': { latitude: 30.7333, longitude: 76.7794 },
    'kochi': { latitude: 9.9312, longitude: 76.2673 },

    // Global
    'dubai': { latitude: 25.2048, longitude: 55.2708 },
    'london': { latitude: 51.5074, longitude: -0.1278 },
    'new york': { latitude: 40.7128, longitude: -74.0060 },
    'los angeles': { latitude: 34.0522, longitude: -118.2437 },
    'chicago': { latitude: 41.8781, longitude: -87.6298 },
    'toronto': { latitude: 43.6532, longitude: -79.3832 },
    'singapore': { latitude: 1.3521, longitude: 103.8198 },
    'tokyo': { latitude: 35.6762, longitude: 139.6503 },
    'sydney': { latitude: -33.8688, longitude: 151.2093 },
    'paris': { latitude: 48.8566, longitude: 2.3522 },
    'berlin': { latitude: 52.5200, longitude: 13.4050 },
  };

  for (const [kw, coords] of Object.entries(keywords)) {
    if (clean.includes(kw)) {
      return coords;
    }
  }

  // 4. Fallback deterministic offset based on hash of string
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
