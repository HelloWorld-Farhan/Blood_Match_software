import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  X, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  Building2,
  FileText
} from 'lucide-react';
import { dispatchEmergencyDonorApi } from '../services/api';

export interface TargetDonorSummary {
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  bloodType: string;
  location?: string;
  distanceKm?: number;
}

export interface SendAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDonor: TargetDonorSummary;
  initialPatientName?: string;
  initialHospital?: string;
  initialMessage?: string;
  onSuccess?: (donorEmail: string) => void;
}

export default function SendAlertModal({
  isOpen,
  onClose,
  targetDonor,
  initialPatientName = '',
  initialHospital = 'Regional Clinical Emergency Center',
  initialMessage = '',
  onSuccess,
}: SendAlertModalProps) {
  // Current authenticated user identity (Email is strictly locked to prevent spoofing)
  const currentUserEmail = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_email') || localStorage.getItem('bloodmatch_user_email') || 'clinician@bloodmatch.org').trim().toLowerCase()
    : 'clinician@bloodmatch.org';

  const defaultUserName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_name') || localStorage.getItem('bloodmatch_user_name') || 'Attending Clinical Coordinator')
    : 'Attending Clinical Coordinator';

  const defaultUserPhone = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_phone') || localStorage.getItem('bloodmatch_user_phone') || '+91 8851860838')
    : '+91 8851860838';

  // Form states (Editable contact name, contact phone, patient name, and clinical note)
  const [requesterName, setRequesterName] = useState(defaultUserName);
  const [requesterPhone, setRequesterPhone] = useState(defaultUserPhone);
  const [patientName, setPatientName] = useState(initialPatientName || defaultUserName);
  const [hospital, setHospital] = useState(initialHospital);
  const [customMessage, setCustomMessage] = useState(
    initialMessage || `Urgent transfusion required for Group ${targetDonor.bloodType}. Your compatible voluntary donation can save a life. Please call our emergency hotline immediately if you can donate.`
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim()) {
      setErrorMessage('Please provide a requester / contact name.');
      return;
    }
    if (!requesterPhone.trim()) {
      setErrorMessage('Please provide a direct call-back phone number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await dispatchEmergencyDonorApi({
        donor_id: targetDonor.id,
        donor_name: targetDonor.fullName,
        donor_email: targetDonor.email,
        donor_phone: targetDonor.phone,
        blood_type: targetDonor.bloodType,
        recipient_blood_type: targetDonor.bloodType,
        patient_name: patientName.trim() || requesterName.trim(),
        hospital: hospital.trim() || 'Regional Emergency Trauma Bay',
        hospital_city: 'Delhi',
        contact_number: requesterPhone.trim(),
        distance_km: targetDonor.distanceKm || 0.0,
        custom_message: customMessage.trim(),
        requester_name: requesterName.trim(),
        requester_email: currentUserEmail,
        requester_phone: requesterPhone.trim(),
      });

      setIsSuccess(true);
      if (onSuccess) {
        onSuccess(targetDonor.email);
      }
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || 'Failed to dispatch alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Blurred backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isSubmitting ? undefined : onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white rounded-3xl border border-[#D9C7C2] shadow-2xl p-6 sm:p-7 z-10 space-y-5 text-[#1A1D20] my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#D72638] shadow-2xs">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1D20] tracking-tight">
                  Send Emergency Blood Alert
                </h3>
                <p className="text-xs text-[#5A626A]">
                  Send an urgent email notification to this verified donor
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target Voluntary Donor Summary Pill */}
          <div className="p-3.5 rounded-2xl bg-[#FDF9F8] border border-[#D9C7C2] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#D72638] text-white flex flex-col items-center justify-center font-black text-xs shadow-2xs shrink-0">
                <span className="text-[7px] uppercase font-bold text-red-100">Blood</span>
                <span>{targetDonor.bloodType}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#1A1D20] truncate">{targetDonor.fullName}</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold shrink-0">
                    Voluntary Donor
                  </span>
                </div>
                <div className="text-[11px] text-[#5A626A] flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="w-3 h-3 text-[#D72638] shrink-0" />
                  <span className="truncate">{targetDonor.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Authenticated Sender Email (Strictly Locked) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1D20] flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sender Account Email</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified &amp; Locked</span>
                </span>
              </div>
              <input
                type="text"
                value={currentUserEmail}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs font-mono text-slate-600 cursor-not-allowed select-all"
              />
              <p className="text-[10px] text-[#5A626A]">
                Dispatched via BloodMatch Support Service on behalf of your verified clinician account.
              </p>
            </div>

            {/* Editable Requester Contact Name & Phone in 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D20] flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#D72638]" />
                  <span>Your Contact Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="e.g. Farhan Khalid"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9C7C2] focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 text-xs font-medium text-[#1A1D20] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D20] flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call-Back Phone *</span>
                </label>
                <input
                  type="text"
                  required
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  placeholder="+91 8851860838"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9C7C2] focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 text-xs font-mono font-bold text-[#1A1D20] transition-all"
                />
              </div>
            </div>

            {/* Patient Name & Hospital / Facility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D20] flex items-center gap-1">
                  <span>Patient / Case Name</span>
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient Name or Emergency Case"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9C7C2] focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 text-xs font-medium text-[#1A1D20] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D20] flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#5A626A]" />
                  <span>Facility / Location</span>
                </label>
                <input
                  type="text"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="Hospital or Trauma Center"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9C7C2] focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 text-xs font-medium text-[#1A1D20] transition-all"
                />
              </div>
            </div>

            {/* Clinical Urgency Message Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1D20] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#D72638]" />
                <span>Urgent Transfusion Message *</span>
              </label>
              <textarea
                required
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-[#D9C7C2] focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 text-xs text-[#1A1D20] leading-relaxed resize-none transition-all"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#D72638] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Notification */}
            {isSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Emergency alert successfully transmitted to {targetDonor.fullName}!</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1A1D20] font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="flex-1 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Alert...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Alert Sent Successfully!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Emergency Blood Alert</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
