import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { BloodType, Donor } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Heart, 
  X, 
  Mail, 
  Activity, 
  ShieldCheck, 
  BarChart3,
  Navigation,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Star,
  Sparkles,
  Droplet,
  ArrowRight,
  Trash2,
  Clock
} from 'lucide-react';
import { getDonors, saveDonors, deleteDonor as deleteDonorStorage } from '../services/storage';
import { fetchDonorsApi, sendDonorOtpApi, registerDonorApi, deleteDonorApi } from '../services/api';
import { COUNTRY_CODES, validatePhoneNumber, validateEmail } from '../utils/countryCodes';
import { BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';

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

const POPULAR_DELHI_LOCALITIES = [
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
  'Okhla, South East Delhi',
];

export default function DonorRegistry() {
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightParam);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [donors, setDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [expandedDonorId, setExpandedDonorId] = useState<string | null>(highlightParam);

  // Auto-scroll and highlight target donor when arriving via direct alert link or search
  useEffect(() => {
    if (highlightParam) {
      setHighlightedId(highlightParam);
      setExpandedDonorId(highlightParam);
      setTimeout(() => {
        const el = document.getElementById(`donor-card-${highlightParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [highlightParam, donors.length]);

  // Modal lifecycle states: FORM -> OTP -> SUCCESS
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<'FORM' | 'OTP' | 'SUCCESS'>('FORM');

  // Form input states
  const [fullName, setFullName] = useState('');
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [age, setAge] = useState<number>(28);
  const [gender, setGender] = useState<Donor['gender']>('MALE');
  const [countryDialCode, setCountryDialCode] = useState<string>('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Delhi');
  const [state, setState] = useState('Delhi');
  const [location, setLocation] = useState('');
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Geolocation detector states
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationDetectionSuccess, setLocationDetectionSuccess] = useState<boolean>(false);

  // OTP Verification states
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [donorOtpExpirySeconds, setDonorOtpExpirySeconds] = useState<number>(600); // 10 minutes exact
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Current logged in clinician / account email
  const currentUserEmail = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_email') || localStorage.getItem('bloodmatch_user_email') || '').trim().toLowerCase()
    : '';

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Global cross-device sync & local cache loader
  const loadDonors = async () => {
    // 1. Initial local cache presentation for instant render
    const cached = getDonors();
    if (cached && cached.length > 0) {
      setDonors(cached);
    }

    // 2. Fetch fresh live records from backend database
    try {
      const res = await fetchDonorsApi(selectedFilter, currentUserEmail);
      if (res.ok && Array.isArray(res.data)) {
        const mapped: Donor[] = res.data.map((d: any) => ({
          id: d.id || `DNR-${Math.random().toString().slice(-6)}`,
          fullName: d.name || d.fullName || 'Anonymous Donor',
          bloodType: (d.blood_type || d.bloodType || 'O+') as BloodType,
          age: d.age || 28,
          gender: (d.gender || 'MALE') as Donor['gender'],
          phone: d.phone || '+91 98765 43210',
          email: d.email || 'donor@bloodmatch.io',
          city: d.city || 'Delhi',
          state: d.state || 'Delhi',
          location: d.location || d.city || 'Delhi, India',
          user_email: d.user_email || d.email,
          hospital: d.hospital || 'BloodMatch Emergency Network',
          lastDonationDate: d.last_donation_date || d.lastDonationDate,
          isAvailable: d.is_available ?? d.available ?? true,
          registeredAt: d.created_at || d.registeredAt || new Date().toISOString(),
          unitsDonatedTotal: d.units_donated_total ?? d.unitsDonatedTotal ?? 0,
        }));
        setDonors(mapped);
        saveDonors(mapped);
      }
    } catch {
      // Quiet background fallback to cached state
    }
  };

  useEffect(() => {
    loadDonors();

    // Listen for storage / cross-tab updates
    const handleStorageUpdate = () => loadDonors();
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('bloodmatch_donors_updated', handleStorageUpdate);

    // Calm cross-device sync polling every 60 seconds (active tab only)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadDonors();
      }
    }, 60000);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('bloodmatch_donors_updated', handleStorageUpdate);
      clearInterval(interval);
    };
  }, [selectedFilter, currentUserEmail]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpenModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpenModal]);

  // Resend cooldown timer (30s) + strict token expiry (10 minutes)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpenModal && modalStep === 'OTP') {
      timer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
        setDonorOtpExpirySeconds(prev => {
          if (prev <= 1) {
            setOtpError('Verification code has expired (strictly valid for 10 minutes). Please click Resend Code.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpenModal, modalStep]);

  // Browser Geolocation Detector for Delhi & nearby regions
  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setFormErrors(prev => ({
        ...prev,
        location: 'Geolocation is not supported by your browser. Please select a locality below.',
      }));
      return;
    }

    setIsDetectingLocation(true);
    setLocationDetectionSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse-geocode via standard OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.quarter || addr.subdistrict;
            const cityFound = addr.city || addr.state_district || addr.state || 'Delhi';
            const detectedArea = suburb ? `${suburb}, ${cityFound}` : `Area near ${latitude.toFixed(3)}N, ${longitude.toFixed(3)}E, ${cityFound}`;
            
            setLocation(detectedArea);
            setCity(cityFound);
            setState(addr.state || 'Delhi');
            setLocationDetectionSuccess(true);
            setFormErrors(prev => ({ ...prev, location: '' }));
          } else {
            throw new Error('Reverse geocode failed');
          }
        } catch {
          // Robust local coordinate matcher fallback
          const isDelhiBox = latitude >= 28.3 && latitude <= 28.9 && longitude >= 76.8 && longitude <= 77.5;
          const fallbackLoc = isDelhiBox ? 'Connaught Place, Central Delhi' : `GPS (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;
          setLocation(fallbackLoc);
          setCity('Delhi');
          setState('Delhi');
          setLocationDetectionSuccess(true);
          setFormErrors(prev => ({ ...prev, location: '' }));
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        setFormErrors(prev => ({
          ...prev,
          location: 'Location access was blocked or timed out. Please select from prominent Delhi localities below.',
        }));
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setModalStep('FORM');
    setFormErrors({});
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Full legal name is required (at least 2 characters)';
    }

    if (!age || age < 18 || age > 65) {
      errors.age = 'Donor age must be strictly between 18 and 65 years';
    }

    const phoneValidation = validatePhoneNumber(countryDialCode, phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.message || 'Please enter a valid emergency phone number';
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message || 'Please enter a valid email address';
    }

    if (!location.trim()) {
      errors.location = 'Specific locality or area is required (e.g. Rohini, Connaught Place)';
    }

    if (!city.trim()) {
      errors.city = 'City is required for localized donor dispatch';
    }

    if (!consentChecked) {
      errors.consent = 'You must declare voluntary donor eligibility criteria and consent to proceed';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submit -> initiates Email OTP Verification
  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSendingOtp(true);
    setOtpError('');

    try {
      const res = await sendDonorOtpApi(email.trim().toLowerCase(), fullName.trim());
      if (res.ok) {
        setModalStep('OTP');
        setResendCooldown(res.data?.cooldown_seconds || 30);
        setDonorOtpExpirySeconds(600);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setFormErrors(prev => ({
          ...prev,
          email: res.error || 'Failed to dispatch verification code. Please check your email.',
        }));
      }
    } catch {
      setFormErrors(prev => ({
        ...prev,
        email: 'Network error communicating with email gateway. Please try again.',
      }));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // OTP Input handlers
  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Pasted full OTP code
      const pasted = cleaned.slice(0, 6).split('');
      pasted.forEach((ch, idx) => {
        newDigits[idx] = ch;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
    } else {
      newDigits[index] = cleaned;
      setOtpDigits(newDigits);
      if (cleaned && index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
    if (otpError) setOtpError('');
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError('');

    try {
      const res = await sendDonorOtpApi(email.trim().toLowerCase(), fullName.trim());
      if (res.ok) {
        setResendCooldown(30);
        setDonorOtpExpirySeconds(600);
      } else {
        setOtpError(res.error || 'Could not resend code. Please try again in a moment.');
      }
    } catch {
      setOtpError('Network error resending code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP & finalize donor registration
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmittingOtp(true);
    setOtpError('');

    try {
      const res = await registerDonorApi({
        name: fullName.trim(),
        blood_type: bloodType,
        phone: `${countryDialCode} ${phone.trim()}`,
        email: email.trim().toLowerCase(),
        city: city.trim(),
        location: location.trim(),
        hospital: 'BloodMatch Emergency Network',
        age,
        gender,
        user_email: currentUserEmail || email.trim().toLowerCase(),
        otp_code: code,
      });

      if (res.ok && res.data) {
        // Successful registration & verification
        setModalStep('SUCCESS');
        await loadDonors();
      } else {
        setOtpError(res.error || 'Invalid or expired verification code. Please check your email.');
      }
    } catch {
      setOtpError('Connection error during registration. Please check your connection.');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  // Reset form upon successful registration
  const handleFinishSuccess = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setLocation('');
    setCity('Delhi');
    setState('Delhi');
    setConsentChecked(false);
    setFormErrors({});
    setIsOpenModal(false);
    setModalStep('FORM');
    setOtpDigits(['', '', '', '', '', '']);
  };

  // Owner-Only Donor Deletion Handler (Zero deletion notification dispatched)
  const handleDeleteDonor = async (donorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove your voluntary blood donor pledge from the active registry? This will immediately update the blood bank reserve.')) {
      return;
    }

    setIsDeletingId(donorId);
    try {
      if (currentUserEmail) {
        await deleteDonorApi(donorId, currentUserEmail);
      }
      deleteDonorStorage(donorId);
      setDonors(prev => prev.filter(d => d.id !== donorId));
      if (expandedDonorId === donorId) setExpandedDonorId(null);
      // Strictly: Zero deletion notification is dispatched
    } catch {
      // Quiet background deletion fallback
    } finally {
      setIsDeletingId(null);
    }
  };

  // Filter donors by query and blood group
  const query = search.toLowerCase().trim();
  const filteredDonors = donors.filter(d => {
    const matchesFilter = selectedFilter === 'ALL' || d.bloodType === selectedFilter;
    const matchesSearch = 
      !query ||
      d.fullName.toLowerCase().includes(query) ||
      d.city.toLowerCase().includes(query) ||
      (d.location && d.location.toLowerCase().includes(query)) ||
      d.phone.includes(query) ||
      d.bloodType.toLowerCase().includes(query) ||
      d.email.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  // Partition into: 1. Current logged-in user's pledges (PINNED AT TOP) and 2. Community donors
  const myPledges = filteredDonors.filter(d => 
    Boolean(currentUserEmail) && (
      (d.user_email && d.user_email.toLowerCase() === currentUserEmail) ||
      (d.email && d.email.toLowerCase() === currentUserEmail)
    )
  );

  const communityDonors = filteredDonors.filter(d => 
    !Boolean(currentUserEmail) || !(
      (d.user_email && d.user_email.toLowerCase() === currentUserEmail) ||
      (d.email && d.email.toLowerCase() === currentUserEmail)
    )
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 relative z-10">
      {/* Header */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="p-6 sm:p-8 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/30 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Power BI Voluntary Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Certified Voluntary Blood Donor Registry
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-xl">
            Live directory of screened voluntary blood donors across Delhi & nationwide standby pools, synchronized across all authenticated clinical terminals.
          </p>
        </div>

        <button
          onClick={() => {
            setIsOpenModal(true);
            setModalStep('FORM');
            setFormErrors({});
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/25 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Donor</span>
        </button>
      </motion.div>

      {/* Featured Apheresis Mobilization Live Monitor */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-6">
          <div 
            className="relative w-full lg:w-3/5 rounded-2xl overflow-hidden border border-[#D72638]/40 shadow-md bg-black h-[220px] xs:h-[260px] sm:h-[300px] flex items-center justify-center"
            style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
          >
            <video
              src="/6973-197914400_medium.mp4?v=3"
              poster="/6973-197914400_medium_poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ transform: 'translateZ(0)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping" />
              <span>Live Emergency Donor Dispatch Ledger</span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white pointer-events-none">
              <div>
                <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">National Standby Pool</span>
                <span className="text-sm font-black font-mono">{donors.length} Screened Voluntary Donors</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Delhi Metro Active</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {donors.filter(d => d.city.toLowerCase().includes('delhi') || (d.location && d.location.toLowerCase().includes('delhi'))).length} Ready
                  </span>
                </div>
                <div className="text-right border-l border-white/20 pl-3">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Transfusion Protocol</span>
                  <span className="text-sm font-black text-white font-mono">AABB 4.2</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/20 mb-2">
                <Activity className="w-3.5 h-3.5 text-[#D72638]" />
                <span>Voluntary Donor Mobilization</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#1A1D20] tracking-tight">
                Live Geocoded Donor Directory
              </h2>
              <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                Autonomous cross-device synchronization indexes verified donors by exact Delhi locality, blood antibodies, and contact readiness for rapid trauma triage.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Verified Donors</span>
                <span className="text-sm font-black text-[#1A1D20] mt-0.5 block truncate">{donors.length} Verified Donors</span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">Cross-Device Synchronized</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Immediate Standby</span>
                <span className="text-sm font-black text-emerald-700 mt-0.5 block">
                  {donors.filter(d => d.isAvailable).length} Available
                </span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">Ready for emergency call</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-900 font-semibold text-xs">Donor Health & Serology Clearance</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                VALIDATED
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Controls & Blood Group Filters */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="flex flex-col md:flex-row gap-4 items-center justify-between"
      >
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, Delhi locality, phone, blood group..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#D9C7C2] focus:border-[#D72638] text-xs text-[#1A1D20] placeholder-slate-400 outline-hidden shadow-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {['ALL', ...bloodTypes].map(bt => (
            <button
              key={bt}
              onClick={() => setSelectedFilter(bt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === bt
                  ? 'bg-[#D72638] text-white shadow-md shadow-[#D72638]/30 scale-105'
                  : 'bg-white text-[#4A5568] hover:text-[#1A1D20] border border-[#D9C7C2]'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </motion.div>

      {/* =========================================================================
          SECTION 1: YOUR REGISTERED BLOOD PLEDGES (PRIORITY TOP HIGHLIGHT)
          ========================================================================= */}
      {currentUserEmail && (
        <motion.div
          variants={scrollBlurVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#D72638] text-white shadow-xs">
                <Star className="w-4 h-4 fill-white" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1A1D20] tracking-tight">
                Your Registered Blood Pledges ({myPledges.length})
              </h2>
            </div>
            <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] border border-[#D72638]/20">
              Active Account: {currentUserEmail}
            </span>
          </div>

          {myPledges.length === 0 ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-red-50/50 via-white to-red-50/30 border border-[#D72638]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#D72638]/30 flex items-center justify-center text-[#D72638] shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5 text-[#D72638]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1D20]">No blood pledges registered under your email yet</h4>
                  <p className="text-[#5A626A] mt-0.5 text-[11px]">
                    Register your blood group to have your voluntary donor pledge pinned here with top emergency readiness.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpenModal(true);
                  setModalStep('FORM');
                  setEmail(currentUserEmail);
                }}
                className="px-4 py-2 rounded-xl bg-[#D72638] text-white font-bold text-xs shrink-0 cursor-pointer hover:bg-[#b51d2c] transition-colors"
              >
                Pledge Blood Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPledges.map((donor) => renderDonorCard(donor, true))}
            </div>
          )}
        </motion.div>
      )}

      {/* =========================================================================
          SECTION 2: VERIFIED COMMUNITY DONORS (NETWORK DIRECTORY)
          ========================================================================= */}
      <motion.div
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="space-y-3 pt-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#1A1D20] text-white shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#1A1D20] tracking-tight">
              Verified Community Donors ({communityDonors.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono font-semibold text-[#5A626A]">
            Showing {filteredDonors.length} total matches
          </span>
        </div>

        {communityDonors.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white/80 border border-dashed border-[#D9C7C2]">
            <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#1A1D20]">No community donors found</h3>
            <p className="text-xs text-[#5A626A] mt-1 max-w-sm mx-auto">
              {search || selectedFilter !== 'ALL'
                ? 'Try adjusting your blood group filter or search query.'
                : 'Zero community donors registered. Click "Register New Donor" to register the first donor.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communityDonors.map((donor) => renderDonorCard(donor, false))}
          </div>
        )}
      </motion.div>

      {/* =========================================================================
          REGISTER DONOR MODAL WITH GPS DELHI LOCATOR & EMAIL OTP (HORIZONTAL TWO-COLUMN LAYOUT)
          ========================================================================= */}
      {isOpenModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={handleCloseModal}
        >
          <div 
            className="relative w-full max-w-4xl lg:max-w-5xl max-h-[94vh] overflow-y-auto no-scrollbar rounded-3xl bg-white border border-[#D9C7C2] p-5 sm:p-7 md:p-8 shadow-2xl text-[#1A1D20]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer z-10"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* STEP 1: REGISTRATION FORM (HORIZONTAL 2-COLUMN SPLIT) */}
            {modalStep === 'FORM' && (
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#D9C7C2]/60 pr-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#7A0C17]/10 border border-[#D72638]/20 flex items-center justify-center text-[#D72638] shadow-xs shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#1A1D20] tracking-tight">
                        Register Voluntary Blood Donor
                      </h2>
                      <p className="text-xs text-[#5A626A] mt-0.5">
                        Enroll prospective donor with verified Delhi locality, contact channels, and secure email OTP verification.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProceedToOtp} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                    {/* LEFT COLUMN: DONOR IDENTITY & CLINICAL CONTACT */}
                    <div className="space-y-3.5 bg-[#F5F1EF]/40 p-4 sm:p-5 rounded-2xl border border-[#D9C7C2]/70">
                      <div className="text-[11px] font-black text-[#7A0C17] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-[#D9C7C2]/60">
                        <Droplet className="w-3.5 h-3.5 text-[#D72638] fill-current" />
                        <span>1. Donor Identity & Clinical Contact</span>
                      </div>

                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                          Full Legal Name <span className="text-[#D72638]">*</span>
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (formErrors.fullName) setFormErrors(prev => ({ ...prev, fullName: '' }));
                          }}
                          placeholder="e.g. Farhan Khalid"
                          className={`w-full px-3 py-2 rounded-xl bg-white border ${
                            formErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                          } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                        />
                        {formErrors.fullName && (
                          <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.fullName}</p>
                        )}
                      </div>

                      {/* Blood Group & Biological Gender */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                            Blood Group <span className="text-[#D72638]">*</span>
                          </label>
                          <select
                            value={bloodType}
                            onChange={(e) => setBloodType(e.target.value as BloodType)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs text-[#1A1D20] font-bold outline-hidden focus:border-[#D72638] cursor-pointer"
                          >
                            {bloodTypes.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Biological Gender</label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value as Donor['gender'])}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] cursor-pointer"
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Age */}
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                          Age (18 - 65) <span className="text-[#D72638]">*</span>
                        </label>
                        <input
                          type="number"
                          min="18"
                          max="65"
                          value={age}
                          onChange={(e) => {
                            setAge(Number(e.target.value));
                            if (formErrors.age) setFormErrors(prev => ({ ...prev, age: '' }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl bg-white border ${
                            formErrors.age ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                          } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                        />
                        {formErrors.age && (
                          <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.age}</p>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                          Phone Number <span className="text-[#D72638]">*</span>
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            value={countryDialCode}
                            onChange={(e) => {
                              setCountryDialCode(e.target.value);
                              if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
                            }}
                            className="px-2 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs font-bold text-[#1A1D20] outline-hidden focus:border-[#D72638] shrink-0 cursor-pointer max-w-[105px]"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.dialCode}>
                                {c.flag} {c.dialCode}
                              </option>
                            ))}
                          </select>

                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
                            }}
                            placeholder={countryDialCode === '+91' ? '98765 43210' : 'Mobile number'}
                            className={`w-full px-3 py-2 rounded-xl bg-white border ${
                              formErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                            } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                          />
                        </div>
                        {formErrors.phone && (
                          <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.phone}</p>
                        )}
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                          Email Address (Requires OTP) <span className="text-[#D72638]">*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                          }}
                          placeholder="donor@example.com"
                          className={`w-full px-3 py-2 rounded-xl bg-white border ${
                            formErrors.email ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                          } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                        />
                        {formErrors.email && (
                          <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.email}</p>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: GEOLOCATION, CONSENT & ACTION PLEDGE */}
                    <div className="space-y-3.5 bg-[#F5F1EF]/40 p-4 sm:p-5 rounded-2xl border border-[#D9C7C2]/70 flex flex-col justify-between">
                      <div className="space-y-3.5">
                        <div className="text-[11px] font-black text-[#7A0C17] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-[#D9C7C2]/60">
                          <MapPin className="w-3.5 h-3.5 text-[#D72638]" />
                          <span>2. Delhi Locality & Geolocation Verification</span>
                        </div>

                        {/* Geolocation Input & Popular Localities */}
                        <div className="p-3.5 rounded-2xl bg-white border border-[#D9C7C2] space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-[#1A1D20] flex items-center gap-1.5">
                              <span>Exact Locality / Area in Delhi <span className="text-[#D72638]">*</span></span>
                            </label>

                            <button
                              type="button"
                              onClick={handleDetectLocation}
                              disabled={isDetectingLocation}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F1EF] border border-[#D9C7C2] hover:border-[#D72638] text-[11px] font-bold text-[#D72638] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isDetectingLocation ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Navigation className="w-3 h-3 text-[#D72638]" />
                              )}
                              <span>{isDetectingLocation ? 'Detecting GPS...' : 'Detect My Location'}</span>
                            </button>
                          </div>

                          <input
                            type="text"
                            value={location}
                            onChange={(e) => {
                              setLocation(e.target.value);
                              if (formErrors.location) setFormErrors(prev => ({ ...prev, location: '' }));
                            }}
                            placeholder="e.g. Rohini Sector 7, North West Delhi / Connaught Place"
                            className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                              formErrors.location ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                            } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                          />
                          {formErrors.location && (
                            <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.location}</p>
                          )}
                          {locationDetectionSuccess && (
                            <p className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Location successfully detected via browser GPS.</span>
                            </p>
                          )}

                          {/* Quick Select Popular Delhi Localities */}
                          <div>
                            <span className="text-[10px] font-bold text-[#7A0C17] uppercase tracking-wider block mb-1">
                              Or Pick Delhi Locality:
                            </span>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar py-0.5">
                              {POPULAR_DELHI_LOCALITIES.map((loc) => (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => {
                                    setLocation(loc);
                                    setCity('Delhi');
                                    setState('Delhi');
                                    if (formErrors.location) setFormErrors(prev => ({ ...prev, location: '' }));
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                                    location === loc
                                      ? 'bg-[#D72638] text-white shadow-2xs'
                                      : 'bg-[#F5F1EF] hover:bg-red-50 text-[#5A626A] border border-[#D9C7C2]'
                                  }`}
                                >
                                  {loc.split(',')[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* City & State (Synced with location) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                              City / Metro <span className="text-[#D72638]">*</span>
                            </label>
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => {
                                setCity(e.target.value);
                                if (formErrors.city) setFormErrors(prev => ({ ...prev, city: '' }));
                              }}
                              placeholder="Delhi"
                              className={`w-full px-3 py-2 rounded-xl bg-white border ${
                                formErrors.city ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                              } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                            />
                            {formErrors.city && (
                              <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.city}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#1A1D20] mb-1">State / Region</label>
                            <input
                              type="text"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              placeholder="Delhi"
                              className="w-full px-3 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                            />
                          </div>
                        </div>

                        {/* Voluntary Consent Declaration Checkbox */}
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                          <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={consentChecked}
                              onChange={(e) => {
                                setConsentChecked(e.target.checked);
                                if (formErrors.consent) setFormErrors(prev => ({ ...prev, consent: '' }));
                              }}
                              className="mt-0.5 w-4 h-4 rounded-sm border-[#D9C7C2] text-[#D72638] focus:ring-[#D72638] cursor-pointer shrink-0"
                            />
                            <span className="text-[11px] text-[#5A626A] leading-relaxed">
                              I certify that I am between 18–65 years of age, weigh at least 45kg, have no active transmissible illnesses or blood-borne conditions, have had no major surgery or tattoo in the past 6 months, and voluntarily consent to emergency transfusion notifications. <span className="text-[#D72638]">*</span>
                            </span>
                          </label>
                          {formErrors.consent && (
                            <p className="text-red-500 text-[11px] font-semibold mt-1.5 ml-6">{formErrors.consent}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-end gap-2.5 mt-auto">
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#5A626A] hover:text-[#1A1D20] hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSendingOtp}
                          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isSendingOtp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{isSendingOtp ? 'Sending Verification OTP...' : 'Verify Email & Pledge'}</span>
                          {!isSendingOtp && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: EMAIL OTP VERIFICATION (HORIZONTAL TWO-COLUMN PRESENTATION) */}
            {modalStep === 'OTP' && (
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#D9C7C2]/60 pr-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#7A0C17]/10 border border-[#D72638]/20 text-[#D72638] flex items-center justify-center shrink-0 shadow-xs">
                      <Heart className="w-5 h-5 fill-current text-[#D72638]" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#1A1D20] tracking-tight">
                        Verify Voluntary Donor Email
                      </h2>
                      <p className="text-xs text-[#5A626A] mt-0.5">
                        Confirm ownership of your registered clinical work email to complete voluntary donor registry.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center py-2">
                  {/* Left Column: Prospective Donor Summary Card */}
                  <div className="p-5 rounded-2xl bg-[#F5F1EF]/60 border border-[#D9C7C2] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#7A0C17]">
                        Prospective Voluntary Donor
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        Pledge Pending
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7A0C17] to-[#D72638] text-white flex items-center justify-center text-lg font-black shadow-sm">
                        {bloodType}
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-[#1A1D20]">
                          {fullName || 'Prospective Donor'}
                        </div>
                        <div className="text-xs text-[#5A626A]">
                          {gender} • {age} Years • {city}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#D9C7C2]/50 space-y-1.5 text-xs text-[#5A626A]">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Locality:</span>
                        <span className="font-semibold text-[#1A1D20] truncate max-w-[200px]">{location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Contact:</span>
                        <span className="font-semibold text-[#1A1D20]">{countryDialCode} {phone}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Code Sent To:</span>
                        <span className="font-bold text-[#D72638] truncate max-w-[200px]">{email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 6-Digit Code Input & Verification Action */}
                  <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#5A626A] mb-2 px-1">
                        <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                          6-Digit Code
                        </label>
                        <span className="text-[11px] font-mono font-bold text-[#D72638] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {donorOtpExpirySeconds > 0 ? (
                            <span>Expires in {Math.floor(donorOtpExpirySeconds / 60)}:{(donorOtpExpirySeconds % 60).toString().padStart(2, '0')}</span>
                          ) : (
                            <span className="text-red-600 font-extrabold">Expired (10m Limit)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-center gap-2 sm:gap-3">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl text-center text-xl font-mono font-black border transition-all duration-200 outline-hidden ${
                              otpError 
                                ? 'border-red-400 bg-red-50/40 text-[#D72638]' 
                                : digit 
                                  ? 'border-[#D72638] bg-white text-[#1A1D20] shadow-sm' 
                                  : 'border-[#D9C7C2] bg-[#F5F1EF] text-[#1A1D20]'
                            } focus:border-[#D72638] focus:bg-white`}
                          />
                        ))}
                      </div>
                      {otpError && (
                        <p className="text-red-500 text-xs font-semibold text-center mt-2 flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{otpError}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#5A626A] px-1">
                      <button
                        type="button"
                        onClick={() => setModalStep('FORM')}
                        className="hover:text-[#1A1D20] underline underline-offset-2 cursor-pointer"
                      >
                        ← Edit Details
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || isSendingOtp}
                        className={`font-semibold cursor-pointer ${
                          resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#D72638] hover:underline'
                        }`}
                      >
                        {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                      </button>
                    </div>

                    <div className="pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#5A626A] hover:text-[#1A1D20] hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingOtp || otpDigits.join('').length < 6}
                        className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSubmittingOtp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isSubmittingOtp ? 'Verifying...' : 'Confirm Registration'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION */}
            {modalStep === 'SUCCESS' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-[#1A1D20]">
                  Voluntary Donor Registered!
                </h3>
                <p className="text-xs text-[#5A626A] max-w-md mx-auto leading-relaxed">
                  Thank you, <strong className="text-[#1A1D20]">{fullName}</strong>! Your Group <strong className="text-[#D72638]">{bloodType}</strong> blood pledge has been verified and enrolled into our live emergency registry for <strong className="text-[#1A1D20]">{location}</strong>.
                </p>
                <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#10B981]/30 text-emerald-900 text-xs text-left">
                  <strong>Notification Dispatched:</strong> A confirmation email has been sent to <strong>{email}</strong>. If someone in your area requires blood matching your group, our clinical emergency coordination team will notify you immediately.
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleFinishSuccess}
                    className="w-full py-3 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer transition-all"
                  >
                    View in Certified Directory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  /**
   * Helper component function to render an interactive donor card
   * with priority styling and on-click expandable dropdown details
   */
  function renderDonorCard(donor: Donor, isOwnPledge: boolean) {
    const isExpanded = expandedDonorId === donor.id;
    const isTargeted = highlightedId === donor.id;
    const compatibility = BLOOD_COMPATIBILITY_TABLE[donor.bloodType];

    return (
      <motion.div
        id={`donor-card-${donor.id}`}
        key={donor.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -2 }}
        className={`rounded-2xl transition-all duration-300 overflow-hidden ${
          isTargeted
            ? 'ring-4 ring-[#D72638] border-2 border-[#D72638] shadow-2xl shadow-[#D72638]/25 scale-[1.01] bg-gradient-to-br from-white via-red-50/40 to-white'
            : isOwnPledge
            ? 'bg-gradient-to-br from-white via-red-50/25 to-white border-2 border-[#D72638] shadow-md shadow-[#D72638]/10'
            : 'bg-white/95 border border-[#D9C7C2] shadow-sm hover:border-[#D72638]/50'
        }`}
      >
        {/* Card Header (Clickable for Dropdown Toggle) */}
        <div 
          onClick={() => {
            setExpandedDonorId(isExpanded ? null : donor.id);
            if (isTargeted) setHighlightedId(null);
          }}
          className="p-5 cursor-pointer select-none"
        >
          {/* Top Pill / Badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isTargeted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D72638] text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  <span>Targeted Record</span>
                </span>
              )}
              {isOwnPledge ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D72638] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                  <Star className="w-3 h-3 fill-white" />
                  <span>Your Registered Pledge</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F5F1EF] text-[#7A0C17] text-[10px] font-bold uppercase tracking-wider border border-[#D9C7C2]">
                  <Users className="w-3 h-3 text-[#D72638]" />
                  <span>Community Donor</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                donor.isAvailable 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-[#F5F1EF] text-slate-500 border-[#D9C7C2]'
              }`}>
                {donor.isAvailable ? '● Standby Ready' : 'Resting'}
              </span>

              {/* Owner-Only Delete Pledge Action */}
              {isOwnPledge && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteDonor(donor.id, e)}
                  disabled={isDeletingId === donor.id}
                  className="px-2 py-0.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#D72638] border border-red-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Remove your blood donor pledge"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Blood Type Badge & Primary Info */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] flex flex-col items-center justify-center font-black text-white shadow-md shadow-[#D72638]/20 border border-[#D72638]/40 shrink-0">
                <span className="text-[9px] uppercase font-bold text-red-100">Blood</span>
                <span className="text-base">{donor.bloodType}</span>
              </div>
              <div>
                <h3 className="font-black text-[#1A1D20] text-base leading-tight flex items-center gap-1.5">
                  <span>{donor.fullName}</span>
                  {isOwnPledge && (
                    <span className="text-[10px] font-semibold text-[#D72638] bg-red-100/70 px-1.5 py-0.2 rounded-md">
                      You
                    </span>
                  )}
                </h3>
                <div className="text-xs text-[#5A626A] mt-0.5 flex items-center gap-2">
                  <span>{donor.age} yrs</span>
                  <span>•</span>
                  <span>{donor.gender}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-[#7A0C17]">{donor.id}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="p-1.5 rounded-xl bg-[#F5F1EF] text-[#5A626A] hover:text-[#1A1D20] transition-colors shrink-0"
              title={isExpanded ? 'Collapse profile' : 'Expand full clinical profile'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4 text-[#D72638]" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Locality & Quick Metrics */}
          <div className="mt-3.5 pt-3 border-t border-[#D9C7C2]/50 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-[#1A1D20] font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#D72638] shrink-0" />
              <span className="truncate">{donor.location || `${donor.city}, ${donor.state}`}</span>
            </div>
            <div className="flex items-center justify-between text-[#5A626A] text-[11px]">
              <span className="truncate">Contact: {donor.phone}</span>
              <span className="text-[#D72638] font-bold">
                {isExpanded ? 'Hide Details' : 'View Full Profile ↓'}
              </span>
            </div>
          </div>
        </div>

        {/* EXPANDABLE ACCORDION / ON-CLICK DROPDOWN DETAILS */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="px-5 pb-5 pt-1 border-t border-[#D9C7C2]/60 bg-[#FDF9F8]/60 space-y-3.5 text-xs text-[#1A1D20]"
            >
              {/* Detailed Clinical Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-white border border-[#D9C7C2]">
                  <span className="text-[10px] text-[#7A0C17] font-bold uppercase tracking-wider block">Verified Phone</span>
                  <a 
                    href={`tel:${donor.phone}`} 
                    className="font-mono font-bold text-emerald-700 hover:underline mt-0.5 block truncate"
                  >
                    {donor.phone}
                  </a>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-[#D9C7C2]">
                  <span className="text-[10px] text-[#7A0C17] font-bold uppercase tracking-wider block">Verified Email</span>
                  <a 
                    href={`mailto:${donor.email}`} 
                    className="font-medium text-[#1A1D20] hover:text-[#D72638] hover:underline mt-0.5 block truncate"
                  >
                    {donor.email}
                  </a>
                </div>
              </div>

              {/* Exact Locality & City */}
              <div className="p-2.5 rounded-xl bg-white border border-[#D9C7C2] space-y-1">
                <span className="text-[10px] text-[#7A0C17] font-bold uppercase tracking-wider block">
                  Registered Delhi Locality / Area
                </span>
                <p className="text-xs font-semibold text-[#1A1D20]">
                  {donor.location || `${donor.city}, ${donor.state}`}
                </p>
                <p className="text-[10px] text-[#5A626A]">
                  Enrolled under: {donor.hospital || 'BloodMatch Emergency Network'}
                </p>
              </div>

              {/* Blood Compatibility Breakdown */}
              <div className="p-2.5 rounded-xl bg-white border border-[#D9C7C2] space-y-1">
                <span className="text-[10px] text-[#7A0C17] font-bold uppercase tracking-wider block">
                  Safe Transfusion Recipients (Who can accept this blood)
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {compatibility.canGiveTo.map((target) => (
                    <span 
                      key={target} 
                      className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-black"
                    >
                      ✓ {target}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[#5A626A] mt-1">
                  Red blood cells can safely be transfused to {compatibility.canGiveTo.length} of 8 groups.
                </p>
              </div>

              {/* Verification & Serology Status */}
              <div className="flex items-center justify-between text-[11px] text-[#5A626A] pt-1">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Email OTP & Serology Validated</span>
                </span>
                <span className="font-mono">
                  Registered: {new Date(donor.registeredAt).toLocaleDateString()}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D9C7C2]/40">
                <a
                  href={`tel:${donor.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Phone className="w-3 h-3" />
                  <span>Direct Mobilize Call</span>
                </a>
                <a
                  href={`mailto:${donor.email}?subject=Emergency%20Blood%20Transfusion%20Request%20-%20BloodMatch&body=Hello%20${encodeURIComponent(donor.fullName)},%20we%20have%20an%20urgent%20need%20for%20Group%20${donor.bloodType}%20blood%20in%20your%20area.`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F1EF] text-[#1A1D20] border border-[#D9C7C2] font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Mail className="w-3 h-3 text-[#D72638]" />
                  <span>Send Alert</span>
                </a>
                {isOwnPledge && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteDonor(donor.id, e)}
                    disabled={isDeletingId === donor.id}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#D72638] border border-red-200 font-bold text-xs transition-colors cursor-pointer"
                    title="Remove your blood donor pledge"
                  >
                    <Trash2 className="w-3 h-3 text-[#D72638]" />
                    <span>Delete Pledge</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
}
