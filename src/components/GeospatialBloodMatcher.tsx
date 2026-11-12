import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  Mail, 
  Send, 
  FileDown, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  ShieldCheck, 
  RefreshCw, 
  Heart, 
  Droplet, 
  Crosshair, 
  Building2, 
  User, 
  Clock, 
  Layers, 
  Activity,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { BloodType, Donor } from '../types';
import { getDonors } from '../services/storage';
import { 
  fetchDonorsApi, 
  dispatchEmergencyDonorApi, 
  emailEmergencyRosterApi 
} from '../services/api';
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

interface RankedDonor extends Donor {
  distanceKm: number;
  isCompatible: boolean;
  tier: ReturnType<typeof getProximityTier>;
}

export const GeospatialBloodMatcher: React.FC = () => {
  // Clinician session info
  const clinicianEmail = useMemo(() => {
    return sessionStorage.getItem('bloodmatch_user_email') || 
           localStorage.getItem('bloodmatch_user_email') || 
           'clinician@bloodmatch.org';
  }, []);

  const clinicianName = useMemo(() => {
    return sessionStorage.getItem('bloodmatch_user_name') || 
           localStorage.getItem('bloodmatch_user_name') || 
           'Attending Trauma Clinician';
  }, []);

  // Form State
  const [recipientBloodType, setRecipientBloodType] = useState<BloodType>('A+');
  const [patientName, setPatientName] = useState('Marcus Vance');
  const [patientAge, setPatientAge] = useState(38);
  const [hospital, setHospital] = useState('All India Institute of Medical Sciences (AIIMS)');
  const [selectedLocality, setSelectedLocality] = useState('Connaught Place, Central Delhi');
  const [customLocalityInput, setCustomLocalityInput] = useState('');
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [urgency, setUrgency] = useState<'CRITICAL' | 'URGENT' | 'STANDARD'>('CRITICAL');
  const [emergencyPhone, setEmergencyPhone] = useState('+91 8851860838');
  const [clinicalNotes, setClinicalNotes] = useState('Urgent surgical trauma support required immediately.');

  // Geolocation Coordinates
  const [userCoords, setUserCoords] = useState<Coordinates>({ latitude: 28.6315, longitude: 77.2167 });
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Donors & Scanning State
  const [allDonors, setAllDonors] = useState<Donor[]>([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);

  // Dispatch & Actions State
  const [dispatchingDonorId, setDispatchingDonorId] = useState<string | null>(null);
  const [dispatchedDonorIds, setDispatchedDonorIds] = useState<Record<string, boolean>>({});
  const [isEmailingRoster, setIsEmailingRoster] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const scanSteps = [
    'Triaging 8-Group ABO/Rh Matrix...',
    'Scanning Delhi Locality GPS Radius...',
    'Calculating Spherical Haversine Distances...',
    'Sorting Nearest Compatible Donors...'
  ];

  // Fetch registered donors on mount
  const loadDonors = async () => {
    setIsLoadingDonors(true);
    try {
      const apiRes = await fetchDonorsApi();
      if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
        setAllDonors(apiRes.data);
      } else {
        const local = getDonors();
        setAllDonors(local);
      }
    } catch {
      const local = getDonors();
      setAllDonors(local);
    } finally {
      setIsLoadingDonors(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, []);

  // Update coordinates whenever selected locality changes
  useEffect(() => {
    const loc = customLocalityInput.trim() || selectedLocality;
    const coords = resolveCoordinatesForLocation(loc);
    setUserCoords(coords);
  }, [selectedLocality, customLocalityInput]);

  // GPS Browser Geolocation
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setSelectedLocality('GPS Live Coordinates');
        setNotification({
          message: `Live GPS pinpointed: (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          type: 'success'
        });
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsError(err.message || 'GPS location permission denied. Falling back to Delhi locality map.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Run visual scanning animation when user triggers triage
  const triggerClinicalScan = () => {
    setIsScanning(true);
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
      setIsScanning(false);
    }, 1300);
  };

  // Compatible Blood Types
  const compatibleTypes = useMemo(() => {
    return getCompatibleDonorTypes(recipientBloodType);
  }, [recipientBloodType]);

  // Ranked Compatible Donors List (100% Deterministic Proximity Calculation)
  const rankedDonors: RankedDonor[] = useMemo(() => {
    if (!allDonors || allDonors.length === 0) return [];

    return allDonors
      .filter((donor) => {
        const isAvail = donor.isAvailable !== false && donor.available !== false;
        return isAvail && compatibleTypes.includes(donor.bloodType);
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
          isCompatible: true,
          tier
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [allDonors, compatibleTypes, userCoords]);

  // Dispatch Emergency Alert to Donor
  const handleDispatchDonor = async (donor: RankedDonor) => {
    setDispatchingDonorId(donor.id);
    setNotification(null);

    try {
      const res = await dispatchEmergencyDonorApi({
        donor_id: donor.id,
        donor_name: donor.fullName,
        donor_email: donor.email,
        donor_phone: donor.phone,
        patient_name: patientName,
        recipient_blood_type: recipientBloodType,
        units_needed: unitsNeeded,
        hospital: hospital,
        locality: customLocalityInput.trim() || selectedLocality,
        urgency: urgency,
        clinician_name: clinicianName,
        emergency_contact: emergencyPhone,
        message: clinicalNotes
      });

      if (res.ok) {
        setDispatchedDonorIds((prev) => ({ ...prev, [donor.id]: true }));
        setNotification({
          message: `Emergency dispatch email transmitted successfully to lifesaver ${donor.fullName}!`,
          type: 'success'
        });
      } else {
        setNotification({
          message: res.error || 'Failed to dispatch email. Please check network connection.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({
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
      setNotification({ message: 'No compatible donors available to email.', type: 'error' });
      return;
    }
    setIsEmailingRoster(true);
    setNotification(null);

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
        clinician_email: clinicianEmail,
        clinician_name: clinicianName,
        patient_name: patientName,
        recipient_blood_type: recipientBloodType,
        units_needed: unitsNeeded,
        hospital: hospital,
        locality: customLocalityInput.trim() || selectedLocality,
        urgency: urgency,
        emergency_phone: emergencyPhone,
        roster_items: rosterItems
      });

      if (res.ok) {
        setNotification({
          message: `Ranked donor roster briefing transmitted to ${clinicianEmail}!`,
          type: 'success'
        });
      } else {
        setNotification({
          message: res.error || 'Failed to send roster briefing email.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({
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
      setNotification({ message: 'No compatible donors available for PDF docket.', type: 'error' });
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
          recipientBloodType,
          patientName,
          hospitalName: hospital,
          hospitalLocality: customLocalityInput.trim() || selectedLocality,
          searchCoordinates: userCoords,
          timestamp: new Date().toISOString()
        },
        donorItems
      );

      setNotification({
        message: 'Clinical Emergency Donor Mobilization Docket PDF downloaded successfully!',
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        message: err.message || 'Failed to render PDF document.',
        type: 'error'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header Banner */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-xs font-semibold tracking-wide">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-600" />
              100% Deterministic Clinical Proximity Radar
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Real-Time Geospatial Blood Matcher
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Instantaneous spherical Haversine proximity triage coupled with ABO/Rh cross-match matrix.
              Zero LLM latency — ranks nearest compatible lifesavers in under 15 milliseconds.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleEmailRoster}
              disabled={isEmailingRoster || rankedDonors.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all disabled:opacity-50"
            >
              {isEmailingRoster ? (
                <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
              ) : (
                <Mail className="w-4 h-4 text-red-600" />
              )}
              Email Me Top Donors
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || rankedDonors.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Download Emergency PDF
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs font-bold underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Clinical Input Console + Live Proximity Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Triage Parameters Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Crosshair className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Emergency Triage Parameters
              </h2>
            </div>

            {/* Recipient Blood Group Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Recipient Required Blood Type *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as BloodType[]).map((type) => {
                  const isSelected = recipientBloodType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setRecipientBloodType(type);
                        triggerClinicalScan();
                      }}
                      className={`py-2 px-3 rounded-xl font-black text-sm transition-all border ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-sm scale-105'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>

              {/* Compatible Donors Pill Bar */}
              <div className="mt-3 p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                <div className="text-xs font-bold text-red-900 dark:text-red-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                  Clinical Compatible Donor Matrix:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {compatibleTypes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-white dark:bg-slate-800 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Patient & Hospital Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Patient Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                    placeholder="Patient Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Units Needed
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={unitsNeeded}
                  onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Hospital / Transfusion Center
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. AIIMS Trauma Center"
                />
              </div>
            </div>

            {/* Geolocation & Delhi Locality Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Target Triage Location *
                </label>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                  {isDetectingGps ? 'Pinpointing GPS...' : 'Detect My GPS'}
                </button>
              </div>

              {gpsError && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                  {gpsError}
                </div>
              )}

              {/* Delhi Locality Dropdown / Select */}
              <select
                value={selectedLocality}
                onChange={(e) => {
                  setSelectedLocality(e.target.value);
                  setCustomLocalityInput('');
                  triggerClinicalScan();
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              >
                {DELHI_LOCALITY_NAMES.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Popular Locality Quick Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Connaught Place', 'South Extension', 'Rohini Sector 7', 'Dwarka Sector 10', 'Karol Bagh', 'Saket'].map((pill: string) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => {
                      const matched = DELHI_LOCALITY_NAMES.find((l: string) => l.toLowerCase().includes(pill.toLowerCase())) || pill;
                      setSelectedLocality(matched);
                      setCustomLocalityInput('');
                      triggerClinicalScan();
                    }}
                    className={`text-2xs font-semibold px-2 py-1 rounded-lg border transition-all ${
                      selectedLocality.toLowerCase().includes(pill.toLowerCase())
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Coordinates Indicator */}
              <div className="text-2xs text-slate-500 flex items-center justify-between pt-1">
                <span>Coordinates:</span>
                <span className="font-mono font-medium">
                  {userCoords.latitude.toFixed(4)}° N, {userCoords.longitude.toFixed(4)}° E
                </span>
              </div>
            </div>

            {/* Emergency Phone & Notes */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Emergency Phone
                </label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Urgency Level
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 font-bold"
                >
                  <option value="CRITICAL">CRITICAL (&lt; 1 Hour)</option>
                  <option value="URGENT">URGENT (&lt; 4 Hours)</option>
                  <option value="STANDARD">STANDARD</option>
                </select>
              </div>
            </div>

            {/* Trigger Re-scan Button */}
            <button
              type="button"
              onClick={triggerClinicalScan}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-red-600 dark:hover:bg-red-700 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              Re-Scan Proximity Radius
            </button>
          </div>
        </div>

        {/* Right Column: Radar Visualizer & Ranked Compatible Donors (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scanning Animation Radar Overlay */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-red-200 dark:border-red-900/60 shadow-lg text-center relative overflow-hidden"
              >
                {/* Radar Ripple Waves */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-red-500/20 rounded-full animate-ping" />
                  <div className="w-48 h-48 border-2 border-red-500/30 rounded-full animate-pulse" />
                  <div className="w-32 h-32 border-2 border-red-500/40 rounded-full" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 animate-bounce">
                    <Droplet className="w-8 h-8 fill-red-600" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Clinical Proximity Radar Active
                  </h3>
                  <div className="inline-block px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold font-mono text-red-600 dark:text-red-400">
                    {scanSteps[scanStepIndex]}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Summary Counter */}
          {!isScanning && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {rankedDonors.length} Compatible Lifesavers Identified
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sorted strictly ascending by spherical Haversine distance (closest on top)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Triage
                </span>
              </div>
            </div>
          )}

          {/* Donor Cards Ranked List */}
          {!isScanning && (
            <div className="space-y-3">
              {rankedDonors.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
                  <Droplet className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                    No active compatible donors found in this area
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try switching recipient blood type or expanding your Delhi NCR search radius.
                  </p>
                </div>
              ) : (
                rankedDonors.map((donor, index) => {
                  const isImmediate = donor.distanceKm <= 3.0;
                  const isDispatched = dispatchedDonorIds[donor.id];
                  const isDispatching = dispatchingDonorId === donor.id;

                  return (
                    <motion.div
                      key={donor.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all hover:shadow-md ${
                        isImmediate
                          ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/10'
                          : 'border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Donor Left Info */}
                        <div className="flex items-start gap-4">
                          {/* Rank & Blood Group Badge */}
                          <div className="flex flex-col items-center">
                            <span className="text-2xs font-extrabold text-slate-400 mb-1">
                              #{index + 1}
                            </span>
                            <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex flex-col items-center justify-center font-black text-sm shadow-sm">
                              {donor.bloodType}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {donor.fullName}
                              </h4>
                              {/* Proximity Badge */}
                              <span
                                className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${donor.tier.badgeClass}`}
                              >
                                {donor.tier.label} • {donor.distanceKm.toFixed(1)} km
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{donor.location || donor.city || 'Delhi NCR'}</span>
                            </div>

                            <div className="text-2xs text-slate-400 flex items-center gap-3 pt-0.5">
                              <span>Age: {donor.age}</span>
                              <span>•</span>
                              <span>Standby: Ready</span>
                              <span>•</span>
                              <span className="font-mono">{donor.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Donor Right Actions (Call & Dispatch) */}
                        <div className="flex items-center gap-2 sm:self-center flex-wrap">
                          {/* Call Button */}
                          <a
                            href={`tel:${donor.phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all"
                            title="Direct call lifesaver via workstation dialer"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            Call Lifesaver
                          </a>

                          {/* Urgent Dispatch Email Button */}
                          <button
                            type="button"
                            onClick={() => handleDispatchDonor(donor)}
                            disabled={isDispatching || isDispatched}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                              isDispatched
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
                            }`}
                          >
                            {isDispatching ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isDispatched ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            {isDispatched ? 'Dispatched' : 'Send Urgent Dispatch'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeospatialBloodMatcher;
