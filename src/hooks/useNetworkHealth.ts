import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';

export type NetworkSpeedStatus = 'excellent' | 'good' | 'poor';

export interface NetworkHealthState {
  status: NetworkSpeedStatus;
  latency: number | null;
  isSyncing: boolean;
  lastChecked: number;
  checkHealth: () => Promise<void>;
}

// Rolling window of recent latency probes to prevent single-packet jitter swings
const recentLatencies: number[] = [];

// Read last known cached latency from sessionStorage if available
const getInitialState = (): { status: NetworkSpeedStatus; latency: number | null } => {
  try {
    const cached = sessionStorage.getItem('bloodmatch_network_latency');
    if (cached) {
      const lat = parseInt(cached, 10);
      if (!isNaN(lat) && lat > 0) {
        recentLatencies.push(lat);
        if (lat < 800) return { status: 'excellent', latency: lat };
        if (lat <= 2000) return { status: 'good', latency: lat };
        return { status: 'poor', latency: lat };
      }
    }
  } catch {}
  return { status: 'excellent', latency: null };
};

const initial = getInitialState();
let globalStatus: NetworkSpeedStatus = initial.status;
let globalLatency: number | null = initial.latency;
let globalIsSyncing = false;
let globalLastChecked = Date.now();
let hasInitialized = false;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

/**
 * Perform actual round-trip latency probe to the API endpoint
 * and calculate rolling average over the last 3 probes
 */
async function probeNetworkHealth(): Promise<{ status: NetworkSpeedStatus; latency: number | null }> {
  const start = performance.now();
  try {
    const res = await apiClient.get('/api/health', {
      timeoutMs: 4000,
      retries: 0,
      skipAuth: true,
    });

    const rtt = Math.round(performance.now() - start);

    if (!res.ok) {
      return { status: 'poor', latency: rtt > 0 ? rtt : null };
    }

    // Keep last 3 measurements for smooth rolling average
    recentLatencies.push(rtt);
    if (recentLatencies.length > 3) {
      recentLatencies.shift();
    }

    const smoothedLatency = Math.round(
      recentLatencies.reduce((sum, val) => sum + val, 0) / recentLatencies.length
    );

    // Save smoothed latency to sessionStorage for seamless subsequent page visits
    try {
      sessionStorage.setItem('bloodmatch_network_latency', smoothedLatency.toString());
    } catch {}

    // Calibrated Cloud API Telemetry classification:
    // Green (excellent / optimal): < 800ms
    // Yellow (good / cloud response): 800ms - 2000ms
    // Red (poor / degraded / timeout): > 2000ms
    if (smoothedLatency < 800) {
      return { status: 'excellent', latency: smoothedLatency };
    } else if (smoothedLatency <= 2000) {
      return { status: 'good', latency: smoothedLatency };
    } else {
      return { status: 'poor', latency: smoothedLatency };
    }
  } catch {
    return { status: 'poor', latency: null };
  }
}

/**
 * Execute synchronized health check across all subscribers
 */
export async function triggerSynchronizedHealthCheck(): Promise<void> {
  if (globalIsSyncing) return;
  globalIsSyncing = true;
  notifyListeners();

  try {
    const { status, latency } = await probeNetworkHealth();
    globalStatus = status;
    globalLatency = latency;
    globalLastChecked = Date.now();
  } finally {
    globalIsSyncing = false;
    notifyListeners();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bloodmatch_network_health', {
          detail: { status: globalStatus, latency: globalLatency },
        })
      );
    }
  }
}

/**
 * Custom React hook for synchronized real-time connectivity & speed monitoring.
 * The speed/latency is communicated exclusively through color:
 * - Green: Excellent / Optimal (< 800ms)
 * - Yellow: Good / Moderate (800ms - 2000ms)
 * - Red: Poor / Degraded / Down (> 2000ms or offline)
 * 
 * Automatically probes health every 10 seconds.
 */
export function useNetworkHealth(): NetworkHealthState {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((prev) => prev + 1);
    listeners.add(handleUpdate);

    // Initial check on mount
    if (!hasInitialized) {
      hasInitialized = true;
      triggerSynchronizedHealthCheck();
    }

    // Precise 10-second automatic polling interval (only while tab is active)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerSynchronizedHealthCheck();
      }
    }, 10000);

    // Immediate check when tab visibility changes back to visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - globalLastChecked >= 8000) {
        triggerSynchronizedHealthCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      listeners.delete(handleUpdate);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkHealth = useCallback(async () => {
    await triggerSynchronizedHealthCheck();
  }, []);

  return {
    status: globalStatus,
    latency: globalLatency,
    isSyncing: globalIsSyncing,
    lastChecked: globalLastChecked,
    checkHealth,
  };
}

