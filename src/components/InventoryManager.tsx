import React from 'react';
import { BloodInventoryUnit, BloodType } from '../types';
import { Package, Plus, Minus, AlertCircle, Droplet, ShieldCheck, Check } from 'lucide-react';

interface InventoryManagerProps {
  inventory: BloodInventoryUnit[];
  onUpdateUnits: (type: BloodType, delta: number) => void;
}

export default function InventoryManager({ inventory, onUpdateUnits }: InventoryManagerProps) {
  const totalUnits = inventory.reduce((acc, curr) => acc + curr.unitsAvailable, 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>Blood Bank Cryo-Storage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Blood Units Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time tracking of cryo-preserved and refrigerated whole blood and packed red blood cells across all 8 types.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shrink-0">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Total Bank Reserves</span>
            <span className="text-2xl font-black text-white">{totalUnits} Units</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blood-600/20 text-blood-400 flex items-center justify-center border border-blood-500/30">
            <Droplet className="w-5 h-5 fill-blood-500" />
          </div>
        </div>
      </div>

      {/* Grid of 8 Blood Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {inventory.map(item => {
          const isCritical = item.unitsAvailable < 5;
          const isLow = item.unitsAvailable >= 5 && item.unitsAvailable < 15;
          const isOptimal = item.unitsAvailable >= 15;

          return (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border transition-all backdrop-blur-xl space-y-4 ${
                isCritical
                  ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700/60'
                  : isLow
                  ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700/60'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blood-600 to-blood-800 flex items-center justify-center font-black text-lg text-white shadow-md shadow-blood-950/60 border border-blood-500/40">
                  {item.bloodType}
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isCritical
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : isLow
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {item.status}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Available Pints
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-white">{item.unitsAvailable}</span>
                  <span className="text-xs text-slate-400 font-mono">units in vault</span>
                </div>
              </div>

              {/* Quick Stepper */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-400">Inventory Adjustment:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={item.unitsAvailable <= 0}
                    onClick={() => onUpdateUnits(item.bloodType, -1)}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                    title="Dispatch 1 Unit"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateUnits(item.bloodType, 1)}
                    className="w-8 h-8 rounded-xl bg-blood-600 hover:bg-blood-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-md shadow-blood-900/40"
                    title="Intake 1 Unit"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono truncate">
                {item.storageFacility} · Tested {item.lastTestedDate}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

