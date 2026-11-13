import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { BloodType, Donor, BloodInventoryUnit } from '../types';
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
import { getDonors, saveDonors, deleteDonor as deleteDonorStorage, saveInventory, getInventory } from '../services/storage';
import { 
  fetchDonorsApi, 
  sendDonorOtpApi, 
  registerDonorApi, 
  deleteDonorApi,
  fetchSavedPhonesApi,
  saveUserPhoneApi,
  fetchVerifiedEmailsApi,
  saveUserVerifiedEmailApi
} from '../services/api';
import { 
  COUNTRY_CODES, 
  validatePhoneNumber, 
  validateEmail,
  parsePhoneNumberWithCountry,
  formatFullPhone
} from '../utils/countryCodes';
import { BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';
import { reverseGeocodeCoordinates } from '../utils/geolocation';
import ClinicalCallModal from './ClinicalCallModal';
import SendAlertModal, { TargetDonorSummary } from './SendAlertModal';

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
  const donorsRef = useRef<Donor[]>(donors);
  donorsRef.current = donors;
  const isFetchingRef = useRef<boolean>(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  // State for in-app Clinical Mobilize Call modal (eliminates native browser OS prompt)
  const [callModalTarget, setCallModalTarget] = useState<{
    contactName: string;
    phoneNumber: string;
    bloodType?: string;
    location?: string;
    roleOrContext?: string;
  } | null>(null);
  // State for in-app Send Alert modal (allows editing requester contact & phone while locking verified email)
  const [alertModalTarget, setAlertModalTarget] = useState<TargetDonorSummary | null>(null);
  // Multi-card independent expansion tracking via Set so opening one does not close others
  const [expandedDonorIds, setExpandedDonorIds] = useState<Set<string>>(() => new Set(highlightParam ? [highlightParam] : []));

  const toggleDonorExpanded = (id: string) => {
    setExpandedDonorIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Auto-scroll and highlight target donor when arriving via direct alert link or search
  useEffect(() => {
    if (highlightParam) {
      setHighlightedId(highlightParam);
      setExpandedDonorIds(prev => new Set(prev).add(highlightParam));
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(`donor-card-${highlightParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
      const unhighlightTimer = setTimeout(() => {
        setHighlightedId(null);
      }, 2500);
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(unhighlightTimer);
      };
    }
  }, [highlightParam]);

  // Modal lifecycle states: FORM -> OTP -> SUCCESS
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<'FORM' | 'OTP' | 'SUCCESS'>('FORM');

  // Form input states (Neutral zero-default state)
  const [fullName, setFullName] = useState('');
  const [bloodType, setBloodType] = useState<BloodType | ''>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Donor['gender'] | ''>('');
  // User account phone
  const userAccountPhone = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_phone') || localStorage.getItem('bloodmatch_user_phone') || '').trim()
    : '';

  // Current logged in clinician / account email
  const currentUserEmail = typeof window !== 'undefined'
    ? (sessionStorage.getItem('bloodmatch_user_email') || localStorage.getItem('bloodmatch_user_email') || '').trim().toLowerCase()
    : '';

  const initialParsedPhone = parsePhoneNumberWithCountry(userAccountPhone);
  const [countryDialCode, setCountryDialCode] = useState<string>(initialParsedPhone.dialCode || '+91');
  const [phone, setPhone] = useState(initialParsedPhone.number || '');
  const [email, setEmail] = useState('');
  const [phoneAnimate, setPhoneAnimate] = useState<boolean>(false);
  const [emailAnimate, setEmailAnimate] = useState<boolean>(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [location, setLocation] = useState('');
  const [detectedSuggestions, setDetectedSuggestions] = useState<string[]>([]);
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [contactShareConsent, setContactShareConsent] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [donorToDelete, setDonorToDelete] = useState<Donor | null>(null);

  // Geolocation detector states
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationDetectionSuccess, setLocationDetectionSuccess] = useState<boolean>(false);

  // OTP Verification states
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState<boolean>(false);
  const [isSubmittingDirect, setIsSubmittingDirect] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [donorOtpExpirySeconds, setDonorOtpExpirySeconds] = useState<number>(600); // 10 minutes exact
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Saved phone numbers for instant click-to-fill & cross-device sync
  const [savedPhones, setSavedPhones] = useState<string[]>(() => {
    try {
      const userKey = `bloodmatch_saved_phones_${currentUserEmail || 'default'}`;
      const stored = localStorage.getItem(userKey);
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];
      if (userAccountPhone && !list.includes(userAccountPhone)) {
        list.unshift(userAccountPhone);
      }
      return list;
    } catch {
      return userAccountPhone ? [userAccountPhone] : [];
    }
  });

  // Persistent verified emails memory
  const [verifiedEmails, setVerifiedEmails] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('bloodmatch_verified_emails');
      const list = stored ? JSON.parse(stored) : [];
      const cleanList = Array.isArray(list) ? list.map((e: string) => e.toLowerCase().trim()) : [];
      if (currentUserEmail && !cleanList.includes(currentUserEmail)) {
        cleanList.unshift(currentUserEmail);
      }
      return cleanList;
    } catch {
      return currentUserEmail ? [currentUserEmail] : [];
    }
  });

  // Cross-device sync hydration from backend
  useEffect(() => {
    if (currentUserEmail) {
      fetchSavedPhonesApi(currentUserEmail).then(res => {
        if (res.ok && res.data && Array.isArray(res.data.saved_phones)) {
          const fetchedPhones = res.data.saved_phones;
          setSavedPhones(prev => {
            const combined = [...fetchedPhones];
            prev.forEach(p => { if (!combined.includes(p)) combined.push(p); });
            try {
              localStorage.setItem(`bloodmatch_saved_phones_${currentUserEmail}`, JSON.stringify(combined));
            } catch { }
            return combined;
          });
        }
      }).catch(() => {});

      fetchVerifiedEmailsApi(currentUserEmail).then(res => {
        if (res.ok && res.data && Array.isArray(res.data.verified_emails)) {
          const fetchedEmails = res.data.verified_emails;
          setVerifiedEmails(prev => {
            const combined = [...fetchedEmails];
            prev.forEach(e => { if (!combined.includes(e)) combined.push(e); });
            try {
              localStorage.setItem('bloodmatch_verified_emails', JSON.stringify(combined));
            } catch { }
            return combined;
          });
        }
      }).catch(() => {});
    }
  }, [currentUserEmail]);

  // Click-to-fill phone with smooth pulse animation
  const handleSelectPhone = (phoneStr: string) => {
    const parsed = parsePhoneNumberWithCountry(phoneStr);
    setCountryDialCode(parsed.dialCode);
    setPhone(parsed.number);
    if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
    setPhoneAnimate(true);
    setTimeout(() => setPhoneAnimate(false), 1600);
  };

  // Save phone to state, localStorage, and backend
  const saveCustomPhone = (phoneStr: string) => {
    const clean = phoneStr.trim();
    if (!clean) return;
    setSavedPhones(prev => {
      if (prev.includes(clean)) return prev;
      const updated = [...prev, clean];
      try {
        localStorage.setItem(`bloodmatch_saved_phones_${currentUserEmail || 'default'}`, JSON.stringify(updated));
      } catch { }
      return updated;
    });
    saveUserPhoneApi(clean, currentUserEmail).catch(() => {});
  };

  // Click-to-fill verified email with smooth pulse animation
  const handleSelectVerifiedEmail = (emailStr: string) => {
    setEmail(emailStr.trim());
    if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
    setEmailAnimate(true);
    setTimeout(() => setEmailAnimate(false), 1600);
  };

  // Save verified email to state, localStorage, and backend
  const saveVerifiedEmail = (em: string) => {
    const clean = em.trim().toLowerCase();
    if (!clean) return;
    setVerifiedEmails(prev => {
      if (prev.includes(clean)) return prev;
      const updated = [...prev, clean];
      try {
        localStorage.setItem('bloodmatch_verified_emails', JSON.stringify(updated));
      } catch { }
      return updated;
    });
    saveUserVerifiedEmailApi(clean, currentUserEmail).catch(() => {});
  };

  const isEmailVerified = Boolean(
    email.trim() && (
      (currentUserEmail && email.trim().toLowerCase() === currentUserEmail) ||
      verifiedEmails.includes(email.trim().toLowerCase())
    )
  );

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Fast structural equality check to prevent needless re-renders & blinking
  const areDonorsIdentical = (a: Donor[], b: Donor[]): boolean => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const da = a[i];
      const db = b[i];
      if (
        da.id !== db.id ||
        da.fullName !== db.fullName ||
        da.bloodType !== db.bloodType ||
        da.phone !== db.phone ||
        da.email !== db.email ||
        da.user_email !== db.user_email ||
        da.isAvailable !== db.isAvailable ||
        da.unitsDonatedTotal !== db.unitsDonatedTotal ||
        da.location !== db.location
      ) {
        return false;
      }
    }
    return true;
  };

  // Global cross-device sync & local cache loader
  const loadDonors = async (force: boolean = false) => {
    // 1. Initial local cache presentation on cold start only
    if (donorsRef.current.length === 0) {
      const cached = getDonors();
      if (cached && cached.length > 0) {
        donorsRef.current = cached;
        setDonors(cached);
      }
    }

    // Guard against concurrent overlapping requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

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

        if (force || !areDonorsIdentical(donorsRef.current, mapped)) {
          donorsRef.current = mapped;
          setDonors(mapped);
          saveDonors(mapped, false);
          saveInventory(getInventory(), false);
        }
      }
    } catch {
      // Quiet background fallback to cached state
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadDonors(true);

    // Cross-tab real-time sync via browser native storage event
    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key.includes('bloodmatch_donors') || e.key.includes('bloodmatch_inventory')) {
        loadDonors();
      }
    };
    window.addEventListener('storage', handleStorageUpdate);

    const handleCustomUpdate = () => loadDonors();
    window.addEventListener('bloodmatch_donors_updated', handleCustomUpdate);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadDonors();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Real-Time cross-device sync polling (4-second cadence on active tab)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadDonors();
      }
    }, 4000);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('bloodmatch_donors_updated', handleCustomUpdate);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
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

  // Browser Geolocation Detector (Worldwide with Instant 1-Click Permissions & Positioning)
  const handleDetectLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setFormErrors(prev => ({
        ...prev,
        location: 'Geolocation is not supported by your browser. Please enter your locality manually.',
      }));
      return;
    }

    setIsDetectingLocation(true);
    setLocationDetectionSuccess(false);

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permissionStatus.state === 'denied') {
          setIsDetectingLocation(false);
          setFormErrors(prev => ({
            ...prev,
            location: 'Location access is blocked in your browser settings. Please allow location permissions or enter your locality manually.',
          }));
          return;
        }
      }
    } catch {
      // Permission query not supported on older browsers, proceed to navigator.geolocation
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const geo = await reverseGeocodeCoordinates(latitude, longitude);
          setLocation(geo.primaryLocality);
          setCity(geo.city || (geo.primaryLocality.split(',')[1]?.trim()) || '');
          setState(geo.state || (geo.primaryLocality.split(',')[2]?.trim()) || '');
          setDetectedSuggestions(geo.nearestPills || []);
          setLocationDetectionSuccess(true);
          setFormErrors(prev => ({ ...prev, location: '', city: '' }));
        } catch {
          const fallbackLoc = `GPS Area (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`;
          setLocation(fallbackLoc);
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
          location: err.code === 1
            ? 'Location permission was denied. Please allow access in your browser or enter your locality manually.'
            : 'Unable to retrieve GPS coordinates. Please enter your locality manually.',
        }));
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setModalStep('FORM');
    setFormErrors({});
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setDevOtp(null);
    setBloodType('');
    setAge('');
    setGender('');
    setFullName('');
    setPhone('');
    setEmail('');
    setLocation('');
    setCity('');
    setState('');
    setDetectedSuggestions([]);
    setLocationDetectionSuccess(false);
    setConsentChecked(false);
    setContactShareConsent(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Full legal name is required (at least 2 characters)';
    }

    if (!bloodType) {
      errors.bloodType = 'Please select a blood group';
    }

    if (!gender) {
      errors.gender = 'Please select biological gender';
    }

    if (!age || Number(age) < 18 || Number(age) > 65) {
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
      errors.location = 'Specific locality or area is required (e.g. Area, Suburb, or City)';
    }

    if (!city.trim()) {
      errors.city = 'City is required for localized donor dispatch';
    }

    if (!consentChecked) {
      errors.consent = 'You must declare voluntary donor eligibility criteria to proceed';
    }

    if (!contactShareConsent) {
      errors.contactShare = 'Please agree to share your contact details so callers can reach you in emergencies';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Direct registration handler for pre-verified contact emails (zero OTP required)
  const handleRegisterDirectly = async () => {
    if (!validateForm()) return;
    setIsSubmittingDirect(true);
    setFormErrors({});

    try {
      const res = await registerDonorApi({
        name: fullName.trim(),
        blood_type: bloodType as BloodType,
        phone: `${countryDialCode} ${phone.trim()}`,
        email: email.trim().toLowerCase(),
        city: city.trim(),
        location: location.trim(),
        hospital: 'BloodMatch Emergency Network',
        age: Number(age),
        gender: gender as Donor['gender'],
        user_email: currentUserEmail || email.trim().toLowerCase(),
        otp_code: '', // Verified account bypass
      });

      if (res.ok && res.data) {
        saveCustomPhone(`${countryDialCode} ${phone.trim()}`);
        saveVerifiedEmail(email);
        setModalStep('SUCCESS');
        await loadDonors();
      } else {
        setFormErrors(prev => ({
          ...prev,
          email: res.error || 'Failed to complete registration. Please check your credentials.',
        }));
      }
    } catch {
      setFormErrors(prev => ({
        ...prev,
        email: 'Network error during donor registration. Please try again.',
      }));
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  // Form submit -> initiates Email OTP Verification or directly registers if already verified
  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmailVerified) {
      await handleRegisterDirectly();
      return;
    }

    if (!validateForm()) return;

    setIsSendingOtp(true);
    setOtpError('');
    setDevOtp(null);

    try {
      const res = await sendDonorOtpApi(email.trim().toLowerCase(), fullName.trim());
      if (res.ok) {
        if (res.data?.dev_otp) {
          setDevOtp(res.data.dev_otp);
        }
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
        if (res.data?.dev_otp) {
          setDevOtp(res.data.dev_otp);
        }
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
        blood_type: bloodType as BloodType,
        phone: `${countryDialCode} ${phone.trim()}`,
        email: email.trim().toLowerCase(),
        city: city.trim(),
        location: location.trim(),
        hospital: 'BloodMatch Emergency Network',
        age: Number(age),
        gender: gender as Donor['gender'],
        user_email: currentUserEmail || email.trim().toLowerCase(),
        otp_code: code,
      });

      if (res.ok && res.data) {
        // Successful registration & verification - save phone & email!
        saveCustomPhone(`${countryDialCode} ${phone.trim()}`);
        saveVerifiedEmail(email);
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
    setBloodType('');
    setAge('');
    setGender('');
    const parsed = parsePhoneNumberWithCountry(userAccountPhone);
    setCountryDialCode(parsed.dialCode || '+91');
    setPhone(parsed.number || '');
    setEmail('');
    setLocation('');
    setCity('');
    setState('');
    setDetectedSuggestions([]);
    setLocationDetectionSuccess(false);
    setConsentChecked(false);
    setContactShareConsent(false);
    setFormErrors({});
    setIsOpenModal(false);
    setModalStep('FORM');
    setOtpDigits(['', '', '', '', '', '']);
    setDevOtp(null);
  };

  // Owner-Only Donor Deletion Modal Trigger
  const handleOpenDeleteModal = (donor: Donor, e: React.MouseEvent) => {
    e.stopPropagation();
    setDonorToDelete(donor);
  };

  // Confirmed Donor Deletion Executor (Zero deletion notification dispatched)
  const handleConfirmDelete = async () => {
    if (!donorToDelete) return;
    const donorId = donorToDelete.id;
    setIsDeletingId(donorId);
    try {
      const effectiveEmail = currentUserEmail || donorToDelete.user_email || donorToDelete.email || '';
      const res = await deleteDonorApi(donorId, effectiveEmail);
      if (res.ok && res.data?.inventory) {
        const mappedInv: BloodInventoryUnit[] = res.data.inventory.map((item: any) => ({
          id: item.id || `INV-${item.blood_type}`,
          bloodType: (item.blood_type || item.bloodType) as BloodType,
          unitsAvailable: item.units_available ?? 0,
          storageFacility: 'Central Blood Bank',
          lastTestedDate: item.last_tested_date || new Date().toISOString().split('T')[0],
          status: item.status || 'critical',
          temperatureCelsius: item.temperature_celsius ?? 4.0,
        }));
        saveInventory(mappedInv);
      }
      deleteDonorStorage(donorId);
      setDonors(prev => prev.filter(d => d.id !== donorId));
      setExpandedDonorIds(prev => { const n = new Set(prev); n.delete(donorId); return n; });
      saveInventory(getInventory());
      window.dispatchEvent(new CustomEvent('bloodmatch_inventory_updated'));
      window.dispatchEvent(new CustomEvent('bloodmatch_donors_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      deleteDonorStorage(donorId);
      setDonors(prev => prev.filter(d => d.id !== donorId));
      saveInventory(getInventory());
      window.dispatchEvent(new CustomEvent('bloodmatch_inventory_updated'));
      window.dispatchEvent(new CustomEvent('bloodmatch_donors_updated'));
    } finally {
      setIsDeletingId(null);
      setDonorToDelete(null);
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
    <div className="space-y-6 sm:space-y-8 pb-2 sm:pb-3 relative z-10">
      {/* Header */}
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
            <span>Volunteer Donor Community</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Volunteer Blood Donor Registry
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-xl">
            Find and contact verified volunteer donors near you by blood group and location.
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
        className="p-5 sm:p-6 rounded-2xl bg-white border border-[#D9C7C2] shadow-sm overflow-hidden"
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
              <span>Active Volunteer Donors</span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white pointer-events-none">
              <div>
                <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Registered Donors</span>
                <span className="text-sm font-black font-mono">{donors.length} Verified Volunteers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Delhi Metro Active</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {donors.filter(d => d.city.toLowerCase().includes('delhi') || (d.location && d.location.toLowerCase().includes('delhi'))).length} Ready
                  </span>
                </div>
                <div className="text-right border-l border-white/20 pl-3">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Safety Protocol</span>
                  <span className="text-sm font-black text-white font-mono">Standard 4.2</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/20 mb-2">
                <Activity className="w-3.5 h-3.5 text-[#D72638]" />
                <span>Donor Community</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#1A1D20] tracking-tight">
                Registered Blood Donors
              </h2>
              <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                Directory of verified voluntary blood donors ready to help during hospital transfusion emergencies.
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
        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#D9C7C2] shadow-xs flex flex-col md:flex-row gap-3.5 items-center justify-between"
      >
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, locality, phone, blood group..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F5F1EF] hover:bg-white focus:bg-white border border-[#D9C7C2] focus:border-[#D72638] text-xs text-[#1A1D20] placeholder-slate-400 outline-hidden shadow-2xs transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto py-0.5">
          {['ALL', ...bloodTypes].map(bt => (
            <button
              key={bt}
              onClick={() => setSelectedFilter(bt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${selectedFilter === bt
                  ? 'bg-[#D72638] text-white shadow-md shadow-[#D72638]/30 scale-105'
                  : 'bg-[#F5F1EF] hover:bg-white text-[#4A5568] hover:text-[#1A1D20] border border-[#D9C7C2]'
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
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-[#D72638] text-white shadow-xs shrink-0">
                <Star className="w-4 h-4 fill-white" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1A1D20] tracking-tight truncate">
                Your Registered Blood Pledges ({myPledges.length})
              </h2>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold font-mono px-3 py-1 rounded-full bg-white text-[#7A0C17] border border-[#D9C7C2] shadow-2xs truncate self-start sm:self-auto max-w-full">
              Active Account: {currentUserEmail}
            </span>
          </div>

          {myPledges.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white border border-[#D9C7C2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F1EF] border border-[#D72638]/30 flex items-center justify-center text-[#D72638] shrink-0 shadow-xs">
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
            <div className="flex flex-col gap-3.5 w-full">
              {myPledges.map((donor) => renderDonorCard(donor, true))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 2: VERIFIED COMMUNITY DONORS (NETWORK DIRECTORY)
          ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#1A1D20] text-white shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#1A1D20] tracking-tight">
              Verified Community Donors ({communityDonors.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#5A626A] bg-white px-3 py-1 rounded-full border border-[#D9C7C2] shadow-2xs">
            Showing {filteredDonors.length} total matches
          </span>
        </div>

        {communityDonors.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white border-2 border-dashed border-[#D9C7C2] shadow-xs">
            <Heart className="w-10 h-10 text-[#D72638]/40 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#1A1D20]">No community donors found</h3>
            <p className="text-xs text-[#5A626A] mt-1 max-w-sm mx-auto">
              {search || selectedFilter !== 'ALL'
                ? 'Try adjusting your blood group filter or search query.'
                : 'Zero community donors registered. Click "Register New Donor" to register the first donor.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 w-full">
            {communityDonors.map((donor) => renderDonorCard(donor, false))}
          </div>
        )}
      </div>

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
                        Enroll prospective donor with verified contact channels, geolocation, and secure email OTP verification.
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
                          className={`w-full px-3 py-2 rounded-xl bg-white border ${formErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
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
                            onChange={(e) => {
                              setBloodType(e.target.value as BloodType);
                              if (formErrors.bloodType) setFormErrors(prev => ({ ...prev, bloodType: '' }));
                            }}
                            className={`w-full px-3 py-2 rounded-xl bg-white border ${formErrors.bloodType ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                              } text-xs text-[#1A1D20] font-bold outline-hidden focus:border-[#D72638] cursor-pointer`}
                          >
                            <option value="" disabled>Select Blood Group</option>
                            {bloodTypes.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          {formErrors.bloodType && (
                            <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.bloodType}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                            Biological Gender <span className="text-[#D72638]">*</span>
                          </label>
                          <select
                            value={gender}
                            onChange={(e) => {
                              setGender(e.target.value as Donor['gender']);
                              if (formErrors.gender) setFormErrors(prev => ({ ...prev, gender: '' }));
                            }}
                            className={`w-full px-3 py-2 rounded-xl bg-white border ${formErrors.gender ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                              } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] cursor-pointer`}
                          >
                            <option value="" disabled>Select Gender</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                          {formErrors.gender && (
                            <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.gender}</p>
                          )}
                        </div>
                      </div>

                      {/* Age */}
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                          Age (18 - 65) <span className="text-[#D72638]">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          autoComplete="off"
                          value={age}
                          placeholder="e.g. 28"
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            const clean = raw.replace(/^0+/, '');
                            setAge(clean);
                            if (formErrors.age) setFormErrors(prev => ({ ...prev, age: '' }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl bg-white border ${formErrors.age ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
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
                            className={`w-full px-3 py-2 rounded-xl bg-white border ${formErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                              } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-all duration-300 ${
                                phoneAnimate ? 'ring-2 ring-emerald-500 bg-emerald-50/60 scale-[1.01]' : ''
                              }`}
                          />
                        </div>
                        {savedPhones.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[#7A0C17] uppercase tracking-wider">Saved Numbers:</span>
                            {savedPhones.map((p, idx) => (
                              <button
                                key={p + idx}
                                type="button"
                                onClick={() => handleSelectPhone(p)}
                                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F5F1EF] hover:bg-emerald-50 border border-[#D9C7C2] hover:border-emerald-300 text-[11px] font-medium text-[#1A1D20] hover:text-emerald-900 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                title="Click to fill into phone field"
                              >
                                <Phone className="w-2.5 h-2.5 text-[#D72638] group-hover:text-emerald-600 transition-colors" />
                                <span className="font-mono">{p}</span>
                                <span className="text-[9px] px-1 rounded bg-white text-slate-500 font-mono">
                                  {idx === 0 ? 'Account' : `Saved #${idx + 1}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {formErrors.phone && (
                          <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.phone}</p>
                        )}
                      </div>

                      {/* Email Address */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-[#1A1D20]">
                            Email Address {isEmailVerified ? '(Verified)' : '(Requires OTP)'} <span className="text-[#D72638]">*</span>
                          </label>
                          {isEmailVerified && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified Contact (No OTP required)
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                          }}
                          placeholder="donor@example.com"
                          className={`w-full px-3 py-2 rounded-xl bg-white border ${formErrors.email ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                            } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-all duration-300 ${
                              emailAnimate ? 'ring-2 ring-emerald-500 bg-emerald-50/60 scale-[1.01]' : ''
                            }`}
                        />
                        {currentUserEmail && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectVerifiedEmail(currentUserEmail)}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-300 hover:border-emerald-500 text-emerald-900 text-xs font-medium transition-all shadow-2xs hover:scale-102 active:scale-98 cursor-pointer"
                              title="Click to fill verified account email into the field"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Verified Account Email: <strong className="font-semibold underline decoration-emerald-400">{currentUserEmail}</strong></span>
                              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded-md font-bold text-emerald-700 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                Auto-fill
                              </span>
                            </button>
                          </div>
                        )}
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
                          <span>2. Geolocation & Area Verification</span>
                        </div>

                        {/* Geolocation Input & Popular Localities */}
                        <div className="p-3.5 rounded-2xl bg-white border border-[#D9C7C2] space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-[#1A1D20] flex items-center gap-1.5">
                              <span>Exact Locality / Area <span className="text-[#D72638]">*</span></span>
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
                            placeholder="e.g. Area, Suburb, District (or click Detect My Location)"
                            className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${formErrors.location ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
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

                          {/* Dynamic Nearby Locality Suggestions (Shown ONLY after detecting location) */}
                          {detectedSuggestions.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[10px] font-bold text-[#7A0C17] uppercase tracking-wider block mb-1">
                                Nearby Locality Suggestions:
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar py-0.5">
                                {detectedSuggestions.map((loc) => (
                                  <button
                                    key={loc}
                                    type="button"
                                    onClick={() => {
                                      setLocation(loc);
                                      if (formErrors.location) setFormErrors(prev => ({ ...prev, location: '' }));
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${location.toLowerCase().includes(loc.toLowerCase())
                                        ? 'bg-[#D72638] text-white shadow-2xs'
                                        : 'bg-[#F5F1EF] hover:bg-red-50 text-[#5A626A] border border-[#D9C7C2]'
                                      }`}
                                  >
                                    {loc}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
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
                              placeholder="e.g. New Delhi, Mumbai, London"
                              className={`w-full px-3 py-2 rounded-xl bg-white border ${formErrors.city ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
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
                              placeholder="e.g. Delhi, Maharashtra, England"
                              className="w-full px-3 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                            />
                          </div>
                        </div>

                        {/* Donor Health & Eligibility Declaration Checkbox */}
                        <div className={`p-3 rounded-xl border transition-colors ${
                          formErrors.consent ? 'bg-red-50/80 border-red-300' : 'bg-amber-50/70 border-amber-200/80'
                        }`}>
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
                            <div className="text-[11px] leading-relaxed">
                              <span className="font-bold text-[#1A1D20] block mb-0.5">
                                Donor Health &amp; Eligibility Declaration <span className="text-[#D72638]">*</span>
                              </span>
                              <span className="text-[#5A626A] block">
                                I certify that I am between 18–65 years old, weigh at least 45kg, am in good health, and voluntarily register as an emergency blood donor.
                              </span>
                            </div>
                          </label>
                          {formErrors.consent && (
                            <p className="text-red-500 text-[11px] font-semibold mt-1.5 ml-6">{formErrors.consent}</p>
                          )}
                        </div>

                        {/* Public Phone Number & Contact Sharing Consent Checkbox */}
                        <div className={`p-3 rounded-xl border transition-colors ${
                          formErrors.contactShare ? 'bg-red-50/80 border-red-300' : 'bg-emerald-50/70 border-emerald-200/80'
                        }`}>
                          <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={contactShareConsent}
                              onChange={(e) => {
                                setContactShareConsent(e.target.checked);
                                if (formErrors.contactShare) setFormErrors(prev => ({ ...prev, contactShare: '' }));
                              }}
                              className="mt-0.5 w-4 h-4 rounded-sm border-[#D9C7C2] text-[#D72638] focus:ring-[#D72638] cursor-pointer shrink-0"
                            />
                            <div className="text-[11px] leading-relaxed">
                              <span className="font-bold text-[#1A1D20] block mb-0.5">
                                Phone Number &amp; Contact Sharing Consent <span className="text-[#D72638]">*</span>
                              </span>
                              <span className="text-[#5A626A] block">
                                I agree to share my phone number and contact details publicly on this donor directory so that patients, clinicians, and hospitals in urgent need of blood can call me directly.
                              </span>
                            </div>
                          </label>
                          {formErrors.contactShare && (
                            <p className="text-red-500 text-[11px] font-semibold mt-1.5 ml-6">{formErrors.contactShare}</p>
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
                        {isEmailVerified ? (
                          <button
                            type="button"
                            onClick={handleRegisterDirectly}
                            disabled={isSubmittingDirect}
                            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isSubmittingDirect && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{isSubmittingDirect ? 'Registering Pledge...' : 'Confirm & Register Pledge'}</span>
                            {!isSubmittingDirect && <ArrowRight className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={isSendingOtp}
                            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isSendingOtp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{isSendingOtp ? 'Sending Verification OTP...' : 'Verify Email & Pledge'}</span>
                            {!isSendingOtp && <ArrowRight className="w-3.5 h-3.5" />}
                          </button>
                        )}
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
                        {bloodType || 'Pending'}
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-[#1A1D20]">
                          {fullName || 'Prospective Donor'}
                        </div>
                        <div className="text-xs text-[#5A626A]">
                          {gender || 'Donor'} • {age || '--'} Years • {city || 'Locality'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#D9C7C2]/50 space-y-1.5 text-xs text-[#5A626A]">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Locality:</span>
                        <span className="font-semibold text-[#1A1D20] truncate max-w-[200px]">{location || 'Area'}</span>
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

                    {/* Development / Gateway Fallback Helper */}
                    {devOtp && (
                      <div
                        onClick={() => {
                          const digits = devOtp.split('').slice(0, 6);
                          setOtpDigits(digits);
                          otpInputRefs.current[5]?.focus();
                        }}
                        className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-mono flex items-center justify-between cursor-pointer hover:bg-amber-100/80 transition-colors"
                        title="Click to auto-fill code"
                      >
                        <span className="flex items-center gap-1.5 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Code: {devOtp}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold text-amber-700 underline">Auto-fill</span>
                      </div>
                    )}
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
                            className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl text-center text-xl font-mono font-black border transition-all duration-200 outline-hidden ${otpError
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
                        className={`font-semibold cursor-pointer ${resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#D72638] hover:underline'
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
          targetDonor={alertModalTarget}
        />
      )}

      {/* Custom Branded Delete Pledge Confirmation Modal */}
      {donorToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => { if (!isDeletingId) setDonorToDelete(null); }}
        >
          <div 
            className="relative w-full max-w-md bg-[#FAF7F5] rounded-3xl border border-[#D9C7C2] shadow-2xl p-6 text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Trash Icon + Close Button */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 text-[#D72638] flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-6 h-6 text-[#D72638]" />
              </div>
              <button
                type="button"
                onClick={() => { if (!isDeletingId) setDonorToDelete(null); }}
                disabled={Boolean(isDeletingId)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-[#5A626A] hover:text-[#1A1D20] flex items-center justify-center border border-[#D9C7C2] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Body */}
            <div>
              <h3 className="text-lg font-extrabold text-[#1A1D20]">
                Remove Blood Donor Pledge?
              </h3>
              <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                Are you sure you want to remove your voluntary blood donor pledge from the active registry? This will immediately remove your availability from the donor directory and update the reserve.
              </p>
            </div>

            {/* Target Donor Summary Card */}
            <div className="p-3 rounded-2xl bg-white border border-[#D9C7C2] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-[#D72638] font-black text-sm flex items-center justify-center shrink-0 font-mono">
                {donorToDelete.bloodType}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#1A1D20] truncate">
                  {donorToDelete.fullName}
                </div>
                <div className="text-[10px] text-[#5A626A] truncate">
                  {donorToDelete.location || donorToDelete.city} • {donorToDelete.phone}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D9C7C2]/60">
              <button
                type="button"
                onClick={() => setDonorToDelete(null)}
                disabled={Boolean(isDeletingId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A626A] hover:text-[#1A1D20] hover:bg-[#F5F1EF] border border-[#D9C7C2] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(isDeletingId)}
                className="px-5 py-2 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
              >
                {isDeletingId ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Remove Pledge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Helper component function to render an interactive donor card
   * with priority styling and on-click expandable dropdown details
   */
  function renderDonorCard(donor: Donor, isOwnPledge: boolean) {
    const isExpanded = expandedDonorIds.has(donor.id);
    const isTargeted = highlightedId === donor.id;
    const compatibility = BLOOD_COMPATIBILITY_TABLE[donor.bloodType];
    const isSelfDonor = isOwnPledge || Boolean(
      currentUserEmail && (
        (donor.email && donor.email.trim().toLowerCase() === currentUserEmail) ||
        (donor.user_email && donor.user_email.trim().toLowerCase() === currentUserEmail)
      )
    );

    return (
      <div
        id={`donor-card-${donor.id}`}
        key={donor.id}
        className={`rounded-2xl transition-all duration-300 overflow-hidden w-full ${isTargeted
            ? 'ring-4 ring-[#D72638] border-2 border-[#D72638] shadow-2xl shadow-[#D72638]/25 scale-[1.005] bg-white animate-pulse'
            : isSelfDonor
              ? 'bg-white border-2 border-[#D72638] shadow-md shadow-[#D72638]/10'
              : 'bg-white border border-[#D9C7C2] shadow-xs hover:border-[#D72638]/50 hover:shadow-sm'
          }`}
      >
        {/* Card Header (Full-Width Horizontal Bar on One Line) */}
        <div
          onClick={() => {
            toggleDonorExpanded(donor.id);
            if (isTargeted) setHighlightedId(null);
          }}
          className="p-4 sm:p-5 cursor-pointer select-none flex flex-col md:flex-row md:items-center justify-between gap-3.5"
        >
          {/* Left: Blood Badge & Primary Clinical Identity */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] flex flex-col items-center justify-center font-black text-white shadow-xs border border-[#D72638]/40 shrink-0">
              <span className="text-[8px] uppercase font-bold text-red-100">Blood</span>
              <span className="text-base">{donor.bloodType}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-[#1A1D20] text-base leading-tight truncate">
                  {donor.fullName}
                </h3>
                {isOwnPledge && (
                  <span className="text-[10px] font-bold text-white bg-[#D72638] px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                    You
                  </span>
                )}
                {isTargeted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D72638] text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-xs shrink-0">
                    <Sparkles className="w-3 h-3" />
                    <span>Targeted</span>
                  </span>
                )}
                <span className="font-mono text-xs text-[#7A0C17] bg-[#7A0C17]/10 px-2 py-0.5 rounded-md font-bold shrink-0">
                  {donor.id}
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${donor.isAvailable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-[#F5F1EF] text-slate-500 border-[#D9C7C2]'
                  }`}>
                  {donor.isAvailable ? '● Standby Ready' : 'Resting'}
                </span>
              </div>

              <div className="text-xs text-[#5A626A] mt-1 flex items-center gap-2 flex-wrap">
                <span>{donor.age} yrs</span>
                <span>•</span>
                <span>{donor.gender}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-[#1A1D20]">
                  <MapPin className="w-3.5 h-3.5 text-[#D72638] shrink-0" />
                  <span className="truncate">{donor.location || `${donor.city}, ${donor.state}`}</span>
                </span>
                <span>•</span>
                <span className="font-mono text-slate-600">Contact: {donor.phone}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions & Expand Button */}
          <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
            {isOwnPledge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDeleteModal(donor, e);
                }}
                disabled={isDeletingId === donor.id}
                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#D72638] border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Remove your blood donor pledge"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Pledge</span>
              </button>
            )}

            <button
              type="button"
              className="py-1.5 px-3.5 rounded-xl bg-[#F5F1EF] hover:bg-slate-200 text-[#1A1D20] text-xs font-bold transition-all flex items-center gap-1.5 border border-[#D9C7C2] cursor-pointer"
            >
              <span>{isExpanded ? 'Hide Details' : 'View Full Profile'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#D72638]" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* EXPANDABLE ACCORDION / ON-CLICK DROPDOWN DETAILS WITH ANIMATION AND BLUR EFFECT */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0, filter: 'blur(8px)' }}
              animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)' }}
              exit={{ height: 0, opacity: 0, filter: 'blur(8px)' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="px-5 pb-5 pt-3 border-t border-[#D9C7C2] bg-[#FDF9F8] space-y-3.5 text-xs text-[#1A1D20]"
            >
              {/* Detailed Clinical Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white border border-[#D9C7C2]">
                  <span className="text-[10px] text-[#7A0C17] font-bold uppercase tracking-wider block">Verified Phone</span>
                  <button
                    type="button"
                    onClick={() => setCallModalTarget({
                      contactName: donor.fullName,
                      phoneNumber: donor.phone,
                      bloodType: donor.bloodType,
                      location: donor.location || `${donor.city}, ${donor.state}`,
                      roleOrContext: `Voluntary Blood Donor (Group ${donor.bloodType})`
                    })}
                    className="font-mono font-bold text-emerald-700 hover:underline mt-0.5 block truncate text-left cursor-pointer"
                  >
                    {donor.phone}
                  </button>
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
                  Registered Locality / Area
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

              {/* Action Buttons: If own pledge, NEVER show self-call or self-alert buttons! */}
              <div className="pt-2 border-t border-[#D9C7C2]/40">
                {isSelfDonor ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>You are registered as a Standby Voluntary Donor for Group <strong>{donor.bloodType}</strong>. In the event of a matching emergency transfusion demand in your area, attending clinicians will mobilize you.</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleOpenDeleteModal(donor, e)}
                      disabled={isDeletingId === donor.id}
                      className="self-end sm:self-center px-3.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-[#D72638] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Pledge</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCallModalTarget({
                        contactName: donor.fullName,
                        phoneNumber: donor.phone,
                        bloodType: donor.bloodType,
                        location: donor.location || `${donor.city}, ${donor.state}`,
                        roleOrContext: `Voluntary Blood Donor (Group ${donor.bloodType})`
                      })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Direct Mobilize Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertModalTarget({
                        id: donor.id,
                        fullName: donor.fullName,
                        email: donor.email,
                        phone: donor.phone,
                        bloodType: donor.bloodType,
                        location: donor.location || `${donor.city}, ${donor.state}`,
                      })}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#F5F1EF] text-[#1A1D20] border border-[#D9C7C2] font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Mail className="w-3 h-3 text-[#D72638]" />
                      <span>Send Alert</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
}
