import React, { useState } from 'react';
import { BloodType } from '../types';
import { BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';
import { HeartPulse, CheckCircle2, XCircle, ShieldCheck, Info, Sparkles } from 'lucide-react';

export default function CompatibilityMatrix() {
  const bloodTypes: BloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const [selectedType, setSelectedType] = useState<BloodType>('O-');

  const selectedInfo = BLOOD_COMPATIBILITY_TABLE[selectedType];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 mb-2">
            <HeartPulse className="w-3.5 h-3.5 text-purple-400" />
            <span>Clinical Transfusion Standards</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ABO & RhD Compatibility Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Select any blood group below to visualize who they can safely donate to, and which blood groups they can safely receive without provoking acute hemolytic transfusion reactions.
          </p>
        </div>

        {/* Quick Blood Group Badges */}
        <div className="flex flex-wrap gap-1.5 bg-slate-950/80 p-2 rounded-2xl border border-slate-800 shrink-0">
          {bloodTypes.map(bt => (
            <button
              key={bt}
              type="button"
              onClick={() => setSelectedType(bt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedType === bt
                  ? 'bg-blood-600 text-white shadow-lg shadow-blood-900/50 scale-105'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Type Detail Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400">Selected Profile</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {selectedInfo.rhFactor ? 'Rh Positive (+)' : 'Rh Negative (-)'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blood-600 to-blood-900 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-blood-950/80 border border-blood-500/40">
                {selectedType}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Group {selectedType}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedInfo.frequency}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Red Cell Antigens:</span>
                <span className="font-bold text-white">{selectedInfo.antigens}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Plasma Antibodies:</span>
                <span className="font-bold text-white">{selectedInfo.antibodies}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blood-400 shrink-0" />
            <span>Strict antigenic matching safeguards patient hemodynamics.</span>
          </div>
        </div>

        {/* Can Donate To (Eligible Recipients) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col justify-between">
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
                        : 'bg-slate-950/40 border-slate-800/60 text-slate-600 opacity-40'
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

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {selectedType === 'O-'
              ? 'Universal Red Blood Cell Donor: O- erythrocytes lack A, B, and Rh antigens, making them safely transfusable to all 8 blood groups in critical resuscitation emergencies.'
              : `Patients with ${selectedType} can safely donate red blood cells to: ${selectedInfo.canGiveTo.join(', ')}.`}
          </p>
        </div>

        {/* Can Receive From (Eligible Donors) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col justify-between">
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
                        : 'bg-slate-950/40 border-slate-800/60 text-slate-600 opacity-40'
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

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {selectedType === 'AB+'
              ? 'Universal Recipient: AB+ individuals possess neither anti-A nor anti-B antibodies in their plasma and carry the Rh antigen, enabling them to safely receive red blood cells from any blood type.'
              : `A recipient with ${selectedType} blood can safely accept transfusions from: ${selectedInfo.canReceiveFrom.join(', ')}.`}
          </p>
        </div>
      </div>

      {/* Comprehensive 8x8 Master Matrix Table */}
      <div className="p-5 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Full Transfusion Cross-Match Registry</h3>
            <p className="text-xs text-slate-400">Rows represent Donor group; columns represent Recipient group</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Standard Red Blood Cells (RBC)</span>
        </div>

        <table className="w-full text-center text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-bold">
              <th className="py-3 px-3 text-left">Donor \ Recipient</th>
              {bloodTypes.map(rType => (
                <th key={rType} className="py-3 px-2 font-black text-white">{rType}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {bloodTypes.map(dType => (
              <tr key={dType} className={dType === selectedType ? 'bg-blood-950/20' : 'hover:bg-slate-800/20'}>
                <td className="py-3 px-3 text-left font-black text-white font-sans flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blood-500" />
                  <span>{dType}</span>
                </td>
                {bloodTypes.map(rType => {
                  const isMatch = BLOOD_COMPATIBILITY_TABLE[dType].canGiveTo.includes(rType);
                  return (
                    <td key={rType} className="py-3 px-2">
                      {isMatch ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-slate-600 text-[11px]">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
