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

// Global shared state across all components for instant synchronization ("syn for both work")
let globalStatus: NetworkSpeedStatus = 'excellent';
let globalLatency: number | null = 45;
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

    // Speed classification:
    // Green (excellent): < 350ms
    // Yellow (good / warning): 350ms - 999ms
    // Red (poor): >= 1000ms
    if (rtt < 350) {
      return { status: 'excellent', latency: rtt };
    } else if (rtt < 1000) {
      return { status: 'good', latency: rtt };
    } else {
      return { status: 'poor', latency: rtt };
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
 * - Green: Excellent / Fast (< 350ms)
 * - Yellow: Good / Warning (350ms - 999ms)
 * - Red: Poor / Degraded / Down (>= 1000ms or offline)
 */
export function useNetworkHealth(): NetworkHealthState {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((prev) => prev + 1);
    listeners.add(handleUpdate);

    // Initial check on first mount
    if (!hasInitialized) {
      hasInitialized = true;
      triggerSynchronizedHealthCheck();
    }

    // Calm background interval check every 45 seconds (only when tab is active)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerSynchronizedHealthCheck();
      }
    }, 45000);

    return () => {
      listeners.delete(handleUpdate);
      clearInterval(interval);
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

