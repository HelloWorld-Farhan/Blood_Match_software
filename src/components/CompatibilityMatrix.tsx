import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BloodType } from '../types';
import { BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';
import { HeartPulse, CheckCircle2, Info } from 'lucide-react';

export default function CompatibilityMatrix() {
  const bloodTypes: BloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const [selectedType, setSelectedType] = useState<BloodType>('O-');

  const selectedInfo = BLOOD_COMPATIBILITY_TABLE[selectedType];

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
            <HeartPulse className="w-3.5 h-3.5 text-[#D00000]" />
            <span>Clinical Transfusion Standards</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ABO & RhD Compatibility Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Select any blood group below to visualize safe donation targets and compatible donor red cells.
          </p>
        </div>

        {/* Quick Blood Group Badges */}
        <div className="flex flex-wrap gap-1.5 bg-[#2A2A2F]/80 p-2 rounded-2xl border border-[#2A2A2F] shrink-0">
          {bloodTypes.map(bt => (
            <button
              key={bt}
              type="button"
              onClick={() => setSelectedType(bt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedType === bt
                  ? 'bg-[#D00000] text-white shadow-lg shadow-[#D00000]/50 scale-105'
                  : 'bg-[#0E0E10] text-slate-300 hover:text-white border border-[#2A2A2F]'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Selected Type Detail Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 sm:p-6 rounded-2xl bg-[#0E0E10]/85 backdrop-blur-xl border border-[#6A040F]/45 shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400">Selected Profile</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2A2A2F] text-slate-200">
                {selectedInfo.rhFactor ? 'Rh Positive (+)' : 'Rh Negative (-)'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D00000] to-[#6A040F] flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-black/80 border border-[#D00000]/40">
                {selectedType}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Group {selectedType}</h3>
                <p className="text-xs text-slate-300 font-mono">{selectedInfo.frequency}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#2A2A2F]/70 border border-[#2A2A2F] flex justify-between">
                <span className="text-slate-400">Red Cell Antigens:</span>
                <span className="font-bold text-white">{selectedInfo.antigens}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#2A2A2F]/70 border border-[#2A2A2F] flex justify-between">
                <span className="text-slate-400">Plasma Antibodies:</span>
                <span className="font-bold text-white">{selectedInfo.antibodies}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#2A2A2F] text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#D00000] shrink-0" />
            <span>Strict antigenic matching safeguards patient hemodynamics.</span>
          </div>
        </motion.div>

        {/* Can Donate To (Eligible Recipients) */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 sm:p-6 rounded-2xl bg-[#0E0E10]/85 backdrop-blur-xl border border-[#6A040F]/45 shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Can Donate Blood To</span>
              </h4>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {selectedInfo.canGiveTo.length} of 8 Groups
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 my-4">
              {bloodTypes.map(bt => {
                const canGive = selectedInfo.canGiveTo.includes(bt);
                return (
                  <div
                    key={bt}
                    className={`py-3 rounded-2xl flex flex-col items-center justify-center border font-black text-xs transition-all ${
                      canGive
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/50'
                        : 'bg-[#2A2A2F]/30 border-[#2A2A2F] text-slate-500 opacity-40'
                    }`}
                  >
                    <span>{bt}</span>
                    <span className="text-[9px] font-normal mt-0.5">
                      {canGive ? '✓ Safe' : '✗ No'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {selectedType === 'O-'
              ? 'Universal Red Blood Cell Donor: O- erythrocytes lack A, B, and Rh antigens, making them safely transfusable to all 8 blood groups in critical resuscitation emergencies.'
              : `Patients with ${selectedType} can safely donate red blood cells to: ${selectedInfo.canGiveTo.join(', ')}.`}
          </p>
        </motion.div>

        {/* Can Receive From (Eligible Donors) */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 sm:p-6 rounded-2xl bg-[#0E0E10]/85 backdrop-blur-xl border border-[#6A040F]/45 shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Can Receive Blood From</span>
              </h4>
              <span className="text-xs font-bold text-blue-400 font-mono">
                {selectedInfo.canReceiveFrom.length} of 8 Groups
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 my-4">
              {bloodTypes.map(bt => {
                const canReceive = selectedInfo.canReceiveFrom.includes(bt);
                return (
                  <div
                    key={bt}
                    className={`py-3 rounded-2xl flex flex-col items-center justify-center border font-black text-xs transition-all ${
                      canReceive
                        ? 'bg-blue-950/40 border-blue-500/50 text-blue-300 shadow-md shadow-blue-950/50'
                        : 'bg-[#2A2A2F]/30 border-[#2A2A2F] text-slate-500 opacity-40'
                    }`}
                  >
                    <span>{bt}</span>
                    <span className="text-[9px] font-normal mt-0.5">
                      {canReceive ? '✓ Safe' : '✗ No'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {selectedType === 'AB+'
              ? 'Universal Red Blood Cell Recipient: AB+ individuals have both A, B and Rh antigens, allowing them to receive packed red blood cells from all 8 blood types.'
              : `A recipient with ${selectedType} blood can safely accept transfusions from: ${selectedInfo.canReceiveFrom.join(', ')}.`}
          </p>
        </motion.div>
      </div>

      {/* Full 8x8 Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="p-6 rounded-2xl bg-[#0E0E10]/85 backdrop-blur-xl border border-[#6A040F]/45 shadow-xl overflow-x-auto no-scrollbar"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Full Transfusion Cross-Match Registry</h3>
            <p className="text-xs text-slate-400">Rows represent Donor group; columns represent Recipient group</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Standard Red Blood Cells (RBC)</span>
        </div>

        <table className="w-full min-w-[560px] text-center text-xs">
          <thead>
            <tr className="border-b border-[#2A2A2F] text-slate-400">
              <th className="py-2.5 text-left font-bold pl-2">Donor \ Recipient</th>
              {bloodTypes.map(rt => (
                <th key={rt} className="py-2.5 font-bold text-white">{rt}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2F]/60">
            {bloodTypes.map(dt => (
              <tr key={dt} className="hover:bg-[#2A2A2F]/40 transition-colors">
                <td className="py-3 text-left font-black text-white pl-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D00000]"></span>
                  <span>{dt}</span>
                </td>
                {bloodTypes.map(rt => {
                  const safe = BLOOD_COMPATIBILITY_TABLE[dt].canGiveTo.includes(rt);
                  return (
                    <td key={rt} className="py-3">
                      {safe ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-600">
                          –
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
