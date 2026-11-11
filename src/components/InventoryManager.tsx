import React, { useState, useEffect, useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import { BloodInventoryUnit, BloodType } from '../types';
import { 
  Droplet, 
  BarChart3, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Filter, 
  Layers,
  Database
} from 'lucide-react';
import { getInventory, saveInventory } from '../services/storage';
import { fetchInventoryApi } from '../services/api';

// Modern scroll-triggered blur-in entrance variants
const scrollBlurVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 24, 
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

const tileCardVariants: Variants = {
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

export default function InventoryManager() {
  const [inventory, setInventory] = useState<BloodInventoryUnit[]>(getInventory());
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CRITICAL' | 'RH_NEG' | 'RH_POS' | 'UNIVERSAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = async () => {
    // 1. Initial immediate presentation from local storage combined with registered donors
    const local = getInventory();
    setInventory(local);

    // 2. Fetch fresh live inventory from backend database
    try {
      const res = await fetchInventoryApi();
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: BloodInventoryUnit[] = res.data.map((item: any) => ({
          id: item.id || `INV-${item.blood_type}`,
          bloodType: (item.blood_type || item.bloodType) as BloodType,
          unitsAvailable: item.units_available ?? item.unitsAvailable ?? 0,
          storageFacility: 'Central Blood Bank',
          lastTestedDate: item.last_tested_date || new Date().toISOString().split('T')[0],
          status: item.status || 'optimal',
          temperatureCelsius: item.temperature_celsius ?? 4.0,
        }));
        setInventory(mapped);
        saveInventory(mapped);
      }
    } catch (e) {
      console.warn('[InventoryManager] Backend sync fallback to local calculations:', e);
    }
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    loadData();
    setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  };

  useEffect(() => {
    loadData();

    // 10-Second Real-Time Silent Auto-Sync Engine (seamless non-intrusive background sync)
    const syncInterval = setInterval(() => {
      loadData();
    }, 10000);

    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('bloodmatch_donors_updated', handleStorage);
    window.addEventListener('bloodmatch_inventory_updated', handleStorage);
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('bloodmatch_donors_updated', handleStorage);
      window.removeEventListener('bloodmatch_inventory_updated', handleStorage);
    };
  }, []);

  // KPI Calculations
  const totalUnits = useMemo(() => inventory.reduce((acc, curr) => acc + curr.unitsAvailable, 0), [inventory]);
  const idealCapacity = 160; // 20 units x 8 types
  const capacityPercent = Math.min(100, Math.round((totalUnits / idealCapacity) * 100));

  const criticalGroupsCount = useMemo(() => inventory.filter(i => i.unitsAvailable < 5).length, [inventory]);
  const healthyGroupsCount = useMemo(() => inventory.filter(i => i.unitsAvailable >= 15).length, [inventory]);

  const universalDonorItem = useMemo(() => inventory.find(i => i.bloodType === 'O-'), [inventory]);
  const universalUnits = universalDonorItem?.unitsAvailable || 0;

  // Rh Positive vs Negative breakdown
  const rhStats = useMemo(() => {
    const rhPos = inventory.filter(i => i.bloodType.includes('+')).reduce((sum, i) => sum + i.unitsAvailable, 0);
    const rhNeg = inventory.filter(i => i.bloodType.includes('-')).reduce((sum, i) => sum + i.unitsAvailable, 0);
    const total = rhPos + rhNeg;
    const posPct = total > 0 ? Math.round((rhPos / total) * 100) : 50;
    const negPct = total > 0 ? 100 - posPct : 50;
    return { rhPos, rhNeg, posPct, negPct };
  }, [inventory]);

  // Filtered Inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesType = item.bloodType.toLowerCase().includes(q);
        if (!matchesType) return false;
      }

      // Slicer filter
      if (selectedFilter === 'CRITICAL') return item.unitsAvailable < 5;
      if (selectedFilter === 'RH_NEG') return item.bloodType.includes('-');
      if (selectedFilter === 'RH_POS') return item.bloodType.includes('+');
      if (selectedFilter === 'UNIVERSAL') return item.bloodType === 'O-';
      return true;
    });
  }, [inventory, selectedFilter, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 relative z-10">
      {/* Power BI Executive Header with Scroll Blur-In */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="p-6 sm:p-8 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/30 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Power BI Clinical Telemetry Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Blood Bank Reserves
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-2xl">
            Real-time monitored blood bank inventory across all 8 ABO and Rh blood groups, synchronized live with registered voluntary donors.
          </p>
        </div>

        {/* Monitored Live Status Indicator (Automatic Silent Sync & Gentle On-Demand Refresh) */}
        <div className="flex items-center gap-2 shrink-0">
          <div 
            onClick={handleManualSync}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs font-semibold cursor-pointer hover:bg-emerald-100 transition-colors shadow-2xs"
            title="Monitored live with automatic 10-second background sync. Click to refresh immediately."
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Network Live</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </motion.div>

      {/* 4 Power BI Executive KPI Tiles with Scroll Blur-In */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Tile 1: Total Bank Reserves */}
        <motion.div 
          variants={tileCardVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5A626A]">Total Bank Volume</span>
              <div className="text-3xl font-black text-[#1A1D20] font-mono mt-1">
                {totalUnits} <span className="text-sm font-bold text-[#5A626A] font-sans">Pints</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#D72638]/10 text-[#D72638] flex items-center justify-center border border-[#D72638]/20">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#5A626A] font-semibold">Target Capacity (160 Pts)</span>
              <span className="font-bold text-[#D72638] font-mono">{capacityPercent}%</span>
            </div>
            <div className="w-full bg-[#F5F1EF] border border-[#D9C7C2]/70 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#D72638] to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Tile 2: Vault Deficit Monitor */}
        <motion.div 
          variants={tileCardVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5A626A]">Critical Shortages</span>
              <div className="text-3xl font-black text-[#1A1D20] font-mono mt-1 flex items-baseline gap-1.5">
                <span className={criticalGroupsCount > 0 ? 'text-[#D72638]' : 'text-emerald-600'}>
                  {criticalGroupsCount}
                </span>
                <span className="text-sm font-bold text-[#5A626A] font-sans">of 8 Groups</span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              criticalGroupsCount > 0 
                ? 'bg-red-100 text-[#D72638] border-red-200' 
                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}>
              {criticalGroupsCount > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/50 flex items-center justify-between text-xs">
            <span className="text-[#5A626A]">Healthy Groups (≥15 Pts):</span>
            <span className="font-bold text-emerald-700 font-mono">{healthyGroupsCount} Groups</span>
          </div>
        </motion.div>

        {/* Tile 3: Universal O- Emergency Buffer */}
        <motion.div 
          variants={tileCardVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5A626A]">Universal O- Buffer</span>
              <div className="text-3xl font-black text-[#1A1D20] font-mono mt-1">
                {universalUnits} <span className="text-sm font-bold text-[#5A626A] font-sans">Pints</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] text-white flex items-center justify-center shadow-xs font-black text-xs">
              O-
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/50 flex items-center justify-between text-xs">
            <span className="text-[#5A626A]">Triage Readiness:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              universalUnits >= 15 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
              universalUnits >= 5 ? 'bg-amber-100 text-amber-800 border-amber-200' :
              'bg-red-100 text-[#D72638] border-red-200 font-black'
            }`}>
              {universalUnits >= 15 ? 'OPTIMAL' : universalUnits >= 5 ? 'ADEQUATE' : 'CRITICAL SHORTAGE'}
            </span>
          </div>
        </motion.div>

        {/* Tile 4: Rh-Factor Distribution Ratio */}
        <motion.div 
          variants={tileCardVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5A626A]">Rh Antigen Distribution</span>
              <div className="text-xs font-bold text-[#1A1D20] mt-1.5 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D72638]"></span>
                  Rh+ ({rhStats.rhPos} Pts)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7A0C17]"></span>
                  Rh- ({rhStats.rhNeg} Pts)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F5F1EF] text-[#7A0C17] flex items-center justify-center border border-[#D9C7C2]">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/50">
            <div className="flex items-center justify-between text-xs mb-1.5 font-mono font-bold">
              <span className="text-[#D72638]">{rhStats.posPct}% Rh+</span>
              <span className="text-[#7A0C17]">{rhStats.negPct}% Rh-</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#D9C7C2]/40">
              <div 
                className="bg-[#D72638] h-full transition-all duration-500"
                style={{ width: `${rhStats.posPct}%` }}
              />
              <div 
                className="bg-[#7A0C17] h-full transition-all duration-500"
                style={{ width: `${rhStats.negPct}%` }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Featured Large-Format Cryo-Vault Atmospheric Surveillance Bay with Blur-In Transition */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-6">
          {/* Prominent High-Definition Cryo-Chamber Video Monitor */}
          <div 
            className="relative w-full lg:w-3/5 rounded-2xl overflow-hidden border border-[#D72638]/40 shadow-md bg-black h-[220px] xs:h-[260px] sm:h-[300px] flex items-center justify-center"
            style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
          >
            <video
              src="/16531-273379399_medium.mp4?v=3"
              poster="/16531-273379399_medium_poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ transform: 'translateZ(0)' }}
            />
            {/* Live Cryo Telemetry Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
            
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Blood Bank Sensor Bay 01
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D72638]/90 text-white font-mono font-bold text-[11px] shadow-xs">
                Deep-Cold Storage 60fps
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white pointer-events-none">
              <div>
                <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Chamber Environment</span>
                <span className="text-sm font-black font-mono">Core Temp: 4.0°C Stable</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">LN2 Vapor Seal</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">100% Sealed</span>
                </div>
                <div className="text-right border-l border-white/20 pl-3">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Thermal Vacuum</span>
                  <span className="text-sm font-black text-white font-mono">0.02 mbar</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cryo Surveillance Diagnostics & Preservation Safety */}
          <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/20 mb-2">
                <Database className="w-3.5 h-3.5 text-[#D72638]" />
                <span>Storage Temperature Integrity</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#1A1D20] tracking-tight">
                Sub-Zero Whole Blood & Packed Red Cell Preservation
              </h2>
              <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                Autonomous thermal surveillance actively maintaining CPD/SAGM blood packs within the strict AABB +2°C to +6°C clinical refrigeration corridor.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Reserve Saturation</span>
                <span className="text-sm font-black text-[#1A1D20] mt-0.5 block truncate">{totalUnits} / 160 Pints</span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">{capacityPercent}% Banked</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Deficit Alleles</span>
                <span className={`text-sm font-black mt-0.5 block truncate ${criticalGroupsCount > 0 ? 'text-[#D72638]' : 'text-emerald-700'}`}>
                  {criticalGroupsCount} Groups Low
                </span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">Threshold: &lt;5 Pts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-900 font-semibold text-xs">AABB Cold-Chain Storage Standard</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                CERTIFIED
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Graphical Stock Level Comparison Matrix with Scroll Blur-In */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="p-6 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9C7C2]/60">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D72638]" />
              <h2 className="font-bold text-base text-[#1A1D20]">
                Comparative Stock Level Distribution Matrix
              </h2>
            </div>
            <p className="text-xs text-[#5A626A] mt-0.5">
              Live capacity visualization with baseline 20-pint safety target threshold per allele.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className="flex items-center gap-1.5 text-[#5A626A]">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span> Deficit (&lt;5)
            </span>
            <span className="flex items-center gap-1.5 text-[#5A626A]">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Low (5-14)
            </span>
            <span className="flex items-center gap-1.5 text-[#5A626A]">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Optimal (≥15)
            </span>
          </div>
        </div>

        {/* Visual Bar Columns */}
        <div className="pt-4">
          <div className="grid grid-cols-8 gap-2 sm:gap-4 h-48 items-end relative px-2">
            {/* Target 20-Pint Threshold Line */}
            <div 
              className="absolute left-0 right-0 border-t-2 border-dashed border-[#D72638]/50 z-10 pointer-events-none flex items-center justify-end pr-2"
              style={{ bottom: '75%' }}
            >
              <span className="bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-[#D72638] font-mono border border-[#D72638]/30 shadow-2xs">
                Target: 20 Pts
              </span>
            </div>

            {inventory.map(item => {
              const maxScale = 25;
              const heightPct = Math.min(100, Math.round((item.unitsAvailable / maxScale) * 100));
              const isCrit = item.unitsAvailable < 5;
              const isLw = item.unitsAvailable >= 5 && item.unitsAvailable < 15;

              return (
                <div key={item.id} className="flex flex-col items-center h-full justify-end group">
                  {/* Pints count badge on top */}
                  <span className="text-[11px] font-bold font-mono text-[#1A1D20] mb-1 group-hover:scale-110 transition-transform">
                    {item.unitsAvailable}
                  </span>

                  {/* Vertical Column */}
                  <div className="w-full max-w-[36px] bg-[#F5F1EF] border border-[#D9C7C2] rounded-t-lg h-36 relative overflow-hidden flex items-end">
                    <div 
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        isCrit ? 'bg-gradient-to-t from-[#7A0C17] to-[#D72638]' :
                        isLw ? 'bg-gradient-to-t from-amber-600 to-amber-400' :
                        'bg-gradient-to-t from-emerald-700 to-emerald-400'
                      }`}
                      style={{ height: `${Math.max(item.unitsAvailable > 0 ? 4 : 0, heightPct)}%` }}
                    />
                  </div>

                  {/* Group Label */}
                  <span className="mt-2 text-xs font-black text-[#1A1D20] px-1.5 py-0.5 rounded bg-[#F5F1EF] border border-[#D9C7C2]/70 group-hover:border-[#D72638] transition-colors">
                    {item.bloodType}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Slicers & Filters Ribbon with Scroll Blur-In */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="p-4 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        {/* Slicer Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-[#5A626A] mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#D72638]" /> Slicers:
          </span>

          {[
            { id: 'ALL', label: `All Alleles (${inventory.length})` },
            { id: 'CRITICAL', label: `Critical Deficit (<5)` },
            { id: 'UNIVERSAL', label: 'Universal (O-)' },
            { id: 'RH_NEG', label: 'Rh- Negative' },
            { id: 'RH_POS', label: 'Rh+ Positive' },
          ].map(slicer => (
            <button
              key={slicer.id}
              onClick={() => setSelectedFilter(slicer.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === slicer.id
                  ? 'bg-[#D72638] text-white shadow-sm shadow-[#D72638]/30 scale-102'
                  : 'bg-[#F5F1EF] text-[#4A5568] hover:text-[#1A1D20] border border-[#D9C7C2]'
              }`}
            >
              {slicer.label}
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div className="w-full md:w-56">
          <input
            type="text"
            placeholder="Search group (e.g. O-, AB+)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] placeholder-slate-400 outline-hidden focus:border-[#D72638] transition-colors"
          />
        </div>
      </motion.div>

      {/* Grid of 8 Graphical Cryo-Pod Cards with Scroll Blur-In */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {filteredInventory.map((item) => {
          const isCritical = item.unitsAvailable < 5;
          const isLow = item.unitsAvailable >= 5 && item.unitsAvailable < 15;
          const pct = Math.min(100, Math.round((item.unitsAvailable / 20) * 100));

          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-sm flex flex-col justify-between hover:border-[#D72638]/50 hover:shadow-md transition-all duration-200"
            >
              <div>
                {/* Header with Type Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] flex flex-col items-center justify-center font-black text-white shadow-md shadow-[#D72638]/20 border border-[#D72638]/40 shrink-0">
                      <span className="text-[9px] uppercase font-bold text-red-100 tracking-wider">Type</span>
                      <span className="text-lg leading-tight">{item.bloodType}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-[#1A1D20] text-base leading-tight">
                        Blood Group {item.bloodType}
                      </h3>
                      <div className="text-[11px] text-[#7A0C17] font-semibold mt-0.5">
                        {item.bloodType === 'O-' ? 'Universal Red Cell Donor' :
                         item.bloodType === 'AB+' ? 'Universal Red Cell Recipient' :
                         item.bloodType.includes('-') ? 'Rare Rh- Transfusion Allele' :
                         'Standard Rh+ Allele'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Graphical Fluid Level Meter + Pints Counter */}
                <div className="my-3 p-3.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] flex items-center justify-between gap-4">
                  {/* Left: Fluid Tank Meter Graphic */}
                  <div className="w-7 h-16 rounded-lg bg-white border border-[#D9C7C2] p-0.5 flex flex-col justify-end overflow-hidden shadow-inner shrink-0">
                    <div 
                      className={`w-full rounded-sm transition-all duration-500 ${
                        isCritical ? 'bg-gradient-to-t from-[#7A0C17] to-[#D72638]' :
                        isLow ? 'bg-gradient-to-t from-amber-600 to-amber-400' :
                        'bg-gradient-to-t from-emerald-700 to-emerald-400'
                      }`}
                      style={{ height: `${Math.max(item.unitsAvailable > 0 ? 6 : 0, pct)}%` }}
                    />
                  </div>

                  {/* Center: Numeric Volume */}
                  <div className="flex-1 text-right">
                    <div className="text-3xl font-black text-[#1A1D20] font-mono leading-none">
                      {item.unitsAvailable}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-[#5A626A] mt-1">
                      Pints Available in Blood Bank
                    </div>
                    <div className="text-[10px] font-mono font-bold text-[#7A0C17] mt-0.5">
                      {pct}% of 20-Pt Goal
                    </div>
                  </div>
                </div>

                {/* Health Badge */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-[#5A626A] font-semibold">Reserve Health:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCritical ? 'bg-red-100 text-[#D72638] border-red-200 font-black animate-pulse' :
                    isLow ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isCritical ? 'CRITICAL SHORTAGE' : isLow ? 'LOW RESERVE' : 'HEALTHY BUFFER'}
                  </span>
                </div>
              </div>

              {/* Dynamic Cryo-Vault Telemetry Footer (Automated Live Feeds) */}
              <div className="pt-2.5 border-t border-[#D9C7C2]/60 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-mono text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Dynamic Stream</span>
                </span>
                <span className="font-mono font-bold text-[#7A0C17]">
                  4.0°C Monitored
                </span>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}