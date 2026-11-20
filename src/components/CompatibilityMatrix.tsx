import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { BloodType } from '../types';
import { BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';
import { HeartPulse, CheckCircle2, Info, Activity, ShieldCheck, Dna, BarChart3, ChevronLeft, ChevronRight, ArrowDown, ArrowRight, X } from 'lucide-react';

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

export default function CompatibilityMatrix() {
  const bloodTypes: BloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const [selectedType, setSelectedType] = useState<BloodType>('O-');
  const [hoveredCell, setHoveredCell] = useState<{ donor: BloodType; recipient: BloodType } | null>(null);

  const selectedInfo = BLOOD_COMPATIBILITY_TABLE[selectedType];
  const currentIndex = bloodTypes.indexOf(selectedType);

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + bloodTypes.length) % bloodTypes.length;
    setSelectedType(bloodTypes[prevIdx]);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % bloodTypes.length;
    setSelectedType(bloodTypes[nextIdx]);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-2 sm:pb-3 relative z-10">
      {/* Header */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.12 }}
        className="p-6 sm:p-8 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/30 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Safe Blood Matching Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Blood Group Compatibility Guide
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-2xl">
            Select any blood group below to see which groups can safely give or receive blood.
          </p>
        </div>

        {/* Quick Blood Group Badges */}
        <div className="flex flex-wrap gap-1.5 bg-[#F5F1EF] p-2 rounded-2xl border border-[#D9C7C2] shrink-0">
          {bloodTypes.map(bt => (
            <button
              key={bt}
              type="button"
              onClick={() => setSelectedType(bt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedType === bt
                  ? 'bg-[#D72638] text-white shadow-md shadow-[#D72638]/30 scale-105'
                  : 'bg-white text-[#4A5568] hover:text-[#1A1D20] border border-[#D9C7C2]'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Featured Large-Format Molecular Genetics & Cross-Match Bay (4122-177145595_medium.mp4) */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.12 }}
        className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-6">
          {/* Prominent High-Definition Molecular Video Monitor */}
          <div 
            className="relative w-full lg:w-3/5 rounded-2xl overflow-hidden border border-[#D72638]/40 shadow-md bg-black h-[220px] xs:h-[260px] sm:h-[300px] flex items-center justify-center"
            style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
          >
            <video
              src="/4122-177145595_medium.mp4?v=3"
              poster="/4122-177145595_medium_poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ transform: 'translateZ(0)' }}
            />
            {/* Live Molecular Telemetry Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
            
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold">
                <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping" />
                ABO / RhD Molecular Sequencing
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D72638]/90 text-white font-mono font-bold text-[11px] shadow-xs">
                DNA Strand 60fps
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white pointer-events-none">
              <div>
                <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Active Blood Group</span>
                <span className="text-sm font-black font-mono">Blood Group {selectedType} ({selectedInfo.rhFactor ? 'Rh+' : 'Rh-'})</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Match Accuracy</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">100% Verified</span>
                </div>
                <div className="text-right border-l border-white/20 pl-3">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Safety Standard</span>
                  <span className="text-sm font-black text-white font-mono">Medical Standard</span>
                </div>
              </div>
            </div>
          </div>

          {/* Molecular Genetics Diagnostics */}
          <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/20 mb-2">
                <Dna className="w-3.5 h-3.5 text-[#D72638]" />
                <span>How Blood Matching Works</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#1A1D20] tracking-tight">
                Safe Donor &amp; Recipient Rules
              </h2>
              <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                Different blood groups have natural proteins. Giving the wrong blood group can cause harmful clumping, so matching donor and recipient blood types is essential for safe transfusions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Red Cell Antigens</span>
                <span className="text-sm font-black text-[#1A1D20] mt-0.5 block truncate">{selectedInfo.antigens}</span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">Proteins on red blood cells</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Plasma Antibodies</span>
                <span className="text-sm font-black text-[#D72638] mt-0.5 block truncate">{selectedInfo.antibodies}</span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">Defenses in blood liquid</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-900 font-semibold text-xs">Transfusion Safety Check</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                PASSED
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Selected Type Detail Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#7A0C17]">Selected Profile</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] border border-[#D72638]/20">
                  {currentIndex + 1} of 8
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 rounded-lg bg-[#F5F1EF] hover:bg-[#E8DFDC] text-[#7A0C17] border border-[#D9C7C2] transition-colors cursor-pointer"
                  title="Previous Blood Group"
                  aria-label="Previous Blood Group"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 rounded-lg bg-[#F5F1EF] hover:bg-[#E8DFDC] text-[#7A0C17] border border-[#D9C7C2] transition-colors cursor-pointer"
                  title="Next Blood Group"
                  aria-label="Next Blood Group"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5F1EF] text-[#7A0C17] border border-[#D9C7C2] ml-1">
                  {selectedInfo.rhFactor ? 'Rh Positive (+)' : 'Rh Negative (-)'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] flex items-center justify-center font-black text-2xl text-white shadow-md shadow-[#D72638]/20 border border-[#D72638]/40">
                {selectedType}
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1A1D20]">Group {selectedType}</h3>
                <p className="text-xs text-[#5A626A] font-mono">{selectedInfo.frequency}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] flex justify-between">
                <span className="text-[#5A626A]">Red Cell Antigens:</span>
                <span className="font-bold text-[#1A1D20]">{selectedInfo.antigens}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] flex justify-between">
                <span className="text-[#5A626A]">Plasma Antibodies:</span>
                <span className="font-bold text-[#1A1D20]">{selectedInfo.antibodies}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9C7C2]/60 text-[11px] text-[#5A626A] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#D72638] shrink-0" />
            <span>Matching blood types ensures safe transfusions without harmful reactions.</span>
          </div>
        </motion.div>

        {/* Can Donate To (Eligible Recipients) */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Can Donate Blood To</span>
              </h4>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {selectedInfo.canGiveTo.length} of 8 Groups
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 my-4">
              {bloodTypes.map(bt => {
                const canGive = selectedInfo.canGiveTo.includes(bt);
                const isSelected = bt === selectedType;
                return (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setSelectedType(bt)}
                    title={`Switch focus to Group ${bt}`}
                    className={`py-3 rounded-2xl flex flex-col items-center justify-center border font-black text-xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                      isSelected
                        ? 'ring-2 ring-[#D72638] ring-offset-2 shadow-sm'
                        : ''
                    } ${
                      canGive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs hover:bg-emerald-100'
                        : 'bg-[#F5F1EF] border-[#D9C7C2] text-slate-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span>{bt}</span>
                    <span className="text-[9px] font-normal mt-0.5">
                      {canGive ? '✓ Safe' : '✗ No'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-[#5A626A] leading-relaxed">
            {selectedType === 'O-'
              ? 'Universal Red Blood Cell Donor: O- erythrocytes lack A, B, and Rh antigens, making them safely transfusable to all 8 blood groups in critical resuscitation emergencies.'
              : `Patients with ${selectedType} can safely donate red blood cells to: ${selectedInfo.canGiveTo.join(', ')}.`}
          </p>
        </motion.div>

        {/* Can Receive From (Eligible Donors) */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Can Receive Blood From</span>
              </h4>
              <span className="text-xs font-bold text-blue-700 font-mono">
                {selectedInfo.canReceiveFrom.length} of 8 Groups
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 my-4">
              {bloodTypes.map(bt => {
                const canReceive = selectedInfo.canReceiveFrom.includes(bt);
                const isSelected = bt === selectedType;
                return (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setSelectedType(bt)}
                    title={`Switch focus to Group ${bt}`}
                    className={`py-3 rounded-2xl flex flex-col items-center justify-center border font-black text-xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                      isSelected
                        ? 'ring-2 ring-[#D72638] ring-offset-2 shadow-sm'
                        : ''
                    } ${
                      canReceive
                        ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs hover:bg-blue-100'
                        : 'bg-[#F5F1EF] border-[#D9C7C2] text-slate-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span>{bt}</span>
                    <span className="text-[9px] font-normal mt-0.5">
                      {canReceive ? '✓ Safe' : '✗ No'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-[#5A626A] leading-relaxed">
            {selectedType === 'AB+'
              ? 'Universal Red Blood Cell Recipient: AB+ individuals have both A, B and Rh antigens, allowing them to receive packed red blood cells from all 8 blood types.'
              : `A recipient with ${selectedType} blood can safely accept transfusions from: ${selectedInfo.canReceiveFrom.join(', ')}.`}
          </p>
        </motion.div>
      </div>

      {/* Full 8x8 Grid */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.12 }}
        className="p-4 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm overflow-x-auto no-scrollbar"
      >
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#1A1D20]">Full Transfusion Cross-Match Registry</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-[#D72638]">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Rows: DONOR (Giving Blood)</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Columns: RECIPIENT (Receiving Blood)</span>
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-[#7A0C17] font-semibold bg-[#F5F1EF] px-2.5 py-1 rounded-md self-start sm:self-auto border border-[#D9C7C2]/60">
            Standard Red Blood Cells (RBC)
          </span>
        </div>

        <table className="w-full min-w-[620px] text-center text-xs border-collapse">
          <thead>
            {/* Top Recipient Axis Descriptor Row */}
            <tr>
              <th className="p-0 border-b border-[#D9C7C2]"></th>
              <th colSpan={8} className="py-2 px-2 text-center bg-sky-50/80 border-b border-sky-200/80 rounded-t-xl">
                <div className="inline-flex items-center justify-center gap-2 text-sky-900 font-black text-[11px] uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
                  <span>RECIPIENT / PATIENT (Receiving Blood ↓)</span>
                  <span className="text-[10px] text-sky-700 font-normal lowercase hidden sm:inline">(read columns vertically)</span>
                </div>
              </th>
            </tr>
            <tr className="border-b border-[#D9C7C2] text-[#5A626A]">
              {/* Corner Cell clearly separating Axes */}
              <th className="py-2.5 px-3 text-left bg-slate-50/90 border-r border-[#D9C7C2] align-middle w-36">
                <div className="flex flex-col gap-1 text-[10px]">
                  <div className="flex items-center justify-between text-sky-800 font-black">
                    <span className="flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-sky-600" />
                      <span>Cols</span>
                    </span>
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold tracking-tight">Recipient</span>
                  </div>
                  <div className="border-t border-[#D9C7C2]/80 my-0.5" />
                  <div className="flex items-center justify-between text-[#D72638] font-black">
                    <span className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-[#D72638]" />
                      <span>Rows</span>
                    </span>
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-[#D72638] font-bold tracking-tight">Donor</span>
                  </div>
                </div>
              </th>
              {bloodTypes.map(rt => {
                const isSelectedCol = rt === selectedType;
                const isHoveredCol = hoveredCell?.recipient === rt;
                return (
                  <th
                    key={rt}
                    onClick={() => setSelectedType(rt)}
                    className={`py-2 px-1 font-bold cursor-pointer transition-all border-b border-[#D9C7C2] ${
                      isHoveredCol
                        ? 'bg-sky-100 text-sky-950 font-black'
                        : isSelectedCol
                        ? 'bg-sky-50 text-[#D72638] font-black border-b-2 border-[#D72638]'
                        : 'text-[#1A1D20] hover:bg-sky-50/60'
                    }`}
                    title={`Recipient Group ${rt} (Click to focus)`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black">{rt}</span>
                      <span className="text-[9px] font-mono text-sky-700/80 font-bold">Recv ↓</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9C7C2]/60">
            {bloodTypes.map(dt => {
              const isSelectedRow = dt === selectedType;
              const isHoveredRow = hoveredCell?.donor === dt;
              return (
                <tr 
                  key={dt} 
                  className={`transition-colors ${
                    isHoveredRow
                      ? 'bg-red-50/50'
                      : isSelectedRow 
                      ? 'bg-[#F5F1EF]/70 font-semibold' 
                      : 'hover:bg-[#F5F1EF]/40'
                  }`}
                >
                  {/* Donor Row Header */}
                  <td
                    onClick={() => setSelectedType(dt)}
                    className={`py-2.5 px-3 text-left font-black border-r border-[#D9C7C2] cursor-pointer transition-colors ${
                      isHoveredRow
                        ? 'bg-red-100 text-[#D72638]'
                        : isSelectedRow 
                        ? 'bg-red-50/80 text-[#D72638]' 
                        : 'text-[#1A1D20] hover:text-[#D72638]'
                    }`}
                    title={`Donor Group ${dt} (Click to focus)`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isSelectedRow || isHoveredRow ? 'bg-[#D72638]' : 'bg-[#D72638]/50'}`}></span>
                        <span className="text-xs font-black">{dt}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-red-600/80">Give →</span>
                    </div>
                  </td>
                  {bloodTypes.map(rt => {
                    const safe = BLOOD_COMPATIBILITY_TABLE[dt].canGiveTo.includes(rt);
                    const isSelectedCol = rt === selectedType;
                    const isIntersection = isSelectedRow && isSelectedCol;
                    const isCellHovered = hoveredCell?.donor === dt && hoveredCell?.recipient === rt;
                    const isCrosshair = hoveredCell?.donor === dt || hoveredCell?.recipient === rt;

                    return (
                      <td 
                        key={rt} 
                        onMouseEnter={() => setHoveredCell({ donor: dt, recipient: rt })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`py-2.5 transition-colors cursor-pointer ${
                          isCellHovered
                            ? 'bg-amber-100/90 ring-2 ring-amber-400 z-10 relative'
                            : isCrosshair
                            ? 'bg-slate-100/60'
                            : isIntersection
                            ? 'bg-emerald-50/60'
                            : ''
                        }`}
                      >
                        {safe ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold shadow-2xs transition-transform ${
                            isCellHovered
                              ? 'bg-emerald-500 text-white scale-110 shadow-md font-black'
                              : isIntersection
                              ? 'bg-emerald-200 text-emerald-950 font-black'
                              : 'bg-emerald-100 text-emerald-800 hover:scale-105'
                          }`}>
                            ✓
                          </span>
                        ) : (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold transition-transform ${
                            isCellHovered
                              ? 'bg-rose-100 text-rose-700 scale-110 font-black'
                              : 'text-slate-300'
                          }`}>
                            {isCellHovered ? '✕' : '–'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Dynamic Transfusion Interpretation Card */}
        <div className="mt-4 p-3.5 rounded-xl border border-[#D9C7C2] bg-[#FBF9F8] transition-all">
          {hoveredCell ? (
            (() => {
              const safe = BLOOD_COMPATIBILITY_TABLE[hoveredCell.donor].canGiveTo.includes(hoveredCell.recipient);
              return (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-red-100 text-[#D72638] font-black text-xs flex items-center gap-1 border border-red-200">
                      DONOR: {hoveredCell.donor}
                      <ArrowRight className="w-3 h-3 text-[#D72638]" />
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 font-black text-xs flex items-center gap-1 border border-sky-200">
                      RECIPIENT: {hoveredCell.recipient}
                      <ArrowDown className="w-3 h-3 text-sky-700" />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {safe ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span><strong>SAFE TRANSFUSION:</strong> Group {hoveredCell.donor} blood can be safely received by Group {hoveredCell.recipient}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 shadow-2xs">
                        <X className="w-4 h-4 text-rose-600 shrink-0" />
                        <span><strong>INCOMPATIBLE:</strong> Group {hoveredCell.recipient} cannot receive Group {hoveredCell.donor} RBCs (risk of acute hemolysis)</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#5A626A]">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#D72638] shrink-0" />
                <span>Hover over any cell to see real-time donor-to-recipient transfusion compatibility.</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ✓ Compatible
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> – Incompatible
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
