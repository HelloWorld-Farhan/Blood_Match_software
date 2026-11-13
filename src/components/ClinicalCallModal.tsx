import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneCall, 
  Copy, 
  Check, 
  X, 
  MapPin, 
  ShieldCheck, 
  Droplet,
  ExternalLink 
} from 'lucide-react';

export interface ClinicalCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  phoneNumber: string;
  bloodType?: string;
  location?: string;
  roleOrContext?: string;
}

export default function ClinicalCallModal({
  isOpen,
  onClose,
  contactName,
  phoneNumber,
  bloodType,
  location,
  roleOrContext = 'Voluntary Transfusion Standby Donor',
}: ClinicalCallModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cleanPhone = phoneNumber.replace(/\s+/g, '');

  const handleCopyNumber = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanPhone);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cleanPhone;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDirectDial = () => {
    window.location.href = `tel:${cleanPhone}`;
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Blurred, dim backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-white rounded-3xl border border-[#D9C7C2] shadow-2xl p-6 sm:p-7 z-10 space-y-5 text-[#1A1D20]"
        >
          {/* Top Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                <PhoneCall className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1D20] tracking-tight">
                  Call Contact Person
                </h3>
                <p className="text-xs text-[#5A626A]">
                  Direct phone call for quick coordination
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contact Profile Box */}
          <div className="p-4 rounded-2xl bg-[#FDF9F8] border border-[#D9C7C2] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1A1D20]">{contactName}</span>
                {bloodType && (
                  <span className="px-2 py-0.5 rounded-md bg-[#D72638] text-white text-xs font-black shadow-2xs">
                    {bloodType}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </div>

            <p className="text-xs text-[#5A626A] font-medium">
              {roleOrContext}
            </p>

            {location && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-[#D72638] shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>

          {/* Phone Number Display & Copy Row */}
          <div className="p-4 rounded-2xl bg-white border-2 border-dashed border-[#D9C7C2] space-y-2 text-center">
            <span className="text-[10px] text-[#7A0C17] font-bold uppercase tracking-widest block">
              Direct Contact Number
            </span>
            <div className="font-mono text-2xl font-black text-[#1A1D20] tracking-wider select-all">
              {phoneNumber}
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleCopyNumber}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-[#1A1D20] border border-[#D9C7C2]'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-[#D72638]" />}
                <span>{copied ? 'Copied to Clipboard! ✓' : 'Copy Phone Number'}</span>
              </button>
            </div>
          </div>

          {/* Clinical Guidance Note */}
          <p className="text-[11px] text-[#5A626A] leading-relaxed text-center px-2">
            Desktop browsers do not have cellular dialers. You can copy the number to your mobile device or clinical desk phone, or launch your system dialer below.
          </p>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDirectDial}
              className="flex-1 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Launch Dialer App</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1A1D20] font-bold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

