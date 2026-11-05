import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BloodInventoryUnit, BloodType } from '../types';
import { 
  Package, 
  Plus, 
  Minus, 
  Droplet, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  Filter, 
  Activity, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { getInventory, updateInventoryUnits, saveInventory } from '../services/storage';

export default function InventoryManager() {
  const [inventory, setInventory] = useState<BloodInventoryUnit[]>(getInventory());
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CRITICAL' | 'RH_NEG' | 'RH_POS' | 'UNIVERSAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  const loadData = () => {
    setInventory(getInventory());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleUpdateUnits = (type: BloodType, delta: number) => {
    const updated = updateInventoryUnits(type, delta);
    setInventory(updated);
  };

  // Quick 1-click clinical sample simulation
  const handleSimulateData = () => {
    setIsSimulating(true);
    const clinicalSample: Record<BloodType, number> = {
      'O-': 12,
      'O+': 24,
      'A-': 8,
      'A+': 22,
      'B-': 6,
      'B+': 18,
      'AB-': 4,
      'AB+': 16,
    };

    const simulatedList: BloodInventoryUnit[] = inventory.map(item => {
      const targetUnits = clinicalSample[item.bloodType] || 10;
      return {
        ...item,
        unitsAvailable: targetUnits,
        status: targetUnits >= 15 ? 'optimal' : targetUnits >= 5 ? 'low' : 'critical'
      };
    });

    saveInventory(simulatedList);
    setInventory(simulatedList);
    setTimeout(() => setIsSimulating(false), 400);
  };

  // Reset all to zero
  const handleResetToZero = () => {
    const zeroList: BloodInventoryUnit[] = inventory.map(item => ({
      ...item,
      unitsAvailable: 0,
      status: 'critical'
    }));
    saveInventory(zeroList);
    setInventory(zeroList);
  };

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
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Power BI Executive Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/30 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Power BI Clinical Telemetry Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Cryo-Vault Blood Reserves
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-2xl">
            Real-time multi-allele inventory surveillance, automated deficit alert thresholds, and Power BI visual reserve analytics.
          </p>
        </div>

        {/* Quick Batch Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleSimulateData}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D72638] to-[#7A0C17] hover:from-[#b51d2c] hover:to-[#600811] text-white text-xs font-bold shadow-md shadow-[#D72638]/20 active:scale-95 transition-all cursor-pointer"
            title="Populate clinical demo values across all 8 alleles"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSimulating ? 'Calibrating...' : 'Simulate Clinical Batch'}</span>
          </button>

          <button
            onClick={handleResetToZero}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F1EF] hover:bg-slate-200 border border-[#D9C7C2] text-[#4A5568] hover:text-[#1A1D20] text-xs font-semibold active:scale-95 transition-all cursor-pointer"
            title="Reset all reserves to 0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Zero Vault</span>
          </button>
        </div>
      </div>

      {/* 4 Power BI Executive KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Total Bank Reserves */}
        <div className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col justify-between">
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
        </div>

        {/* Tile 2: Vault Deficit Monitor */}
        <div className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col justify-between">
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
        </div>

        {/* Tile 3: Universal O- Emergency Buffer */}
        <div className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col justify-between">
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
        </div>

        {/* Tile 4: Rh-Factor Distribution Ratio */}
        <div className="p-5 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col justify-between">
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
        </div>
      </div>

      {/* Graphical Stock Level Comparison Matrix (Power BI Bar Chart) */}
      <div className="p-6 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs space-y-4">
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
              style={{ bottom: '75%' }} // 20 out of 25 scale
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
                      style={{ height: `${Math.max(4, heightPct)}%` }}
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
      </div>

      {/* Slicers & Filters Ribbon */}
      <div className="p-4 rounded-2xl bg-white/95 border border-[#D9C7C2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      </div>

      {/* Grid of 8 Graphical Cryo-Pod Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredInventory.map((item, index) => {
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
                      style={{ height: `${Math.max(6, pct)}%` }}
                    />
                  </div>

                  {/* Center: Numeric Volume */}
                  <div className="flex-1 text-right">
                    <div className="text-3xl font-black text-[#1A1D20] font-mono leading-none">
                      {item.unitsAvailable}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-[#5A626A] mt-1">
                      Pints in Cryo-Vault
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

              {/* Adjust Units Stepper & Quick +5 Batch */}
              <div className="pt-3 border-t border-[#D9C7C2]/60 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleUpdateUnits(item.bloodType, -1)}
                    disabled={item.unitsAvailable <= 0}
                    className="flex-1 py-1.5 rounded-xl bg-[#F5F1EF] hover:bg-slate-200 text-[#1A1D20] border border-[#D9C7C2] flex items-center justify-center gap-1 text-xs font-semibold disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                    title="Dispense 1 pint"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>-1 Dispense</span>
                  </button>
                  <button
                    onClick={() => handleUpdateUnits(item.bloodType, 1)}
                    className="flex-1 py-1.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white border border-[#D72638]/40 flex items-center justify-center gap-1 text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-xs"
                    title="Restock 1 pint"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+1 Restock</span>
                  </button>
                </div>

                <button
                  onClick={() => handleUpdateUnits(item.bloodType, 5)}
                  className="w-full py-1 rounded-lg bg-[#F5F1EF] hover:bg-[#D72638]/10 text-[#7A0C17] hover:text-[#D72638] border border-[#D9C7C2]/70 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <span>+5 Quick Batch Injection</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
