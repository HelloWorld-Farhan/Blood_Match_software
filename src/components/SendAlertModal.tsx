import React, { useState, useEffect, useRef } from 'react';
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
  FileText,
  Navigation,
  ChevronDown,
  Clock,
  CheckCircle
} from 'lucide-react';
import { dispatchEmergencyDonorApi, fetchGpsPermissionApi, updateGpsPermissionApi } from '../services/api';
import { stripHonorific } from '../utils/countryCodes';
import { reverseGeocodeCoordinates } from '../utils/geolocation';
import { getGpsPermission, setGpsPermission } from '../services/storage';

export interface TargetDonorSummary {
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  bloodType: string;
  location?: string;
  distanceKm?: number;
  lastAlertSentAt?: string | null;
  last_alert_sent_at?: string | null;
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

const POPULAR_FACILITY_LOCATIONS = [
  'Regional Clinical Emergency Center',
  'AIIMS Trauma Center, New Delhi',
  'Safdarjung Emergency Trauma Bay',
  'Connaught Place, Central Delhi',
  'South Extension, South Delhi',
  'Rohini Sector 7, North West Delhi',
  'Dwarka Sector 10, South West Delhi',
  'Karol Bagh, Central Delhi',
  'Saket, South Delhi',
  'Lajpat Nagar, South Delhi',
  'Hauz Khas, South Delhi',
  'Janakpuri, West Delhi',
  'Pitampura, North West Delhi',
  'Vasant Kunj, South West Delhi',
  'Mayur Vihar, East Delhi',
  'Chandni Chowk, North Delhi',
  'Okhla, South East Delhi'
];

export const calculateCooldown = (lastAlertIso?: string | null): { inCooldown: boolean; remainingText: string; remainingMs: number } => {
  if (!lastAlertIso) return { inCooldown: false, remainingText: '', remainingMs: 0 };
  const alertTime = new Date(lastAlertIso).getTime();
  if (isNaN(alertTime)) return { inCooldown: false, remainingText: '', remainingMs: 0 };
  const now = Date.now();
  const cooldownDuration = 24 * 60 * 60 * 1000; // 24 hours in ms
  const elapsed = now - alertTime;
  if (elapsed >= cooldownDuration || elapsed < 0) {
    return { inCooldown: false, remainingText: '', remainingMs: 0 };
  }
  const remainingMs = cooldownDuration - elapsed;
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    inCooldown: true,
    remainingText: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    remainingMs
  };
};

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

  const defaultRawUserName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_name') || localStorage.getItem('bloodmatch_user_name') || 'Attending Clinical Coordinator')
    : 'Attending Clinical Coordinator';

  // Strip "Dr." prefix so contact name is clean user name (e.g. Farhan Khalid)
  const defaultUserName = stripHonorific(defaultRawUserName);

  const defaultUserPhone = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_phone') || localStorage.getItem('bloodmatch_user_phone') || '')
    : '';

  // Form states
  const [requesterName, setRequesterName] = useState(defaultUserName);
  const [requesterPhone, setRequesterPhone] = useState(defaultUserPhone);
  // Neutral patient name: NEVER default to the clinician's own name!
  const [patientName, setPatientName] = useState(stripHonorific(initialPatientName) || '');
  const [hospital, setHospital] = useState(initialHospital || 'Regional Clinical Emergency Center');
  const [customMessage, setCustomMessage] = useState(
    initialMessage || `Urgent transfusion required for Group ${targetDonor.bloodType}. Your compatible voluntary donation can save a life. Please call our emergency hotline immediately if you can donate.`
  );

  // GPS Permission state (Defaults to OFF, syncs across tabs & devices, only turns off when explicitly toggled)
  const [isGpsPermissionEnabled, setIsGpsPermissionEnabled] = useState<boolean>(() => getGpsPermission(currentUserEmail));
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [detectedPills, setDetectedPills] = useState<string[]>([]);

  // Facility / Location Dropdown states
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState<boolean>(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // 24-Hour Cooldown tracking
  const [donorLastAlert, setDonorLastAlert] = useState<string | null>(
    targetDonor.lastAlertSentAt || targetDonor.last_alert_sent_at || null
  );
  const [cooldown, setCooldown] = useState(() => calculateCooldown(donorLastAlert));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync GPS permission changes in real-time across tabs/windows & DB
  useEffect(() => {
    const handleGpsUpdate = (e: Event) => {
      const customDetail = (e as CustomEvent).detail;
      if (customDetail && typeof customDetail.enabled === 'boolean') {
        setIsGpsPermissionEnabled(customDetail.enabled);
      } else {
        setIsGpsPermissionEnabled(getGpsPermission(currentUserEmail));
      }
    };
    window.addEventListener('bloodmatch_gps_permission_updated', handleGpsUpdate);
    window.addEventListener('storage', handleGpsUpdate);
    return () => {
      window.removeEventListener('bloodmatch_gps_permission_updated', handleGpsUpdate);
      window.removeEventListener('storage', handleGpsUpdate);
    };
  }, [currentUserEmail]);

  // Sync GPS permission from backend on mount
  useEffect(() => {
    if (currentUserEmail) {
      fetchGpsPermissionApi(currentUserEmail).then(res => {
        if (res.data && typeof res.data.gps_permission_enabled === 'boolean' && res.data.gps_permission_enabled) {
          setIsGpsPermissionEnabled(true);
          setGpsPermission(true, currentUserEmail, false);
        }
      }).catch(() => { });
    }
  }, [currentUserEmail]);

  // Real-time Cooldown Refresh (Tick every 30 seconds)
  useEffect(() => {
    const checkCooldown = () => {
      setCooldown(calculateCooldown(donorLastAlert));
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 30000);
    return () => clearInterval(interval);
  }, [donorLastAlert]);

  // Listen to cross-tab & WebSocket alert dispatched events
  useEffect(() => {
    const handleDispatched = (e: Event) => {
      const customDetail = (e as CustomEvent).detail;
      if (customDetail && (customDetail.donor_id === targetDonor.id || customDetail.donor_email === targetDonor.email)) {
        const newTime = customDetail.last_alert_sent_at || new Date().toISOString();
        setDonorLastAlert(newTime);
        setCooldown(calculateCooldown(newTime));
      }
    };
    window.addEventListener('bloodmatch_donor_alert_dispatched', handleDispatched);
    return () => window.removeEventListener('bloodmatch_donor_alert_dispatched', handleDispatched);
  }, [targetDonor]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    if (isLocationDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isLocationDropdownOpen]);

  if (!isOpen) return null;

  // Toggle GPS Permission Switch
  const handleToggleGpsPermission = () => {
    const nextVal = !isGpsPermissionEnabled;
    setIsGpsPermissionEnabled(nextVal);
    setGpsPermission(nextVal, currentUserEmail, true);
    if (currentUserEmail) {
      updateGpsPermissionApi(nextVal, currentUserEmail).catch(() => { });
    }
    if (!nextVal) {
      setGpsMessage(null);
      setDetectedPills([]);
    } else {
      setGpsMessage('GPS Permission enabled! Click "Detect GPS" to locate attending medical facility.');
    }
  };

  // GPS Browser Geolocation Pinpointing
  const handleDetectGps = async () => {
    if (!isGpsPermissionEnabled) {
      setGpsMessage('GPS Permission is OFF. Click "GPS: OFF" to turn ON location access.');
      return;
    }
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsMessage('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    setGpsMessage('Detecting current GPS coordinates...');

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permissionStatus.state === 'denied') {
          setIsDetectingGps(false);
          setGpsMessage('Location access blocked in browser settings. Please enter facility manually.');
          return;
        }
      }
    } catch { }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const geo = await reverseGeocodeCoordinates(lat, lon);
          setHospital(geo.primaryLocality);
          setDetectedPills(geo.nearestPills || []);
          setGpsMessage(`Location locked: ${geo.primaryLocality}`);
        } catch {
          const gpsLabel = `Trauma Bay (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;
          setHospital(gpsLabel);
          setGpsMessage(`GPS Coordinates locked: ${gpsLabel}`);
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsMessage(err.code === 1 ? 'Location permission was denied in your browser.' : 'Unable to acquire GPS signal. Please enter location manually.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown.inCooldown) {
      setErrorMessage(`24-Hour Alert Cooldown is active for this donor. Next alert available in ${cooldown.remainingText}.`);
      return;
    }
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

    const nowIso = new Date().toISOString();

    try {
      await dispatchEmergencyDonorApi({
        donor_id: targetDonor.id,
        donor_name: targetDonor.fullName,
        donor_email: targetDonor.email,
        donor_phone: targetDonor.phone,
        blood_type: targetDonor.bloodType,
        recipient_blood_type: targetDonor.bloodType,
        patient_name: stripHonorific(patientName.trim()) || 'Emergency Transfusion Recipient',
        hospital: hospital.trim() || 'Regional Clinical Emergency Center',
        hospital_city: 'Delhi',
        contact_number: requesterPhone.trim(),
        distance_km: targetDonor.distanceKm || 0.0,
        custom_message: customMessage.trim(),
        requester_name: stripHonorific(requesterName.trim()),
        requester_email: currentUserEmail,
        requester_phone: requesterPhone.trim(),
      });

      // Update cooldown state and broadcast event
      setDonorLastAlert(nowIso);
      setCooldown(calculateCooldown(nowIso));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bloodmatch_donor_alert_dispatched', {
          detail: {
            donor_id: targetDonor.id,
            donor_email: targetDonor.email,
            last_alert_sent_at: nowIso
          }
        }));
      }

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
          className="relative w-full max-w-lg bg-white rounded-3xl border border-[#D9C7C2] shadow-2xl p-6 sm:p-7 z-10 space-y-4 text-[#1A1D20] my-8 max-h-[92vh] overflow-y-auto no-scrollbar"
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
                  Direct voluntary donor dispatch &amp; dual confirmation protocol
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

          {/* 24-Hour Cooldown Banner if Active */}
          {cooldown.inCooldown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs"
            >
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-extrabold flex items-center gap-1.5">
                  <span>24-Hour Alert Cooldown Active</span>
                  <span className="bg-amber-200 text-amber-900 px-2 py-0.2 rounded-full text-[10px] font-bold">
                    {cooldown.remainingText} remaining
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  An emergency mobilization alert was already transmitted to {targetDonor.fullName} within the last 24 hours. To protect voluntary donors from notification overload, repeat dispatches unlock in <strong>{cooldown.remainingText}</strong>.
                </p>
              </div>
            </motion.div>
          )}

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

            {targetDonor.distanceKm !== undefined && targetDonor.distanceKm > 0 && (
              <span className="text-[11px] font-bold text-[#D72638] bg-red-50 px-2 py-1 rounded-xl border border-red-200 shrink-0">
                ~{targetDonor.distanceKm.toFixed(1)} km
              </span>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
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

            {/* Patient Name (Starts Empty / Neutral, Never defaults to Doctor name) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1D20] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Patient / Case Name</span>
                </span>
                <span className="text-[10px] text-[#5A626A] font-normal">Optional identifier</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Emergency Patient / Case #892"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9C7C2] focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 text-xs font-medium text-[#1A1D20] transition-all"
              />
            </div>

            {/* Facility / Location with GPS ON/OFF Switch & Detect GPS */}
            <div className="space-y-1.5" ref={locationDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1D20] flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#D72638]" />
                  <span>Facility / Location *</span>
                </label>

                {/* GPS Controls: ON/OFF toggle & Detect GPS */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleGpsPermission}
                    title={isGpsPermissionEnabled ? 'GPS Permission is ON. Click to turn OFF.' : 'GPS Permission is OFF. Click to turn ON.'}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${isGpsPermissionEnabled
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-100 border-[#D9C7C2] text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isGpsPermissionEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>GPS:</span>
                    <span className="font-extrabold">{isGpsPermissionEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={isDetectingGps || !isGpsPermissionEnabled}
                    title={!isGpsPermissionEnabled ? 'Turn ON GPS Permission first to locate' : 'Detect current GPS coordinates'}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${isGpsPermissionEnabled
                      ? 'bg-white border-[#D9C7C2] hover:border-[#D72638] text-[#D72638] hover:text-[#b51d2c]'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Navigation className={`w-3 h-3 ${isDetectingGps ? 'animate-spin' : ''}`} />
                    <span>{isDetectingGps ? 'Locating...' : 'Detect GPS'}</span>
                  </button>
                </div>
              </div>

              {/* Location Input with Dropdown Button */}
              <div className="relative">
                <div className="flex items-center rounded-xl bg-white border border-[#D9C7C2] focus-within:border-[#D72638] focus-within:ring-2 focus-within:ring-[#D72638]/20 transition-all overflow-hidden">
                  <div className="pl-3 pr-1 text-[#D72638]">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={hospital}
                    onChange={(e) => {
                      setHospital(e.target.value);
                      setIsLocationDropdownOpen(true);
                    }}
                    onFocus={() => setIsLocationDropdownOpen(true)}
                    placeholder="Search or enter hospital / facility location"
                    className="w-full py-2.5 px-2 text-xs font-medium text-[#1A1D20] bg-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLocationDropdownOpen(prev => !prev)}
                    className="px-2.5 py-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isLocationDropdownOpen ? 'rotate-180 text-[#D72638]' : ''}`} />
                  </button>
                </div>

                {/* Animated Dropdown Menu */}
                <AnimatePresence>
                  {isLocationDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 mt-1.5 w-full rounded-2xl border border-[#D9C7C2] bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden py-1 max-h-52 overflow-y-auto no-scrollbar"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-black text-[#5A626A] uppercase tracking-wider border-b border-[#D9C7C2]/40 flex items-center justify-between">
                        <span>Standard Medical Facilities &amp; Localities</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-100 text-[#D72638] font-bold">
                          Delhi Region
                        </span>
                      </div>

                      {(() => {
                        const searchLower = hospital.trim().toLowerCase();
                        const filtered = POPULAR_FACILITY_LOCATIONS.filter(item =>
                          item.toLowerCase().includes(searchLower)
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-center">
                              <p className="text-xs text-[#5A626A]">Use custom entry: "{hospital}"</p>
                              <button
                                type="button"
                                onClick={() => setIsLocationDropdownOpen(false)}
                                className="mt-1 text-xs font-bold text-[#D72638] hover:underline"
                              >
                                Confirm Selection
                              </button>
                            </div>
                          );
                        }

                        return filtered.map((loc) => {
                          const isSelected = hospital === loc;
                          return (
                            <div
                              key={loc}
                              onClick={() => {
                                setHospital(loc);
                                setIsLocationDropdownOpen(false);
                              }}
                              className={`px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${isSelected
                                ? 'bg-red-50 text-[#D72638] font-bold'
                                : 'hover:bg-[#F5F1EF] text-[#1A1D20]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-red-100 text-[#D72638]' : 'bg-slate-100 text-slate-500'}`}>
                                  <MapPin className="w-3 h-3" />
                                </div>
                                <span className="truncate">{loc}</span>
                              </div>
                              {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#D72638] shrink-0" />}
                            </div>
                          );
                        });
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* GPS Status Message & Suggestion Pills */}
              {gpsMessage && (
                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{gpsMessage}</span>
                </p>
              )}

              {detectedPills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {detectedPills.map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => {
                        setHospital(pill);
                        setIsLocationDropdownOpen(false);
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border bg-white text-[#4A5568] border-[#D9C7C2] hover:bg-slate-100 cursor-pointer"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              )}
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
                <span>Emergency alert transmitted to {targetDonor.fullName}! Confirmation receipt dispatched to {currentUserEmail}.</span>
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
                disabled={isSubmitting || isSuccess || cooldown.inCooldown}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 ${
                  cooldown.inCooldown
                    ? 'bg-amber-100 border border-amber-300 text-amber-800 cursor-not-allowed opacity-80'
                    : 'bg-[#D72638] hover:bg-[#b51d2c] disabled:opacity-50 text-white cursor-pointer'
                }`}
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
                ) : cooldown.inCooldown ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Alert Sent (Cooldown: {cooldown.remainingText})</span>
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
