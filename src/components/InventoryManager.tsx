import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BloodInventoryUnit, BloodType } from '../types';
import { Package, Plus, Minus, Droplet } from 'lucide-react';
import { getInventory, updateInventoryUnits } from '../services/storage';

export default function InventoryManager() {
  const [inventory, setInventory] = useState<BloodInventoryUnit[]>(getInventory());

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

  const totalUnits = inventory.reduce((acc, curr) => acc + curr.unitsAvailable, 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 sm:space-y-8 pb-12"
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="p-6 sm:p-8 rounded-2xl bg-[#0E0E10]/85 backdrop-blur-xl border border-[#6A040F]/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D00000]/20 text-red-200 text-xs font-bold border border-[#D00000]/40 mb-2">
            <Package className="w-3.5 h-3.5 text-[#D00000]" />
            <span>Blood Bank Cryo-Storage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cryo-Vault Blood Reserves
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time tracking of cryo-preserved whole blood and packed red blood cells across all 8 ABO/Rh alleles.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#2A2A2F]/80 p-3.5 rounded-2xl border border-[#6A040F]/40 shrink-0">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Total Bank Reserves</span>
            <span className="text-2xl font-black text-white">{totalUnits} Pints</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#D00000]/20 text-[#D00000] flex items-center justify-center border border-[#D00000]/30">
            <Droplet className="w-5 h-5 fill-current" />
          </div>
        </div>
      </motion.div>

      {/* Grid of 8 Blood Types with Framer Motion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {inventory.map((item, index) => {
          const isCritical = item.unitsAvailable < 5;
          const isLow = item.unitsAvailable >= 5 && item.unitsAvailable < 15;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              whileHover={{ y: -3, scale: 1.015 }}
              className="p-5 rounded-2xl bg-[#0E0E10]/85 backdrop-blur-xl border border-[#6A040F]/45 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D00000] to-[#6A040F] flex flex-col items-center justify-center font-black text-white shadow-lg shadow-black/60 border border-[#D00000]/40">
                      <span className="text-[10px] uppercase font-bold text-red-200">Type</span>
                      <span className="text-base">{item.bloodType}</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base">Blood Group {item.bloodType}</h3>
                      <div className="text-[11px] text-slate-300">
                        {item.bloodType === 'O-' ? 'Universal Red Cell Donor' :
                         item.bloodType === 'AB+' ? 'Universal Red Cell Recipient' :
                         'Specific Transfusion Allele'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Level Display */}
                <div className="my-4 p-3 rounded-xl bg-[#2A2A2F]/80 border border-[#2A2A2F] text-center">
                  <div className="text-3xl font-black text-white font-mono">
                    {item.unitsAvailable}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                    Pints Available in Cryo-Vault
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-400">Reserve Health:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCritical ? 'bg-[#D00000]/20 text-red-200 border-[#D00000]/50' :
                    isLow ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  }`}>
                    {isCritical ? 'CRITICAL SHORTAGE' : isLow ? 'LOW RESERVE' : 'HEALTHY'}
                  </span>
                </div>
              </div>

              {/* Adjust Units Stepper */}
              <div className="pt-3 border-t border-[#2A2A2F] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleUpdateUnits(item.bloodType, -1)}
                  disabled={item.unitsAvailable <= 0}
                  className="flex-1 py-2 rounded-xl bg-[#2A2A2F] hover:bg-[#2A2A2F]/80 text-slate-200 hover:text-white border border-[#2A2A2F] flex items-center justify-center gap-1 text-xs font-semibold disabled:opacity-40 cursor-pointer transition-colors"
                  title="Dispense 1 pint"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Dispense</span>
                </button>
                <button
                  onClick={() => handleUpdateUnits(item.bloodType, 1)}
                  className="flex-1 py-2 rounded-xl bg-[#D00000]/25 hover:bg-[#D00000]/40 text-red-100 border border-[#D00000]/40 flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Restock 1 pint"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Restock</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
