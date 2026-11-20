import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { BloodType, EmergencyRequest, UrgencyLevel, Donor } from '../types';
import {
  AlertTriangle,
  Plus,
  CheckCircle,
  Check,
  ShieldAlert,
  X,
  Phone,
  BarChart3,
  MapPin,
  Navigation,
  Send,
  FileDown,
  Mail,
  RefreshCw,
  CheckCircle2,
  Droplet,
  Radio,
  Crosshair,
  Activity,
  ShieldCheck,
  User,
  Clock,
  ArrowRight,
  ChevronDown,
  Users,
  Search,
  RotateCcw,
  Trash2
} from 'lucide-react';
import {
  getEmergencyRequests,
  saveEmergencyRequests,
  markRequestDeleted,
  unmarkRequestDeleted,
  getDeletedRequestIds,
  getDonors,
  saveDonors,
  getGpsPermission,
  setGpsPermission,
  normalizeDonor,
  updateRequestLiveTracking
} from '../services/storage';
import {
  fetchEmergencyRequestsApi,
  createEmergencyRequestApi,
  fetchDonorsApi,
  dispatchEmergencyDonorApi,
  emailEmergencyRosterApi,
  fulfillEmergencyRequestApi,
  deleteEmergencyRequestApi,
  fetchDeletedEmergencyIdsApi,
  saveEmergencyDocketApi,
  fetchSavedPhonesApi,
  saveUserPhoneApi,
  fetchGpsPermissionApi,
  updateGpsPermissionApi,
  updateEmergencyLiveTrackingApi,
  getWebSocketUrl
} from '../services/api';
import {
  COUNTRY_CODES,
  validatePhoneNumber,
  parsePhoneNumberWithCountry,
  formatFullPhone,
  deduplicatePhones,
  stripHonorific
} from '../utils/countryCodes';
import {
  Coordinates,
  DELHI_LOCALITY_NAMES,
  calculateHaversineDistance,
  resolveCoordinatesForLocation,
  reverseGeocodeCoordinates,
  getCompatibleDonorTypes,
  getProximityTier
} from '../utils/geolocation';
import {
  generateEmergencyDonorDocketPdf,
  RankedDonorItem
} from '../utils/docketPdfGenerator';
import ClinicalCallModal from './ClinicalCallModal';
import SendAlertModal, { TargetDonorSummary, calculateCooldown } from './SendAlertModal';

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

interface RankedMatchDonor extends Donor {
  distanceKm: number;
  tier: ReturnType<typeof getProximityTier>;
}

interface BlurDropdownOption<T> {
  value: T;
  label: string;
  badge?: string;
  badgeClass?: string;
  sublabel?: string;
}

function BlurDropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  hasError = false,
  className = '',
}: {
  value: T | '';
  onChange: (val: T) => void;
  options: BlurDropdownOption<T>[];
  placeholder?: string;
  hasError?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${hasError
          ? 'border-red-500 bg-red-50/20'
          : isOpen
            ? 'border-[#D72638] ring-2 ring-[#D72638]/20'
            : 'border-[#D9C7C2] hover:border-[#D72638]/60'
          } text-xs font-bold text-[#1A1D20] flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.badge && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${selectedOption.badgeClass || 'bg-red-100 text-[#D72638]'}`}>
                  {selectedOption.badge}
                </span>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#5A626A] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#D72638]' : ''
            }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-50 mt-1.5 w-full rounded-xl border border-[#D9C7C2] bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden py-1.5 max-h-60 overflow-y-auto no-scrollbar"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={String(opt.value)}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3.5 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${isSelected
                    ? 'bg-red-50/80 text-[#D72638] font-bold'
                    : 'hover:bg-[#F5F1EF] text-[#1A1D20]'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${opt.badgeClass || 'bg-red-100 text-[#D72638]'}`}>
                        {opt.badge}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-slate-400 truncate">({opt.sublabel})</span>
                    )}
                  </div>
                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#D72638] shrink-0" />}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EmergencyRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightParam);
  const [isBlinking, setIsBlinking] = useState<boolean>(Boolean(highlightParam));
  const [justFulfilledId, setJustFulfilledId] = useState<string | null>(null);

  // Multi-card independent expansion tracking via Set so opening one does not close others
  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(() => new Set(highlightParam ? [highlightParam] : []));
  // State for custom in-app deletion confirmation modal (eliminates native browser OS prompt)
  const [requestToDelete, setRequestToDelete] = useState<EmergencyRequest | null>(null);

  const toggleRequestExpanded = (id: string) => {
    setExpandedRequestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Search and Blood Group filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodFilter, setSelectedBloodFilter] = useState<string>('ALL');

  // 4-Second Pulsating Blink & Zero-Jump Center Scroll when arriving via "Match Donors ->"
  useEffect(() => {
    if (highlightParam) {
      setHighlightedId(highlightParam);
      setIsBlinking(true);
      setExpandedRequestIds(prev => new Set(prev).add(highlightParam));

      // Silently clear the highlight query param in browser history IMMEDIATELY so reloading the page
      // does not re-trigger focus/blinking again and again. The record stays selected in state.
      try {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has('highlight')) {
          currentUrl.searchParams.delete('highlight');
          window.history.replaceState(null, '', currentUrl.pathname + (currentUrl.search ? currentUrl.search : ''));
        }
      } catch {}

      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(`request-row-${highlightParam}`);
        if (el) {
          // Lock window firmly to (0, 0) to avoid mobile viewport displacement
          window.scrollTo(0, 0);
          const mainContainer = document.querySelector('main');
          if (mainContainer) {
            const rect = el.getBoundingClientRect();
            const containerRect = mainContainer.getBoundingClientRect();
            const targetScrollTop = mainContainer.scrollTop + (rect.top - containerRect.top) - (containerRect.height / 2) + (rect.height / 2);
            mainContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
          }
        }
      }, 150);

      const blinkTimer = setTimeout(() => {
        setIsBlinking(false);
      }, 4000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(blinkTimer);
      };
    }
  }, [highlightParam]);

  // Clinician context
  const currentUserEmail = useMemo(() => {
    return sessionStorage.getItem('bloodmatch_user_email') ||
      localStorage.getItem('bloodmatch_user_email') ||
      'clinician@bloodmatch.org';
  }, []);

  const currentUserName = useMemo(() => {
    const raw = sessionStorage.getItem('bloodmatch_user_name') ||
      localStorage.getItem('bloodmatch_user_name') ||
      'Attending Trauma Clinician';
    return stripHonorific(raw) || 'Attending Trauma Clinician';
  }, []);

  // Initialize with immediate local storage data to prevent any blank flicker or disappearing items
  const [requests, setRequests] = useState<EmergencyRequest[]>(() => getEmergencyRequests(currentUserEmail));
  const [donors, setDonors] = useState<Donor[]>(() => getDonors());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  // Active Emergency Check Draft Tracking (ensures unique ID across Modify & Re-Test cycles)
  const [activeEmergencyRequestId, setActiveEmergencyRequestId] = useState<string | null>(null);
  const [activeEmergencyDraft, setActiveEmergencyDraft] = useState<EmergencyRequest | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

  // In-App Clinical Mobilize Call modal state (eliminates browser OS pick-an-app dialog)
  const [callModalTarget, setCallModalTarget] = useState<{
    contactName: string;
    phoneNumber: string;
    bloodType?: string;
    location?: string;
    roleOrContext?: string;
  } | null>(null);

  // In-App Send Emergency Blood Alert modal state
  const [alertModalTarget, setAlertModalTarget] = useState<{
    donor: TargetDonorSummary;
    patientName?: string;
    hospital?: string;
    customMessage?: string;
  } | null>(null);

  // Mark Fulfilled Confirmation Modal State
  const [fulfillmentModalReq, setFulfillmentModalReq] = useState<EmergencyRequest | null>(null);
  const [selectedFulfillingDonorIds, setSelectedFulfillingDonorIds] = useState<string[]>([]);
  const [fulfilledViaReserve, setFulfilledViaReserve] = useState<boolean>(false);
  const [isFulfilling, setIsFulfilling] = useState<boolean>(false);
  const [boardNotification, setBoardNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const pendingLiveTrackSyncRef = useRef<Record<string, any>>({});

  // Modal Workflow Phase: 'INPUT' | 'SCANNING' | 'RESULTS'
  const [modalPhase, setModalPhase] = useState<'INPUT' | 'SCANNING' | 'RESULTS'>('INPUT');
  const [scanStepIndex, setScanStepIndex] = useState(0);

  // Form states (Form Neutrality with zero default prefilled inputs, string state prevents leading 0 bug)
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<string>('');
  const [bloodType, setBloodType] = useState<BloodType | ''>('');
  const [unitsNeeded, setUnitsNeeded] = useState<string>('1');
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [contactName, setContactName] = useState(currentUserName);

  // Custom Dispatched Location Dropdown state & ref
  const [isLocalityDropdownOpen, setIsLocalityDropdownOpen] = useState(false);
  const localityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (localityDropdownRef.current && !localityDropdownRef.current.contains(event.target as Node)) {
        setIsLocalityDropdownOpen(false);
      }
    };
    if (isLocalityDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isLocalityDropdownOpen]);

  // GPS Permission state (Defaults to OFF, syncs across tabs & devices, only turns off when user explicitly toggles it off)
  const [isGpsPermissionEnabled, setIsGpsPermissionEnabled] = useState<boolean>(() => getGpsPermission(currentUserEmail));

  // Sync GPS permission changes in real-time across tabs/windows
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

  // Sync from backend on load
  useEffect(() => {
    if (currentUserEmail) {
      fetchGpsPermissionApi(currentUserEmail).then(res => {
        if (res.data && typeof res.data.gps_permission_enabled === 'boolean') {
          if (res.data.gps_permission_enabled) {
            setIsGpsPermissionEnabled(true);
            setGpsPermission(true, currentUserEmail, false);
          }
        }
      }).catch(() => { });
    }
  }, [currentUserEmail]);

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
      setGpsMessage('GPS Permission enabled! Click "Detect GPS" to pinpoint current location.');
    }
  };

  // User account phone
  const userAccountPhone = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_phone') || localStorage.getItem('bloodmatch_user_phone') || '').trim()
    : '';

  const initialParsedPhone = parsePhoneNumberWithCountry(userAccountPhone);
  const [countryDialCode, setCountryDialCode] = useState<string>(initialParsedPhone.dialCode || '+91');
  const [contactPhone, setContactPhone] = useState(initialParsedPhone.number || '');
  const [phoneAnimate, setPhoneAnimate] = useState<boolean>(false);
  const [emergencyConfirmed, setEmergencyConfirmed] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Saved phone numbers for instant click-to-fill & cross-device sync (deduplicated by 10-digit core)
  const [savedPhones, setSavedPhones] = useState<string[]>(() => {
    try {
      const userKey = `bloodmatch_saved_phones_${currentUserEmail || 'default'}`;
      const stored = localStorage.getItem(userKey);
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];
      if (userAccountPhone) {
        list.unshift(userAccountPhone);
      }
      return deduplicatePhones(list);
    } catch {
      return userAccountPhone ? [userAccountPhone] : [];
    }
  });

  // Cross-device sync hydration from backend
  useEffect(() => {
    if (currentUserEmail) {
      fetchSavedPhonesApi(currentUserEmail).then(res => {
        if (res.ok && res.data && Array.isArray(res.data.saved_phones)) {
          const fetchedPhones = res.data.saved_phones;
          setSavedPhones(prev => {
            const combined = deduplicatePhones([...fetchedPhones, ...prev]);
            try {
              localStorage.setItem(`bloodmatch_saved_phones_${currentUserEmail}`, JSON.stringify(combined));
            } catch { }
            return combined;
          });
        }
      }).catch(() => { });
    }
  }, [currentUserEmail]);

  // Click-to-fill phone with smooth pulse animation
  const handleSelectPhone = (phoneStr: string) => {
    const parsed = parsePhoneNumberWithCountry(phoneStr);
    setCountryDialCode(parsed.dialCode);
    setContactPhone(parsed.number);
    if (formErrors.contactPhone) setFormErrors(prev => ({ ...prev, contactPhone: '' }));
    setPhoneAnimate(true);
    setTimeout(() => setPhoneAnimate(false), 1600);
  };

  // Save phone to state, localStorage, and backend
  const saveCustomPhone = (phoneStr: string) => {
    const clean = phoneStr.trim();
    if (!clean) return;
    setSavedPhones(prev => {
      const updated = deduplicatePhones([...prev, clean]);
      try {
        localStorage.setItem(`bloodmatch_saved_phones_${currentUserEmail || 'default'}`, JSON.stringify(updated));
      } catch { }
      return updated;
    });
    saveUserPhoneApi(clean, currentUserEmail).catch(() => { });
  };

  // Geolocation & Locality
  const [selectedLocality, setSelectedLocality] = useState<string>('');
  const [customLocalityInput, setCustomLocalityInput] = useState<string>('');
  const [userCoords, setUserCoords] = useState<Coordinates>({ latitude: 28.6315, longitude: 77.2167 });
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [detectedPills, setDetectedPills] = useState<string[]>([]);

  // In-modal actions & feedback
  const [dispatchingDonorId, setDispatchingDonorId] = useState<string | null>(null);
  const [dispatchedDonorIds, setDispatchedDonorIds] = useState<Record<string, boolean>>({});
  const [isEmailingRoster, setIsEmailingRoster] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [emailingRosterReqId, setEmailingRosterReqId] = useState<string | null>(null);
  const [emailedRosterReqId, setEmailedRosterReqId] = useState<string | null>(null);
  const [generatingPdfReqId, setGeneratingPdfReqId] = useState<string | null>(null);
  const [downloadedPdfReqId, setDownloadedPdfReqId] = useState<string | null>(null);
  const [modalNotification, setModalNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss confirmation / status messages after 4.5 seconds with smooth exit animation
  useEffect(() => {
    if (!boardNotification) return;
    const timer = setTimeout(() => {
      setBoardNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [boardNotification]);

  useEffect(() => {
    if (!modalNotification) return;
    const timer = setTimeout(() => {
      setModalNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [modalNotification]);
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState<{
    uniqueId: string;
    filename: string;
    timestamp: string;
    patientName: string;
    patientAge: number;
    bloodType: BloodType;
    unitsNeeded: number;
    urgency: string;
    locality: string;
    emergencyPhone: string;
    contactName: string;
    donorCount: number;
    persistedToR2: boolean;
  } | null>(null);

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const bloodTypeOptions: BlurDropdownOption<BloodType>[] = useMemo(() => {
    return bloodTypes.map(t => ({
      value: t,
      badge: t,
      badgeClass: 'bg-red-100 text-[#D72638] font-black',
      label: `Blood Group ${t}`,
      sublabel: `Safely receives from: ${getCompatibleDonorTypes(t).join(', ')}`
    }));
  }, [bloodTypes]);

  const urgencyOptions: BlurDropdownOption<UrgencyLevel>[] = useMemo(() => [
    { value: 'CRITICAL', badge: 'CRITICAL', badgeClass: 'bg-red-100 text-[#D72638] font-black', label: 'Critical Emergency (< 1 Hour Transfusion)' },
    { value: 'URGENT', badge: 'URGENT', badgeClass: 'bg-amber-100 text-amber-800 font-bold', label: 'Urgent Transfusion (< 4 Hours Trauma Call)' },
    { value: 'STANDARD', badge: 'STANDARD', badgeClass: 'bg-blue-100 text-blue-800 font-semibold', label: 'Standard Elective (Next 24 Hours)' },
  ], []);

  const countryOptions: BlurDropdownOption<string>[] = useMemo(() => {
    return COUNTRY_CODES.map(c => ({
      value: c.dialCode,
      badge: c.flag,
      label: `${c.dialCode}`,
      sublabel: c.name
    }));
  }, []);

  // Locations where blood has been dispatched or requested in user's clinical history
  const userDispatchedLocations = useMemo(() => {
    const locSet = new Set<string>();

    if (requests && requests.length > 0) {
      requests.forEach((r) => {
        const city = (r.hospitalCity || '').trim();
        if (city) locSet.add(city);
        const hosp = (r.hospital || '').trim();
        if (hosp && hosp !== 'Emergency Trauma Network' && hosp !== city) {
          locSet.add(hosp);
        }
      });
    }

    if (donors && donors.length > 0) {
      donors.forEach((d) => {
        const loc = (d.location || d.city || '').trim();
        if (loc) locSet.add(loc);
      });
    }

    return Array.from(locSet);
  }, [requests, donors]);
  const scanSteps = [
    'Checking blood group compatibility...',
    'Searching registered voluntary donors...',
    'Calculating distance to location...',
    'Finding nearest compatible donors...'
  ];

  // Auto-open modal if URL contains ?action=broadcast
  useEffect(() => {
    if (searchParams.get('action') === 'broadcast') {
      setIsOpenModal(true);
      setModalPhase('INPUT');
      setFormErrors({});
      // Clean up search params
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  // Load emergency requests and donors with resilient bidirectional merge & zero data loss
  const loadData = async () => {
    const currentLocal = getEmergencyRequests(currentUserEmail);

    try {
      const [reqRes, donorRes] = await Promise.allSettled([
        fetchEmergencyRequestsApi(currentUserEmail),
        fetchDonorsApi()
      ]);

      if (donorRes.status === 'fulfilled' && donorRes.value.ok && Array.isArray(donorRes.value.data)) {
        const normalized = donorRes.value.data.map(normalizeDonor);
        if (normalized.length > 0) {
          setDonors(normalized);
          saveDonors(normalized);
        } else {
          const local = getDonors();
          if (local.length > 0) setDonors(local);
        }
      }

      if (reqRes.status === 'fulfilled' && reqRes.value.ok && Array.isArray(reqRes.value.data)) {
        const remoteReqs: EmergencyRequest[] = reqRes.value.data.map((r: any) => ({
          id: r.id || `REQ-${Date.now().toString().slice(-6)}`,
          patientName: stripHonorific(r.patient_name || r.patientName || 'Emergency Patient'),
          patientAge: r.patient_age || r.patientAge || 35,
          bloodType: (r.blood_type || r.bloodType || 'O+') as BloodType,
          unitsNeeded: r.units_needed ?? r.unitsNeeded ?? 1,
          hospital: r.hospital || 'Emergency Trauma Network',
          hospitalCity: r.hospital_city || r.hospitalCity || 'Delhi NCR',
          ward: r.ward || 'Emergency Triage',
          urgency: (r.urgency || 'CRITICAL') as UrgencyLevel,
          contactName: stripHonorific(r.contact_person || r.contactName || 'Trauma Desk'),
          contactNumber: r.contact_phone || r.contactNumber || '+91 98765 43210',
          status: (r.status || 'urgent') as EmergencyRequest['status'],
          liveTracking: r.status === 'fulfilled' ? false : (r.live_tracking !== undefined ? Boolean(r.live_tracking) : (r.liveTracking !== undefined ? Boolean(r.liveTracking) : true)),
          live_tracking: r.status === 'fulfilled' ? false : (r.live_tracking !== undefined ? Boolean(r.live_tracking) : (r.liveTracking !== undefined ? Boolean(r.liveTracking) : true)),
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          matchedDonorId: r.matched_donor_id || r.matchedDonorId,
          fulfilledAt: r.fulfilled_at || r.fulfilledAt,
          fulfilledByDonorName: r.fulfilled_by_donor_name || r.fulfilledByDonorName,
          fulfilledByDonorEmail: r.fulfilled_by_donor_email || r.fulfilledByDonorEmail,
        }));

        // 1. Fetch backend tombstones for this user to sync cross-device deletions
        const remoteDeletedSet = new Set<string>();
        try {
          const delRes = await fetchDeletedEmergencyIdsApi(currentUserEmail);
          if (delRes.ok && Array.isArray(delRes.data?.deleted_ids)) {
            delRes.data.deleted_ids.forEach(delId => {
              remoteDeletedSet.add(delId);
              markRequestDeleted(delId, currentUserEmail);
            });
          }
        } catch { }

        const localDeletedSet = getDeletedRequestIds(currentUserEmail);
        const allDeletedIds = new Set([...localDeletedSet, ...remoteDeletedSet]);

        const now = Date.now();
        // Filter out any tombstoned requests & protect local live-tracking toggles using timestamp precedence (never reverts)
        const activeRemoteReqs = remoteReqs.map(r => {
          const local = currentLocal.find(l => l.id === r.id);
          const localUpdated = local?.liveTrackingUpdatedAt || 0;
          const remoteUpdated = (r as any).liveTrackingUpdatedAt || (r as any).live_tracking_updated_at || 0;

          if (local && local.liveTracking !== undefined) {
            // If local was explicitly updated and remote doesn't have a newer timestamp, always retain local user intent
            if (localUpdated >= remoteUpdated) {
              return {
                ...r,
                liveTracking: local.liveTracking,
                live_tracking: local.liveTracking,
                liveTrackingUpdatedAt: localUpdated
              };
            }
          }
          return r;
        }).filter(r => !allDeletedIds.has(r.id));
        const remoteMap = new Map<string, EmergencyRequest>();
        activeRemoteReqs.forEach(r => remoteMap.set(r.id, r));

        // 2. Resilient local preservation:
        // Any request in currentLocal that is NOT tombstoned should be kept.
        // If it's missing from remoteMap, automatically re-sync it to the remote backend database!
        currentLocal.forEach(r => {
          if (!allDeletedIds.has(r.id) && !remoteMap.has(r.id)) {
            createEmergencyRequestApi({
              id: r.id,
              user_email: currentUserEmail,
              patient_name: r.patientName,
              patient_age: r.patientAge,
              hospital: r.hospital,
              hospital_city: r.hospitalCity,
              ward: r.ward,
              blood_type: r.bloodType,
              units_needed: r.unitsNeeded,
              urgency: r.urgency,
              status: r.status,
              contact_person: r.contactName,
              contact_phone: r.contactNumber
            }).catch(() => { });
          }
        });

        // 3. Preserve active remote records and all valid local records
        const validLocalDrafts = currentLocal.filter(r =>
          !remoteMap.has(r.id) &&
          !allDeletedIds.has(r.id)
        );

        const rawMerged = [...validLocalDrafts, ...activeRemoteReqs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Deduplicate strictly by unique request ID
        const seenIds = new Set<string>();
        const merged: EmergencyRequest[] = [];
        for (const req of rawMerged) {
          if (!seenIds.has(req.id)) {
            seenIds.add(req.id);
            merged.push(req);
          }
        }

        setRequests(merged);
        saveEmergencyRequests(merged, currentUserEmail, false);
      } else {
        const cleaned = currentLocal.map(r => ({
          ...r,
          patientName: stripHonorific(r.patientName),
          contactName: stripHonorific(r.contactName)
        }));
        setRequests(cleaned);
      }
    } catch {
      const cleaned = currentLocal.map(r => ({
        ...r,
        patientName: stripHonorific(r.patientName),
        contactName: stripHonorific(r.contactName)
      }));
      setRequests(cleaned);
    }
  };

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    const handleDonorAlertDispatched = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.donor_id) {
        setDispatchedDonorIds((prev) => ({ ...prev, [detail.donor_id]: true }));
        setDonors(prev => {
          const updated = prev.map(d => {
            if (d.id === detail.donor_id || d.email.toLowerCase() === (detail.donor_email || '').toLowerCase()) {
              return {
                ...d,
                lastAlertSentAt: detail.last_alert_sent_at,
                last_alert_sent_at: detail.last_alert_sent_at
              };
            }
            return d;
          });
          saveDonors(updated, false);
          return updated;
        });
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('bloodmatch_requests_updated', handleStorage);
    window.addEventListener('bloodmatch_donors_updated', handleStorage);
    window.addEventListener('bloodmatch_donor_alert_dispatched', handleDonorAlertDispatched);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('bloodmatch_requests_updated', handleStorage);
      window.removeEventListener('bloodmatch_donors_updated', handleStorage);
      window.removeEventListener('bloodmatch_donor_alert_dispatched', handleDonorAlertDispatched);
    };
  }, [currentUserEmail]);

  // Auto-sync across devices when user switches to tab or window regains focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUserEmail]);

  // Periodic 10-second ticker to dynamically re-evaluate cooldown and unlock buttons in real time
  const [, setEmergencyCooldownTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setEmergencyCooldownTick(prev => (prev + 1) % 1000000);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Real-time WebSocket Multi-Device Synchronization & Live Tracking Alerts
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let pingInterval: any = null;

    const connectWs = () => {
      try {
        const wsUrl = getWebSocketUrl();
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'COMPATIBLE_DONOR_ARRIVED') {
              // Real-time incoming donor match for an active live-tracked emergency request
              loadData();
              setBoardNotification({
                message: `🚨 Live Match Alert: Compatible voluntary donor ${data.donor?.name || 'Lifesaver'} (${data.donor?.blood_type}) arrived for patient ${data.patient_name || 'Emergency'}!`,
                type: 'success'
              });
              setTimeout(() => setBoardNotification(null), 8000);
            } else if (data.type === 'LIVE_TRACKING_TOGGLED') {
              const targetId = data.request_id || data.id;
              const nextStatus = Boolean(data.live_tracking);
              const eventTs = data.live_tracking_updated_at || Date.now();
              setRequests(prev => {
                const target = prev.find(r => r.id === targetId);
                // If local has a newer pending change, don't revert from older broadcast
                if (target?.liveTrackingUpdatedAt && target.liveTrackingUpdatedAt > eventTs) {
                  return prev;
                }
                const updated = prev.map(r => r.id === targetId ? { ...r, liveTracking: nextStatus, live_tracking: nextStatus, liveTrackingUpdatedAt: eventTs } : r);
                saveEmergencyRequests(updated, currentUserEmail, false);
                return updated;
              });
            } else if (data.type === 'DONOR_ALERT_DISPATCHED') {
              if (data.donor_id) {
                setDispatchedDonorIds((prev) => ({ ...prev, [data.donor_id]: true }));
              }
              setDonors(prev => {
                const updated = prev.map(d => {
                  if (d.id === data.donor_id || d.email.toLowerCase() === (data.donor_email || '').toLowerCase()) {
                    return {
                      ...d,
                      lastAlertSentAt: data.last_alert_sent_at,
                      last_alert_sent_at: data.last_alert_sent_at
                    };
                  }
                  return d;
                });
                saveDonors(updated, false);
                return updated;
              });
            } else if (data.type === 'EMERGENCY_DELETED') {
              const delId = data.deleted_id || data.id;
              if (delId) {
                markRequestDeleted(delId, currentUserEmail);
                setRequests(prev => {
                  const updated = prev.filter(r => r.id !== delId);
                  saveEmergencyRequests(updated, currentUserEmail, false);
                  return updated;
                });
              }
            } else if (data.type === 'EMERGENCY_FULFILLED') {
              const fulId = data.request_id || data.id;
              if (fulId) {
                setJustFulfilledId(fulId);
                setTimeout(() => setJustFulfilledId(null), 2500);
              }
              loadData();
            } else if (data.type === 'EMERGENCY_CREATED' || data.type === 'EMERGENCY_UPDATED') {
              loadData();
            }
          } catch { }
        };

        ws.onclose = () => {
          clearInterval(pingInterval);
          reconnectTimer = setTimeout(connectWs, 4000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch { }
    };

    connectWs();

    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [currentUserEmail]);

  // Toggle Live Tracking status for an active emergency request (Fast & Real-time, 0ms latency, race-free debouncing)
  const handleToggleLiveTracking = (targetReq: EmergencyRequest) => {
    const now = Date.now();
    let computedNextVal = false;

    // 1. Instant 0ms Optimistic UI Update & Broadcast across tabs
    setRequests(prev => {
      const current = prev.find(r => r.id === targetReq.id);
      const isCurrentlyOn = current
        ? (current.liveTracking !== false && current.live_tracking !== false)
        : (targetReq.liveTracking !== false && targetReq.live_tracking !== false);
      computedNextVal = !isCurrentlyOn;

      const updated = prev.map(r =>
        r.id === targetReq.id
          ? { ...r, liveTracking: computedNextVal, live_tracking: computedNextVal, liveTrackingUpdatedAt: now }
          : r
      );
      saveEmergencyRequests(updated, currentUserEmail);
      return updated;
    });

    // 2. Debounce rapid toggles per request so multiple rapid clicks don't race on the network
    if (pendingLiveTrackSyncRef.current[targetReq.id]) {
      clearTimeout(pendingLiveTrackSyncRef.current[targetReq.id]);
    }
    pendingLiveTrackSyncRef.current[targetReq.id] = setTimeout(() => {
      updateEmergencyLiveTrackingApi(targetReq.id, computedNextVal, currentUserEmail, now).catch(err => {
        console.warn('Background sync of live tracking failed:', err);
      });
      delete pendingLiveTrackSyncRef.current[targetReq.id];
    }, 150);
  };

  // Update coordinates whenever selected locality changes
  useEffect(() => {
    const loc = customLocalityInput.trim() || selectedLocality;
    const coords = resolveCoordinatesForLocation(loc);
    setUserCoords(coords);
  }, [selectedLocality, customLocalityInput]);

  // Lock body scroll while popup is open
  useEffect(() => {
    if (isOpenModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };
  }, [isOpenModal]);

  // GPS Browser Geolocation (Accurate 1-Click Permissions & Positioning)
  const handleDetectGps = async () => {
    if (!isGpsPermissionEnabled) {
      setGpsMessage('GPS Permission is OFF. Click "GPS Permission: OFF" to turn ON location access.');
      return;
    }
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsMessage('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    setGpsMessage('Detecting browser GPS coordinates...');

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permissionStatus.state === 'denied') {
          setIsDetectingGps(false);
          setGpsMessage('Location access is blocked in your browser settings. Please enter your locality manually.');
          return;
        }
      }
    } catch {
      // Permission query unsupported on some browsers
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserCoords({
          latitude: lat,
          longitude: lon
        });

        try {
          const geo = await reverseGeocodeCoordinates(lat, lon);
          setSelectedLocality(geo.primaryLocality);
          setCustomLocalityInput(geo.primaryLocality);
          setDetectedPills(geo.nearestPills || []);
          setGpsMessage(`Location locked: ${geo.primaryLocality}`);
          if (formErrors.targetLocation) setFormErrors(prev => ({ ...prev, targetLocation: '' }));
        } catch {
          const gpsLabel = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          setSelectedLocality(gpsLabel);
          setCustomLocalityInput(gpsLabel);
          setGpsMessage(`GPS Coordinates locked: (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`);
          if (formErrors.targetLocation) setFormErrors(prev => ({ ...prev, targetLocation: '' }));
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsMessage(err.code === 1 ? 'Location permission was denied. Please enter your locality manually.' : 'Unable to acquire GPS signal. Please enter your locality manually.');
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );
  };

  // Compatible donor types for selected blood group
  const compatibleBloodTypes = useMemo(() => {
    if (!bloodType) return [];
    return getCompatibleDonorTypes(bloodType as BloodType);
  }, [bloodType]);

  // Ranked Compatible Donors List (Fully Normalized & Proximity Ranked)
  const rankedDonors: RankedMatchDonor[] = useMemo(() => {
    if (!donors || donors.length === 0) return [];

    return donors
      .map(normalizeDonor)
      .filter((donor) => {
        const isAvail = donor.isAvailable !== false && donor.available !== false;
        const bType = (donor.bloodType || (donor as any).blood_type || '').toUpperCase() as BloodType;
        return isAvail && compatibleBloodTypes.includes(bType);
      })
      .map((donor) => {
        const donorCoords = resolveCoordinatesForLocation(donor.location || donor.city || 'Delhi');
        const distance = calculateHaversineDistance(
          userCoords.latitude,
          userCoords.longitude,
          donorCoords.latitude,
          donorCoords.longitude
        );
        const tier = getProximityTier(distance);

        return {
          ...donor,
          distanceKm: distance,
          tier
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [donors, compatibleBloodTypes, userCoords]);

  // Two Categorized Proximity Sections:
  // 1. Close / Same Locality & State Donors (<= 50 km)
  // 2. Regional & Extended Network Donors (> 50 km)
  const { closeDonors, extendedDonors } = useMemo(() => {
    const close: RankedMatchDonor[] = [];
    const extended: RankedMatchDonor[] = [];

    rankedDonors.forEach((donor) => {
      if (donor.distanceKm <= 50.0) {
        close.push(donor);
      } else {
        extended.push(donor);
      }
    });

    return { closeDonors: close, extendedDonors: extended };
  }, [rankedDonors]);

  // Dynamic matched donors calculator for any specific emergency request
  const getMatchesForRequest = (req: EmergencyRequest): RankedMatchDonor[] => {
    if (!donors || donors.length === 0) return [];
    const compTypes = getCompatibleDonorTypes(req.bloodType);
    const reqCoords = resolveCoordinatesForLocation(req.hospitalCity || 'Delhi');

    return donors
      .map(normalizeDonor)
      .filter((donor) => {
        const isAvail = donor.isAvailable !== false && donor.available !== false;
        const bType = (donor.bloodType || (donor as any).blood_type || '').toUpperCase() as BloodType;
        return isAvail && compTypes.includes(bType);
      })
      .map((donor) => {
        const donorCoords = resolveCoordinatesForLocation(donor.location || donor.city || 'Delhi');
        const distance = calculateHaversineDistance(
          reqCoords.latitude,
          reqCoords.longitude,
          donorCoords.latitude,
          donorCoords.longitude
        );
        const tier = getProximityTier(distance);

        return {
          ...donor,
          distanceKm: distance,
          tier
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  };

  // Open the interactive Mark Fulfilled confirmation modal
  const handleOpenFulfillModal = (req: EmergencyRequest) => {
    setFulfillmentModalReq(req);
    const matches = getMatchesForRequest(req);
    if (matches.length > 0) {
      setSelectedFulfillingDonorIds([matches[0].id]);
      setFulfilledViaReserve(false);
    } else {
      setSelectedFulfillingDonorIds([]);
      setFulfilledViaReserve(true);
    }
  };

  const handleToggleFulfillingDonor = (donorId: string) => {
    setFulfilledViaReserve(false);
    setSelectedFulfillingDonorIds(prev => {
      if (prev.includes(donorId)) {
        return prev.filter(id => id !== donorId);
      } else {
        return [...prev, donorId];
      }
    });
  };

  const handleSelectReserveOnly = () => {
    setFulfilledViaReserve(true);
    setSelectedFulfillingDonorIds([]);
  };

  // Confirm Fulfillment & trigger targeted gratitude / completion emails
  const handleConfirmFulfillment = async () => {
    if (!fulfillmentModalReq) return;
    if (selectedFulfillingDonorIds.length === 0 && !fulfilledViaReserve) return;
    setIsFulfilling(true);

    const targetReq = fulfillmentModalReq;
    const fulfilledAt = new Date().toISOString();
    const matches = getMatchesForRequest(targetReq);
    const chosenDonors = matches.filter(d => selectedFulfillingDonorIds.includes(d.id));

    const donorSummaryName = chosenDonors.length > 0
      ? chosenDonors.map(d => d.fullName).join(', ')
      : 'Alternative Clinical Reserve / External Stock';

    const donorSummaryEmail = chosenDonors.length > 0
      ? chosenDonors.map(d => d.email).join(', ')
      : undefined;

    try {
      // 1. Call backend fulfillment endpoint to update status and dispatch emails
      await fulfillEmergencyRequestApi(targetReq.id, {
        requester_email: currentUserEmail,
        requester_name: targetReq.contactName,
        donor_id: chosenDonors.length > 0 ? chosenDonors[0].id : undefined,
        donor_name: donorSummaryName,
        donor_email: donorSummaryEmail,
        selected_donors: chosenDonors.map(d => ({
          id: d.id,
          name: d.fullName,
          email: d.email,
          blood_type: d.bloodType,
          phone: d.phone
        })),
        fulfilled_via_reserve: fulfilledViaReserve || chosenDonors.length === 0,
        notes: chosenDonors.length > 0
          ? `Transfusion fulfilled by voluntary donor(s): ${donorSummaryName}`
          : 'Transfusion fulfilled via alternative clinical reserve'
      });

      // 2. Update local state
      const updated = requests.map(r => {
        if (r.id === targetReq.id) {
          return {
            ...r,
            status: 'fulfilled' as const,
            matchedDonorId: chosenDonors.length > 0 ? chosenDonors[0].id : r.matchedDonorId,
            liveTracking: false,
            live_tracking: false,
            fulfilledAt,
            fulfilledByDonorName: donorSummaryName,
            fulfilledByDonorEmail: donorSummaryEmail
          };
        }
        return r;
      });

      setRequests(updated);
      saveEmergencyRequests(updated, currentUserEmail);
      updateRequestLiveTracking(targetReq.id, false, currentUserEmail);

      // Trigger single smooth celebration animation and clear any blinking loops
      setJustFulfilledId(targetReq.id);
      setIsBlinking(false);
      setHighlightedId(null);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('highlight');
        return next;
      }, { replace: true });
      setTimeout(() => setJustFulfilledId(null), 2500);

      setBoardNotification({
        message: chosenDonors.length > 0
          ? `Transfusion for ${targetReq.patientName} marked FULFILLED! Gratitude emails transmitted to ${chosenDonors.length} voluntary lifesaver(s) and ${currentUserEmail}.`
          : `Transfusion for ${targetReq.patientName} marked FULFILLED via Clinical Reserve! Receipt transmitted to ${currentUserEmail}.`,
        type: 'success'
      });
      setTimeout(() => setBoardNotification(null), 6000);
      setFulfillmentModalReq(null);
    } catch (err: any) {
      setBoardNotification({
        message: err.message || 'Error marking request fulfilled. Please try again.',
        type: 'error'
      });
    } finally {
      setIsFulfilling(false);
    }
  };

  // Generate and download clinical PDF docket directly from horizontal request card
  const handleDownloadPdfForRequest = async (req: EmergencyRequest, matches: RankedMatchDonor[]) => {
    if (matches.length === 0) return;
    setGeneratingPdfReqId(req.id);
    setIsGeneratingPdf(true);
    try {
      // Brief pause to allow the spinning animation to be visible and clear
      await new Promise(resolve => setTimeout(resolve, 450));

      const donorItems: RankedDonorItem[] = matches.map((d, index) => ({
        rank: index + 1,
        id: d.id,
        fullName: d.fullName,
        bloodType: d.bloodType,
        distanceKm: d.distanceKm,
        location: d.location || d.city || 'Delhi NCR',
        phone: d.phone,
        email: d.email || '',
        matchScore: Math.max(70, Math.round(100 - d.distanceKm * 2))
      }));

      const reqCoords = resolveCoordinatesForLocation(req.hospitalCity || 'Delhi');

      const pdfResult = generateEmergencyDonorDocketPdf(
        {
          recipientBloodType: req.bloodType,
          patientName: req.patientName,
          patientAge: req.patientAge,
          unitsNeeded: req.unitsNeeded,
          urgency: req.urgency,
          hospitalLocality: req.hospitalCity || 'Delhi NCR',
          searchCoordinates: reqCoords,
          emergencyPhone: req.contactNumber || 'N/A',
          contactName: req.contactName || currentUserName,
          timestamp: new Date().toISOString(),
          autoDownload: true
        },
        donorItems
      );

      // Persist PDF docket to Cloudflare R2 object storage for this user
      if (pdfResult.base64 && currentUserEmail) {
        saveEmergencyDocketApi({
          user_email: currentUserEmail,
          filename: pdfResult.filename,
          pdf_base64: pdfResult.base64
        }).catch(() => { });
      }

      setDownloadedPdfReqId(req.id);
      setTimeout(() => {
        setDownloadedPdfReqId(prev => (prev === req.id ? null : prev));
      }, 2500);

      setBoardNotification({
        message: `Clinical PDF docket downloaded for ${req.patientName} (${req.bloodType}).`,
        type: 'success'
      });
      setTimeout(() => setBoardNotification(null), 4000);
    } catch (err: any) {
      setBoardNotification({
        message: err.message || 'Failed to download PDF docket.',
        type: 'error'
      });
    } finally {
      setGeneratingPdfReqId(null);
      setIsGeneratingPdf(false);
    }
  };

  // Email top compatible donor roster with attached PDF directly from horizontal request card (Dispatched to Clinician)
  const handleEmailRosterForRequest = async (req: EmergencyRequest, matches: RankedMatchDonor[]) => {
    if (matches.length === 0) return;
    setEmailingRosterReqId(req.id);
    setIsEmailingRoster(true);

    const rosterItems = matches.slice(0, 18).map((d, index) => ({
      rank: index + 1,
      fullName: d.fullName,
      bloodType: d.bloodType,
      distanceKm: d.distanceKm,
      locality: d.location || d.city || 'Delhi NCR',
      phone: d.phone
    }));

    const donorItems: RankedDonorItem[] = matches.map((d, index) => ({
      rank: index + 1,
      id: d.id,
      fullName: d.fullName,
      bloodType: d.bloodType,
      distanceKm: d.distanceKm,
      location: d.location || d.city || 'Delhi NCR',
      phone: d.phone,
      email: d.email || '',
      matchScore: Math.max(70, Math.round(100 - d.distanceKm * 2))
    }));

    const reqCoords = resolveCoordinatesForLocation(req.hospitalCity || 'Delhi');

    try {
      const pdfResult = generateEmergencyDonorDocketPdf(
        {
          recipientBloodType: req.bloodType,
          patientName: req.patientName,
          patientAge: req.patientAge,
          unitsNeeded: req.unitsNeeded,
          urgency: req.urgency,
          hospitalLocality: req.hospitalCity || 'Delhi NCR',
          searchCoordinates: reqCoords,
          emergencyPhone: req.contactNumber || 'N/A',
          contactName: req.contactName || currentUserName,
          timestamp: new Date().toISOString(),
          autoDownload: false
        },
        donorItems
      );

      const res = await emailEmergencyRosterApi({
        clinician_email: currentUserEmail,
        clinician_name: currentUserName,
        patient_name: req.patientName,
        recipient_blood_type: req.bloodType,
        units_needed: req.unitsNeeded,
        hospital: req.hospital || 'Emergency Trauma Network',
        locality: req.hospitalCity || 'Delhi NCR',
        urgency: req.urgency,
        emergency_phone: req.contactNumber,
        roster_items: rosterItems,
        pdf_base64: pdfResult.base64,
        pdf_filename: pdfResult.filename,
        dispatch_id: pdfResult.uniqueId
      });

      // Persist PDF docket to Cloudflare R2 object storage for this user
      if (pdfResult.base64 && currentUserEmail) {
        saveEmergencyDocketApi({
          user_email: currentUserEmail,
          filename: pdfResult.filename,
          pdf_base64: pdfResult.base64
        }).catch(() => { });
      }

      if (res.ok) {
        setEmailedRosterReqId(req.id);
        setTimeout(() => {
          setEmailedRosterReqId(prev => (prev === req.id ? null : prev));
        }, 2500);

        setBoardNotification({
          message: `Ranked donor roster & PDF docket #${pdfResult.uniqueId} dispatched to ${currentUserEmail} with attachment!`,
          type: 'success'
        });
        setTimeout(() => setBoardNotification(null), 5000);
      } else {
        setBoardNotification({
          message: res.error || 'Failed to send roster briefing email.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setBoardNotification({
        message: err.message || 'Error transmitting roster email.',
        type: 'error'
      });
    } finally {
      setEmailingRosterReqId(null);
      setIsEmailingRoster(false);
    }
  };

  // Send real-time emergency alert email to an individual donor from horizontal card
  const handleSendAlertForRequest = async (req: EmergencyRequest, donor: RankedMatchDonor) => {
    setDispatchingDonorId(donor.id);

    try {
      const res = await dispatchEmergencyDonorApi({
        donor_id: donor.id,
        donor_name: donor.fullName,
        donor_email: donor.email,
        donor_phone: donor.phone,
        patient_name: req.patientName,
        recipient_blood_type: req.bloodType,
        units_needed: req.unitsNeeded,
        hospital: req.hospital || 'Emergency Trauma Network',
        locality: req.hospitalCity || 'Delhi NCR',
        urgency: req.urgency,
        clinician_name: currentUserName,
        emergency_contact: req.contactNumber
      });

      if (res.ok) {
        setDispatchedDonorIds((prev) => ({ ...prev, [donor.id]: true }));
        setBoardNotification({
          message: `Emergency dispatch email transmitted successfully to ${donor.fullName} (${donor.email})!`,
          type: 'success'
        });
        setTimeout(() => setBoardNotification(null), 5000);
      } else {
        setBoardNotification({
          message: res.error || 'Failed to dispatch email. Please check network.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setBoardNotification({
        message: err.message || 'Error transmitting emergency dispatch.',
        type: 'error'
      });
    } finally {
      setDispatchingDonorId(null);
    }
  };

  // Update Status helper
  const onUpdateStatus = (id: string, status: EmergencyRequest['status'], matchedDonorId?: string) => {
    const updated = requests.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status,
          matchedDonorId: matchedDonorId || r.matchedDonorId,
          fulfilledAt: status === 'fulfilled' ? new Date().toISOString() : r.fulfilledAt,
        };
      }
      return r;
    });
    saveEmergencyRequests(updated, currentUserEmail);
    setRequests(updated);
  };

  const BLOOD_TYPES: (BloodType | 'ALL')[] = ['ALL', 'O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  const filteredRequests = requests.filter(r => {
    // Highlighted emergency case bypasses active filters so user always lands directly on it
    if (highlightParam && r.id === highlightParam) return true;

    // 1. Triage Status filter
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;

    // 2. Blood Group filter
    if (selectedBloodFilter !== 'ALL' && r.bloodType !== selectedBloodFilter) return false;

    // 3. Search Query filter (Case ID, patient name, locality/hospital, contact, blood group)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = r.patientName?.toLowerCase().includes(q);
      const matchesBlood = r.bloodType?.toLowerCase().includes(q);
      const matchesHospital = r.hospital?.toLowerCase().includes(q) || r.hospitalCity?.toLowerCase().includes(q);
      const matchesContact = r.contactName?.toLowerCase().includes(q) || r.contactNumber?.toLowerCase().includes(q);
      const matchesId = r.id?.toLowerCase().includes(q);
      if (!matchesName && !matchesBlood && !matchesHospital && !matchesContact && !matchesId) {
        return false;
      }
    }

    return true;
  });

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setModalPhase('INPUT');
    setFormErrors({});
    setModalNotification(null);
    setPatientName('');
    setPatientAge('');
    setBloodType('');
    setUnitsNeeded('1');
    setUrgency('CRITICAL');
    setEmergencyConfirmed(false);
    setSelectedLocality('');
    setCustomLocalityInput('');
    setIsLocalityDropdownOpen(false);
    setDetectedPills([]);
    setGpsMessage(null);
    setActiveEmergencyRequestId(null);
    setActiveEmergencyDraft(null);
  };

  const handleCancelModal = () => {
    handleCloseModal();
  };

  // Custom in-app deletion confirmation trigger (eliminates native window.confirm prompt)
  const handleOpenDeleteModal = (req: EmergencyRequest, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRequestToDelete(req);
  };

  const handleConfirmDeleteRequest = async () => {
    if (!requestToDelete) return;
    const targetId = requestToDelete.id;
    setDeletingRequestId(targetId);

    // 1. Immediately mark deleted in persistent local tombstone set
    markRequestDeleted(targetId, currentUserEmail);

    // 2. Optimistically filter from state and storage
    setRequests(prev => {
      const updated = prev.filter(r => r.id !== targetId);
      saveEmergencyRequests(updated, currentUserEmail);
      return updated;
    });

    // 3. Dispatch delete API call to backend
    try {
      await deleteEmergencyRequestApi(targetId, currentUserEmail);
    } catch { }

    // 4. Show confirmation banner and automatically dismiss after 4 seconds (Work 1)
    setBoardNotification({
      message: `Emergency request #${targetId} permanently removed from triage board.`,
      type: 'success'
    });
    setTimeout(() => {
      setBoardNotification(prev => (prev?.message?.includes(targetId) ? null : prev));
    }, 4000);

    setDeletingRequestId(null);
    setRequestToDelete(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!patientName.trim() || patientName.trim().length < 2) {
      errors.patientName = 'Patient full legal name is required (at least 2 characters)';
    }

    if (!patientAge || Number(patientAge) < 1 || Number(patientAge) > 120) {
      errors.patientAge = 'Please enter a valid patient age between 1 and 120';
    }

    if (!bloodType) {
      errors.bloodType = 'Recipient required blood group is required';
    }

    const loc = (customLocalityInput.trim() || selectedLocality.trim());
    if (!loc) {
      errors.locality = 'Target locality or triage area is required. Type an area or click Detect My Location.';
    }

    const phoneVal = validatePhoneNumber(countryDialCode, contactPhone);
    if (!phoneVal.isValid) {
      errors.contactPhone = phoneVal.message || 'Please enter a valid emergency contact number';
    }

    if (!emergencyConfirmed) {
      errors.emergencyConfirmed = 'You must confirm emergency dispatch authorization to proceed';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const fullPhone = `${countryDialCode} ${contactPhone.trim()}`;
    const locationString = customLocalityInput.trim() || selectedLocality;

    // Use active draft ID if already modifying and re-testing; otherwise assign a fresh unique ID
    const reqId = activeEmergencyRequestId || `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    setActiveEmergencyRequestId(reqId);
    unmarkRequestDeleted(reqId, currentUserEmail);

    const currentRequest: EmergencyRequest = {
      id: reqId,
      patientName: stripHonorific(patientName.trim()),
      patientAge: Number(patientAge) || 35,
      bloodType: bloodType as BloodType,
      unitsNeeded: Number(unitsNeeded) || 1,
      hospital: 'Emergency Trauma Network',
      hospitalCity: locationString,
      ward: 'Emergency Triage',
      urgency,
      contactName: stripHonorific(contactName.trim() || currentUserName),
      contactNumber: fullPhone,
      status: 'urgent',
      createdAt: activeEmergencyDraft?.createdAt || new Date().toISOString(),
    };

    setActiveEmergencyDraft(currentRequest);
    saveCustomPhone(fullPhone);

    // Modify the unique one in board state in place and save immediately to localStorage
    let updatedList: EmergencyRequest[] = [];
    setRequests(prev => {
      const idx = prev.findIndex(r => r.id === reqId);
      if (idx >= 0) {
        updatedList = [...prev];
        updatedList[idx] = currentRequest;
      } else {
        updatedList = [currentRequest, ...prev];
      }
      saveEmergencyRequests(updatedList, currentUserEmail);
      return updatedList;
    });

    // Immediately persist to backend database & Cloudflare R2 for this separate user
    createEmergencyRequestApi({
      id: currentRequest.id,
      user_email: currentUserEmail,
      patient_name: currentRequest.patientName,
      patient_age: currentRequest.patientAge,
      hospital: currentRequest.hospital,
      hospital_city: currentRequest.hospitalCity,
      ward: currentRequest.ward,
      blood_type: currentRequest.bloodType,
      units_needed: currentRequest.unitsNeeded,
      urgency: currentRequest.urgency,
      status: currentRequest.status,
      contact_person: currentRequest.contactName,
      contact_phone: currentRequest.contactNumber
    }).catch(err => {
      console.warn('Backend emergency request auto-sync error:', err);
    });

    // Seamlessly transition to Radar Scanning state inside the same popup
    setModalPhase('SCANNING');
    setScanStepIndex(0);

    const stepInterval = setInterval(() => {
      setScanStepIndex((prev) => {
        if (prev < scanSteps.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 300);

    setTimeout(() => {
      clearInterval(stepInterval);
      setModalPhase('RESULTS');
    }, 1300);
  };

  const handleDoneAndViewOnBoard = async () => {
    if (activeEmergencyDraft) {
      const finalReq = activeEmergencyDraft;
      const targetId = finalReq.id;

      // 1. Commit to state & localStorage
      let updatedList: EmergencyRequest[] = [];
      setRequests(prev => {
        const idx = prev.findIndex(r => r.id === targetId);
        if (idx >= 0) {
          updatedList = [...prev];
          updatedList[idx] = finalReq;
        } else {
          updatedList = [finalReq, ...prev];
        }
        saveEmergencyRequests(updatedList, currentUserEmail);
        return updatedList;
      });

      // 2. Persist to backend database & Cloudflare R2
      try {
        await createEmergencyRequestApi({
          id: finalReq.id,
          user_email: currentUserEmail,
          patient_name: finalReq.patientName,
          patient_age: finalReq.patientAge,
          hospital: finalReq.hospital,
          hospital_city: finalReq.hospitalCity,
          ward: finalReq.ward,
          blood_type: finalReq.bloodType,
          units_needed: finalReq.unitsNeeded,
          urgency: finalReq.urgency,
          status: finalReq.status,
          contact_person: finalReq.contactName,
          contact_phone: finalReq.contactNumber
        });
      } catch { }

      setBoardNotification({
        message: `Emergency request #${targetId} for ${finalReq.patientName} saved and live on triage board.`,
        type: 'success'
      });

      handleCloseModal();

      // 3. Smooth scroll and highlight that unique card strictly inside container
      setTimeout(() => {
        const card = document.getElementById(`request-row-${targetId}`);
        if (card) {
          window.scrollTo(0, 0);
          const mainContainer = document.querySelector('main');
          if (mainContainer) {
            const rect = card.getBoundingClientRect();
            const containerRect = mainContainer.getBoundingClientRect();
            const targetScrollTop = mainContainer.scrollTop + (rect.top - containerRect.top) - (containerRect.height / 2) + (rect.height / 2);
            mainContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
          }
          card.classList.add('ring-2', 'ring-[#D72638]/40', 'border-l-4', 'border-l-[#D72638]', 'bg-[#FFF9F9]');
          setTimeout(() => {
            card.classList.remove('ring-2', 'ring-[#D72638]/40', 'border-l-4', 'border-l-[#D72638]', 'bg-[#FFF9F9]');
          }, 3000);
        }
      }, 350);
    } else {
      handleCloseModal();
    }
  };

  // Dispatch Emergency Alert to an individual donor
  const handleDispatchDonor = async (donor: RankedMatchDonor) => {
    setDispatchingDonorId(donor.id);
    setModalNotification(null);

    try {
      const res = await dispatchEmergencyDonorApi({
        donor_id: donor.id,
        donor_name: donor.fullName,
        donor_email: donor.email,
        donor_phone: donor.phone,
        patient_name: patientName,
        recipient_blood_type: bloodType as BloodType,
        units_needed: Number(unitsNeeded) || 1,
        hospital: 'Emergency Trauma Network',
        locality: customLocalityInput.trim() || selectedLocality,
        urgency: urgency,
        clinician_name: currentUserName,
        emergency_contact: `${countryDialCode} ${contactPhone.trim()}`,
      });

      if (res.ok) {
        setDispatchedDonorIds((prev) => ({ ...prev, [donor.id]: true }));
        setModalNotification({
          message: `Emergency dispatch email transmitted successfully to ${donor.fullName}!`,
          type: 'success'
        });
      } else {
        setModalNotification({
          message: res.error || 'Failed to dispatch email. Please check network.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setModalNotification({
        message: err.message || 'Error transmitting emergency dispatch.',
        type: 'error'
      });
    } finally {
      setDispatchingDonorId(null);
    }
  };

  // Email Top Donors Roster to Clinician along with the Attached Minimal PDF Docket
  const handleEmailRoster = async () => {
    if (rankedDonors.length === 0) return;
    setIsEmailingRoster(true);
    setModalNotification(null);

    const rosterItems = rankedDonors.slice(0, 18).map((d, index) => ({
      rank: index + 1,
      fullName: d.fullName,
      bloodType: d.bloodType,
      distanceKm: d.distanceKm,
      locality: d.location || d.city || 'Delhi NCR',
      phone: d.phone
    }));

    const donorItems: RankedDonorItem[] = rankedDonors.map((d, index) => ({
      rank: index + 1,
      id: d.id,
      fullName: d.fullName,
      bloodType: d.bloodType,
      distanceKm: d.distanceKm,
      location: d.location || d.city || 'Delhi NCR',
      phone: d.phone,
      email: d.email || '',
      matchScore: Math.max(70, Math.round(100 - d.distanceKm * 2))
    }));

    try {
      // 1. Generate minimal UI-aligned PDF docket with unique ID (autoDownload: false for email)
      const pdfResult = generateEmergencyDonorDocketPdf(
        {
          recipientBloodType: (bloodType || 'O+') as BloodType,
          patientName,
          patientAge: patientAge ? Number(patientAge) : undefined,
          unitsNeeded: unitsNeeded ? Number(unitsNeeded) : undefined,
          urgency,
          hospitalName: 'Emergency Trauma Network',
          hospitalLocality: customLocalityInput.trim() || selectedLocality,
          searchCoordinates: userCoords,
          emergencyPhone: `${countryDialCode} ${contactPhone.trim()}`,
          contactName: contactName.trim() || currentUserName,
          timestamp: new Date().toISOString(),
          autoDownload: false
        },
        donorItems
      );

      // 2. Dispatch email to user/clinician with Base64 PDF attachment
      const res = await emailEmergencyRosterApi({
        clinician_email: currentUserEmail,
        clinician_name: currentUserName,
        patient_name: patientName,
        recipient_blood_type: bloodType as BloodType,
        units_needed: Number(unitsNeeded) || 1,
        hospital: 'Emergency Trauma Network',
        locality: customLocalityInput.trim() || selectedLocality,
        urgency: urgency,
        emergency_phone: `${countryDialCode} ${contactPhone.trim()}`,
        roster_items: rosterItems,
        pdf_base64: pdfResult.base64,
        pdf_filename: pdfResult.filename,
        dispatch_id: pdfResult.uniqueId
      });

      // Persist PDF docket to Cloudflare R2 object storage for this user
      if (pdfResult.base64 && currentUserEmail) {
        saveEmergencyDocketApi({
          user_email: currentUserEmail,
          filename: pdfResult.filename,
          pdf_base64: pdfResult.base64
        }).catch(() => { });
      }

      setLastGeneratedPdf({
        uniqueId: pdfResult.uniqueId,
        filename: pdfResult.filename,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        patientName: patientName.trim() || 'Emergency Patient',
        patientAge: Number(patientAge) || 35,
        bloodType: (bloodType || 'O+') as BloodType,
        unitsNeeded: Number(unitsNeeded) || 1,
        urgency: urgency,
        locality: customLocalityInput.trim() || selectedLocality || 'Emergency Triage',
        emergencyPhone: `${countryDialCode} ${contactPhone.trim()}`,
        contactName: contactName.trim() || currentUserName,
        donorCount: donorItems.length,
        persistedToR2: Boolean(currentUserEmail)
      });

      if (res.ok) {
        setModalNotification({
          message: `Ranked donor roster & PDF docket #${pdfResult.uniqueId} dispatched to ${currentUserEmail} with attachment!`,
          type: 'success'
        });
      } else {
        setModalNotification({
          message: res.error || 'Failed to send roster briefing email.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setModalNotification({
        message: err.message || 'Error transmitting roster briefing.',
        type: 'error'
      });
    } finally {
      setIsEmailingRoster(false);
    }
  };

  // Generate & Download Instant Client-Side PDF Docket
  const handleDownloadPdf = async () => {
    if (rankedDonors.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const donorItems: RankedDonorItem[] = rankedDonors.map((d, index) => ({
        rank: index + 1,
        id: d.id,
        fullName: d.fullName,
        bloodType: d.bloodType,
        distanceKm: d.distanceKm,
        location: d.location || d.city || 'Delhi NCR',
        phone: d.phone,
        email: d.email || '',
        matchScore: Math.max(70, Math.round(100 - d.distanceKm * 2))
      }));

      const pdfResult = generateEmergencyDonorDocketPdf(
        {
          recipientBloodType: (bloodType || 'O+') as BloodType,
          patientName,
          patientAge: patientAge ? Number(patientAge) : undefined,
          unitsNeeded: unitsNeeded ? Number(unitsNeeded) : undefined,
          urgency,
          hospitalName: 'Emergency Trauma Network',
          hospitalLocality: customLocalityInput.trim() || selectedLocality,
          searchCoordinates: userCoords,
          emergencyPhone: `${countryDialCode} ${contactPhone.trim()}`,
          contactName: contactName.trim() || currentUserName,
          timestamp: new Date().toISOString(),
          autoDownload: true
        },
        donorItems
      );

      // Persist PDF docket to Cloudflare R2 object storage for this user
      if (pdfResult.base64 && currentUserEmail) {
        saveEmergencyDocketApi({
          user_email: currentUserEmail,
          filename: pdfResult.filename,
          pdf_base64: pdfResult.base64
        }).catch(() => { });
      }

      setLastGeneratedPdf({
        uniqueId: pdfResult.uniqueId,
        filename: pdfResult.filename,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        patientName: patientName.trim() || 'Emergency Patient',
        patientAge: Number(patientAge) || 35,
        bloodType: (bloodType || 'O+') as BloodType,
        unitsNeeded: Number(unitsNeeded) || 1,
        urgency: urgency,
        locality: customLocalityInput.trim() || selectedLocality || 'Emergency Triage',
        emergencyPhone: `${countryDialCode} ${contactPhone.trim()}`,
        contactName: contactName.trim() || currentUserName,
        donorCount: donorItems.length,
        persistedToR2: Boolean(currentUserEmail)
      });

      setModalNotification({
        message: `Clinical Emergency Docket #${pdfResult.uniqueId} downloaded successfully!`,
        type: 'success'
      });
    } catch (err: any) {
      setModalNotification({
        message: err.message || 'Failed to render PDF document.',
        type: 'error'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-2 sm:pb-3 relative z-10">
      {/* Header with Scroll Blur-In */}
      <motion.div
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="p-6 sm:p-8 rounded-2xl bg-white border border-[#D9C7C2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/30 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Live Emergency Requests</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Emergency Blood Requests
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-xl">
            Manage urgent blood requests, match nearby compatible donors, and dispatch transfusion dockets.
          </p>
        </div>

        <button
          onClick={() => {
            setIsOpenModal(true);
            setModalPhase('INPUT');
            setFormErrors({});
            setModalNotification(null);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Broadcast Emergency Request</span>
        </button>
      </motion.div>

      {/* Featured Video Header */}
      <motion.div
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="p-5 sm:p-6 rounded-2xl bg-white border border-[#D9C7C2] shadow-sm overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-6">
          <div
            className="relative w-full lg:w-3/5 rounded-2xl overflow-hidden border border-[#D72638]/40 shadow-md bg-black h-[220px] xs:h-[260px] sm:h-[300px] flex items-center justify-center"
            style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
          >
            <video
              src="/21617-319452308.mp4"
              poster="/21617-319452308_poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden', willChange: 'transform' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-center justify-between gap-1.5 text-xs pointer-events-none">
              <span className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] sm:text-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping shrink-0" />
                <span className="truncate">Live Trauma Dispatch Bay 01</span>
              </span>
              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#D72638]/90 backdrop-blur-sm text-white font-mono font-bold text-[9px] sm:text-[11px] shadow-xs shrink-0 whitespace-nowrap">
                Emergency Feed 60fps
              </span>
            </div>

            <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 pointer-events-none">
              <div className="bg-black/65 backdrop-blur-md rounded-xl p-2 sm:p-2.5 border border-white/15 grid grid-cols-3 gap-1.5 sm:gap-3 items-center text-white">
                {/* Active Triage Board */}
                <div className="min-w-0 pr-1 border-r border-white/10">
                  <div className="text-[8.5px] sm:text-[10px] uppercase font-mono tracking-wider text-slate-300 truncate">
                    Active Triage
                  </div>
                  <div className="text-xs sm:text-sm font-black tracking-tight flex items-baseline gap-1 mt-0.5">
                    <span className="text-[#D72638] font-mono text-sm sm:text-base font-black">{requests.length}</span>
                    <span className="text-[10px] sm:text-xs text-white truncate">Calls</span>
                  </div>
                </div>

                {/* Cross-Match Latency */}
                <div className="min-w-0 px-1 border-r border-white/10 text-center sm:text-left">
                  <div className="text-[8.5px] sm:text-[10px] uppercase font-mono tracking-wider text-slate-300 truncate">
                    Cross-Match
                  </div>
                  <div className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400 mt-0.5 truncate">
                    &lt; 15m Dispatch
                  </div>
                </div>

                {/* Standby Pool */}
                <div className="min-w-0 pl-1 text-right">
                  <div className="text-[8.5px] sm:text-[10px] uppercase font-mono tracking-wider text-slate-300 truncate">
                    Standby Pool
                  </div>
                  <div className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400 mt-0.5 truncate">
                    {donors.length} Donors Ready
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/20 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-[#D72638]" />
                <span>Zero Tolerance Trauma Protocol</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#1A1D20] tracking-tight">
                Immediate Clinical Blood Dispatch &amp; Donor Alert
              </h2>
              <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                Direct integration with regional emergency trauma bays, real-time ABO/Rh cross-matching, and autonomous broadcast mobilization for high-priority patient transfusions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Critical Triage</span>
                <span className="text-base font-black text-[#D72638] font-mono mt-0.5 block">
                  {requests.filter(r => r.urgency === 'CRITICAL' && r.status === 'urgent').length} Urgent Calls
                </span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">&lt; 1 Hr Transfusion Corridor</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Standby Donors</span>
                <span className="text-base font-black text-[#1A1D20] font-mono mt-0.5 block">
                  {donors.length} Available
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Ready for Mobilization</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#7A0C17]/5 border border-[#D72638]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D72638]" />
                <span className="text-[#1A1D20] font-semibold text-xs">Emergency Alert System Online</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#D72638] text-white font-bold text-[10px]">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {['ALL', 'urgent', 'critical', 'fulfilled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${filterStatus === status
              ? 'bg-[#D72638] text-white shadow-md shadow-[#D72638]/20'
              : 'bg-white text-[#4A5568] hover:text-[#1A1D20] border border-[#D9C7C2]'
              }`}
          >
            {status.toUpperCase()} ({status === 'ALL' ? requests.length : requests.filter(r => r.status === status).length})
          </button>
        ))}
      </div>

      {/* Board Notification Toast */}
      <AnimatePresence>
        {boardNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.35, ease: 'easeOut' } }}
            className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md border ${boardNotification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-[#D72638] border-red-200'
              }`}
          >
            <div className="flex items-center gap-2">
              {boardNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#D72638] shrink-0" />
              )}
              <span>{boardNotification.message}</span>
            </div>
            <button
              onClick={() => setBoardNotification(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Triage Request Cards (Full-Width Horizontal Bar Architecture) */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#D9C7C2] text-[#5A626A] shadow-xs">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1D20]">No active requests found</h3>
          <p className="text-xs mt-1">No emergency transfusion requests have been broadcast yet. Click "Broadcast Emergency Request" above to initiate a real-time call.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 w-full">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map(req => {
              const matches = getMatchesForRequest(req);
              const isExpanded = expandedRequestIds.has(req.id);
              const isFulfilled = req.status === 'fulfilled';
              const isJustFulfilled = justFulfilledId === req.id;
              const isTargetHighlighted = !isFulfilled && (highlightedId === req.id || highlightParam === req.id) && isBlinking;

              const isReserveFulfillment = isFulfilled && (
                !req.fulfilledByDonorName ||
                req.fulfilledByDonorName.toLowerCase().includes('reserve') ||
                req.fulfilledByDonorName.toLowerCase().includes('stock') ||
                req.fulfilledByDonorName.toLowerCase().includes('no one')
              );

              // If fulfilled, only show the donor(s) that actually fulfilled it ("only show that which user do that done by no one or any one that the user clicked on fulfilled")
              let effectiveFulfilledDonors: RankedMatchDonor[] = [];
              if (isFulfilled && !isReserveFulfillment) {
                effectiveFulfilledDonors = matches.filter(d =>
                  (req.matchedDonorId && d.id === req.matchedDonorId) ||
                  (req.fulfilledByDonorName && (
                    req.fulfilledByDonorName.toLowerCase().includes(d.fullName.toLowerCase()) ||
                    d.fullName.toLowerCase().includes(req.fulfilledByDonorName.toLowerCase())
                  )) ||
                  (req.fulfilledByDonorEmail && d.email && (
                    req.fulfilledByDonorEmail.toLowerCase().includes(d.email.toLowerCase()) ||
                    d.email.toLowerCase().includes(req.fulfilledByDonorEmail.toLowerCase())
                  ))
                );

                if (effectiveFulfilledDonors.length === 0 && req.fulfilledByDonorName) {
                  const baseDonor = normalizeDonor({
                    id: req.matchedDonorId || 'fulfilled-donor-id',
                    fullName: req.fulfilledByDonorName,
                    email: req.fulfilledByDonorEmail || 'Verified Donor Contact',
                    phone: 'Verified Clinical Roster',
                    bloodType: req.bloodType,
                    city: req.hospitalCity || 'Delhi NCR',
                    location: req.hospitalCity || 'Delhi NCR'
                  });
                  effectiveFulfilledDonors = [{
                    ...baseDonor,
                    distanceKm: 0,
                    tier: {
                      label: 'Primary Fulfilling Lifesaver',
                      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      textColor: 'text-emerald-800',
                      dotColor: 'bg-emerald-500'
                    }
                  }];
                }
              }

              const displayedDonors = isFulfilled ? effectiveFulfilledDonors : matches;

              return (
                <motion.div
                  layout
                  key={req.id}
                  id={`request-row-${req.id}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.93, filter: 'blur(8px)', transition: { duration: 0.25, ease: 'easeOut' } }}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs relative ${isJustFulfilled
                    ? 'animate-fulfilled-smooth ring-4 ring-emerald-400/50 border-emerald-500 bg-emerald-50/40 z-10'
                    : isTargetHighlighted
                      ? 'animate-target-record-blink ring-2 ring-[#D72638]/40 border-l-4 border-l-[#D72638] border-y-[#D72638]/30 border-r-[#D72638]/30 shadow-md shadow-[#D72638]/10 bg-[#FFF9F9] z-10'
                      : isFulfilled
                        ? 'bg-white border-emerald-200'
                        : 'bg-white border-[#D9C7C2] hover:border-[#D72638]/50'
                    }`}
                >
                  {/* Horizontal Primary Row */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Blood Type & Patient Clinical Details */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      <div
                        title={`Blood Group ${req.bloodType}`}
                        className="group/badge relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#E63946] via-[#D72638] to-[#7A0C17] text-white font-black flex flex-col items-center justify-center shadow-md shadow-[#D72638]/25 border border-white/20 shrink-0 transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#D72638]/40 hover:from-[#FF4D5E] hover:to-[#8E0E1B] active:scale-95 cursor-pointer overflow-hidden select-none"
                      >
                        {/* Subtle Glass Sheen Top Overlay */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-2xl" />
                        <div className="relative z-10 flex flex-col items-center justify-center leading-none">
                          <span className="text-[7.5px] font-extrabold uppercase tracking-widest text-red-100/90 leading-tight mb-0.5">
                            GROUP
                          </span>
                          <span className="text-base sm:text-lg font-black tracking-tight leading-none text-white drop-shadow-xs">
                            {req.bloodType}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-[#1A1D20] leading-tight truncate">
                            {req.patientName}
                          </h3>
                          <span className="font-mono text-xs text-[#7A0C17] bg-[#7A0C17]/10 px-2 py-0.5 rounded-md font-bold">
                            {req.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isFulfilled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : req.urgency === 'CRITICAL'
                              ? 'bg-red-100 text-[#D72638] border border-red-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                            {isFulfilled ? '✓ FULFILLED' : req.urgency}
                          </span>
                          {isTargetHighlighted && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight bg-red-50 text-[#D72638] border border-red-200 inline-flex items-center gap-1.5 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D72638]" />
                              <span>Focused</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-[#5A626A] mt-1 flex-wrap">
                          <span>Age: {req.patientAge}</span>
                          <span>•</span>
                          <span className="font-bold text-[#1A1D20]">{req.unitsNeeded} Pints Needed</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#1A1D20]">
                            <MapPin className="w-3.5 h-3.5 text-[#D72638]" />
                            <span>{req.hospitalCity || 'Delhi NCR'}</span>
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-400 text-[11px]">
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#5A626A] mt-1 flex items-center gap-2 flex-wrap">
                          <span>Contact: <strong>{stripHonorific(req.contactName)}</strong></span>
                          <button
                            type="button"
                            onClick={() => setCallModalTarget({
                              contactName: stripHonorific(req.contactName),
                              phoneNumber: req.contactNumber,
                              bloodType: req.bloodType,
                              location: req.hospitalCity || 'Delhi NCR',
                              roleOrContext: `Emergency Transfusion Hotline • Patient: ${stripHonorific(req.patientName)}`
                            })}
                            className="font-mono text-[#D72638] font-bold hover:underline cursor-pointer"
                          >
                            {req.contactNumber}
                          </button>
                          {isFulfilled && req.fulfilledByDonorName && (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Fulfilled by: {stripHonorific(req.fulfilledByDonorName)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons & Expandable Dropdown Toggle */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap">
                      {!isFulfilled && (
                        <>
                          {/* Live Proximity Radar 2FA-Style Toggle Switch */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={req.liveTracking !== false}
                            aria-label={`Toggle Live Tracking for patient ${stripHonorific(req.patientName)}`}
                            onClick={() => handleToggleLiveTracking(req)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 shadow-2xs select-none cursor-pointer active:scale-95 ${req.liveTracking !== false
                              ? 'bg-emerald-50/90 hover:bg-emerald-100/90 border-emerald-300 text-emerald-950'
                              : 'bg-[#F5F1EF] hover:bg-[#EAE4E0] border-[#D9C7C2] text-slate-600'
                              }`}
                          >
                            <div className="flex items-center gap-1.5 pointer-events-none">
                              {req.liveTracking !== false ? (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              ) : (
                                <span className="inline-block h-2 w-2 rounded-full bg-slate-400"></span>
                              )}
                              <span className="text-[11px] font-black tracking-tight whitespace-nowrap">
                                {req.liveTracking !== false ? 'Live Track: ON' : 'Live Track: OFF'}
                              </span>
                            </div>

                            <span
                              className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out pointer-events-none ${req.liveTracking !== false ? 'bg-emerald-600' : 'bg-slate-300'
                                }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${req.liveTracking !== false ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                              />
                            </span>
                          </button>

                          <button
                            onClick={() => handleOpenFulfillModal(req)}
                            disabled={matches.length === 0}
                            title={matches.length === 0 ? "Cannot fulfill: No compatible lifesavers matched yet" : "Mark request as fulfilled"}
                            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${matches.length === 0
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-40 pointer-events-none'
                              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer shadow-xs'
                              }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mark Fulfilled</span>
                          </button>
                        </>
                      )}

                      {/* Expandable Dropdown Toggle Button */}
                      <button
                        onClick={() => toggleRequestExpanded(req.id)}
                        className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${isExpanded
                          ? 'bg-[#1A1D20] text-white border-[#1A1D20]'
                          : 'bg-white hover:bg-[#F5F1EF] text-[#1A1D20] border-[#D9C7C2]'
                          }`}
                      >
                        <Users className="w-3.5 h-3.5 text-[#D72638]" />
                        <span>
                          {isFulfilled
                            ? (displayedDonors.length > 0 ? `Fulfilling Lifesaver (${displayedDonors.length})` : 'Fulfillment Record')
                            : `Matched Lifesavers (${matches.length})`}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                      </button>

                      {/* Delete Emergency Request */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenDeleteModal(req, e)}
                        disabled={deletingRequestId === req.id}
                        className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-400 hover:text-[#D72638] border border-[#D9C7C2] hover:border-red-300 transition-all cursor-pointer shadow-2xs"
                        title="Permanently remove request"
                      >
                        {deletingRequestId === req.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D72638]" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* EXPANDABLE DROPDOWN DRAWER: MATCHED DONOR ROSTER, EMAIL ROSTER & DOWNLOAD PDF */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="border-t border-[#D9C7C2] bg-[#FDF9F8] p-4 sm:p-6 space-y-4"
                      >
                        {/* Dropdown Header Toolbar: Request Actions (Email Roster & PDF, Download PDF Docket) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9C7C2]">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isFulfilled ? 'bg-emerald-600' : 'bg-emerald-500 animate-pulse'}`} />
                            <h4 className="text-xs sm:text-sm font-bold text-[#1A1D20]">
                              {isFulfilled
                                ? (isReserveFulfillment
                                  ? 'Transfusion Fulfilled • Case Closed & Archived'
                                  : `${displayedDonors.length} Verified Fulfilling Lifesaver • Case Closed`)
                                : `${matches.length} Compatible ${req.bloodType} Lifesavers Ranked By GPS Proximity`}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {(() => {
                              const isEmailingThis = emailingRosterReqId === req.id;
                              const isEmailedThis = emailedRosterReqId === req.id;
                              const isGeneratingThis = generatingPdfReqId === req.id;
                              const isDownloadedThis = downloadedPdfReqId === req.id;

                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => !isFulfilled && handleEmailRosterForRequest(req, displayedDonors)}
                                    disabled={isFulfilled || isEmailingThis || displayedDonors.length === 0}
                                    className={`group relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 select-none ${isFulfilled || displayedDonors.length === 0
                                      ? 'bg-[#F5F1EF]/60 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50 shadow-none'
                                      : isEmailedThis
                                        ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-400 shadow-xs scale-102'
                                        : 'bg-white hover:bg-red-50/40 hover:border-[#D72638]/50 border border-[#D9C7C2] text-[#1A1D20] cursor-pointer shadow-2xs hover:shadow-md hover:scale-105 active:scale-95'
                                      }`}
                                    title={
                                      isFulfilled
                                        ? 'Transfusion fulfilled & closed: Email roster blocked'
                                        : displayedDonors.length === 0
                                          ? 'Unavailable: No compatible donors ranked in this search radius'
                                          : 'Email complete donor roster & clinical PDF directly to your email'
                                    }
                                  >
                                    {isEmailingThis ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D72638] shrink-0" />
                                    ) : isEmailedThis ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    ) : (
                                      <Mail className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${isFulfilled || displayedDonors.length === 0 ? 'text-slate-400' : 'text-[#D72638]'}`} />
                                    )}
                                    <span className="whitespace-nowrap">
                                      {isEmailingThis ? 'Sending...' : isEmailedThis ? 'Sent to You ✓' : 'Email Roster & PDF'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => !isFulfilled && handleDownloadPdfForRequest(req, displayedDonors)}
                                    disabled={isFulfilled || isGeneratingThis || displayedDonors.length === 0}
                                    className={`group relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 select-none ${isFulfilled || displayedDonors.length === 0
                                      ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-50 shadow-none'
                                      : isDownloadedThis
                                        ? 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-xs scale-102'
                                        : 'bg-[#D72638] hover:bg-[#b51d2c] text-white cursor-pointer shadow-xs hover:shadow-md hover:scale-105 active:scale-95'
                                      }`}
                                    title={
                                      isFulfilled
                                        ? 'Transfusion fulfilled & closed: PDF download blocked'
                                        : displayedDonors.length === 0
                                          ? 'Unavailable: No compatible donors ranked in this search radius'
                                          : 'Download official clinical PDF docket directly to your device'
                                    }
                                  >
                                    {isGeneratingThis ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white shrink-0" />
                                    ) : isDownloadedThis ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                                    ) : (
                                      <FileDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-y-0.5 shrink-0 text-white" />
                                    )}
                                    <span className="whitespace-nowrap">
                                      {isGeneratingThis ? 'Generating...' : isDownloadedThis ? 'Downloaded ✓' : 'Download PDF Docket'}
                                    </span>
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Matching Donor List or Fulfillment Status */}
                        {isFulfilled ? (
                          displayedDonors.length === 0 ? (
                            <div className="p-6 text-center bg-white rounded-2xl border border-emerald-200/80 shadow-xs space-y-2">
                              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                                <ShieldCheck className="w-6 h-6" />
                              </div>
                              <h4 className="text-sm font-black text-[#1A1D20]">
                                Transfusion Fulfilled via Alternative Clinical Reserve / External Stock
                              </h4>
                              <p className="text-xs text-[#5A626A] max-w-md mx-auto">
                                This emergency triage was closed using internal hospital blood reserves or verified blood bank inventory. No voluntary community lifesavers were mobilized.
                              </p>
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-bold">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Case Closed • Transfusion Record Archived</span>
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const renderDrawerItem = (donor: RankedMatchDonor, idx: number, isRegional: boolean) => {
                                const isDispatched = dispatchedDonorIds[donor.id] || false;
                                const isSelf = Boolean(
                                  currentUserEmail && (
                                    (donor.email && donor.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()) ||
                                    (donor.user_email && donor.user_email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase())
                                  )
                                );

                                return (
                                  <div
                                    key={donor.id}
                                    className="p-3.5 rounded-xl border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors bg-emerald-50/40 border-emerald-300"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center font-mono font-bold text-xs text-emerald-800 shrink-0">
                                        ✓
                                      </div>

                                      <div
                                        title={`Matched Donor Group ${donor.bloodType}`}
                                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E63946] via-[#D72638] to-[#7A0C17] text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 select-none opacity-80"
                                      >
                                        {donor.bloodType}
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-xs text-[#1A1D20]">{donor.fullName}</span>
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                                            <span>Fulfilling Lifesaver</span>
                                          </span>
                                          {isSelf && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-[#D72638] border border-red-200">
                                              You
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-[#5A626A] flex items-center gap-2 mt-0.5 flex-wrap">
                                          <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-[#D72638]" />
                                            <span>{donor.location || donor.city}</span>
                                          </span>
                                          <span>•</span>
                                          <span className="font-mono text-slate-500">{donor.phone}</span>
                                          <span>•</span>
                                          <span className="text-[#5A626A]">{donor.email}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                      <button
                                        type="button"
                                        disabled={true}
                                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 font-bold text-xs flex items-center gap-1 border border-slate-200 cursor-not-allowed opacity-50"
                                        title="Transfusion fulfilled & closed: Direct calls blocked"
                                      >
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>Call</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={true}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50 shadow-none"
                                        title="Transfusion fulfilled & closed: Emergency alerts blocked"
                                      >
                                        <Send className="w-3 h-3 text-slate-400" />
                                        <span>Case Closed</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between pb-1 border-b border-emerald-200/70">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                        <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1D20]">
                                          Primary Fulfilling Lifesaver ({displayedDonors.length})
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        Transfusion Completed
                                      </span>
                                    </div>
                                    {displayedDonors.map((donor, idx) => renderDrawerItem(donor, idx, false))}
                                  </div>
                                </div>
                              );
                            })()
                          )
                        ) : matches.length === 0 ? (
                          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#D9C7C2] text-xs text-[#5A626A]">
                            <Droplet className="w-8 h-8 text-[#D72638]/40 mx-auto mb-2" />
                            <p className="font-bold text-[#1A1D20]">No active compatible donors found in this radius for {req.bloodType}</p>
                            <p className="text-[11px] mt-0.5">Emergency broadcast remains active across all hospital nodes.</p>
                          </div>
                        ) : (
                          (() => {
                            const localMatches = matches.filter(d => d.distanceKm <= 50.0);
                            const regionalMatches = matches.filter(d => d.distanceKm > 50.0);

                            const renderDrawerItem = (donor: RankedMatchDonor, idx: number, isRegional: boolean) => {
                              const isDispatched = dispatchedDonorIds[donor.id] || false;
                              const isSelf = Boolean(
                                currentUserEmail && (
                                  (donor.email && donor.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()) ||
                                  (donor.user_email && donor.user_email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase())
                                )
                              );

                              return (
                                <div
                                  key={donor.id}
                                  className={`p-3.5 rounded-xl border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${isDispatched
                                    ? 'bg-emerald-50/60 border-emerald-200'
                                    : isSelf
                                      ? 'bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-300'
                                      : isRegional
                                        ? 'bg-[#FDFBF7] border-amber-200/80 hover:border-amber-300'
                                        : 'bg-white border-[#D9C7C2] hover:border-[#D72638]/40'
                                    }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-[#F5F1EF] border border-[#D9C7C2] flex items-center justify-center font-mono font-bold text-xs text-[#7A0C17] shrink-0">
                                      #{idx + 1}
                                    </div>

                                    <div
                                      title={`Matched Donor Group ${donor.bloodType}`}
                                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E63946] via-[#D72638] to-[#7A0C17] text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 transition-all duration-200 hover:scale-110 hover:shadow-md hover:shadow-[#D72638]/30 cursor-pointer select-none"
                                    >
                                      {donor.bloodType}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs text-[#1A1D20]">{donor.fullName}</span>
                                        {isSelf && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-[#D72638] border border-red-200">
                                            You
                                          </span>
                                        )}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${donor.tier.badgeClass}`}>
                                          {donor.tier.label} • {donor.distanceKm < 1 ? '< 1 km' : `${donor.distanceKm.toFixed(1)} km`}
                                        </span>
                                        {isRegional && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                            Extended Network
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-[#5A626A] flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-[#D72638]" />
                                          <span>{donor.location || donor.city}</span>
                                        </span>
                                        <span>•</span>
                                        <button
                                          type="button"
                                          onClick={() => setCallModalTarget({
                                            contactName: donor.fullName,
                                            phoneNumber: donor.phone,
                                            bloodType: donor.bloodType,
                                            location: donor.location || donor.city,
                                            roleOrContext: `Voluntary Blood Donor (Group ${donor.bloodType}) • Matched for ${req.patientName}`
                                          })}
                                          className="font-mono text-slate-600 hover:text-[#D72638] hover:underline cursor-pointer"
                                        >
                                          {donor.phone}
                                        </button>
                                        <span>•</span>
                                        <span className="text-[#5A626A]">{donor.email}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {isSelf ? (
                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                      <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 shadow-2xs">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>You (Your Standby Pledge)</span>
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                      <button
                                        type="button"
                                        onClick={() => setCallModalTarget({
                                          contactName: donor.fullName,
                                          phoneNumber: donor.phone,
                                          bloodType: donor.bloodType,
                                          location: donor.location || donor.city,
                                          roleOrContext: `Voluntary Blood Donor (Group ${donor.bloodType}) • Matched for ${req.patientName}`
                                        })}
                                        className="px-3.5 py-1.5 rounded-xl bg-[#F5F1EF] hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 text-[#1A1D20] font-bold text-xs flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 border border-[#D9C7C2] cursor-pointer shadow-2xs hover:shadow-xs group"
                                        title={`Call voluntary donor ${donor.fullName} directly`}
                                      >
                                        <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:rotate-12 transition-transform duration-200" />
                                        <span>Call</span>
                                      </button>

                                      {(() => {
                                        const donorCooldown = calculateCooldown(donor.lastAlertSentAt || donor.last_alert_sent_at);
                                        const isBlocked = isDispatched || donorCooldown.inCooldown;
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => setAlertModalTarget({
                                              donor: {
                                                id: donor.id,
                                                fullName: donor.fullName,
                                                email: donor.email,
                                                phone: donor.phone,
                                                bloodType: donor.bloodType,
                                                location: donor.location || donor.city,
                                                distanceKm: donor.distanceKm,
                                                lastAlertSentAt: donor.lastAlertSentAt || donor.last_alert_sent_at,
                                                last_alert_sent_at: donor.lastAlertSentAt || donor.last_alert_sent_at
                                              },
                                              patientName: req.patientName,
                                              hospital: req.hospital || 'Emergency Trauma Bay',
                                              customMessage: `Urgent transfusion required for ${req.patientName} (Group ${req.bloodType}). Your compatible voluntary donation can save a life. Please contact our hotline immediately if you can donate.`
                                            })}
                                            disabled={isBlocked}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 shadow-2xs group ${isDispatched
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                                              : donorCooldown.inCooldown
                                                ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-85'
                                                : 'bg-[#D72638] hover:bg-[#b51d2c] hover:scale-105 active:scale-95 text-white cursor-pointer hover:shadow-md'
                                              }`}
                                            title={
                                              isDispatched
                                                ? `Emergency mobilization alert already dispatched to ${donor.fullName}`
                                                : donorCooldown.inCooldown
                                                  ? `24-Hour Alert Cooldown active for ${donor.fullName}. Repeat dispatches unlock on ${donorCooldown.availableAtText} (${donorCooldown.remainingText} remaining).`
                                                  : `Dispatch real-time emergency mobilization alert directly to donor ${donor.fullName}`
                                            }
                                          >
                                            {isDispatched ? (
                                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                            ) : donorCooldown.inCooldown ? (
                                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                                            ) : (
                                              <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                                            )}
                                            <span>
                                              {isDispatched ? 'Alert Sent ✓' : donorCooldown.inCooldown ? `Available: ${donorCooldown.availableAtText}` : 'Send Alert'}
                                            </span>
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              );
                            };

                            return (
                              <div className="space-y-4">
                                {/* Section 1: Immediate & Same State Lifesavers */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between pb-1 border-b border-emerald-200/70">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1D20]">
                                        Immediate &amp; Same State Lifesavers ({localMatches.length})
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      High Priority &bull; &le; 50 km
                                    </span>
                                  </div>
                                  {localMatches.length === 0 ? (
                                    <div className="p-3 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                                      No local lifesavers detected in immediate 50 km radius. Showing extended network donors below.
                                    </div>
                                  ) : (
                                    localMatches.map((donor, idx) => renderDrawerItem(donor, idx, false))
                                  )}
                                </div>

                                {/* Section 2: Regional & Extended Network */}
                                {regionalMatches.length > 0 && (
                                  <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between pb-1 border-b border-amber-200/80">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1D20]">
                                          Regional &amp; Extended Network ({regionalMatches.length})
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                        Out of State / &gt; 50 km
                                      </span>
                                    </div>
                                    {regionalMatches.map((donor, idx) => renderDrawerItem(donor, localMatches.length + idx, true))}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* =========================================================================
          CONFIRM TRANSFUSION FULFILLED MODAL WITH DUAL THANKS EMAILS
          ========================================================================= */}
      {fulfillmentModalReq && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => !isFulfilling && setFulfillmentModalReq(null)}
        >
          <div
            className="relative w-full max-w-xl rounded-3xl bg-white border border-[#D9C7C2] p-4 sm:p-6 lg:p-7 shadow-2xl text-[#1A1D20] my-auto max-h-[92dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D9C7C2] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1D20]">Confirm Transfusion Fulfilled</h3>
                  <p className="text-[11px] text-[#5A626A]">Record delivery &amp; dispatch clinical completion &amp; gratitude notifications</p>
                </div>
              </div>
              <button
                onClick={() => !isFulfilling && setFulfillmentModalReq(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#1A1D20] hover:bg-[#F5F1EF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-3.5 text-xs overflow-y-auto flex-1 no-scrollbar pr-0.5">
              <div className="p-3.5 rounded-2xl bg-[#F5F1EF] border border-[#D9C7C2] space-y-1">
                <span className="text-[10px] text-[#7A0C17] font-bold uppercase tracking-wider block">Transfusion Case</span>
                <p className="text-sm font-bold text-[#1A1D20]">
                  {fulfillmentModalReq.patientName} • Group {fulfillmentModalReq.bloodType} ({fulfillmentModalReq.unitsNeeded} Pints)
                </p>
                <p className="text-[#5A626A] text-[11px]">{fulfillmentModalReq.hospitalCity} • Requested by {fulfillmentModalReq.contactName}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[#1A1D20]">
                    Select Contributing Lifesaver(s) for this {fulfillmentModalReq.bloodType} Transfusion:
                  </label>
                  <span className="text-[10px] text-[#5A626A] font-semibold">
                    {selectedFulfillingDonorIds.length} Selected
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-0.5">
                  {/* Option: External Reserve / No Donor */}
                  <div
                    onClick={handleSelectReserveOnly}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${fulfilledViaReserve
                      ? 'bg-blue-50/90 border-blue-400 ring-1 ring-blue-400 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-[#D9C7C2]'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${fulfilledViaReserve ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                        {fulfilledViaReserve && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#1A1D20]">
                          No One (Fulfilled via External Reserve / Hospital Blood Bank)
                        </div>
                        <div className="text-[10px] text-[#5A626A]">
                          Demand met without voluntary donor pledge; sends closure receipt only to requester
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold shrink-0">
                      External Reserve
                    </span>
                  </div>

                  {/* List of Compatible Donors for this request */}
                  {getMatchesForRequest(fulfillmentModalReq).map(d => {
                    const isSelected = selectedFulfillingDonorIds.includes(d.id);
                    return (
                      <div
                        key={d.id}
                        onClick={() => handleToggleFulfillingDonor(d.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isSelected
                          ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-400 shadow-xs'
                          : 'bg-white hover:bg-[#F5F1EF]/60 border-[#D9C7C2]'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#1A1D20]">{d.fullName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-100 text-[#D72638] font-bold">
                                {d.bloodType}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#5A626A] flex items-center gap-2 mt-0.5 flex-wrap">
                              <span>{d.location || d.city}</span>
                              <span>•</span>
                              <span>{d.distanceKm.toFixed(1)} km</span>
                              <span>•</span>
                              <span className="font-mono">{d.phone}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isSelected ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {isSelected ? 'Contributing' : 'Compatible'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-[11px] leading-relaxed transition-all ${fulfilledViaReserve
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                {fulfilledViaReserve ? (
                  <>
                    <strong>External Reserve Closure Protocol:</strong> Transfusion demand will be closed in the clinical ledger. A formal closure docket will be transmitted to <strong>{currentUserEmail}</strong> confirming the demand was resolved through alternative hospital reserve without voluntary donor assignment.
                  </>
                ) : (
                  <>
                    <strong>Dual Notification Protocol:</strong> Marking this request fulfilled will update the clinical ledger. Separate heartfelt gratitude emails will be dispatched to <strong>{selectedFulfillingDonorIds.length} voluntary lifesaver(s)</strong> thanking them for saving a life, and a complete fulfillment receipt will be delivered to <strong>{currentUserEmail}</strong>.
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9C7C2] shrink-0">
              <button
                type="button"
                onClick={() => setFulfillmentModalReq(null)}
                disabled={isFulfilling}
                className="px-4 py-2 rounded-xl border border-[#D9C7C2] text-xs font-bold text-[#4A5568] hover:bg-[#F5F1EF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFulfillment}
                disabled={isFulfilling || (selectedFulfillingDonorIds.length === 0 && !fulfilledViaReserve)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{isFulfilling ? 'Completing...' : 'Confirm Transfusion Received ✓'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          HORIZONTAL EMERGENCY BROADCAST MODAL WITH IN-POPUP GEOSPATIAL RADAR & RESULTS
          (Spacious 2-Column Horizontal Architecture: Max-W-5xl)
          ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpenModal && (
            <motion.div
              key="emergency-modal-backdrop"
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/60 backdrop-blur-xl"
              onClick={handleCancelModal}
              style={{ willChange: 'opacity, backdrop-filter' }}
            >
              <motion.div
                key="emergency-modal-card"
                initial={{ opacity: 0, scale: 0.94, y: 16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, y: 12, filter: 'blur(6px)' }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="relative w-full max-w-4xl lg:max-w-5xl max-h-[92dvh] my-auto overflow-y-auto no-scrollbar rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 p-4 sm:p-6 md:p-8 shadow-2xl text-[#1A1D20]"
                onClick={(e) => e.stopPropagation()}
                style={{ willChange: 'transform, opacity, filter' }}
              >
                {/* Close Button with generous clearance & non-overlapping hover boundary */}
                <button
                  onClick={handleCancelModal}
                  className="absolute top-4 right-4 sm:top-5 sm:right-5 z-40 p-2 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 text-slate-400 hover:text-[#1A1D20] hover:bg-[#F5F1EF]"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5 text-[#D72638]" />
                </button>

                {/* Pre-warm 119846 radar video in memory to guarantee zero lag when scan initiates */}
                <video
                  src="/119846-719283256_medium.mp4"
                  preload="auto"
                  muted
                  playsInline
                  className="hidden"
                  aria-hidden="true"
                />

                {/* Notification Banner (mr-14 sm:mr-16 guarantees zero overlap with the top-right close button) */}
                <AnimatePresence>
                  {modalNotification && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.35, ease: 'easeOut' } }}
                      className={`mr-14 sm:mr-16 mb-4 p-3 rounded-xl flex items-center justify-between text-xs font-bold ${modalNotification.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
                        {modalNotification.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="truncate sm:whitespace-normal">{modalNotification.message}</span>
                      </div>
                      <button
                        onClick={() => setModalNotification(null)}
                        className="underline ml-3 shrink-0 text-emerald-900 hover:text-emerald-950 font-bold cursor-pointer px-2 py-1 rounded hover:bg-emerald-100/60 transition-colors"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PHASES WITH BLUR TRANSITIONS */}
                <AnimatePresence mode="wait">
                  {/* PHASE 1: HORIZONTAL ROW-BASED INPUT FORM (ONE ITEM PER HORIZONTAL ROW) */}
                  {modalPhase === 'INPUT' && (
                    <motion.div
                      key="modal-phase-input"
                      initial={{ opacity: 0, filter: 'blur(6px)', y: 6 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                      exit={{ opacity: 0, filter: 'blur(6px)', y: -6 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                      <div className="mb-4 pb-3 border-b border-[#D9C7C2]/60 pr-12 sm:pr-14">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-1">
                          <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                          <span>Emergency Blood Dispatch System</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-[#1A1D20] flex items-center gap-2">
                          <AlertTriangle className="w-6 h-6 text-[#D72638]" />
                          <span>Emergency Transfusion Request &amp; Donor Check</span>
                        </h2>
                        <p className="text-xs text-[#5A626A] mt-0.5">
                          Enter patient details, required blood group, and location to immediately test and find nearby matching donors.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Row 1: Authorized Clinician Account */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F1EF]/50 border border-[#D9C7C2]/70 hover:border-[#D72638]/40 transition-colors">
                          <div className="flex items-center gap-2.5 sm:w-64 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1A1D20]">Authorized Clinician</div>
                              <div className="text-[10px] text-[#5A626A]">Session security credential</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 min-w-0 flex-1 sm:max-w-xl justify-end">
                            <span className="font-mono text-xs font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg truncate">
                              {currentUserEmail}
                            </span>
                            <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                              Active Account
                            </span>
                          </div>
                        </div>

                        {/* Row 2: Patient Full Legal Name */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F1EF]/50 border border-[#D9C7C2]/70 hover:border-[#D72638]/40 transition-colors">
                          <div className="flex items-center gap-2.5 sm:w-64 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D72638] flex items-center justify-center shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1A1D20]">
                                Patient Name <span className="text-[#D72638]">*</span>
                              </div>
                              <div className="text-[10px] text-[#5A626A]">Full name of the patient receiving blood</div>
                            </div>
                          </div>
                          <div className="flex-1 sm:max-w-xl w-full">
                            <input
                              type="text"
                              value={patientName}
                              onChange={(e) => {
                                setPatientName(e.target.value);
                                if (formErrors.patientName) setFormErrors(prev => ({ ...prev, patientName: '' }));
                              }}
                              placeholder="e.g. Rajesh Kumar"
                              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${formErrors.patientName ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                                } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                            />
                            {formErrors.patientName && (
                              <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.patientName}</p>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Patient Age */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F1EF]/50 border border-[#D9C7C2]/70 hover:border-[#D72638]/40 transition-colors">
                          <div className="flex items-center gap-2.5 sm:w-64 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D72638] flex items-center justify-center shrink-0">
                              <Activity className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1A1D20]">
                                Patient Age (Years) <span className="text-[#D72638]">*</span>
                              </div>
                              <div className="text-[10px] text-[#5A626A]">Age of the patient in years (1 - 120)</div>
                            </div>
                          </div>
                          <div className="flex-1 sm:max-w-xl w-full">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={3}
                              autoComplete="off"
                              value={patientAge}
                              placeholder="e.g. 35"
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const clean = raw.replace(/^0+/, '');
                                setPatientAge(clean);
                                if (formErrors.patientAge) setFormErrors(prev => ({ ...prev, patientAge: '' }));
                              }}
                              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${formErrors.patientAge ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                                } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                            />
                            {formErrors.patientAge && (
                              <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.patientAge}</p>
                            )}
                          </div>
                        </div>

                        {/* Row 4: Recipient Blood Group (Custom Animated Blur Dropdown) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F1EF]/50 border border-[#D9C7C2]/70 hover:border-[#D72638]/40 transition-colors">
                          <div className="flex items-center gap-2.5 sm:w-64 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D72638] flex items-center justify-center shrink-0">
                              <Droplet className="w-4 h-4 fill-current" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1A1D20]">
                                Recipient Blood Group <span className="text-[#D72638]">*</span>
                              </div>
                              <div className="text-[10px] text-[#5A626A]">Blood group needed for transfusion</div>
                            </div>
                          </div>
                          <div className="flex-1 sm:max-w-xl w-full">
                            <BlurDropdown
                              value={bloodType}
                              onChange={(val) => {
                                setBloodType(val);
                                if (formErrors.bloodType) setFormErrors(prev => ({ ...prev, bloodType: '' }));
                              }}
                              options={bloodTypeOptions}
                              placeholder="Select Recipient Blood Group..."
                              hasError={Boolean(formErrors.bloodType)}
                            />
                            {formErrors.bloodType && (
                              <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.bloodType}</p>
                            )}
                            {bloodType && (
                              <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 flex items-center justify-between text-2xs">
                                <span className="font-bold text-red-900 flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                                  <span>Safely Accepts RBC From:</span>
                                </span>
                                <span className="font-mono font-bold text-red-700">
                                  {compatibleBloodTypes.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 5: Target Area / Locality (Dispatched Locations Dropdown + GPS Detector) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F1EF]/50 border border-[#D9C7C2]/70 hover:border-[#D72638]/40 transition-colors">
                          <div className="flex items-center gap-2.5 sm:w-64 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D72638] flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1A1D20]">
                                Hospital or Area Locality <span className="text-[#D72638]">*</span>
                              </div>
                              <div className="text-[10px] text-[#5A626A]">Dispatched sites, or click Detect GPS</div>
                            </div>
                          </div>
                          <div className="flex-1 sm:max-w-xl w-full space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div ref={localityDropdownRef} className="relative flex-1">
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={customLocalityInput || selectedLocality}
                                    onFocus={() => setIsLocalityDropdownOpen(true)}
                                    onClick={() => setIsLocalityDropdownOpen(true)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCustomLocalityInput(val);
                                      setSelectedLocality(val);
                                      setIsLocalityDropdownOpen(true);
                                      if (formErrors.locality) {
                                        setFormErrors(prev => ({ ...prev, locality: '' }));
                                      }
                                    }}
                                    placeholder="Select dispatched site or type locality..."
                                    className={`w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-white border ${formErrors.locality
                                      ? 'border-red-500 bg-red-50/20'
                                      : isLocalityDropdownOpen
                                        ? 'border-[#D72638] ring-2 ring-[#D72638]/20'
                                        : 'border-[#D9C7C2] hover:border-[#D72638]/60'
                                      } text-xs font-semibold text-[#1A1D20] outline-hidden transition-all shadow-2xs`}
                                  />
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setIsLocalityDropdownOpen(prev => !prev)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A626A] hover:text-[#D72638] transition-colors p-1"
                                  >
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isLocalityDropdownOpen ? 'rotate-180 text-[#D72638]' : ''}`} />
                                  </button>
                                </div>

                                <AnimatePresence>
                                  {isLocalityDropdownOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                      className="absolute z-50 mt-1.5 w-full rounded-2xl border border-[#D9C7C2] bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden py-1.5 max-h-60 overflow-y-auto no-scrollbar"
                                    >
                                      <div className="px-3.5 py-1.5 text-[10px] font-black text-[#5A626A] uppercase tracking-wider border-b border-[#D9C7C2]/40 flex items-center justify-between">
                                        <span>User Dispatched Blood Locations</span>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-100 text-[#D72638] font-bold">
                                          {userDispatchedLocations.length} sites
                                        </span>
                                      </div>

                                      {(() => {
                                        const currentText = (customLocalityInput || selectedLocality || '').trim().toLowerCase();
                                        const filtered = userDispatchedLocations.filter(loc => loc.toLowerCase().includes(currentText));

                                        if (filtered.length === 0 && userDispatchedLocations.length > 0) {
                                          return (
                                            <div className="p-3 text-center">
                                              <p className="text-xs text-[#5A626A]">No matching dispatched location found for "{customLocalityInput || selectedLocality}".</p>
                                              <button
                                                type="button"
                                                onClick={() => setIsLocalityDropdownOpen(false)}
                                                className="mt-1.5 text-xs font-bold text-[#D72638] hover:underline"
                                              >
                                                Use "{customLocalityInput || selectedLocality}"
                                              </button>
                                            </div>
                                          );
                                        }

                                        if (userDispatchedLocations.length === 0) {
                                          return (
                                            <div className="p-4 text-center space-y-1">
                                              <MapPin className="w-5 h-5 mx-auto text-[#D72638]/70" />
                                              <p className="text-xs font-bold text-[#1A1D20]">No Dispatched Locations Recorded Yet</p>
                                              <p className="text-[10px] text-[#5A626A]">Type your target locality above or click "Detect GPS" to locate automatically.</p>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div className="divide-y divide-[#D9C7C2]/20">
                                            {filtered.map(loc => {
                                              const isSelected = (selectedLocality === loc || customLocalityInput === loc);
                                              return (
                                                <div
                                                  key={loc}
                                                  onClick={() => {
                                                    setSelectedLocality(loc);
                                                    setCustomLocalityInput(loc);
                                                    setIsLocalityDropdownOpen(false);
                                                    if (formErrors.locality) setFormErrors(prev => ({ ...prev, locality: '' }));
                                                  }}
                                                  className={`px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${isSelected
                                                    ? 'bg-red-50/80 text-[#D72638] font-bold'
                                                    : 'hover:bg-[#F5F1EF] text-[#1A1D20]'
                                                    }`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-red-100 text-[#D72638]' : 'bg-slate-100 text-slate-500'
                                                      }`}>
                                                      <MapPin className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="truncate">{loc}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100/80 text-[#D72638]">
                                                      Dispatched
                                                    </span>
                                                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#D72638]" />}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={handleToggleGpsPermission}
                                  title={isGpsPermissionEnabled ? 'GPS Permission is ON. Click to turn OFF.' : 'GPS Permission is OFF. Click to turn ON.'}
                                  className={`px-2.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${isGpsPermissionEnabled
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-slate-100 border-[#D9C7C2] text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${isGpsPermissionEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                  <span className="hidden md:inline">GPS Permission:</span>
                                  <span className="font-extrabold">{isGpsPermissionEnabled ? 'ON' : 'OFF'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleDetectGps}
                                  disabled={isDetectingGps || !isGpsPermissionEnabled}
                                  title={!isGpsPermissionEnabled ? 'Turn ON GPS Permission first to locate' : 'Detect current GPS coordinates'}
                                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${isGpsPermissionEnabled
                                    ? 'bg-white border-[#D9C7C2] hover:border-[#D72638] text-[#D72638] hover:text-[#b51d2c]'
                                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                    }`}
                                >
                                  <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                                  <span className="hidden sm:inline">{isDetectingGps ? 'Pinpointing...' : 'Detect GPS'}</span>
                                </button>
                              </div>
                            </div>
                            {formErrors.locality && (
                              <p className="text-red-500 text-[10px] font-semibold">{formErrors.locality}</p>
                            )}
                            {detectedPills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {detectedPills.map((pill: string) => (
                                  <button
                                    key={pill}
                                    type="button"
                                    onClick={() => {
                                      setSelectedLocality(pill);
                                      setCustomLocalityInput(pill);
                                      setIsLocalityDropdownOpen(false);
                                      if (formErrors.locality) setFormErrors(prev => ({ ...prev, locality: '' }));
                                    }}
                                    className="text-2xs font-semibold px-2 py-0.5 rounded-lg border bg-white text-[#4A5568] border-[#D9C7C2] hover:bg-slate-100 cursor-pointer"
                                  >
                                    {pill}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 8: Emergency Contact Number (Custom Animated Blur Country Selector) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F1EF]/50 border border-[#D9C7C2]/70 hover:border-[#D72638]/40 transition-colors">
                          <div className="flex items-center gap-2.5 sm:w-64 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D72638] flex items-center justify-center shrink-0">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1A1D20]">
                                Emergency Contact Number <span className="text-[#D72638]">*</span>
                              </div>
                              <div className="text-[10px] text-[#5A626A]">Phone number for donor coordination</div>
                            </div>
                          </div>
                          <div className="flex-1 sm:max-w-xl w-full">
                            <div className="flex gap-2">
                              <BlurDropdown
                                value={countryDialCode}
                                onChange={(val) => {
                                  setCountryDialCode(val);
                                  if (formErrors.contactPhone) setFormErrors(prev => ({ ...prev, contactPhone: '' }));
                                }}
                                options={countryOptions}
                                className="w-32 shrink-0"
                              />
                              <input
                                type="tel"
                                value={contactPhone}
                                onChange={(e) => {
                                  setContactPhone(e.target.value);
                                  if (formErrors.contactPhone) setFormErrors(prev => ({ ...prev, contactPhone: '' }));
                                }}
                                placeholder={countryDialCode === '+91' ? '98765 43210' : 'Emergency phone number'}
                                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${formErrors.contactPhone ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                                  } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-all duration-300 ${phoneAnimate ? 'ring-2 ring-emerald-500 bg-emerald-50/60 scale-[1.01]' : ''
                                  }`}
                              />
                            </div>
                            {deduplicatePhones(savedPhones).length > 0 && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold text-[#7A0C17] uppercase tracking-wider">Saved Numbers:</span>
                                {deduplicatePhones(savedPhones).map((p, idx) => (
                                  <button
                                    key={p + idx}
                                    type="button"
                                    onClick={() => handleSelectPhone(p)}
                                    className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white hover:bg-emerald-50 border border-[#D9C7C2] hover:border-emerald-300 text-[11px] font-medium text-[#1A1D20] hover:text-emerald-900 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                    title="Click to fill into emergency contact phone field"
                                  >
                                    <Phone className="w-2.5 h-2.5 text-[#D72638] group-hover:text-emerald-600 transition-colors" />
                                    <span className="font-mono">{p}</span>
                                    <span className="text-[9px] px-1 rounded bg-[#F5F1EF] text-slate-500 font-mono">
                                      {idx === 0 ? 'Account' : `Saved #${idx + 1}`}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {formErrors.contactPhone && (
                              <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.contactPhone}</p>
                            )}
                          </div>
                        </div>

                        {/* Row 9: Clinical Authorization */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F1EF]/50 border border-[#D9C7C2]/70 hover:border-[#D72638]/40 transition-colors">
                          <div className="flex items-center gap-2.5 sm:w-64 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1A1D20]">
                                Emergency Confirmation <span className="text-[#D72638]">*</span>
                              </div>
                              <div className="text-[10px] text-[#5A626A]">Confirm this is an urgent transfusion request</div>
                            </div>
                          </div>
                          <div className="flex-1 sm:max-w-xl w-full">
                            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={emergencyConfirmed}
                                onChange={(e) => {
                                  setEmergencyConfirmed(e.target.checked);
                                  if (formErrors.emergencyConfirmed) setFormErrors(prev => ({ ...prev, emergencyConfirmed: '' }));
                                }}
                                className="mt-0.5 w-4 h-4 rounded-sm border-[#D9C7C2] text-[#D72638] focus:ring-[#D72638] cursor-pointer shrink-0"
                              />
                              <span className="text-xs text-[#5A626A] leading-tight">
                                I confirm this is an authentic emergency blood request authorized for immediate donor dispatch.
                              </span>
                            </label>
                            {formErrors.emergencyConfirmed && (
                              <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.emergencyConfirmed}</p>
                            )}
                          </div>
                        </div>

                        {/* Modal Action Footer */}
                        <div className="pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={handleCancelModal}
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#5A626A] hover:text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-6 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                          >
                            <Activity className="w-4 h-4 animate-pulse" />
                            <span>Run Emergency Check Test &amp; Match Donors</span>
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {/* PHASE 2: SCANNING ANIMATION (HIGH-TECH RADAR STAGE INSIDE CONSISTENT CARD) */}
                  {modalPhase === 'SCANNING' && (
                    <motion.div
                      key="modal-phase-scanning"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="relative w-full h-[400px] sm:h-[460px] rounded-2xl flex flex-col items-center justify-center p-6 sm:p-10 text-center overflow-hidden bg-slate-950 border border-slate-800 shadow-xl"
                      style={{ willChange: 'transform, opacity' }}
                    >
                      {/* Video Background: 119846-719283256_medium.mp4 fills the entire popup */}
                      <video
                        src="/119846-719283256_medium.mp4"
                        poster="/119846-719283256_medium_poster.jpg"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        onLoadedData={(e) => {
                          const v = e.currentTarget;
                          if (v.paused) v.play().catch(() => { });
                        }}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
                      />
                      {/* Dark Frosted Layer for High-Contrast Text Legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/75 backdrop-blur-[1px] pointer-events-none" />

                      {/* Content Box (NO CIRCLES) */}
                      <div className="relative z-10 space-y-4 max-w-lg mx-auto">
                        <div className="inline-flex p-3.5 rounded-2xl bg-red-600/25 border border-red-500/50 text-red-400 shadow-xl shadow-red-600/30 backdrop-blur-md animate-pulse">
                          <Droplet className="w-8 h-8 fill-current" />
                        </div>
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                            Searching for Compatible Donors
                          </h3>
                          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-red-500/50 text-xs sm:text-sm font-semibold text-red-200 backdrop-blur-md shadow-inner">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <span>{scanSteps[scanStepIndex]}</span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 font-medium drop-shadow-sm leading-relaxed max-w-md mx-auto">
                          Finding available Group <span className="font-bold text-white bg-red-600/80 px-2.5 py-0.5 rounded-md">{bloodType}</span> blood donors near {customLocalityInput.trim() || selectedLocality}. Please wait...
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* PHASE 3: PROXIMITY-RANKED DONOR RESULTS IN THE SAME POPUP */}
                  {modalPhase === 'RESULTS' && (
                    <motion.div
                      key="modal-phase-results"
                      initial={{ opacity: 0, filter: 'blur(6px)', y: 6 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                      exit={{ opacity: 0, filter: 'blur(6px)', y: -6 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="space-y-4"
                    >
                      {/* Results Header Bar (pr-16 sm:pr-28 ensures generous buffer so X button never overlaps on hover) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9C7C2] pr-16 sm:pr-28">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Emergency Check Passed: {rankedDonors.length} Compatible Donors Ranked</span>
                          </div>
                          <h3 className="text-lg font-black text-[#1A1D20]">
                            Nearest Lifesavers for {patientName || 'Emergency Patient'} ({bloodType})
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mr-1 sm:mr-3">
                          <button
                            type="button"
                            onClick={() => setModalPhase('INPUT')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1A1D20] bg-white border border-[#D9C7C2] hover:bg-[#F5F1EF] transition-all cursor-pointer shadow-2xs"
                            title="Modify parameters and re-run check"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#5A626A]" />
                            <span>Modify &amp; Re-Test</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleEmailRoster}
                            disabled={isEmailingRoster || rankedDonors.length === 0}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${rankedDonors.length === 0
                              ? 'bg-[#F5F1EF]/60 text-slate-400 border border-slate-200 cursor-not-allowed opacity-40 pointer-events-none shadow-none'
                              : 'text-[#4A5568] bg-[#F5F1EF] border border-[#D9C7C2] hover:bg-slate-200 cursor-pointer shadow-2xs'
                              }`}
                            title={rankedDonors.length === 0 ? 'Unavailable: No compatible donors ranked in this search radius' : 'Transmit ranked roster with attached PDF docket to your email'}
                          >
                            {isEmailingRoster ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className={`w-3.5 h-3.5 ${rankedDonors.length === 0 ? 'text-slate-400' : 'text-[#D72638]'}`} />}
                            <span>Email Roster &amp; PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf || rankedDonors.length === 0}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${rankedDonors.length === 0
                              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-40 pointer-events-none shadow-none'
                              : 'text-white bg-[#D72638] hover:bg-[#b51d2c] shadow-xs cursor-pointer'
                              }`}
                            title={rankedDonors.length === 0 ? 'Unavailable: No compatible donors ranked in this search radius' : 'Download clinical emergency mobilization docket PDF'}
                          >
                            {isGeneratingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className={`w-3.5 h-3.5 ${rankedDonors.length === 0 ? 'text-slate-400' : 'text-white'}`} />}
                            <span>Download PDF Docket</span>
                          </button>
                        </div>
                      </div>

                      {/* COMPREHENSIVE EMERGENCY CHECK CASE DOSSIER */}
                      <div className="p-4 rounded-2xl bg-white border border-[#D9C7C2] shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#D9C7C2]/60">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-[#1A1D20]">
                              Emergency Check Test Dossier
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-[#D72638] bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                            Live Test Case Completed
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 rounded-xl bg-[#F5F1EF]/60 border border-[#D9C7C2]/60">
                            <div className="text-[10px] uppercase font-bold text-[#5A626A]">Patient Identifier</div>
                            <div className="font-bold text-[#1A1D20] truncate">{patientName || 'Emergency Patient'}</div>
                            <div className="text-[11px] text-[#5A626A]">{patientAge ? `${patientAge} Years` : 'Age Unspecified'}</div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#F5F1EF]/60 border border-[#D9C7C2]/60 flex items-center justify-between">
                            <div>
                              <div className="text-[10px] uppercase font-bold text-[#5A626A]">Required Group</div>
                              <div className="font-black text-sm text-[#D72638]">{bloodType}</div>
                              <div className="text-[10px] text-[#5A626A]">{unitsNeeded || 1} Pints Needed</div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-[#D72638] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                              {bloodType}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#F5F1EF]/60 border border-[#D9C7C2]/60">
                            <div className="text-[10px] uppercase font-bold text-[#5A626A]">Triage Urgency</div>
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mt-0.5 ${urgency === 'CRITICAL' ? 'bg-red-100 text-[#D72638] border border-red-200' :
                              urgency === 'URGENT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                              {urgency}
                            </span>
                            <div className="text-[10px] text-[#5A626A] mt-1 truncate">{customLocalityInput.trim() || selectedLocality || 'Worldwide'}</div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#F5F1EF]/60 border border-[#D9C7C2]/60">
                            <div className="text-[10px] uppercase font-bold text-[#5A626A]">Emergency Phone</div>
                            <div className="font-mono font-bold text-[#1A1D20] text-xs truncate">
                              {countryDialCode} {contactPhone}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-semibold truncate">
                              Clinician: {currentUserEmail}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#D9C7C2]/40 flex items-center justify-between text-2xs text-[#5A626A] flex-wrap gap-2">
                          <span className="font-semibold">
                            Acceptable Compatible Donor Groups: <span className="font-bold text-[#D72638]">{compatibleBloodTypes.join(', ')}</span>
                          </span>
                          <span className="font-mono text-slate-400">
                            GPS Origin: {userCoords.latitude.toFixed(4)}°, {userCoords.longitude.toFixed(4)}°
                          </span>
                        </div>
                      </div>

                      {/* AFTER PDF GENERATED: SHOW EVERYTHING IN THE RESULT & PDF */}
                      {lastGeneratedPdf && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300 shadow-sm space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                                  <span>Official Clinical PDF Docket Generated &amp; Signed</span>
                                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                                    #{lastGeneratedPdf.uniqueId}
                                  </span>
                                </div>
                                <div className="text-[10px] text-emerald-700">
                                  Generated at {lastGeneratedPdf.timestamp} • Cloudflare R2 Persistent Archive Active
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleDownloadPdf}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Re-Download PDF</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-2xs">
                            <div className="bg-white/80 p-2 rounded-lg border border-emerald-200/80">
                              <span className="text-slate-400 block font-bold">PDF FILE IDENTIFIER</span>
                              <span className="font-mono text-emerald-950 font-bold truncate block">{lastGeneratedPdf.filename}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-emerald-200/80">
                              <span className="text-slate-400 block font-bold">VERIFIED PATIENT &amp; GROUP</span>
                              <span className="text-emerald-950 font-bold">{lastGeneratedPdf.patientName} ({lastGeneratedPdf.bloodType})</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-emerald-200/80">
                              <span className="text-slate-400 block font-bold">DISPATCH LOCALITY &amp; CONTACT</span>
                              <span className="text-emerald-950 font-bold truncate block">{lastGeneratedPdf.locality} • {lastGeneratedPdf.emergencyPhone}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-emerald-200/80">
                              <span className="text-slate-400 block font-bold">MATCHED LIFESAVERS IN DOCKET</span>
                              <span className="text-emerald-950 font-bold">{lastGeneratedPdf.donorCount} Proximity Donors Included</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Two Categorized Proximity Sections (Close/Same State in Top, Regional/Interstate in Bottom) */}
                      <div className="space-y-4 max-h-[48vh] overflow-y-auto no-scrollbar pr-1">
                        {rankedDonors.length === 0 ? (
                          <div className="p-8 text-center rounded-2xl bg-[#F5F1EF] text-slate-500">
                            <Droplet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-[#1A1D20]">No active compatible donors found in this radius.</p>
                            <p className="text-2xs text-slate-400 mt-0.5">Emergency request is active on the triage board.</p>
                          </div>
                        ) : (
                          <>
                            {/* SECTION 1: Close / Same Locality & State Lifesavers (<= 50 km) */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/70">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1D20]">
                                    Immediate &amp; Same State Lifesavers
                                  </h4>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    {closeDonors.length} Local
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  High Priority &bull; Immediate Dispatch (&le; 50 km)
                                </span>
                              </div>

                              {closeDonors.length === 0 ? (
                                <div className="p-3 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                                  No local lifesavers detected in immediate 50 km radius. Showing extended network donors below.
                                </div>
                              ) : (
                                closeDonors.map((donor, index) => {
                                  const isImmediate = donor.distanceKm <= 3.0;
                                  const isDispatched = dispatchedDonorIds[donor.id];
                                  const isSelf = Boolean(
                                    currentUserEmail && (
                                      (donor.email && donor.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()) ||
                                      (donor.user_email && donor.user_email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase())
                                    )
                                  );

                                  return (
                                    <div
                                      key={donor.id}
                                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isImmediate
                                        ? 'bg-emerald-50/20 border-emerald-300'
                                        : 'bg-[#F5F1EF] border-[#D9C7C2]'
                                        }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center">
                                          <span className="text-2xs font-extrabold text-slate-400">#{index + 1}</span>
                                          <div className="w-9 h-9 rounded-xl bg-[#D72638] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                            {donor.bloodType}
                                          </div>
                                        </div>

                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-xs font-bold text-[#1A1D20]">{donor.fullName}</h4>
                                            {isSelf && (
                                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-[#D72638] border border-red-200">
                                                You
                                              </span>
                                            )}
                                            <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-md border ${donor.tier.badgeClass}`}>
                                              {donor.tier.label} • {donor.distanceKm < 1 ? '< 1 km' : `${donor.distanceKm.toFixed(1)} km`}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3 text-[#D72638]" />
                                            <span>{donor.location || donor.city || 'Delhi NCR'}</span>
                                            <span>•</span>
                                            <span className="font-mono">{donor.phone}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {isSelf ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-2xs">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Your Standby Pledge</span>
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setCallModalTarget({
                                              contactName: donor.fullName,
                                              phoneNumber: donor.phone,
                                              bloodType: donor.bloodType,
                                              location: donor.location || donor.city || 'Delhi NCR',
                                              roleOrContext: `Voluntary Standby Donor (Group ${donor.bloodType})`
                                            })}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#1A1D20] bg-white border border-[#D9C7C2] hover:bg-slate-100 transition-all cursor-pointer"
                                          >
                                            <Phone className="w-3 h-3 text-emerald-600" />
                                            <span>Call</span>
                                          </button>

                                          {(() => {
                                            const donorCooldown = calculateCooldown(donor.lastAlertSentAt || donor.last_alert_sent_at);
                                            const isBlocked = isDispatched || donorCooldown.inCooldown;
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => setAlertModalTarget({
                                                  donor: {
                                                    id: donor.id,
                                                    fullName: donor.fullName,
                                                    email: donor.email,
                                                    phone: donor.phone,
                                                    bloodType: donor.bloodType,
                                                    location: donor.location || donor.city || 'Delhi NCR',
                                                    distanceKm: donor.distanceKm,
                                                    lastAlertSentAt: donor.lastAlertSentAt || donor.last_alert_sent_at
                                                  },
                                                  patientName: patientName,
                                                  hospital: 'Emergency Trauma Network',
                                                  customMessage: `Urgent transfusion needed for ${patientName} (Group ${bloodType}). Your compatible voluntary donation can save a life. Please contact our emergency hotline immediately if you can donate.`
                                                })}
                                                disabled={isBlocked}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${isDispatched
                                                  ? 'bg-emerald-600 text-white cursor-default'
                                                  : donorCooldown.inCooldown
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-85'
                                                    : 'bg-[#D72638] hover:bg-[#b51d2c] text-white cursor-pointer'
                                                  }`}
                                              >
                                                {isDispatched ? (
                                                  <CheckCircle2 className="w-3 h-3" />
                                                ) : donorCooldown.inCooldown ? (
                                                  <Clock className="w-3 h-3 text-amber-700" />
                                                ) : (
                                                  <Send className="w-3 h-3" />
                                                )}
                                                <span>
                                                  {isDispatched ? 'Dispatched' : donorCooldown.inCooldown ? `Available: ${donorCooldown.availableAtText}` : 'Send Alert'}
                                                </span>
                                              </button>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* SECTION 2: Regional & Extended Network Donors (> 50 km) */}
                            {extendedDonors.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/80">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1D20]">
                                      Regional &amp; Extended Network Donors
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                      {extendedDonors.length} Standby
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    Secondary Priority &bull; Out of State / Extended Transit (&gt; 50 km)
                                  </span>
                                </div>

                                {extendedDonors.map((donor, index) => {
                                  const isDispatched = dispatchedDonorIds[donor.id];
                                  const isSelf = Boolean(
                                    currentUserEmail && (
                                      (donor.email && donor.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()) ||
                                      (donor.user_email && donor.user_email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase())
                                    )
                                  );

                                  return (
                                    <div
                                      key={donor.id}
                                      className="p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FDFBF7] border-amber-200/80 hover:border-amber-300"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center">
                                          <span className="text-2xs font-extrabold text-slate-400">#{closeDonors.length + index + 1}</span>
                                          <div className="w-9 h-9 rounded-xl bg-[#D72638] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                            {donor.bloodType}
                                          </div>
                                        </div>

                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-xs font-bold text-[#1A1D20]">{donor.fullName}</h4>
                                            {isSelf && (
                                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-[#D72638] border border-red-200">
                                                You
                                              </span>
                                            )}
                                            <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-md border ${donor.tier.badgeClass}`}>
                                              {donor.tier.label} • {donor.distanceKm.toFixed(1)} km
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                              Extended Network
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3 text-[#D72638]" />
                                            <span>{donor.location || donor.city || 'Delhi NCR'}</span>
                                            <span>•</span>
                                            <span className="font-mono">{donor.phone}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {isSelf ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-2xs">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Your Standby Pledge</span>
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setCallModalTarget({
                                              contactName: donor.fullName,
                                              phoneNumber: donor.phone,
                                              bloodType: donor.bloodType,
                                              location: donor.location || donor.city || 'Delhi NCR',
                                              roleOrContext: `Voluntary Standby Donor (Group ${donor.bloodType})`
                                            })}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#1A1D20] bg-white border border-[#D9C7C2] hover:bg-slate-100 transition-all cursor-pointer"
                                          >
                                            <Phone className="w-3 h-3 text-emerald-600" />
                                            <span>Call</span>
                                          </button>

                                          {(() => {
                                            const donorCooldown = calculateCooldown(donor.lastAlertSentAt || donor.last_alert_sent_at);
                                            const isBlocked = isDispatched || donorCooldown.inCooldown;
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => setAlertModalTarget({
                                                  donor: {
                                                    id: donor.id,
                                                    fullName: donor.fullName,
                                                    email: donor.email,
                                                    phone: donor.phone,
                                                    bloodType: donor.bloodType,
                                                    location: donor.location || donor.city || 'Delhi NCR',
                                                    distanceKm: donor.distanceKm,
                                                    lastAlertSentAt: donor.lastAlertSentAt || donor.last_alert_sent_at
                                                  },
                                                  patientName: patientName,
                                                  hospital: 'Emergency Trauma Network',
                                                  customMessage: `Urgent transfusion needed for ${patientName} (Group ${bloodType}). Your compatible voluntary donation can save a life. Please contact our emergency hotline immediately if you can donate.`
                                                })}
                                                disabled={isBlocked}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${isDispatched
                                                  ? 'bg-emerald-600 text-white cursor-default'
                                                  : donorCooldown.inCooldown
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-85'
                                                    : 'bg-[#D72638] hover:bg-[#b51d2c] text-white cursor-pointer'
                                                  }`}
                                              >
                                                {isDispatched ? (
                                                  <CheckCircle2 className="w-3 h-3" />
                                                ) : donorCooldown.inCooldown ? (
                                                  <Clock className="w-3 h-3 text-amber-700" />
                                                ) : (
                                                  <Send className="w-3 h-3" />
                                                )}
                                                <span>
                                                  {isDispatched ? 'Dispatched' : donorCooldown.inCooldown ? `Available: ${donorCooldown.availableAtText}` : 'Send Alert'}
                                                </span>
                                              </button>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Footer Return Button */}
                      <div className="pt-3 border-t border-[#D9C7C2] flex items-center justify-between">
                        <span className="text-2xs text-slate-500">
                          Request posted to active triage queue and synchronized across devices.
                        </span>
                        <button
                          onClick={handleDoneAndViewOnBoard}
                          className="px-5 py-2 rounded-xl bg-[#1A1D20] hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-98"
                        >
                          Done &amp; View on Board
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Clinical Mobilize Call In-App Modal (eliminates browser OS pick-an-app dialog) */}
      {callModalTarget && (
        <ClinicalCallModal
          isOpen={Boolean(callModalTarget)}
          onClose={() => setCallModalTarget(null)}
          contactName={callModalTarget.contactName}
          phoneNumber={callModalTarget.phoneNumber}
          bloodType={callModalTarget.bloodType}
          location={callModalTarget.location}
          roleOrContext={callModalTarget.roleOrContext}
        />
      )}

      {/* In-App Send Emergency Blood Alert Modal */}
      {alertModalTarget && (
        <SendAlertModal
          isOpen={Boolean(alertModalTarget)}
          onClose={() => setAlertModalTarget(null)}
          targetDonor={alertModalTarget.donor}
          initialPatientName={alertModalTarget.patientName}
          initialHospital={alertModalTarget.hospital}
          initialMessage={alertModalTarget.customMessage}
          onSuccess={() => {
            if (alertModalTarget?.donor.id) {
              setDispatchedDonorIds((prev) => ({ ...prev, [alertModalTarget.donor.id!]: true }));
            }
          }}
        />
      )}

      {/* =========================================================================
          CUSTOM BRANDED IN-APP EMERGENCY REQUEST DELETION MODAL WITH WHOLE-PAGE BLUR
          ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {requestToDelete && (
            <motion.div
              key="delete-emergency-modal-backdrop"
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xl"
              onClick={() => { if (!deletingRequestId) setRequestToDelete(null); }}
              style={{ willChange: 'opacity, backdrop-filter' }}
            >
              <motion.div
                key="delete-emergency-modal-card"
                initial={{ opacity: 0, scale: 0.94, y: 16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, y: 12, filter: 'blur(6px)' }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="relative w-full max-w-md bg-white/95 rounded-3xl border border-[#D9C7C2] shadow-2xl p-4 sm:p-6 lg:p-7 text-left space-y-4 backdrop-blur-2xl text-[#1A1D20] my-auto max-h-[92dvh] overflow-y-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
                style={{ willChange: 'transform, opacity, filter' }}
              >
                {/* Header: Trash Icon + Close Button */}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 text-[#D72638] flex items-center justify-center shrink-0 shadow-xs">
                    <Trash2 className="w-6 h-6 text-[#D72638]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (!deletingRequestId) setRequestToDelete(null); }}
                    disabled={Boolean(deletingRequestId)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer disabled:opacity-50"
                    aria-label="Close confirmation dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-black text-[#1A1D20] tracking-tight">
                    Remove Emergency Request?
                  </h3>
                  <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                    Are you sure you want to permanently remove emergency request <span className="font-mono font-bold text-[#D72638]">#{requestToDelete.id}</span> from the active triage board? This action will archive the case and cannot be undone.
                  </p>
                </div>

                {/* Target Emergency Case Summary Box */}
                <div className="p-3.5 rounded-2xl bg-[#F5F1EF]/70 border border-[#D9C7C2] flex items-center gap-3">
                  <div className="group/badge relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#E63946] via-[#D72638] to-[#7A0C17] text-white flex flex-col items-center justify-center font-black shadow-xs shrink-0 transition-all duration-300 hover:scale-105 overflow-hidden select-none">
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-xl" />
                    <div className="relative z-10 flex flex-col items-center justify-center leading-none">
                      <span className="text-[6.5px] uppercase font-extrabold text-red-100/90 leading-tight">GROUP</span>
                      <span className="text-sm font-black drop-shadow-xs">{requestToDelete.bloodType}</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-[#1A1D20] truncate">
                        {requestToDelete.patientName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#D72638]">
                        {requestToDelete.urgency || 'CRITICAL'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A626A] truncate mt-0.5">
                      {requestToDelete.unitsNeeded} Pints • {requestToDelete.hospitalCity || 'Delhi NCR'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D9C7C2]/60">
                  <button
                    type="button"
                    onClick={() => setRequestToDelete(null)}
                    disabled={Boolean(deletingRequestId)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A626A] hover:text-[#1A1D20] hover:bg-[#F5F1EF] border border-[#D9C7C2] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteRequest}
                    disabled={Boolean(deletingRequestId)}
                    className="px-5 py-2 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
                  >
                    {deletingRequestId ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Request</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
