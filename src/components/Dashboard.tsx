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
  PieChart,
  BarChart3,
  Layers,
  HeartPulse,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BloodType, EmergencyRequest, Donor } from '../types';
import { getDonors, getEmergencyRequests, getInventory } from '../services/storage';
import { checkCompatibility } from '../utils/bloodCompatibility';

export const Dashboard: React.FC = () => {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [inventory, setInventory] = useState(getInventory());
  const [selectedBloodFilter, setSelectedBloodFilter] = useState<string>('ALL');

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
  const targetReserve = 160; // 20 pints per 8 groups = 160 pints ideal vault capacity
  const capacityPercent = Math.min(100, Math.round((totalUnits / targetReserve) * 100));

  // 7-day trend data for multi-series SVG chart
  const trendData = [
    { day: 'Mon', requests: 4, mobilized: 6, stock: 45 },
    { day: 'Tue', requests: 7, mobilized: 8, stock: 42 },
    { day: 'Wed', requests: 3, mobilized: 7, stock: 48 },
    { day: 'Thu', requests: 9, mobilized: 11, stock: 52 },
    { day: 'Fri', requests: 6, mobilized: 8, stock: 50 },
    { day: 'Sat', requests: 12, mobilized: 14, stock: 58 },
    { day: 'Sun', requests: 5, mobilized: 9, stock: 56 },
  ];

  const maxVal = 16;
  const chartWidth = 520;
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

  // Filtered inventory based on interactive Power BI slicer
  const displayedInventory = selectedBloodFilter === 'ALL'
    ? inventory
    : inventory.filter(i => i.bloodType === selectedBloodFilter);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 pb-12"
    >
      {/* Power BI Top Navigation & Slicer Bar */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#7A0C17]/10 border border-[#D72638]/30 text-[#7A0C17] text-xs font-bold mb-1">
            <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping"></span>
            <span>Clinical Telemetry Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1D20] tracking-tight flex items-center gap-2">
            <span>Executive Transfusion Intelligence Hub</span>
          </h1>
          <p className="text-xs text-[#5A626A]">
            Real-time ABO/Rh cross-matching analytics, cryogenic inventory volume, and emergency trauma triage.
          </p>
        </div>

        {/* Power BI Interactive Slicers */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-[#F5F1EF] p-1 rounded-xl border border-[#D9C7C2] overflow-x-auto no-scrollbar max-w-full">
            {['ALL', 'O-', 'O+', 'A+', 'B+', 'AB+'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedBloodFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBloodFilter === type
                    ? 'bg-[#D72638] text-white shadow-md shadow-[#D72638]/30 scale-105'
                    : 'text-[#4A5568] hover:text-[#1A1D20] hover:bg-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F1EF] text-[#1A1D20] border border-[#D9C7C2] text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Sync Hub</span>
          </button>
        </div>
      </motion.div>

      {/* 4 Primary Power BI KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Cryo Volume */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#7A0C17] uppercase tracking-wider">Cryo-Vault Reserve</span>
            <div className="w-8 h-8 rounded-xl bg-[#7A0C17]/10 text-[#D72638] flex items-center justify-center border border-[#D72638]/30">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#1A1D20]">{totalUnits}</span>
              <span className="text-xs text-[#5A626A]">/ {targetReserve} pints benchmark</span>
            </div>
            {/* Visual Mini Progress Gauge */}
            <div className="w-full bg-[#F5F1EF] border border-[#D9C7C2]/60 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-[#7A0C17] to-[#D72638] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, capacityPercent)}%` }}
              ></div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#5A626A] border-t border-[#D9C7C2]/60 pt-2">
            <span className="text-amber-600 font-semibold">{criticalUnitsCount} shortage alleles</span>
            <Link to="/dashboard/inventory" className="text-[#D72638] font-bold hover:underline flex items-center gap-0.5">
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>

        {/* KPI 2: Certified Donors */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#7A0C17] uppercase tracking-wider">Certified Donors</span>
            <div className="w-8 h-8 rounded-xl bg-[#7A0C17]/10 text-[#D72638] flex items-center justify-center border border-[#D72638]/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#1A1D20]">{donors.length}</span>
              <span className="text-xs text-[#5A626A]">volunteer pool</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% On-Standby Readiness</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#5A626A] border-t border-[#D9C7C2]/60 pt-2">
            <span>Mobilization: 24m avg</span>
            <Link to="/dashboard/donors" className="text-[#D72638] font-bold hover:underline flex items-center gap-0.5">
              <span>Registry</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>

        {/* KPI 3: Emergency Requests */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#7A0C17] uppercase tracking-wider">Active Trauma Calls</span>
            <div className="w-8 h-8 rounded-xl bg-[#D72638]/15 text-[#D72638] flex items-center justify-center border border-[#D72638]/30">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#1A1D20]">{urgentCount}</span>
              <span className="text-xs text-[#D72638] font-bold">critical calls</span>
            </div>
            <div className="text-[11px] text-[#5A626A] mt-2">
              {requests.length - urgentCount} stabilized or fulfilled
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#5A626A] border-t border-[#D9C7C2]/60 pt-2">
            <span className="text-[#D72638] font-semibold">Priority Triage Live</span>
            <Link to="/dashboard/emergency" className="text-[#D72638] font-bold hover:underline flex items-center gap-0.5">
              <span>Dispatch Board</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>

        {/* KPI 4: Hemolytic Safety Score */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#7A0C17] uppercase tracking-wider">Antigen Safety Index</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-300">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600">100%</span>
              <span className="text-xs text-[#5A626A]">Zero Mismatch</span>
            </div>
            <div className="text-[11px] text-[#5A626A] mt-2">
              Cross-match latency: <strong className="text-[#1A1D20]">0.4ms</strong>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#5A626A] border-t border-[#D9C7C2]/60 pt-2">
            <span>AABB Protocol v4.2</span>
            <Link to="/dashboard/matrix" className="text-[#D72638] font-bold hover:underline flex items-center gap-0.5">
              <span>8x8 Matrix</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Power BI Visual Row 1: Stock Bar Matrix & 7-Day Area Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Power BI Visual 1: Stock Level Bar Matrix */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D72638]" />
                <h2 className="text-sm font-bold text-[#1A1D20] uppercase tracking-wider">
                  Cryo-Vault Reserve Distribution (8 Alleles)
                </h2>
              </div>
              <span className="text-[11px] text-[#7A0C17] font-mono font-semibold">Benchmark: 10 Pints</span>
            </div>
            <p className="text-xs text-[#5A626A] mb-4">
              Real-time pint volume against clinical minimum safe thresholds.
            </p>

            {/* Power BI Visual Bars */}
            <div className="space-y-2.5">
              {displayedInventory.map((item) => {
                const percentage = Math.min(100, (item.unitsAvailable / 20) * 100);
                const isCritical = item.unitsAvailable < 5;
                const isWarning = item.unitsAvailable >= 5 && item.unitsAvailable < 10;

                return (
                  <div key={item.bloodType} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-10 font-black text-[#7A0C17] text-xs px-1.5 py-0.5 rounded bg-[#F5F1EF] border border-[#D9C7C2] text-center">
                          {item.bloodType}
                        </span>
                        <span className="text-[11px] text-[#5A626A]">
                          {item.bloodType === 'O-' ? 'Universal Donor' : item.bloodType === 'AB+' ? 'Universal Recipient' : 'Target Specific'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1A1D20] text-xs">{item.unitsAvailable} Pints</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCritical ? 'bg-red-100 text-[#D72638] border border-red-200' :
                          isWarning ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isCritical ? 'CRITICAL' : isWarning ? 'LOW' : 'OPTIMAL'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Track with Safe Threshold Marker */}
                    <div className="w-full h-3 rounded-full bg-[#F5F1EF] border border-[#D9C7C2]/60 overflow-hidden relative">
                      <div className="absolute top-0 bottom-0 left-[50%] w-[1.5px] bg-[#7A0C17]/50 z-10" title="Safe Reserve (10 Pints)"></div>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(4, percentage)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          isCritical ? 'bg-gradient-to-r from-[#7A0C17] to-[#D72638]' :
                          isWarning ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                          'bg-gradient-to-r from-[#7A0C17] via-[#D72638] to-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-between text-[11px] text-[#5A626A]">
            <span>Center Line: 10 Pint Buffer</span>
            <Link to="/dashboard/inventory" className="text-[#D72638] font-bold hover:underline">
              Adjust Cryo Vault Units →
            </Link>
          </div>
        </motion.div>

        {/* Power BI Visual 2: 7-Day Influx vs Response Multi-Series Curve */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#D72638]" />
                <h2 className="text-sm font-bold text-[#1A1D20] uppercase tracking-wider">
                  7-Day Transfusion Velocity & Mobilization
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-[#D72638] font-bold">
                  <span className="w-2.5 h-1 bg-[#D72638] rounded-sm"></span> Transfusions
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <span className="w-2.5 h-1 bg-emerald-600 rounded-sm"></span> Mobilized
                </span>
              </div>
            </div>
            <p className="text-xs text-[#5A626A] mb-4">
              Comparative trend analysis tracking emergency intake spikes against donor dispatch.
            </p>

            {/* SVG Wave Chart */}
            <div className="w-full bg-[#F5F1EF] rounded-xl p-3 border border-[#D9C7C2]">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible">
                {/* Horizontal Grid lines */}
                <line x1="20" y1="20" x2={chartWidth - 20} y2="20" stroke="#D9C7C2" strokeDasharray="4" />
                <line x1="20" y1="60" x2={chartWidth - 20} y2="60" stroke="#D9C7C2" strokeDasharray="4" />
                <line x1="20" y1="100" x2={chartWidth - 20} y2="100" stroke="#D9C7C2" strokeDasharray="4" />

                {/* Transfusions line */}
                <polyline
                  fill="none"
                  stroke="#D72638"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsReq}
                />

                {/* Mobilized Donors line */}
                <polyline
                  fill="none"
                  stroke="#059669"
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
                      <circle cx={x} cy={yReq} r="4.5" fill="#D72638" stroke="#FFFFFF" strokeWidth="2" />
                      <circle cx={x} cy={yMob} r="4.5" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
                      <text x={x} y={chartHeight + 14} fill="#5A626A" fontSize="10" textAnchor="middle" fontWeight="bold">
                        {d.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Power BI Trend Indicators */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-white border border-[#D9C7C2]">
                <span className="text-[11px] text-[#5A626A] block">Weekly Critical Volume</span>
                <span className="text-base font-bold text-[#D72638]">46 Critical Pints</span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">↑ 14% rapid response rate</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#D9C7C2]">
                <span className="text-[11px] text-[#5A626A] block">Volunteer Outreach</span>
                <span className="text-base font-bold text-emerald-700">60 Ready Donors</span>
                <span className="text-[10px] text-[#5A626A] block mt-0.5">Zero adverse reaction rate</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-between text-[11px] text-[#5A626A]">
            <span>AABB Protocol Validated</span>
            <span className="text-emerald-600 font-semibold">System Health: 99.8%</span>
          </div>
        </motion.div>
      </div>

      {/* Power BI Visual Row 2: Interactive Cross-Match Simulator & Triage Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Instant Cross-Match Simulator */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm lg:col-span-1 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-4 h-4 text-[#D72638]" />
              <h2 className="text-sm font-bold text-[#1A1D20] uppercase tracking-wider">
                Instant ABO/Rh Cross-Match Evaluator
              </h2>
            </div>
            <p className="text-xs text-[#5A626A] mb-4">
              Cross-test recipient serum and donor red cells to assess agglutination risk.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                  Recipient Blood Group
                </label>
                <select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as BloodType)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-[#1A1D20] font-bold text-sm focus:border-[#D72638] outline-hidden cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                  Candidate Donor Blood Group
                </label>
                <select
                  value={donorType}
                  onChange={(e) => setDonorType(e.target.value as BloodType)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-[#1A1D20] font-bold text-sm focus:border-[#D72638] outline-hidden cursor-pointer"
                >
                  <option value="O-">O- (Universal Red Cells)</option>
                  <option value="O+">O+</option>
                  <option value="A-">A-</option>
                  <option value="A+">A+</option>
                  <option value="B-">B-</option>
                  <option value="B+">B+</option>
                  <option value="AB-">AB-</option>
                  <option value="AB+">AB+</option>
                </select>
              </div>

              {/* Match Result Display */}
              <div className={`p-4 rounded-xl border transition-all mt-4 ${
                matchResult.isCompatible
                  ? matchResult.matchScore === 100
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-[#F5F1EF] border-[#D9C7C2] text-[#1A1D20]'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    {matchResult.isCompatible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#D72638]" />
                    )}
                    {matchResult.isCompatible ? 'Safe Transfusion' : 'Contraindicated / Incompatible'}
                  </span>
                  <span className="font-mono font-bold text-xs">
                    Score: {matchResult.matchScore}%
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90 mt-1 font-medium">
                  {matchResult.clinicalNote}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/60">
            <Link
              to="/dashboard/matrix"
              className="w-full py-2 px-3 rounded-xl bg-[#F5F1EF] hover:bg-white border border-[#D9C7C2] text-[#1A1D20] hover:text-[#D72638] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>View Full 8x8 Master Matrix</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Live Emergency Triage Stream */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm lg:col-span-2 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D72638]" />
                <h2 className="text-sm font-bold text-[#1A1D20] uppercase tracking-wider">
                  Live Emergency Transfusion Stream
                </h2>
              </div>
              <Link
                to="/dashboard/emergency"
                className="text-xs text-[#D72638] font-bold hover:underline flex items-center gap-1"
              >
                <span>Full Queue ({requests.length})</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-[#5A626A] mb-4">
              Real-time urgent hospital calls requiring immediate pint allocation and donor mobilization.
            </p>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-[#5A626A] border border-dashed border-[#D9C7C2] rounded-xl bg-[#F5F1EF]/60">
                <ShieldAlert className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-[#1A1D20]">No emergency requests active</p>
                <p className="text-[11px] text-[#5A626A] mt-1">
                  System is actively monitoring 8-group cryo inventory reserves.
                </p>
                <Link
                  to="/dashboard/emergency"
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-semibold transition-colors shadow-md shadow-[#D72638]/20"
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
                    className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] hover:border-[#D72638] flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] border border-[#D72638]/40 flex flex-col items-center justify-center font-bold text-white shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-red-100">Req</span>
                        <span className="text-xs">{req.bloodType}</span>
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1D20] flex items-center gap-2">
                          <span>{req.patientName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            req.status === 'critical' ? 'bg-red-100 text-[#D72638] border border-red-200' :
                            req.status === 'urgent' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5A626A] mt-0.5">
                          {req.hospital} • {req.unitsNeeded} units needed
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-[11px] text-[#5A626A]">{req.contactNumber}</div>
                      <Link
                        to="/dashboard/emergency"
                        className="text-[11px] text-[#D72638] hover:underline font-bold"
                      >
                        Match Donors →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-between text-[11px] text-[#5A626A]">
            <span>Automated Donor Alert Engine</span>
            <span className="text-emerald-700 font-semibold">GPS Radius: 25 km</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
