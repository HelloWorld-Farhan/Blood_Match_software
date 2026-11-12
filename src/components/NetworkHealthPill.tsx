import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useNetworkHealth } from '../hooks/useNetworkHealth';

interface NetworkHealthPillProps {
  onRefresh?: () => Promise<void> | void;
  className?: string;
  showPingDot?: boolean;
}

export const NetworkHealthPill: React.FC<NetworkHealthPillProps> = ({
  onRefresh,
  className = '',
  showPingDot = true,
}) => {
  const { status, latency, isSyncing, checkHealth } = useNetworkHealth();

  const handleClick = async () => {
    // Synchronously trigger network probe and optional dataset refresh
    await Promise.all([
      checkHealth(),
      onRefresh ? Promise.resolve(onRefresh()) : Promise.resolve(),
    ]);
  };

  // Color classes mapped to the measured API latency/speed:
  // Green (Excellent): < 350ms
  // Yellow (Good / Warning): 350ms - 999ms
  // Red (Poor / Degraded): >= 1000ms
  const colorStyles = {
    excellent: {
      container: 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100 text-emerald-900',
      icon: 'text-emerald-600',
      dot: 'bg-emerald-500',
      ping: 'bg-emerald-400',
    },
    good: {
      container: 'bg-amber-50/80 border-amber-200 hover:bg-amber-100 text-amber-900',
      icon: 'text-amber-600',
      dot: 'bg-amber-500',
      ping: 'bg-amber-400',
    },
    poor: {
      container: 'bg-red-50/80 border-red-200 hover:bg-red-100 text-red-900',
      icon: 'text-red-600',
      dot: 'bg-red-500',
      ping: 'bg-red-400',
    },
  }[status];

  return (
    <div
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors shadow-2xs select-none ${colorStyles.container} ${className}`}
      title={
        latency !== null
          ? `Network Live (${latency}ms telemetry response)`
          : 'Network Live (Encrypted telemetry channel)'
      }
    >
      <RefreshCw className={`w-3.5 h-3.5 ${colorStyles.icon} ${isSyncing ? 'animate-spin' : ''}`} />
      <span>Network Live</span>
      {showPingDot && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorStyles.ping}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${colorStyles.dot}`} />
        </span>
      )}
    </div>
  );
};
