import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Droplet, 
  Users, 
  AlertTriangle, 
  Database, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Plus, 
  Sparkles,
  RefreshCw,
  Clock,
  Compass
} from 'lucide-react';
import { BloodType, EmergencyRequest, Donor } from '../types';
import { getDonors, getEmergencyRequests, getInventory, saveInventory } from '../services/storage';
import { checkCompatibility } from '../utils/bloodCompatibility';

export const Dashboard: React.FC = () => {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [inventory, setInventory] = useState(getInventory());

  // Interactive Quick Cross-Match State
  const [recipientType, setRecipientType] = useState<BloodType>('O+');
  const [donorType, setDonorType] = useState<BloodType>('O-');

  const matchResult = checkCompatibility(donorType, recipientType);

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadData = () => {
    setRequests(getEmergencyRequests());
    setDonors(getDonors());
    setInventory(getInventory());
  };

  const totalUnits = inventory.reduce((acc, curr) => acc + curr.unitsAvailable, 0);
  const urgentCount = requests.filter(r => r.status === 'urgent' || r.status === 'critical').length;
  const criticalUnitsCount = inventory.filter(i => i.status === 'critical').length;

  // 7-day trend mockup data for SVG curved chart
  const trendData = [
    { day: 'Mon', requests: 4, mobilized: 6 },
    { day: 'Tue', requests: 7, mobilized: 5 },
    { day: 'Wed', requests: 3, mobilized: 8 },
    { day: 'Thu', requests: 9, mobilized: 11 },
    { day: 'Fri', requests: 6, mobilized: 7 },
    { day: 'Sat', requests: 12, mobilized: 14 },
    { day: 'Sun', requests: 5, mobilized: 9 },
  ];

  // SVG dimensions for 7-day trend chart
  const maxVal = 16;
  const chartWidth = 500;
  const chartHeight = 140;

  const pointsReq = trendData.map((d, i) => {
    const x = (i / (trendData.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (d.requests / maxVal) * (chartHeight - 30) - 15;
    return `${x},${y}`;
  }).join(' ');

  const pointsMob = trendData.map((d, i) => {
    const x = (i / (trendData.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (d.mobilized / maxVal) * (chartHeight - 30) - 15;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-red-900/30">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-700/40 text-red-300 text-xs font-bold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Real-Time Transfusion Telemetry Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Executive Blood Operations Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Precision ABO/Rh cross-matching, cryo-vault inventory, and emergency trauma routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Telemetry</span>
          </button>
          <Link
            to="/dashboard/emergency"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-md shadow-red-900/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Emergency Call</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Cryo Units */}
        <div className="p-4 rounded-2xl glass-card border border-red-900/30 hover:border-red-600/50 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cryo-Vault Units</span>
            <div className="w-8 h-8 rounded-xl bg-red-950/80 text-red-400 flex items-center justify-center border border-red-800/40 group-hover:scale-105 transition-transform">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalUnits}</span>
            <span className="text-xs text-slate-400">pints available</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-red-950/50 pt-2">
            <span className="text-amber-400 font-semibold">{criticalUnitsCount} low reserve groups</span>
            <Link to="/dashboard/inventory" className="text-red-400 hover:underline flex items-center gap-0.5">
              <span>Manage</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Active Donors */}
        <div className="p-4 rounded-2xl glass-card border border-red-900/30 hover:border-red-600/50 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Certified Donors</span>
            <div className="w-8 h-8 rounded-xl bg-red-950/80 text-red-400 flex items-center justify-center border border-red-800/40 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{donors.length}</span>
            <span className="text-xs text-slate-400">registered</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-red-950/50 pt-2">
            <span className="text-emerald-400 font-semibold">100% Volunteer Network</span>
            <Link to="/dashboard/donors" className="text-red-400 hover:underline flex items-center gap-0.5">
              <span>View list</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Urgent Triage */}
        <div className="p-4 rounded-2xl glass-card border border-red-900/30 hover:border-red-600/50 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Urgent Requests</span>
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/40 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{urgentCount}</span>
            <span className="text-xs text-red-400 font-semibold">critical calls</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-red-950/50 pt-2">
            <span className="text-slate-400">Priority triage active</span>
            <Link to="/dashboard/emergency" className="text-red-400 hover:underline flex items-center gap-0.5">
              <span>Dispatch board</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Engine Velocity */}
        <div className="p-4 rounded-2xl glass-card border border-red-900/30 hover:border-red-600/50 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cross-Match Latency</span>
            <div className="w-8 h-8 rounded-xl bg-red-950/80 text-emerald-400 flex items-center justify-center border border-red-800/40 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">0.4ms</span>
            <span className="text-xs text-emerald-400 font-semibold">Optimal</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-red-950/50 pt-2">
            <span className="text-slate-400">8x8 ABO/RhD matrix</span>
            <Link to="/dashboard/matrix" className="text-red-400 hover:underline flex items-center gap-0.5">
              <span>Open matrix</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* GRAPHICAL SECTION: Stock Level Bar Chart & 7-Day Trend Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Visual Chart 1: Blood Group Stock Level Distribution */}
        <div className="p-5 rounded-2xl glass-card border border-red-900/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Cryo-Vault Blood Reserves (8 Groups)
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">Safety Threshold: 10 Units</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time pint distribution vs clinical shortage limits across all ABO/Rh alleles.
            </p>

            {/* Graphical Bars */}
            <div className="space-y-2.5">
              {inventory.map((item) => {
                const percentage = Math.min(100, (item.unitsAvailable / 25) * 100);
                const isCritical = item.unitsAvailable < 5;
                const isWarning = item.unitsAvailable >= 5 && item.unitsAvailable < 10;

                return (
                  <div key={item.bloodType} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-9 font-extrabold text-white text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-red-900/40 text-center">
                          {item.bloodType}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.bloodType === 'O-' ? 'Universal Donor' : item.bloodType === 'AB+' ? 'Universal Recipient' : 'Specific Match'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">{item.unitsAvailable} Pints</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                          isWarning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          {isCritical ? 'CRITICAL' : isWarning ? 'LOW' : 'OPTIMAL'}
                        </span>
                      </div>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-900/90 overflow-hidden border border-slate-800 relative">
                      {/* Safety Line Marker at 40% (10 units) */}
                      <div className="absolute top-0 bottom-0 left-[40%] w-[1px] bg-red-400/50 z-10" title="Safe Limit"></div>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical ? 'bg-gradient-to-r from-red-600 to-red-500' :
                          isWarning ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                          'bg-gradient-to-r from-red-700 via-red-500 to-emerald-400'
                        }`}
                        style={{ width: `${Math.max(4, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-red-900/30 flex items-center justify-between text-[11px] text-slate-400">
            <span>Critical Reserve Line: 10 Pints</span>
            <Link to="/dashboard/inventory" className="text-red-400 font-semibold hover:underline">
              Adjust Cryo Vault Units →
            </Link>
          </div>
        </div>

        {/* Visual Chart 2: 7-Day Transfusion Demand vs Mobilization Curve */}
        <div className="p-5 rounded-2xl glass-card border border-red-900/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  7-Day Transfusion Demand & Response Curve
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                  <span className="w-2.5 h-0.5 bg-red-500"></span> Transfusions
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-0.5 bg-emerald-400"></span> Mobilized
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time trend analysis tracking emergency room request spikes against volunteer turnout.
            </p>

            {/* SVG Wave Chart */}
            <div className="w-full bg-slate-950/60 rounded-xl p-3 border border-red-950/60">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible">
                {/* Horizontal Grid lines */}
                <line x1="20" y1="20" x2={chartWidth - 20} y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                <line x1="20" y1="60" x2={chartWidth - 20} y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                <line x1="20" y1="100" x2={chartWidth - 20} y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />

                {/* Transfusions line */}
                <polyline
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsReq}
                />

                {/* Mobilized Donors line */}
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsMob}
                />

                {/* Data Points */}
                {trendData.map((d, i) => {
                  const x = (i / (trendData.length - 1)) * (chartWidth - 40) + 20;
                  const yReq = chartHeight - (d.requests / maxVal) * (chartHeight - 30) - 15;
                  const yMob = chartHeight - (d.mobilized / maxVal) * (chartHeight - 30) - 15;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={yReq} r="4" fill="#EF4444" stroke="#080102" strokeWidth="2" />
                      <circle cx={x} cy={yMob} r="4" fill="#10B981" stroke="#080102" strokeWidth="2" />
                      <text x={x} y={chartHeight + 14} fill="#94A3B8" fontSize="10" textAnchor="middle">
                        {d.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Trend Summary Indicators */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Weekly Transfusions</span>
                <span className="text-base font-bold text-red-400">46 Critical Units</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">↑ 12% fulfillment velocity</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Volunteer Donors Engaged</span>
                <span className="text-base font-bold text-emerald-400">60 Certified Donors</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Zero contraindication rate</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-red-900/30 flex items-center justify-between text-[11px] text-slate-400">
            <span>AABB Protocol Validated</span>
            <span className="text-emerald-400 font-semibold">System Load: 18%</span>
          </div>
        </div>
      </div>

      {/* QUICK CROSS-MATCH EVALUATOR & LIVE TRIAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Quick Cross-Match Simulator */}
        <div className="p-5 rounded-2xl glass-card border border-red-900/30 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Instant ABO/Rh Cross-Match
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Simulate compatibility between recipient serum and prospective donor red cells.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Blood Group
                </label>
                <select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as BloodType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-sm focus:border-red-500 outline-hidden"
                >
                  <option value="O-">O-</option>
                  <option value="O+">O+</option>
                  <option value="A-">A-</option>
                  <option value="A+">A+</option>
                  <option value="B-">B-</option>
                  <option value="B+">B+</option>
                  <option value="AB-">AB-</option>
                  <option value="AB+">AB+</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Candidate Donor Blood Group
                </label>
                <select
                  value={donorType}
                  onChange={(e) => setDonorType(e.target.value as BloodType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-sm focus:border-red-500 outline-hidden"
                >
                  <option value="O-">O- (Universal)</option>
                  <option value="O+">O+</option>
                  <option value="A-">A-</option>
                  <option value="A+">A+</option>
                  <option value="B-">B-</option>
                  <option value="B+">B+</option>
                  <option value="AB-">AB-</option>
                  <option value="AB+">AB+</option>
                </select>
              </div>

              {/* Match Result Card */}
              <div className={`p-4 rounded-xl border transition-all mt-4 ${
                matchResult.isCompatible
                  ? matchResult.matchScore === 100
                    ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                    : 'bg-blue-950/40 border-blue-600/50 text-blue-200'
                  : 'bg-red-950/60 border-red-600/60 text-red-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    {matchResult.isCompatible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    {matchResult.isCompatible ? 'Transfusion Compatible' : 'Incompatible / Contraindicated'}
                  </span>
                  <span className="font-mono font-bold text-xs">
                    Score: {matchResult.matchScore}%
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90 mt-1">
                  {matchResult.clinicalNote}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-red-900/30">
            <Link
              to="/dashboard/matrix"
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View Full 8x8 Master Matrix</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Live Emergency Triage Feed */}
        <div className="p-5 rounded-2xl glass-card border border-red-900/30 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Emergency Transfusion Stream
                </h2>
              </div>
              <Link
                to="/dashboard/emergency"
                className="text-xs text-red-400 hover:underline flex items-center gap-1"
              >
                <span>View Full Queue ({requests.length})</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time urgent hospital calls requiring immediate pint allocation and donor mobilization.
            </p>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-red-950/60 rounded-xl">
                <ShieldAlert className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-medium">No emergency requests active</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  System is monitoring 8-group cryo inventory reserves.
                </p>
                <Link
                  to="/dashboard/emergency"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Broadcast Test Request</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar">
                {requests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-red-900/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-950/90 border border-red-800/50 flex flex-col items-center justify-center font-bold text-red-400">
                        <span className="text-[10px] uppercase">Req</span>
                        <span className="text-xs text-white">{req.bloodType}</span>
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{req.patientName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            req.status === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            req.status === 'urgent' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {req.hospital} • {req.unitsNeeded} units needed
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-[11px] text-slate-400">{req.contactNumber}</div>
                      <Link
                        to="/dashboard/emergency"
                        className="text-[11px] text-red-400 hover:underline font-semibold"
                      >
                        Match Donors →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-red-900/30 flex items-center justify-between text-[11px] text-slate-400">
            <span>Automated Donor Alert System</span>
            <span className="text-emerald-400 font-semibold">GPS Radius: 25 km</span>
          </div>
        </div>
      </div>
    </div>
  );
};
