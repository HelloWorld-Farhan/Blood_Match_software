import React, { useState } from 'react';
import { BloodType, Donor, EmergencyRequest, BloodInventoryUnit, ActiveTab } from '../types';
import { checkCompatibility, BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';
import { 
  Users, 
  AlertTriangle, 
  Package, 
  HeartHandshake, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  Plus,
  Sparkles,
  Droplet
} from 'lucide-react';

interface DashboardProps {
  donors: Donor[];
  requests: EmergencyRequest[];
  inventory: BloodInventoryUnit[];
  onNavigate: (tab: ActiveTab) => void;
  onOpenDonorModal: () => void;
  onOpenRequestModal: () => void;
}

export default function Dashboard({
  donors,
  requests,
  inventory,
  onNavigate,
  onOpenDonorModal,
  onOpenRequestModal,
}: DashboardProps) {
  const [quickDonorType, setQuickDonorType] = useState<BloodType>('O-');
  const [quickRecipientType, setQuickRecipientType] = useState<BloodType>('A+');

  const compatibility = checkCompatibility(quickDonorType, quickRecipientType);
  const totalInventoryUnits = inventory.reduce((acc, curr) => acc + curr.unitsAvailable, 0);
  const activeRequests = requests.filter(r => r.status === 'PENDING');
  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-blood-950/70 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blood-600/20 border border-blood-500/40 text-blood-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-blood-500 animate-pulse" />
            <span>Transfusion Compatibility Engine Online</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Universal Blood Compatibility & Emergency Matching
          </h1>
          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">
            Eliminate transfusion mismatch risks with real-time RhD and antigenic cross-matching, instant local donor coordination, and centralized blood bank inventory tracking.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenRequestModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blood-600 to-blood-700 hover:from-blood-500 hover:to-blood-600 text-white text-xs font-bold shadow-lg shadow-blood-900/50 flex items-center gap-2 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Broadcast Emergency Request</span>
            </button>
            <button
              type="button"
              onClick={onOpenDonorModal}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blood-400" />
              <span>Register New Donor</span>
            </button>
          </div>
        </div>

        {/* Ambient Decorative Badge */}
        <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col items-center justify-center w-36 h-36 rounded-full bg-slate-950/60 border border-blood-500/30 p-4 text-center backdrop-blur-md">
          <Droplet className="w-8 h-8 text-blood-500 fill-blood-500 animate-pulse-subtle" />
          <span className="text-xs font-extrabold text-white mt-1">Zero Mismatch</span>
          <span className="text-[10px] text-slate-400">Strict Antigens</span>
        </div>
      </div>

      {/* KPI Metric Cards (All Initially 0 as Requested) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Donors */}
        <div 
          onClick={() => onNavigate('donors')}
          className="group p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 backdrop-blur-md transition-all cursor-pointer hover:shadow-xl hover:shadow-slate-950/40"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Registered Donors</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{donors.length}</span>
            <span className="text-[11px] text-slate-500 font-mono">active pool</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 group-hover:text-blue-300">
            <span>Manage Directory</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Active Emergency Requests */}
        <div 
          onClick={() => onNavigate('requests')}
          className="group p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blood-500/50 backdrop-blur-md transition-all cursor-pointer hover:shadow-xl hover:shadow-blood-950/40"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Pending Requests</span>
            <div className="w-8 h-8 rounded-xl bg-blood-500/10 text-blood-400 flex items-center justify-center border border-blood-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{activeRequests.length}</span>
            <span className="text-[11px] text-blood-400 font-mono">urgent</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 group-hover:text-blood-300">
            <span>Live Dispatch Board</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Blood Bank Units */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="group p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 backdrop-blur-md transition-all cursor-pointer hover:shadow-xl hover:shadow-emerald-950/40"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Inventory Units</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalInventoryUnits}</span>
            <span className="text-[11px] text-emerald-400 font-mono">pints available</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 group-hover:text-emerald-300">
            <span>Inspect Bank Stocks</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Universal Donor Index */}
        <div 
          onClick={() => onNavigate('compatibility')}
          className="group p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 backdrop-blur-md transition-all cursor-pointer hover:shadow-xl hover:shadow-purple-950/40"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">ABO / Rh Matrices</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">8 / 8</span>
            <span className="text-[11px] text-purple-400 font-mono">types mapped</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 group-hover:text-purple-300">
            <span>Explore Matrix</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>

      {/* Two Column Grid: Live Quick Matcher + Emergency Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Quick Cross-Match Engine (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blood-600/20 border border-blood-500/30 text-blood-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Interactive Match Evaluator</h2>
                  <p className="text-xs text-slate-400">Instantaneous RhD and ABO antigenic cross-verification</p>
                </div>
              </div>

              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Live Simulator
              </span>
            </div>

            {/* Selector Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
              {/* Donor Selection */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-blood-400" />
                  <span>Donor Blood Group</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {bloodTypes.map(bt => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setQuickDonorType(bt)}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        quickDonorType === bt
                          ? 'bg-blood-600 text-white shadow-md shadow-blood-900/60 scale-105'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 mt-2 block font-mono">
                  {BLOOD_COMPATIBILITY_TABLE[quickDonorType].frequency}
                </span>
              </div>

              {/* Recipient Selection */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Recipient Blood Group</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {bloodTypes.map(bt => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setQuickRecipientType(bt)}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        quickRecipientType === bt
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/60 scale-105'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 mt-2 block font-mono">
                  Antibodies: {BLOOD_COMPATIBILITY_TABLE[quickRecipientType].antibodies}
                </span>
              </div>
            </div>

            {/* Verdict Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              compatibility.isCompatible
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${compatibility.isCompatible ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-xs font-black tracking-wider uppercase">
                    {compatibility.isCompatible ? 'Transfusion Permissible' : 'Critical Hazard — Incompatible'}
                  </span>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                  {compatibility.matchScore}% Match
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {compatibility.clinicalNote}
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>O- is universal red-cell donor; AB+ is universal recipient.</span>
            <button
              type="button"
              onClick={() => onNavigate('compatibility')}
              className="font-bold text-blood-400 hover:text-blood-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* RIGHT: Live Emergency Request Board (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Urgent Requests</h2>
                  <p className="text-xs text-slate-400">Hospital transfusion alarms</p>
                </div>
              </div>

              <span className="text-xs font-bold text-blood-400 px-2 py-0.5 rounded-full bg-blood-500/10 border border-blood-500/20">
                {activeRequests.length} Active
              </span>
            </div>

            {/* Requests Stream */}
            <div className="my-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {activeRequests.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/50 border border-slate-800/60 text-slate-400 space-y-2">
                  <ShieldCheck className="w-8 h-8 mx-auto text-emerald-400/80" />
                  <p className="text-xs font-bold text-slate-300">All Requests Fulfilled</p>
                  <p className="text-[11px] text-slate-500">
                    No active emergency calls right now. System is operating under standard protocols.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenRequestModal}
                    className="mt-2 text-xs font-bold text-blood-400 hover:underline cursor-pointer"
                  >
                    + Create Emergency Call
                  </button>
                </div>
              ) : (
                activeRequests.slice(0, 3).map(req => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-blood-600 text-white font-black text-xs">
                          {req.bloodType}
                        </span>
                        <span className="text-xs font-bold text-white">{req.patientName}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        req.urgency === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {req.urgency}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{req.hospitalName}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <Droplet className="w-3 h-3 text-blood-400 shrink-0" />
                        <span>{req.unitsNeeded} Units Needed</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('requests')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open Emergency Dispatch Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

