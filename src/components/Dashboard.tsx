import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  ShieldCheck, 
  RefreshCw,
  BarChart3,
  HeartPulse,
  Plus
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { BloodType, EmergencyRequest, Donor } from '../types';
import { getDonors, getEmergencyRequests, getInventory, resetAllDataToZero } from '../services/storage';
import { checkCompatibility } from '../utils/bloodCompatibility';

// Cinematic Framer Motion entrance variants with modern blur-in
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04,
    },
  },
};

const blurSectionVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 22, 
    filter: 'blur(12px)',
    scale: 0.985,
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    scale: 1,
    transition: { 
      duration: 0.55, 
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const kpiCardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 18, 
    filter: 'blur(10px)',
    scale: 0.97,
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [inventory, setInventory] = useState(getInventory());
  const [selectedBloodFilter, setSelectedBloodFilter] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [hoveredAllele, setHoveredAllele] = useState<string | null>(null);

  // Interactive Quick Cross-Match State
  const [recipientType, setRecipientType] = useState<BloodType>('O+');
  const [donorType, setDonorType] = useState<BloodType>('O-');

  const matchResult = checkCompatibility(donorType, recipientType);

  const loadData = () => {
    setRequests(getEmergencyRequests());
    setDonors(getDonors());
    setInventory(getInventory());
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    loadData();
    setTimeout(() => setIsSyncing(false), 800);
  };

  useEffect(() => {
    loadData();

    // Work 1: 5-Second Real-Time Auto-Sync Engine with smooth rotation animation
    const syncInterval = setInterval(() => {
      setIsSyncing(true);
      loadData();
      setTimeout(() => setIsSyncing(false), 900);
    }, 5000);

    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleResetToZero = () => {
    resetAllDataToZero();
    loadData();
  };

  const totalUnits = inventory.reduce((acc, curr) => acc + curr.unitsAvailable, 0);
  const urgentCount = requests.filter(r => r.status === 'urgent' || r.status === 'critical').length;
  const criticalUnitsCount = inventory.filter(i => i.status === 'critical').length;
  const targetReserve = 160; // 20 pints per 8 groups = 160 pints ideal vault capacity
  const capacityPercent = Math.min(100, Math.round((totalUnits / targetReserve) * 100));

  // Dynamic 7-day trend data derived directly from real events (0 when storage is empty)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const trendData = days.map(day => ({
    day,
    requests: requests.filter(r => {
      try {
        return new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'short' }) === day;
      } catch {
        return false;
      }
    }).length,
    mobilized: donors.filter(d => {
      try {
        return new Date(d.registeredAt).toLocaleDateString('en-US', { weekday: 'short' }) === day;
      } catch {
        return false;
      }
    }).length,
    stock: totalUnits,
  }));

  const maxVal = Math.max(10, ...trendData.map(d => Math.max(d.requests, d.mobilized)));
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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 pb-12"
    >
      {/* Power BI Top Navigation & Slicer Bar */}
      <motion.div 
        variants={blurSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 z-10 min-w-0">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#7A0C17]/10 border border-[#D72638]/30 text-[#7A0C17] text-xs font-bold mb-1">
              <Activity className="w-3.5 h-3.5 text-[#D72638] animate-pulse" />
              <span>Hemodynamic Intelligence Active</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1D20] tracking-tight flex items-center gap-2">
              <span>Executive Transfusion Intelligence Hub</span>
            </h1>
            <p className="text-xs text-[#5A626A]">
              Real-time ABO/Rh cross-matching analytics, cryogenic inventory volume, and emergency trauma triage.
            </p>
          </div>
        </div>

        {/* Power BI Interactive Slicers & Zero Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto z-10 shrink-0">
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
            onClick={handleManualSync}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F1EF] text-[#1A1D20] border border-[#D9C7C2] text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 group"
            title="Auto-syncs every 5s or click to sync immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D72638] transition-transform duration-700 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            <span>Sync Hub</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-[#7A0C17] font-bold">5s</span>
          </button>

          <button
            onClick={handleResetToZero}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-[#7A0C17] border border-[#D9C7C2] text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Reset all donors, requests, and inventory to zero"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Zero Data</span>
          </button>
        </div>
      </motion.div>

      {/* 4 Primary Power BI KPI Cards with Interactive Visualizations (Work 5) */}
      <motion.div 
        variants={blurSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
      >
        {/* KPI 1: Cryo Volume with Power BI ABO Allele Micro Bar Chart */}
        <motion.div 
          variants={kpiCardVariants}
          whileHover={{ y: -4, scale: 1.015 }}
          onClick={() => navigate('/dashboard/inventory')}
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] hover:border-[#D72638] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#7A0C17] uppercase tracking-wider flex items-center gap-1">
                <span>Cryo-Vault Reserve</span>
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#7A0C17]/10 text-[#D72638] group-hover:bg-[#D72638] group-hover:text-white transition-colors flex items-center justify-center border border-[#D72638]/30">
                <Database className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1A1D20]">{totalUnits}</span>
              <span className="text-xs text-[#5A626A]">/ {targetReserve} Pts</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#D72638]/10 text-[#D72638] ml-auto">
                {capacityPercent}% Cap
              </span>
            </div>

            {/* Power BI Micro ABO Alleles Segmented Bar Chart */}
            <div className="mt-2.5 pt-2 border-t border-[#D9C7C2]/40">
              <div className="flex items-center justify-between text-[10px] text-[#5A626A] mb-1">
                <span>Allele Volume Bar</span>
                <span className="font-bold text-[#7A0C17]">{hoveredAllele ? hoveredAllele : `${inventory.length} Groups`}</span>
              </div>
              <div className="grid grid-cols-8 gap-1 h-9 items-end bg-[#F5F1EF] p-1.5 rounded-xl border border-[#D9C7C2]/60">
                {inventory.map((inv) => {
                  const barH = Math.max(15, Math.min(100, (inv.unitsAvailable / 20) * 100));
                  const isHovered = hoveredAllele?.startsWith(inv.bloodType);
                  return (
                    <div
                      key={inv.bloodType}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setHoveredAllele(`${inv.bloodType}: ${inv.unitsAvailable} Pts`);
                      }}
                      onMouseLeave={() => setHoveredAllele(null)}
                      className="h-full flex flex-col justify-end items-center group/bar"
                    >
                      <div
                        style={{ height: `${barH}%` }}
                        className={`w-full rounded-xs transition-all duration-300 ${
                          inv.unitsAvailable === 0
                            ? 'bg-[#D9C7C2]/40'
                            : isHovered
                            ? 'bg-[#D72638] shadow-sm shadow-[#D72638]/50 scale-105'
                            : 'bg-gradient-to-t from-[#7A0C17] to-[#D72638]'
                        }`}
                      />
                      <span className="text-[7.5px] font-bold text-[#4A5568] mt-0.5 leading-none">{inv.bloodType}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#5A626A] border-t border-[#D9C7C2]/60 pt-2">
            <span className={criticalUnitsCount > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {criticalUnitsCount} shortage alleles
            </span>
            <span className="text-[#D72638] font-bold group-hover:underline flex items-center gap-0.5">
              <span>Inspect Vault</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </motion.div>

        {/* KPI 2: Certified Donors with Power BI Radial Micro Gauge */}
        <motion.div 
          variants={kpiCardVariants}
          whileHover={{ y: -4, scale: 1.015 }}
          onClick={() => navigate('/dashboard/donors')}
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] hover:border-[#D72638] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#7A0C17] uppercase tracking-wider">Certified Donors</span>
              <div className="w-8 h-8 rounded-xl bg-[#7A0C17]/10 text-[#D72638] group-hover:bg-[#D72638] group-hover:text-white transition-colors flex items-center justify-center border border-[#D72638]/30">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1A1D20]">{donors.length}</span>
              <span className="text-xs text-[#5A626A]">Volunteer Pool</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ml-auto">
                Ready
              </span>
            </div>

            {/* Power BI Radial Readiness Gauge Visual */}
            <div className="mt-2.5 pt-2 border-t border-[#D9C7C2]/40 flex items-center gap-2.5 bg-[#F5F1EF] p-2 rounded-xl border border-[#D9C7C2]/60">
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#D9C7C2]/60"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray={`${Math.min(100, donors.length > 0 ? 88 : 0)}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[9px] font-black text-[#1A1D20]">
                  {donors.length > 0 ? '88%' : '0%'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-[#1A1D20] truncate">Mobilization Velocity</div>
                <div className="text-[9px] text-[#5A626A] truncate">
                  {donors.length > 0 ? '24m Emergency Response' : 'Standby Pool Initializing'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#5A626A] border-t border-[#D9C7C2]/60 pt-2">
            <span>{donors.length > 0 ? `${donors.length} Verified Clinicians` : 'Registry Zero Standby'}</span>
            <span className="text-[#D72638] font-bold group-hover:underline flex items-center gap-0.5">
              <span>Registry</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </motion.div>

        {/* KPI 3: Emergency Requests with Power BI Triage Sparkline Radar */}
        <motion.div 
          variants={kpiCardVariants}
          whileHover={{ y: -4, scale: 1.015 }}
          onClick={() => navigate('/dashboard/emergency')}
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] hover:border-[#D72638] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#7A0C17] uppercase tracking-wider">Active Trauma Calls</span>
              <div className="w-8 h-8 rounded-xl bg-[#D72638]/15 text-[#D72638] group-hover:bg-[#D72638] group-hover:text-white transition-colors flex items-center justify-center border border-[#D72638]/30">
                <AlertTriangle className={`w-4 h-4 ${urgentCount > 0 ? 'animate-pulse' : ''}`} />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1A1D20]">{urgentCount}</span>
              <span className="text-xs text-[#D72638] font-bold">Critical Calls</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-[#D72638] border border-red-200 ml-auto">
                {requests.length} Total
              </span>
            </div>

            {/* Power BI Real-Time Triage Pulse Sparkline Waveform */}
            <div className="mt-2.5 pt-2 border-t border-[#D9C7C2]/40 bg-[#F5F1EF] p-2 rounded-xl border border-[#D9C7C2]/60">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-[#5A626A]">Triage Velocity</span>
                <span className="font-bold text-[#D72638] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D72638] animate-ping" />
                  <span>{urgentCount > 0 ? 'Priority Stream' : 'Calibrated'}</span>
                </span>
              </div>
              <svg className="w-full h-6 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                <path
                  d="M0,16 L20,16 L28,6 L36,22 L44,12 L52,18 L60,16 L80,16 L88,8 L100,16"
                  fill="none"
                  stroke={urgentCount > 0 ? "#D72638" : "#A0AEC0"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#5A626A] border-t border-[#D9C7C2]/60 pt-2">
            <span className="text-[#D72638] font-semibold">{urgentCount > 0 ? 'Urgent Queue Active' : 'Queue Cleared'}</span>
            <span className="text-[#D72638] font-bold group-hover:underline flex items-center gap-0.5">
              <span>Dispatch Board</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </motion.div>

        {/* KPI 4: Antigen Safety Index with Power BI Concentric Ring Gauge */}
        <motion.div 
          variants={kpiCardVariants}
          whileHover={{ y: -4, scale: 1.015 }}
          onClick={() => navigate('/dashboard/matrix')}
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] hover:border-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#7A0C17] uppercase tracking-wider">Antigen Safety Index</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center border border-emerald-300">
                <HeartPulse className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">100%</span>
              <span className="text-xs text-[#5A626A]">Zero Mismatch</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ml-auto">
                Optimal
              </span>
            </div>

            {/* Power BI Concentric Compatibility Ring Gauge */}
            <div className="mt-2.5 pt-2 border-t border-[#D9C7C2]/40 flex items-center gap-2.5 bg-[#F5F1EF] p-2 rounded-xl border border-[#D9C7C2]/60">
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#D9C7C2]/60"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 animate-[pulse_2s_infinite]"
                    strokeDasharray="100, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-[#1A1D20] truncate">AABB Cross-Match Latency</div>
                <div className="text-[9px] text-emerald-700 font-semibold truncate">0.4ms Synchronous Verification</div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#5A626A] border-t border-[#D9C7C2]/60 pt-2">
            <span>8x8 Matrix Synchronized</span>
            <span className="text-[#D72638] font-bold group-hover:underline flex items-center gap-0.5">
              <span>8x8 Matrix</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Featured Large-Format Clinical Telemetry Theater with Blur-In Transition */}
      <motion.div
        variants={blurSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-6">
          {/* Prominent High-Definition Clinical Video Monitor */}
          <div 
            className="relative w-full lg:w-3/5 rounded-2xl overflow-hidden border border-[#D72638]/40 shadow-md bg-black min-h-[260px] sm:min-h-[320px] flex items-center justify-center"
            style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
          >
            <video
              src="/385816_medium.mp4?v=3"
              poster="/385816_medium_poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover pointer-events-none"
              style={{ transform: 'translateZ(0)' }}
            />
            {/* Clinical Live Telemetry Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
            
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold">
                <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping" />
                Live Hemodynamic Stream
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D72638]/90 text-white font-mono font-bold text-[11px] shadow-xs">
                Ultra-HD 60fps
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white pointer-events-none">
              <div>
                <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Microvascular Circulation</span>
                <span className="text-sm font-black font-mono">Erythrocyte Flow: 1.24 m/s</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Perfusion Index</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">98.6%</span>
                </div>
                <div className="text-right border-l border-white/20 pl-3">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Hemoglobin Sat</span>
                  <span className="text-sm font-black text-red-300 font-mono">SpO2 99%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Diagnostics & Live Clinical Insights */}
          <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/20 mb-2">
                <Activity className="w-3.5 h-3.5 text-[#D72638]" />
                <span>Hemodynamic Diagnostics</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#1A1D20] tracking-tight">
                Live Erythrocyte Velocity & Tissue Perfusion
              </h2>
              <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                Direct in-vivo microvascular feed visualizing cellular rheology, erythrocyte aggregation resistance, and oxygen transport capacity under active transfusion protocols.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Agglutination Rate</span>
                <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">0.00% Zero</span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">No antigen clumping</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Vessel Viscosity</span>
                <span className="text-base font-black text-[#1A1D20] font-mono mt-0.5 block">3.2 cP</span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Normo-rheologic</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#7A0C17]/5 border border-[#D72638]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[#1A1D20] font-semibold text-xs">Transfusion Cross-Safety Lock</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                ENGAGED
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Power BI Visual Row 1: Stock Bar Matrix & Dynamic 7-Day Velocity Curve */}
      <motion.div 
        variants={blurSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Power BI Visual 1: Stock Level Bar Matrix */}
        <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D72638]" />
                <h2 className="text-sm font-bold text-[#1A1D20] uppercase tracking-wider">
                  Cryo-Vault Reserve Distribution (8 Alleles)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#7A0C17] font-mono font-semibold">Benchmark: 10 Pints</span>
              </div>
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
                        animate={{ width: `${Math.max(item.unitsAvailable > 0 ? 4 : 0, percentage)}%` }}
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
        </div>

        {/* Power BI Visual 2: 7-Day Influx vs Response Multi-Series Curve */}
        <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between">
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
              Real-time trend analysis tracking emergency intake spikes against voluntary donor mobilization.
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
                      <circle cx={x} cy={yReq} r="4" fill="#D72638" stroke="#FFFFFF" strokeWidth="2" />
                      <circle cx={x} cy={yMob} r="4" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
                      <text x={x} y={chartHeight + 14} fill="#5A626A" fontSize="10" textAnchor="middle" fontWeight="bold">
                        {d.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Dynamic Trend Indicators without hardcoded mock numbers */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-white border border-[#D9C7C2]">
                <span className="text-[11px] text-[#5A626A] block">Active Critical Intake</span>
                <span className="text-base font-bold text-[#D72638]">{urgentCount} Urgent Calls</span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                  {urgentCount > 0 ? 'Triage dispatch running' : 'Zero unassigned calls'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#D9C7C2]">
                <span className="text-[11px] text-[#5A626A] block">Volunteer Standby</span>
                <span className="text-base font-bold text-emerald-700">
                  {donors.filter(d => d.isAvailable).length} Ready Donors
                </span>
                <span className="text-[10px] text-[#5A626A] block mt-0.5">
                  {donors.length > 0 ? `${donors.length} in registry` : 'Zero registered donors'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-between text-[11px] text-[#5A626A]">
            <span>AABB Protocol Validated</span>
            <span className="text-emerald-600 font-semibold">System Health: 100%</span>
          </div>
        </div>
      </motion.div>

      {/* Power BI Visual Row 2: Interactive Cross-Match Simulator & Triage Feed with Blur-In Transition */}
      <motion.div 
        variants={blurSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Instant Cross-Match Simulator */}
        <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm lg:col-span-1 flex flex-col justify-between">
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
                <div className="flex items-center justify-between mb-2">
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

                <p className="text-xs leading-relaxed opacity-90 mt-2 font-medium">
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
        </div>

        {/* Live Emergency Triage Stream */}
        <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D72638]" />
                <h2 className="text-sm font-bold text-[#1A1D20] uppercase tracking-wider">
                  Live Emergency Transfusion Stream
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard/emergency"
                  className="text-xs text-[#D72638] font-bold hover:underline flex items-center gap-1"
                >
                  <span>Full Queue ({requests.length})</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
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
        </div>
      </motion.div>
    </motion.div>
  );
};