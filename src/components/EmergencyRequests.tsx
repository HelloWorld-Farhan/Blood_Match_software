import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { BloodType, EmergencyRequest, UrgencyLevel, Donor } from '../types';
import { 
  AlertTriangle, 
  Plus, 
  CheckCircle, 
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
  ArrowRight 
} from 'lucide-react';
import { 
  getEmergencyRequests, 
  saveEmergencyRequests, 
  getDonors, 
  saveDonors 
} from '../services/storage';
import { 
  fetchEmergencyRequestsApi, 
  createEmergencyRequestApi, 
  fetchDonorsApi, 
  dispatchEmergencyDonorApi, 
  emailEmergencyRosterApi 
} from '../services/api';
import { COUNTRY_CODES, validatePhoneNumber } from '../utils/countryCodes';
import { 
  Coordinates, 
  DELHI_LOCALITY_NAMES, 
  calculateHaversineDistance, 
  resolveCoordinatesForLocation, 
  getCompatibleDonorTypes, 
  getProximityTier 
} from '../utils/geolocation';
import { 
  generateEmergencyDonorDocketPdf, 
  RankedDonorItem 
} from '../utils/docketPdfGenerator';

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

export default function EmergencyRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  // Clinician context
  const currentUserEmail = useMemo(() => {
    return sessionStorage.getItem('bloodmatch_user_email') || 
           localStorage.getItem('bloodmatch_user_email') || 
           'clinician@bloodmatch.org';
  }, []);

  const currentUserName = useMemo(() => {
    return sessionStorage.getItem('bloodmatch_user_name') || 
           localStorage.getItem('bloodmatch_user_name') || 
           'Attending Trauma Clinician';
  }, []);

  // Modal Workflow Phase: 'INPUT' | 'SCANNING' | 'RESULTS'
  const [modalPhase, setModalPhase] = useState<'INPUT' | 'SCANNING' | 'RESULTS'>('INPUT');
  const [scanStepIndex, setScanStepIndex] = useState(0);

  // Form states (Hospital & Clinical Indication/Diagnosis completely removed)
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number>(35);
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [unitsNeeded, setUnitsNeeded] = useState<number>(2);
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [contactName, setContactName] = useState(currentUserName);
  const [countryDialCode, setCountryDialCode] = useState<string>('+91');
  const [contactPhone, setContactPhone] = useState('');
  const [emergencyConfirmed, setEmergencyConfirmed] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Geolocation & Delhi Locality
  const [selectedLocality, setSelectedLocality] = useState<string>('Connaught Place, Central Delhi');
  const [customLocalityInput, setCustomLocalityInput] = useState<string>('');
  const [userCoords, setUserCoords] = useState<Coordinates>({ latitude: 28.6315, longitude: 77.2167 });
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  // In-modal actions & feedback
  const [dispatchingDonorId, setDispatchingDonorId] = useState<string | null>(null);
  const [dispatchedDonorIds, setDispatchedDonorIds] = useState<Record<string, boolean>>({});
  const [isEmailingRoster, setIsEmailingRoster] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [modalNotification, setModalNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const scanSteps = [
    'Triaging 8-Group ABO/Rh Matrix...',
    'Scanning Delhi Locality GPS Radius...',
    'Calculating Spherical Haversine Distances...',
    'Sorting Nearest Compatible Donors...'
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

  // Load emergency requests and donors with cross-device sync
  const loadData = async () => {
    try {
      const [reqRes, donorRes] = await Promise.allSettled([
        fetchEmergencyRequestsApi(currentUserEmail),
        fetchDonorsApi()
      ]);

      if (reqRes.status === 'fulfilled' && reqRes.value.ok && Array.isArray(reqRes.value.data)) {
        const mappedReqs: EmergencyRequest[] = reqRes.value.data.map((r: any) => ({
          id: r.id || `REQ-${Date.now().toString().slice(-6)}`,
          patientName: r.patient_name || r.patientName || 'Emergency Patient',
          patientAge: r.patient_age || r.patientAge || 35,
          bloodType: (r.blood_type || r.bloodType || 'O+') as BloodType,
          unitsNeeded: r.units_needed ?? r.unitsNeeded ?? 1,
          hospital: r.hospital || 'Emergency Trauma Network',
          hospitalCity: r.hospital_city || r.hospitalCity || 'Delhi NCR',
          ward: r.ward || 'Emergency Triage',
          urgency: (r.urgency || 'CRITICAL') as UrgencyLevel,
          contactName: r.contact_person || r.contactName || 'Trauma Desk',
          contactNumber: r.contact_phone || r.contactNumber || '+91 98765 43210',
          status: (r.status || 'urgent') as EmergencyRequest['status'],
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
        }));
        setRequests(mappedReqs);
        saveEmergencyRequests(mappedReqs, currentUserEmail);
      } else {
        setRequests(getEmergencyRequests(currentUserEmail));
      }

      if (donorRes.status === 'fulfilled' && donorRes.value.ok && Array.isArray(donorRes.value.data) && donorRes.value.data.length > 0) {
        setDonors(donorRes.value.data);
      } else {
        setDonors(getDonors());
      }
    } catch {
      setRequests(getEmergencyRequests(currentUserEmail));
      setDonors(getDonors());
    }
  };

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('bloodmatch_requests_updated', handleStorage);
    window.addEventListener('bloodmatch_donors_updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('bloodmatch_requests_updated', handleStorage);
      window.removeEventListener('bloodmatch_donors_updated', handleStorage);
    };
  }, [currentUserEmail]);

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
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpenModal]);

  // GPS Browser Geolocation
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setSelectedLocality('GPS Live Coordinates');
        setGpsMessage(`Live GPS Pinpointed: (${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°)`);
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsMessage(err.message || 'GPS location denied. Falling back to Delhi locality map.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Compatible donor types for selected blood group
  const compatibleBloodTypes = useMemo(() => {
    return getCompatibleDonorTypes(bloodType);
  }, [bloodType]);

  // Ranked Compatible Donors List
  const rankedDonors: RankedMatchDonor[] = useMemo(() => {
    if (!donors || donors.length === 0) return [];

    return donors
      .filter((donor) => {
        const isAvail = donor.isAvailable !== false && donor.available !== false;
        return isAvail && compatibleBloodTypes.includes(donor.bloodType);
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

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setModalPhase('INPUT');
    setFormErrors({});
    setModalNotification(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!patientName.trim() || patientName.trim().length < 2) {
      errors.patientName = 'Patient name is required (at least 2 characters)';
    }

    if (!patientAge || patientAge < 1 || patientAge > 120) {
      errors.patientAge = 'Please enter a valid age between 1 and 120';
    }

    if (!unitsNeeded || unitsNeeded < 1 || unitsNeeded > 50) {
      errors.unitsNeeded = 'Units needed must be at least 1 pint';
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

    const newRequest: EmergencyRequest = {
      id: `REQ-${Date.now().toString().slice(-6)}`,
      patientName: patientName.trim(),
      patientAge,
      bloodType,
      unitsNeeded,
      hospital: 'Emergency Trauma Network',
      hospitalCity: locationString,
      ward: 'Emergency Triage',
      urgency,
      contactName: contactName.trim() || currentUserName,
      contactNumber: fullPhone,
      status: 'urgent',
      createdAt: new Date().toISOString(),
    };

    // 1. Save locally to immediate UI board
    const updated = [newRequest, ...requests];
    saveEmergencyRequests(updated, currentUserEmail);
    setRequests(updated);

    // 2. Synchronize to backend API and Cloudflare R2
    try {
      createEmergencyRequestApi({
        user_email: currentUserEmail,
        patient_name: patientName.trim(),
        hospital: 'Emergency Trauma Network',
        blood_type: bloodType,
        units_needed: unitsNeeded,
        status: 'urgent',
        contact_person: contactName.trim() || currentUserName,
        contact_phone: fullPhone
      });
    } catch {
      // Quiet background sync fallback
    }

    // 3. Seamlessly transition to Radar Scanning state inside the same popup
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
        recipient_blood_type: bloodType,
        units_needed: unitsNeeded,
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

  // Email Top Donors Roster to Clinician
  const handleEmailRoster = async () => {
    if (rankedDonors.length === 0) {
      setModalNotification({ message: 'No compatible donors available to email.', type: 'error' });
      return;
    }
    setIsEmailingRoster(true);
    setModalNotification(null);

    const rosterItems = rankedDonors.slice(0, 10).map((d, index) => ({
      rank: index + 1,
      fullName: d.fullName,
      bloodType: d.bloodType,
      distanceKm: d.distanceKm,
      locality: d.location || d.city || 'Delhi NCR',
      phone: d.phone
    }));

    try {
      const res = await emailEmergencyRosterApi({
        clinician_email: currentUserEmail,
        clinician_name: currentUserName,
        patient_name: patientName,
        recipient_blood_type: bloodType,
        units_needed: unitsNeeded,
        hospital: 'Emergency Trauma Network',
        locality: customLocalityInput.trim() || selectedLocality,
        urgency: urgency,
        emergency_phone: `${countryDialCode} ${contactPhone.trim()}`,
        roster_items: rosterItems
      });

      if (res.ok) {
        setModalNotification({
          message: `Ranked donor roster briefing transmitted to ${currentUserEmail}!`,
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
    if (rankedDonors.length === 0) {
      setModalNotification({ message: 'No compatible donors available for PDF docket.', type: 'error' });
      return;
    }
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
        matchScore: Math.max(70, Math.round(100 - d.distanceKm * 2))
      }));

      generateEmergencyDonorDocketPdf(
        {
          dispatchId: `DISPATCH-${Date.now().toString(36).toUpperCase()}`,
          recipientBloodType: bloodType,
          patientName,
          hospitalName: 'Emergency Trauma Network',
          hospitalLocality: customLocalityInput.trim() || selectedLocality,
          searchCoordinates: userCoords,
          timestamp: new Date().toISOString()
        },
        donorItems
      );

      setModalNotification({
        message: 'Clinical Emergency Donor Mobilization Docket PDF downloaded successfully!',
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
    <div className="space-y-6 sm:space-y-8 pb-12 relative z-10">
      {/* Header with Scroll Blur-In */}
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
            <span>Power BI Triage Stream</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Transfusion Blood Requests
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-xl">
            Live triage board of urgent patient transfusion requirements with real-time geospatial proximity matching.
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
        className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm overflow-hidden"
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
              style={{ transform: 'translateZ(0)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
            
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold">
                <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping" />
                Live Trauma Dispatch Bay 01
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D72638]/90 text-white font-mono font-bold text-[11px] shadow-xs">
                Emergency Feed 60fps
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white pointer-events-none">
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300">Active Triage Board</div>
                <div className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
                  <span className="text-[#D72638]">{requests.length}</span>
                  <span>Total Registered Calls</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300">Cross-Match Latency</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">&lt; 15m Dispatch</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300">Standby Pool</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">{donors.length} Donors Ready</div>
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === status
                ? 'bg-[#D72638] text-white shadow-md shadow-[#D72638]/20'
                : 'bg-white/90 text-[#4A5568] hover:text-[#1A1D20] border border-[#D9C7C2]'
            }`}
          >
            {status.toUpperCase()} ({status === 'ALL' ? requests.length : requests.filter(r => r.status === status).length})
          </button>
        ))}
      </div>

      {/* Active Triage Request Cards Grid */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/95 border border-[#D9C7C2] text-[#5A626A]">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1D20]">No active requests found</h3>
          <p className="text-xs mt-1">No emergency transfusion requests have been broadcast yet. Click "Broadcast Emergency Request" above to initiate a real-time call.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map(req => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] hover:border-[#D72638]/60 transition-all shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {req.bloodType}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1D20] leading-tight">{req.patientName}</h3>
                    <div className="text-[11px] text-[#5A626A] flex items-center gap-1 mt-0.5">
                      <span>Age: {req.patientAge}</span>
                      <span>•</span>
                      <span className="font-semibold">{req.unitsNeeded} Pints</span>
                    </div>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  req.status === 'fulfilled' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : req.urgency === 'CRITICAL' 
                    ? 'bg-red-100 text-[#D72638] border border-red-200' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {req.status === 'fulfilled' ? 'FULFILLED' : req.urgency}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]/60 text-xs space-y-1">
                <div className="flex items-center justify-between text-[#5A626A]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D72638]" />
                    <span>{req.hospitalCity || 'Delhi NCR'}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-[#1A1D20] flex items-center justify-between pt-1 border-t border-[#D9C7C2]/40">
                  <span>Contact: {req.contactName}</span>
                  <a href={`tel:${req.contactNumber}`} className="font-mono text-[#D72638] font-bold hover:underline">
                    {req.contactNumber}
                  </a>
                </div>
              </div>

              {req.status !== 'fulfilled' && (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`tel:${req.contactNumber}`}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-[#F5F1EF] hover:bg-slate-200 text-[#1A1D20] text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Call Hotline</span>
                  </a>
                  <button
                    onClick={() => onUpdateStatus(req.id, 'fulfilled')}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Fulfilled</span>
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* =========================================================================
          HORIZONTAL EMERGENCY BROADCAST MODAL WITH IN-POPUP GEOSPATIAL RADAR & RESULTS
          (Spacious 2-Column Horizontal Architecture: Max-W-5xl)
          ========================================================================= */}
      {isOpenModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={handleCloseModal}
        >
          <div 
            className="relative w-full max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto no-scrollbar rounded-3xl bg-white border border-[#D9C7C2] p-5 sm:p-7 md:p-8 shadow-2xl text-[#1A1D20]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-[#D72638]" />
            </button>

            {/* Notification Banner */}
            <AnimatePresence>
              {modalNotification && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-4 p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                    modalNotification.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {modalNotification.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    <span>{modalNotification.message}</span>
                  </div>
                  <button onClick={() => setModalNotification(null)} className="underline ml-3">Dismiss</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PHASE 1: HORIZONTAL INPUT FORM */}
            {modalPhase === 'INPUT' && (
              <div>
                <div className="mb-4 pb-3 border-b border-[#D9C7C2]/60">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-1">
                    <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                    <span>Real-Time Geospatial Mobilization Engine</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1A1D20] flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-[#D72638]" />
                    <span>Broadcast Emergency Transfusion Request</span>
                  </h2>
                  <p className="text-xs text-[#5A626A] mt-0.5">
                    Enter patient criteria, target location, and authorization. Zero non-essential fields.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Horizontal 2-Column Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {/* LEFT COLUMN: Patient & Blood Specifications */}
                    <div className="space-y-3.5 bg-[#F5F1EF]/60 p-4 rounded-2xl border border-[#D9C7C2]/80">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#D9C7C2]/60">
                        <User className="w-4 h-4 text-[#D72638]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1D20]">
                          1. Patient &amp; Blood Specifications
                        </h3>
                      </div>

                      {/* Patient Name & Age Row */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-[#1A1D20] mb-1">
                            Patient Full Name <span className="text-[#D72638]">*</span>
                          </label>
                          <input
                            type="text"
                            value={patientName}
                            onChange={(e) => {
                              setPatientName(e.target.value);
                              if (formErrors.patientName) setFormErrors(prev => ({ ...prev, patientName: '' }));
                            }}
                            placeholder="Marcus Vance"
                            className={`w-full px-3 py-2 rounded-xl bg-white border ${
                              formErrors.patientName ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                            } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                          />
                          {formErrors.patientName && (
                            <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.patientName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1A1D20] mb-1">
                            Age <span className="text-[#D72638]">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={patientAge}
                            onChange={(e) => {
                              setPatientAge(Number(e.target.value));
                              if (formErrors.patientAge) setFormErrors(prev => ({ ...prev, patientAge: '' }));
                            }}
                            className={`w-full px-3 py-2 rounded-xl bg-white border ${
                              formErrors.patientAge ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                            } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]`}
                          />
                          {formErrors.patientAge && (
                            <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.patientAge}</p>
                          )}
                        </div>
                      </div>

                      {/* Interactive Blood Group Selection Matrix */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-[#1A1D20]">
                            Recipient Required Blood Group <span className="text-[#D72638]">*</span>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-[#D72638]">
                            Selected: {bloodType}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {bloodTypes.map((type) => {
                            const isSelected = bloodType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setBloodType(type)}
                                className={`py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#D72638] text-white border-[#D72638] shadow-sm scale-105'
                                    : 'bg-white text-[#4A5568] border-[#D9C7C2] hover:bg-slate-100'
                                }`}
                              >
                                {type}
                              </button>
                            );
                          })}
                        </div>

                        {/* Compatible Donor Indicator */}
                        <div className="mt-2 p-2 rounded-xl bg-red-50/80 border border-red-100 flex items-center justify-between text-2xs">
                          <span className="font-bold text-red-900 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-red-600" />
                            Compatible Donors:
                          </span>
                          <span className="font-bold text-red-700">
                            {compatibleBloodTypes.join(', ')}
                          </span>
                        </div>
                      </div>

                      {/* Units Needed & Triage Urgency */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-[#1A1D20] mb-1">
                            Units Needed (Pints) <span className="text-[#D72638]">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={unitsNeeded}
                            onChange={(e) => {
                              setUnitsNeeded(Number(e.target.value));
                              if (formErrors.unitsNeeded) setFormErrors(prev => ({ ...prev, unitsNeeded: '' }));
                            }}
                            className={`w-full px-3 py-2 rounded-xl bg-white border ${
                              formErrors.unitsNeeded ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                            } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]`}
                          />
                          {formErrors.unitsNeeded && (
                            <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.unitsNeeded}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1A1D20] mb-1">Triage Urgency</label>
                          <select
                            value={urgency}
                            onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs font-bold text-[#1A1D20] outline-hidden focus:border-[#D72638] cursor-pointer"
                          >
                            <option value="CRITICAL">CRITICAL (&lt; 1 Hour)</option>
                            <option value="URGENT">URGENT (&lt; 4 Hours)</option>
                            <option value="ROUTINE">ROUTINE (&lt; 24 Hours)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Target Location & Emergency Contact Channels */}
                    <div className="space-y-3.5 bg-[#F5F1EF]/60 p-4 rounded-2xl border border-[#D9C7C2]/80 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#D9C7C2]/60">
                          <div className="flex items-center gap-2">
                            <Crosshair className="w-4 h-4 text-[#D72638]" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1D20]">
                              2. Target Triage Location
                            </h3>
                          </div>
                          {/* Live GPS Detection Button */}
                          <button
                            type="button"
                            onClick={handleDetectGps}
                            disabled={isDetectingGps}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#D72638] hover:text-[#b51d2c] transition-colors cursor-pointer"
                          >
                            <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                            <span>{isDetectingGps ? 'Pinpointing...' : 'Detect My Location'}</span>
                          </button>
                        </div>

                        {gpsMessage && (
                          <div className="text-2xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-mono">
                            {gpsMessage}
                          </div>
                        )}

                        {/* Locality Selector */}
                        <div>
                          <label className="block text-xs font-bold text-[#1A1D20] mb-1">
                            Exact Delhi NCR Area / Locality <span className="text-[#D72638]">*</span>
                          </label>
                          <select
                            value={selectedLocality}
                            onChange={(e) => {
                              setSelectedLocality(e.target.value);
                              setCustomLocalityInput('');
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] cursor-pointer"
                          >
                            {DELHI_LOCALITY_NAMES.map((name: string) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>

                          {/* Quick Locality Pills */}
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {['Connaught Place', 'South Extension', 'Rohini Sector 7', 'Dwarka Sector 10', 'Karol Bagh', 'Saket'].map((pill: string) => (
                              <button
                                key={pill}
                                type="button"
                                onClick={() => {
                                  const matched = DELHI_LOCALITY_NAMES.find((l: string) => l.toLowerCase().includes(pill.toLowerCase())) || pill;
                                  setSelectedLocality(matched);
                                  setCustomLocalityInput('');
                                }}
                                className={`text-2xs font-semibold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  selectedLocality.toLowerCase().includes(pill.toLowerCase())
                                    ? 'bg-[#D72638] text-white border-[#D72638]'
                                    : 'bg-white text-[#4A5568] border-[#D9C7C2] hover:bg-slate-100'
                                }`}
                              >
                                {pill}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Contact Person & Emergency Number */}
                        <div>
                          <label className="block text-xs font-bold text-[#1A1D20] mb-1">
                            Emergency Contact Number <span className="text-[#D72638]">*</span>
                          </label>
                          <div className="flex gap-1.5">
                            <select
                              value={countryDialCode}
                              onChange={(e) => {
                                setCountryDialCode(e.target.value);
                                if (formErrors.contactPhone) setFormErrors(prev => ({ ...prev, contactPhone: '' }));
                              }}
                              className="px-2 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs font-bold text-[#1A1D20] outline-hidden focus:border-[#D72638] shrink-0 cursor-pointer max-w-[100px]"
                            >
                              {COUNTRY_CODES.map((c) => (
                                <option key={c.code} value={c.dialCode}>
                                  {c.flag} {c.dialCode}
                                </option>
                              ))}
                            </select>

                            <input
                              type="tel"
                              value={contactPhone}
                              onChange={(e) => {
                                setContactPhone(e.target.value);
                                if (formErrors.contactPhone) setFormErrors(prev => ({ ...prev, contactPhone: '' }));
                              }}
                              placeholder={countryDialCode === '+91' ? '98765 43210' : 'Emergency number'}
                              className={`w-full px-3 py-2 rounded-xl bg-white border ${
                                formErrors.contactPhone ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                              } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                            />
                          </div>
                          {formErrors.contactPhone && (
                            <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.contactPhone}</p>
                          )}
                        </div>
                      </div>

                      {/* Confirmation Checkbox */}
                      <div className="pt-2 border-t border-[#D9C7C2]/60">
                        <label className="flex items-start gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={emergencyConfirmed}
                            onChange={(e) => {
                              setEmergencyConfirmed(e.target.checked);
                              if (formErrors.emergencyConfirmed) setFormErrors(prev => ({ ...prev, emergencyConfirmed: '' }));
                            }}
                            className="mt-0.5 w-4 h-4 rounded-sm border-[#D9C7C2] text-[#D72638] focus:ring-[#D72638] cursor-pointer shrink-0"
                          />
                          <span className="text-[11px] text-[#5A626A] leading-tight">
                            I confirm this is an authentic clinical transfusion emergency authorized for immediate donor dispatch. <span className="text-[#D72638]">*</span>
                          </span>
                        </label>
                        {formErrors.emergencyConfirmed && (
                          <p className="text-red-500 text-[10px] font-semibold mt-1 ml-6">{formErrors.emergencyConfirmed}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modal Action Footer */}
                  <div className="pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#5A626A] hover:text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Confirm &amp; Broadcast Request</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* PHASE 2: RADAR SCANNING ANIMATION IN THE SAME POPUP */}
            {modalPhase === 'SCANNING' && (
              <div className="py-12 px-6 text-center space-y-6 relative overflow-hidden">
                {/* Radar Ripple Waves */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-72 h-72 border-2 border-red-500/20 rounded-full animate-ping" />
                  <div className="w-56 h-56 border-2 border-red-500/30 rounded-full animate-pulse" />
                  <div className="w-40 h-40 border-2 border-red-500/40 rounded-full" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-red-100 text-red-600 animate-bounce">
                    <Droplet className="w-10 h-10 fill-red-600" />
                  </div>
                  <h3 className="text-xl font-extrabold text-[#1A1D20]">
                    Clinical Proximity Radar Active
                  </h3>
                  <div className="inline-block px-4 py-1.5 rounded-full bg-[#F5F1EF] text-xs font-bold font-mono text-[#D72638]">
                    {scanSteps[scanStepIndex]}
                  </div>
                  <p className="text-xs text-slate-500">
                    Locating nearest active lifesavers matching {bloodType} antibodies in {customLocalityInput.trim() || selectedLocality}...
                  </p>
                </div>
              </div>
            )}

            {/* PHASE 3: PROXIMITY-RANKED DONOR RESULTS IN THE SAME POPUP */}
            {modalPhase === 'RESULTS' && (
              <div className="space-y-4">
                {/* Results Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9C7C2]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{rankedDonors.length} Compatible Donors Ranked By Proximity</span>
                    </div>
                    <h3 className="text-lg font-black text-[#1A1D20]">
                      Nearest Lifesavers for {patientName} ({bloodType})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEmailRoster}
                      disabled={isEmailingRoster || rankedDonors.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#4A5568] bg-[#F5F1EF] border border-[#D9C7C2] hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      {isEmailingRoster ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-[#D72638]" />}
                      <span>Email Roster</span>
                    </button>

                    <button
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf || rankedDonors.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#D72638] hover:bg-[#b51d2c] shadow-xs transition-all cursor-pointer"
                    >
                      {isGeneratingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* Ranked Donor List */}
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
                  {rankedDonors.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#F5F1EF] text-slate-500">
                      <Droplet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#1A1D20]">No active compatible donors found in this radius.</p>
                      <p className="text-2xs text-slate-400 mt-0.5">Emergency request is active on the triage board.</p>
                    </div>
                  ) : (
                    rankedDonors.map((donor, index) => {
                      const isImmediate = donor.distanceKm <= 3.0;
                      const isDispatched = dispatchedDonorIds[donor.id];
                      const isDispatching = dispatchingDonorId === donor.id;

                      return (
                        <div
                          key={donor.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isImmediate
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
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-[#1A1D20]">{donor.fullName}</h4>
                                <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-md border ${donor.tier.badgeClass}`}>
                                  {donor.tier.label} • {donor.distanceKm.toFixed(1)} km
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

                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${donor.phone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#1A1D20] bg-white border border-[#D9C7C2] hover:bg-slate-100 transition-all"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>Call</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDispatchDonor(donor)}
                              disabled={isDispatching || isDispatched}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                isDispatched
                                  ? 'bg-emerald-600 text-white cursor-default'
                                  : 'bg-[#D72638] hover:bg-[#b51d2c] text-white cursor-pointer disabled:opacity-50'
                              }`}
                            >
                              {isDispatching ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : isDispatched ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>{isDispatched ? 'Dispatched' : 'Send Alert'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Return Button */}
                <div className="pt-3 border-t border-[#D9C7C2] flex items-center justify-between">
                  <span className="text-2xs text-slate-500">
                    Request posted to active triage queue and synchronized across devices.
                  </span>
                  <button
                    onClick={handleCloseModal}
                    className="px-5 py-2 rounded-xl bg-[#1A1D20] hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Done &amp; View on Board
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
}
