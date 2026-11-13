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
  ArrowRight,
  ChevronDown,
  Users
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
  emailEmergencyRosterApi,
  fulfillEmergencyRequestApi
} from '../services/api';
import { COUNTRY_CODES, validatePhoneNumber } from '../utils/countryCodes';
import { 
  Coordinates, 
  DELHI_LOCALITY_NAMES, 
  GLOBAL_LOCALITY_NAMES,
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

interface RankedMatchDonor extends Donor {
  distanceKm: number;
  tier: ReturnType<typeof getProximityTier>;
}

export default function EmergencyRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Initialize with immediate local storage data to prevent any blank flicker or disappearing items
  const [requests, setRequests] = useState<EmergencyRequest[]>(() => getEmergencyRequests(currentUserEmail));
  const [donors, setDonors] = useState<Donor[]>(() => getDonors());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  // Expanded horizontal triage bar request ID (for in-board matched lifesavers dropdown)
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

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
  const [fulfillmentDonorName, setFulfillmentDonorName] = useState<string>('');
  const [fulfillmentDonorEmail, setFulfillmentDonorEmail] = useState<string>('');
  const [selectedFulfillingDonorId, setSelectedFulfillingDonorId] = useState<string>('');
  const [isFulfilling, setIsFulfilling] = useState<boolean>(false);
  const [boardNotification, setBoardNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal Workflow Phase: 'INPUT' | 'SCANNING' | 'RESULTS'
  const [modalPhase, setModalPhase] = useState<'INPUT' | 'SCANNING' | 'RESULTS'>('INPUT');
  const [scanStepIndex, setScanStepIndex] = useState(0);

  // Form states (Form Neutrality with zero default prefilled inputs)
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [bloodType, setBloodType] = useState<BloodType | ''>('');
  const [unitsNeeded, setUnitsNeeded] = useState<number | ''>('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [contactName, setContactName] = useState(currentUserName);
  const [countryDialCode, setCountryDialCode] = useState<string>('+91');
  const [contactPhone, setContactPhone] = useState('');
  const [emergencyConfirmed, setEmergencyConfirmed] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
  const [modalNotification, setModalNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const scanSteps = [
    'Triaging 8-Group ABO/Rh Matrix...',
    'Scanning Locality GPS Radius Worldwide...',
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

  // Load emergency requests and donors with resilient bidirectional merge & zero data loss
  const loadData = async () => {
    const currentLocal = getEmergencyRequests(currentUserEmail);

    try {
      const [reqRes, donorRes] = await Promise.allSettled([
        fetchEmergencyRequestsApi(currentUserEmail),
        fetchDonorsApi()
      ]);

      if (donorRes.status === 'fulfilled' && donorRes.value.ok && Array.isArray(donorRes.value.data) && donorRes.value.data.length > 0) {
        setDonors(donorRes.value.data);
        saveDonors(donorRes.value.data);
      }

      if (reqRes.status === 'fulfilled' && reqRes.value.ok && Array.isArray(reqRes.value.data)) {
        const remoteReqs: EmergencyRequest[] = reqRes.value.data.map((r: any) => ({
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
          matchedDonorId: r.matched_donor_id || r.matchedDonorId,
          fulfilledAt: r.fulfilled_at || r.fulfilledAt,
          fulfilledByDonorName: r.fulfilled_by_donor_name || r.fulfilledByDonorName,
          fulfilledByDonorEmail: r.fulfilled_by_donor_email || r.fulfilledByDonorEmail,
        }));

        // Merge remote and local by ID to ensure local requests NEVER disappear!
        const map = new Map<string, EmergencyRequest>();
        remoteReqs.forEach(r => map.set(r.id, r));

        // Preserve and sync any local requests not yet on remote
        currentLocal.forEach(r => {
          if (!map.has(r.id)) {
            map.set(r.id, r);
            // Push missing local request to remote in background
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
            }).catch(() => {});
          }
        });

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRequests(merged);
        saveEmergencyRequests(merged, currentUserEmail);
      } else {
        setRequests(currentLocal);
      }
    } catch {
      setRequests(currentLocal);
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

  // GPS Browser Geolocation (Accurate 1-Click Permissions & Positioning)
  const handleDetectGps = async () => {
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

  // Dynamic matched donors calculator for any specific emergency request
  const getMatchesForRequest = (req: EmergencyRequest): RankedMatchDonor[] => {
    if (!donors || donors.length === 0) return [];
    const compTypes = getCompatibleDonorTypes(req.bloodType);
    const reqCoords = resolveCoordinatesForLocation(req.hospitalCity || 'Delhi');

    return donors
      .filter((donor) => {
        const isAvail = donor.isAvailable !== false && donor.available !== false;
        return isAvail && compTypes.includes(donor.bloodType);
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
      setSelectedFulfillingDonorId(matches[0].id);
      setFulfillmentDonorName(matches[0].fullName);
      setFulfillmentDonorEmail(matches[0].email);
    } else {
      setSelectedFulfillingDonorId('');
      setFulfillmentDonorName('');
      setFulfillmentDonorEmail('');
    }
  };

  // Confirm Fulfillment & trigger dual thank-you / completion emails
  const handleConfirmFulfillment = async () => {
    if (!fulfillmentModalReq || !fulfillmentDonorName.trim() || !fulfillmentDonorEmail.trim()) return;
    setIsFulfilling(true);

    const targetReq = fulfillmentModalReq;
    const fulfilledAt = new Date().toISOString();

    try {
      // 1. Call backend fulfillment endpoint to update status and dispatch dual emails
      await fulfillEmergencyRequestApi(targetReq.id, {
        requester_email: currentUserEmail,
        requester_name: targetReq.contactName,
        donor_id: selectedFulfillingDonorId || undefined,
        donor_name: fulfillmentDonorName.trim(),
        donor_email: fulfillmentDonorEmail.trim(),
        notes: `Transfusion fulfilled by voluntary donor ${fulfillmentDonorName.trim()}`
      });

      // 2. Update local state
      const updated = requests.map(r => {
        if (r.id === targetReq.id) {
          return {
            ...r,
            status: 'fulfilled' as const,
            matchedDonorId: selectedFulfillingDonorId || r.matchedDonorId,
            fulfilledAt,
            fulfilledByDonorName: fulfillmentDonorName.trim(),
            fulfilledByDonorEmail: fulfillmentDonorEmail.trim()
          };
        }
        return r;
      });

      setRequests(updated);
      saveEmergencyRequests(updated, currentUserEmail);

      setBoardNotification({
        message: `Transfusion for ${targetReq.patientName} marked as FULFILLED! Gratitude emails transmitted to ${fulfillmentDonorEmail.trim()} and ${currentUserEmail}.`,
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
  const handleDownloadPdfForRequest = (req: EmergencyRequest, matches: RankedMatchDonor[]) => {
    setIsGeneratingPdf(true);
    try {
      const donorItems: RankedDonorItem[] = matches.map((d, index) => ({
        rank: index + 1,
        id: d.id,
        fullName: d.fullName,
        bloodType: d.bloodType,
        distanceKm: d.distanceKm,
        location: d.location || d.city || 'Delhi NCR',
        phone: d.phone,
        matchScore: Math.max(70, Math.round(100 - d.distanceKm * 2))
      }));

      const reqCoords = resolveCoordinatesForLocation(req.hospitalCity || 'Delhi');

      generateEmergencyDonorDocketPdf(
        {
          recipientBloodType: req.bloodType,
          patientName: req.patientName,
          patientAge: req.patientAge,
          unitsNeeded: req.unitsNeeded,
          urgency: req.urgency,
          hospitalLocality: req.hospitalCity || 'Delhi NCR',
          searchCoordinates: reqCoords,
          timestamp: new Date().toISOString(),
          autoDownload: true
        },
        donorItems
      );

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
      setIsGeneratingPdf(false);
    }
  };

  // Email top compatible donor roster with attached PDF directly from horizontal request card
  const handleEmailRosterForRequest = async (req: EmergencyRequest, matches: RankedMatchDonor[]) => {
    if (matches.length === 0) {
      setBoardNotification({ message: 'No compatible donors available to email.', type: 'error' });
      return;
    }
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

      if (res.ok) {
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

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setModalPhase('INPUT');
    setFormErrors({});
    setModalNotification(null);
    setPatientName('');
    setPatientAge('');
    setBloodType('');
    setUnitsNeeded('');
    setEmergencyConfirmed(false);
    setSelectedLocality('');
    setCustomLocalityInput('');
    setDetectedPills([]);
    setGpsMessage(null);
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

    if (!unitsNeeded || Number(unitsNeeded) < 1 || Number(unitsNeeded) > 50) {
      errors.unitsNeeded = 'Units needed must be at least 1 pint';
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

    const newRequest: EmergencyRequest = {
      id: `REQ-${Date.now().toString().slice(-6)}`,
      patientName: patientName.trim(),
      patientAge: Number(patientAge) || 35,
      bloodType: bloodType as BloodType,
      unitsNeeded: Number(unitsNeeded) || 1,
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
    createEmergencyRequestApi({
      id: newRequest.id,
      user_email: currentUserEmail,
      patient_name: newRequest.patientName,
      patient_age: newRequest.patientAge,
      hospital: newRequest.hospital,
      hospital_city: newRequest.hospitalCity,
      ward: newRequest.ward,
      blood_type: newRequest.bloodType,
      units_needed: newRequest.unitsNeeded,
      urgency: newRequest.urgency,
      status: 'urgent',
      contact_person: newRequest.contactName,
      contact_phone: newRequest.contactNumber
    }).catch(() => {});

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
    if (rankedDonors.length === 0) {
      setModalNotification({ message: 'No compatible donors available to email.', type: 'error' });
      return;
    }
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
          hospitalLocality: customLocalityInput.trim() || selectedLocality,
          searchCoordinates: userCoords,
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
          timestamp: new Date().toISOString(),
          autoDownload: true
        },
        donorItems
      );

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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md border ${
              boardNotification.type === 'success'
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
          {filteredRequests.map(req => {
            const matches = getMatchesForRequest(req);
            const isExpanded = expandedRequestId === req.id;
            const isFulfilled = req.status === 'fulfilled';

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl bg-white border transition-all duration-200 overflow-hidden shadow-xs ${
                  isFulfilled ? 'border-emerald-200' : 'border-[#D9C7C2] hover:border-[#D72638]/50'
                }`}
              >
                {/* Horizontal Primary Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Blood Type & Patient Clinical Details */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] text-white font-black text-base flex flex-col items-center justify-center shadow-xs shrink-0">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-red-100">Blood</span>
                      <span>{req.bloodType}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[#1A1D20] leading-tight truncate">
                          {req.patientName}
                        </h3>
                        <span className="font-mono text-xs text-[#7A0C17] bg-[#7A0C17]/10 px-2 py-0.5 rounded-md font-bold">
                          {req.id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isFulfilled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : req.urgency === 'CRITICAL'
                            ? 'bg-red-100 text-[#D72638] border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {isFulfilled ? '✓ FULFILLED' : req.urgency}
                        </span>
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
                        <span>Contact: <strong>{req.contactName}</strong></span>
                        <button 
                          type="button"
                          onClick={() => setCallModalTarget({
                            contactName: req.contactName,
                            phoneNumber: req.contactNumber,
                            bloodType: req.bloodType,
                            location: req.hospitalCity || 'Delhi NCR',
                            roleOrContext: `Emergency Transfusion Hotline • Patient: ${req.patientName}`
                          })}
                          className="font-mono text-[#D72638] font-bold hover:underline cursor-pointer"
                        >
                          {req.contactNumber}
                        </button>
                        {isFulfilled && req.fulfilledByDonorName && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Fulfilled by: {req.fulfilledByDonorName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons & Expandable Dropdown Toggle */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap">
                    {!isFulfilled && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCallModalTarget({
                            contactName: req.contactName,
                            phoneNumber: req.contactNumber,
                            bloodType: req.bloodType,
                            location: req.hospitalCity || 'Delhi NCR',
                            roleOrContext: `Emergency Transfusion Hotline • Patient: ${req.patientName}`
                          })}
                          className="py-2 px-3.5 rounded-xl bg-[#F5F1EF] hover:bg-slate-200 text-[#1A1D20] text-xs font-bold transition-all flex items-center gap-1.5 border border-[#D9C7C2] cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Call Hotline</span>
                        </button>
                        <button
                          onClick={() => handleOpenFulfillModal(req)}
                          className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mark Fulfilled</span>
                        </button>
                      </>
                    )}

                    {/* Expandable Dropdown Toggle Button */}
                    <button
                      onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                      className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                        isExpanded
                          ? 'bg-[#1A1D20] text-white border-[#1A1D20]'
                          : 'bg-white hover:bg-[#F5F1EF] text-[#1A1D20] border-[#D9C7C2]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-[#D72638]" />
                      <span>Matched Lifesavers ({matches.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : 'text-slate-400'}`} />
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
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <h4 className="text-xs sm:text-sm font-bold text-[#1A1D20]">
                            {matches.length} Compatible {req.bloodType} Lifesavers Ranked By GPS Proximity
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleEmailRosterForRequest(req, matches)}
                            disabled={isEmailingRoster}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-[#D9C7C2] text-xs font-bold text-[#1A1D20] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#D72638]" />
                            <span>{isEmailingRoster ? 'Sending...' : 'Email Roster & PDF'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadPdfForRequest(req, matches)}
                            disabled={isGeneratingPdf}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF Docket'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Matching Donor List */}
                      {matches.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#D9C7C2] text-xs text-[#5A626A]">
                          <Droplet className="w-8 h-8 text-[#D72638]/40 mx-auto mb-2" />
                          <p className="font-bold text-[#1A1D20]">No active compatible donors found in this radius for {req.bloodType}</p>
                          <p className="text-[11px] mt-0.5">Emergency broadcast remains active across all hospital nodes.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {matches.map((donor, idx) => {
                            const isDispatched = dispatchedDonorIds[donor.id] || false;
                            const isDispatching = dispatchingDonorId === donor.id;

                            const isSelf = Boolean(
                              currentUserEmail && (
                                (donor.email && donor.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()) ||
                                (donor.user_email && donor.user_email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase())
                              )
                            );

                            return (
                              <div
                                key={donor.id}
                                className={`p-3.5 rounded-xl border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                  isDispatched 
                                    ? 'bg-emerald-50/60 border-emerald-200' 
                                    : isSelf
                                    ? 'bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-300'
                                    : 'bg-white border-[#D9C7C2] hover:border-[#D72638]/40'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-[#F5F1EF] border border-[#D9C7C2] flex items-center justify-center font-mono font-bold text-xs text-[#7A0C17] shrink-0">
                                    #{idx + 1}
                                  </div>

                                  <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 text-[#D72638] font-black text-xs flex items-center justify-center shrink-0">
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
                                      className="px-3 py-1.5 rounded-lg bg-[#F5F1EF] hover:bg-slate-200 text-[#1A1D20] font-bold text-xs flex items-center gap-1 transition-colors border border-[#D9C7C2] cursor-pointer"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-600" />
                                      <span>Call</span>
                                    </button>

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
                                          distanceKm: donor.distanceKm
                                        },
                                        patientName: req.patientName,
                                        hospital: req.hospital || 'Emergency Trauma Bay',
                                        customMessage: `Urgent transfusion required for ${req.patientName} (Group ${req.bloodType}). Your compatible voluntary donation can save a life. Please contact our hotline immediately if you can donate.`
                                      })}
                                      disabled={isDispatched}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs ${
                                        isDispatched
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : 'bg-[#D72638] hover:bg-[#b51d2c] text-white'
                                      }`}
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>{isDispatched ? 'Alert Sent ✓' : 'Send Alert'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          CONFIRM TRANSFUSION FULFILLED MODAL WITH DUAL THANKS EMAILS
          ========================================================================= */}
      {fulfillmentModalReq && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => !isFulfilling && setFulfillmentModalReq(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white border border-[#D9C7C2] p-6 sm:p-7 shadow-2xl text-[#1A1D20]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D9C7C2]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1D20]">Confirm Transfusion Fulfilled</h3>
                  <p className="text-[11px] text-[#5A626A]">Record delivery &amp; dispatch dual clinical thanks emails</p>
                </div>
              </div>
              <button
                onClick={() => !isFulfilling && setFulfillmentModalReq(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#1A1D20] hover:bg-[#F5F1EF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#F5F1EF] border border-[#D9C7C2] space-y-1">
                <span className="text-[10px] text-[#7A0C17] font-bold uppercase tracking-wider block">Transfusion Case</span>
                <p className="text-sm font-bold text-[#1A1D20]">
                  {fulfillmentModalReq.patientName} • Group {fulfillmentModalReq.bloodType} ({fulfillmentModalReq.unitsNeeded} Pints)
                </p>
                <p className="text-[#5A626A] text-[11px]">{fulfillmentModalReq.hospitalCity} • Requested by {fulfillmentModalReq.contactName}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1D20] mb-1.5">
                  Who fulfilled this blood demand? *
                </label>
                {getMatchesForRequest(fulfillmentModalReq).length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] text-[#5A626A] block mb-1">Quick Select from Matched Lifesavers:</span>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {getMatchesForRequest(fulfillmentModalReq).map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedFulfillingDonorId(d.id);
                            setFulfillmentDonorName(d.fullName);
                            setFulfillmentDonorEmail(d.email);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                            selectedFulfillingDonorId === d.id
                              ? 'bg-[#D72638] text-white border-[#D72638]'
                              : 'bg-white hover:bg-slate-50 text-[#1A1D20] border-[#D9C7C2]'
                          }`}
                        >
                          {d.fullName} ({d.bloodType})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Donor Full Name *</span>
                    <input
                      type="text"
                      value={fulfillmentDonorName}
                      onChange={(e) => setFulfillmentDonorName(e.target.value)}
                      placeholder="e.g. Farhan Khalid"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Donor Email Address *</span>
                    <input
                      type="email"
                      value={fulfillmentDonorEmail}
                      onChange={(e) => setFulfillmentDonorEmail(e.target.value)}
                      placeholder="donor@example.com"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                <strong>Dual Notification Protocol:</strong> Marking this request fulfilled will update the clinical ledger and automatically transmit two concise gratitude emails: one to the clinician and one to voluntary donor <strong>{fulfillmentDonorName || 'Donor'}</strong> thanking them for saving a life.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9C7C2]">
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
                disabled={isFulfilling || !fulfillmentDonorName.trim() || !fulfillmentDonorEmail.trim()}
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

                      {/* Authorized Clinician Account Preview */}
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                              Authorized Clinician Account
                            </div>
                            <div className="text-xs font-mono font-bold text-emerald-950 truncate">
                              {currentUserEmail}
                            </div>
                          </div>
                        </div>
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-900 text-[10px] font-bold shrink-0">
                          Active Account
                        </span>
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
                            placeholder="Enter patient full legal name..."
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
                            value={patientAge === '' ? '' : patientAge}
                            placeholder="e.g. 35"
                            onChange={(e) => {
                              const val = e.target.value;
                              setPatientAge(val === '' ? '' : Number(val));
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
                          <span className={`text-[10px] font-mono font-bold ${bloodType ? 'text-[#D72638]' : 'text-slate-400'}`}>
                            Selected: {bloodType || 'None (Select Group)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {bloodTypes.map((type) => {
                            const isSelected = bloodType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setBloodType(type);
                                  if (formErrors.bloodType) setFormErrors(prev => ({ ...prev, bloodType: '' }));
                                }}
                                className={`h-9 rounded-xl font-black text-xs transition-colors border cursor-pointer flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-[#D72638] text-white border-[#D72638] shadow-xs'
                                    : 'bg-white text-[#4A5568] border-[#D9C7C2] hover:bg-slate-100'
                                }`}
                              >
                                {type}
                              </button>
                            );
                          })}
                        </div>
                        {formErrors.bloodType && (
                          <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.bloodType}</p>
                        )}

                        {/* Compatible Donor Indicator (Fixed Height to prevent any modal shifting) */}
                        <div className="mt-2 px-3 py-2 rounded-xl bg-red-50/80 border border-red-100 h-10 min-h-[40px] max-h-[40px] flex items-center justify-between gap-2 text-2xs overflow-hidden">
                          <span className="font-bold text-red-900 flex items-center gap-1 shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Compatible Donors:</span>
                          </span>
                          <span className="font-bold text-red-700 text-right text-xs truncate max-w-[62%]" title={bloodType ? compatibleBloodTypes.join(', ') : 'None'}>
                            {bloodType ? compatibleBloodTypes.join(', ') : 'Select blood group above'}
                          </span>
                        </div>
                      </div>

                      {/* Units Needed */}
                      <div>
                        <label className="block text-xs font-bold text-[#1A1D20] mb-1">
                          Units Needed (Pints) <span className="text-[#D72638]">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={unitsNeeded === '' ? '' : unitsNeeded}
                          placeholder="e.g. 2"
                          onChange={(e) => {
                            const val = e.target.value;
                            setUnitsNeeded(val === '' ? '' : Number(val));
                            if (formErrors.unitsNeeded) setFormErrors(prev => ({ ...prev, unitsNeeded: '' }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl bg-white border ${
                            formErrors.unitsNeeded ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                          } text-xs text-[#1A1D20] outline-none focus:border-[#D72638]`}
                        />
                        {formErrors.unitsNeeded && (
                          <p className="text-red-500 text-[10px] font-semibold mt-1">{formErrors.unitsNeeded}</p>
                        )}
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

                        {/* Worldwide Locality Selector & Search */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-[#1A1D20]">
                              Target Locality / Nearest Area (Worldwide) <span className="text-[#D72638]">*</span>
                            </label>
                            <span className="text-[10px] text-[#5A626A] font-semibold">
                              Worldwide Match
                            </span>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              list="global-locality-datalist"
                              value={customLocalityInput || selectedLocality}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomLocalityInput(val);
                                setSelectedLocality(val);
                                if (formErrors.locality) {
                                  setFormErrors(prev => ({ ...prev, locality: '' }));
                                }
                              }}
                              placeholder="Type locality or click Detect My Location..."
                              className={`w-full px-3 py-2 rounded-xl bg-white border ${
                                formErrors.locality ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                              } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]`}
                            />
                            <datalist id="global-locality-datalist">
                              {GLOBAL_LOCALITY_NAMES.map((name: string) => (
                                <option key={name} value={name} />
                              ))}
                            </datalist>
                          </div>
                          {formErrors.locality && (
                            <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.locality}</p>
                          )}

                          {/* Quick Dynamic Locality Pills (Shown ONLY after detecting location) */}
                          {detectedPills.length > 0 && (
                            <div className="pt-2">
                              <span className="text-[10px] font-bold text-[#7A0C17] uppercase tracking-wider block mb-1">
                                Detected Area Suggestions:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {detectedPills.map((pill: string) => {
                                  const active = (customLocalityInput || selectedLocality).toLowerCase().includes(pill.toLowerCase());
                                  return (
                                    <button
                                      key={pill}
                                      type="button"
                                      onClick={() => {
                                        setSelectedLocality(pill);
                                        setCustomLocalityInput(pill);
                                        if (formErrors.locality) {
                                          setFormErrors(prev => ({ ...prev, locality: '' }));
                                        }
                                      }}
                                      className={`text-2xs font-semibold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                        active
                                          ? 'bg-[#D72638] text-white border-[#D72638]'
                                          : 'bg-white text-[#4A5568] border-[#D9C7C2] hover:bg-slate-100'
                                      }`}
                                    >
                                      {pill}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
                      title="Transmit ranked roster with attached PDF docket to your email"
                    >
                      {isEmailingRoster ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-[#D72638]" />}
                      <span>Email Roster & PDF</span>
                    </button>

                    <button
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf || rankedDonors.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#D72638] hover:bg-[#b51d2c] shadow-xs transition-all cursor-pointer"
                      title="Download clinical emergency mobilization docket PDF"
                    >
                      {isGeneratingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                      <span>Download PDF Docket</span>
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
                      const isSelf = Boolean(
                        currentUserEmail && (
                          (donor.email && donor.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()) ||
                          (donor.user_email && donor.user_email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase())
                        )
                      );

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
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-[#D72638] border border-red-200">
                                    You
                                  </span>
                                )}
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
                                    distanceKm: donor.distanceKm
                                  },
                                  patientName: patientName,
                                  hospital: 'Emergency Trauma Network',
                                  customMessage: `Urgent transfusion needed for ${patientName} (Group ${bloodType}). Your compatible voluntary donation can save a life. Please contact our emergency hotline immediately if you can donate.`
                                })}
                                disabled={isDispatched}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                  isDispatched
                                    ? 'bg-emerald-600 text-white cursor-default'
                                    : 'bg-[#D72638] hover:bg-[#b51d2c] text-white cursor-pointer disabled:opacity-50'
                                }`}
                              >
                                {isDispatched ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>{isDispatched ? 'Dispatched' : 'Send Alert'}</span>
                              </button>
                            </div>
                          )}
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
    </div>
  );
}
