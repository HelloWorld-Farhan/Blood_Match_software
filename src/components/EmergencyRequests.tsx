import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, Variants } from 'framer-motion';
import { BloodType, EmergencyRequest, UrgencyLevel, Donor } from '../types';
import { BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';
import { AlertTriangle, Plus, CheckCircle, Hospital, ShieldAlert, X, Phone } from 'lucide-react';
import { getEmergencyRequests, saveEmergencyRequests, getDonors } from '../services/storage';
import { COUNTRY_CODES, validatePhoneNumber } from '../utils/countryCodes';

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

export default function EmergencyRequests() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number>(35);
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [unitsNeeded, setUnitsNeeded] = useState<number>(2);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalCity, setHospitalCity] = useState('');
  const [hospitalWard, setHospitalWard] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [contactName, setContactName] = useState('');
  const [countryDialCode, setCountryDialCode] = useState<string>('+91'); // Default Indian country code
  const [contactPhone, setContactPhone] = useState('');
  const [reason, setReason] = useState('');
  const [emergencyConfirmed, setEmergencyConfirmed] = useState<boolean>(false); // Unchecked by default
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const loadData = () => {
    setRequests(getEmergencyRequests());
    setDonors(getDonors());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  // Lock body scroll while popup is open
  useEffect(() => {
    if (isOpenModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenModal]);

  const onAddRequest = (newReqData: Omit<EmergencyRequest, 'id' | 'status' | 'createdAt'>) => {
    const newRequest: EmergencyRequest = {
      ...newReqData,
      id: `REQ-${Date.now().toString().slice(-6)}`,
      status: 'urgent',
      createdAt: new Date().toISOString(),
    };
    const updated = [newRequest, ...requests];
    saveEmergencyRequests(updated);
    setRequests(updated);
  };

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
    saveEmergencyRequests(updated);
    setRequests(updated);
  };

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setFormErrors({});
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

    if (!hospitalName.trim()) {
      errors.hospitalName = 'Hospital or clinic facility name is required';
    }

    if (!hospitalCity.trim()) {
      errors.hospitalCity = 'City is required for localized donor dispatch';
    }

    const phoneVal = validatePhoneNumber(countryDialCode, contactPhone);
    if (!phoneVal.isValid) {
      errors.contactPhone = phoneVal.message || 'Please enter a valid emergency contact number';
    }

    if (!emergencyConfirmed) {
      errors.emergencyConfirmed = 'You must confirm this emergency dispatch authorization to proceed';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onAddRequest({
      patientName: patientName.trim(),
      patientAge,
      bloodType,
      unitsNeeded,
      hospital: hospitalName.trim(),
      hospitalCity: hospitalCity.trim(),
      ward: hospitalWard.trim() || 'Emergency Triage',
      urgency,
      contactName: contactName.trim() || patientName.trim(),
      contactNumber: `${countryDialCode} ${contactPhone.trim()}`,
      reason: reason.trim(),
    });

    setPatientName('');
    setPatientAge(35);
    setUnitsNeeded(2);
    setHospitalName('');
    setHospitalCity('');
    setHospitalWard('');
    setContactName('');
    setContactPhone('');
    setReason('');
    setEmergencyConfirmed(false);
    setFormErrors({});
    setIsOpenModal(false);
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
            <AlertTriangle className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Emergency Dispatch Queue</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Transfusion Blood Requests
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-xl">
            Live triage board of urgent patient transfusion requirements. Broadcasts notifications to compatible donors automatically.
          </p>
        </div>

        <button
          onClick={() => {
            setIsOpenModal(true);
            setFormErrors({});
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Broadcast Emergency Request</span>
        </button>
      </motion.div>

      {/* Filter Tabs with Scroll Blur-In */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="flex flex-wrap gap-2"
      >
        {['ALL', 'urgent', 'critical', 'fulfilled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === status
                ? 'bg-[#D72638] text-white shadow-md shadow-[#D72638]/30'
                : 'bg-white text-[#4A5568] hover:text-[#1A1D20] border border-[#D9C7C2]'
            }`}
          >
            {status.toUpperCase()} ({status === 'ALL' ? requests.length : requests.filter(r => r.status === status).length})
          </button>
        ))}
      </motion.div>

      {/* Request Cards Grid with Scroll Blur-In */}
      <motion.div
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white/80 border border-dashed border-[#D9C7C2]">
            <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#1A1D20]">No active requests found</h3>
            <p className="text-xs text-[#5A626A] mt-1 max-w-md mx-auto">
              {filterStatus === 'ALL' 
                ? 'No emergency transfusion requests have been broadcast yet. Click "Broadcast Emergency Request" above to initiate a real-time call.'
                : `There are currently no requests with "${filterStatus}" status.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((req, index) => {
              const compatibleDonors = donors.filter(d => 
                d.isAvailable && BLOOD_COMPATIBILITY_TABLE[d.bloodType].canGiveTo.includes(req.bloodType)
              );

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] flex flex-col items-center justify-center font-black text-white shadow-md shadow-[#D72638]/20 border border-[#D72638]/40">
                          <span className="text-[10px] uppercase font-bold text-red-100">Req</span>
                          <span className="text-base">{req.bloodType}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-[#1A1D20] text-base">{req.patientName}</h3>
                            <span className="text-xs text-[#5A626A]">({req.patientAge} yrs)</span>
                          </div>
                          <div className="text-xs text-[#5A626A] flex items-center gap-1.5 mt-0.5">
                            <Hospital className="w-3.5 h-3.5 text-[#D72638]" />
                            <span>{req.hospital}, {req.hospitalCity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          req.status === 'critical' ? 'bg-red-50 text-[#D72638] border-red-300 animate-pulse' :
                          req.status === 'urgent' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          {req.status}
                        </span>
                        <div className="text-xs font-black text-[#D72638] font-mono mt-1">
                          {req.unitsNeeded} Pints Required
                        </div>
                      </div>
                    </div>

                    {req.reason && (
                      <p className="text-xs text-[#5A626A] bg-[#F5F1EF] p-2.5 rounded-xl border border-[#D9C7C2]/60 mb-3">
                        "{req.reason}"
                      </p>
                    )}

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <span className="text-[#5A626A]">Matching Standby Donors:</span>
                      <span className="font-bold text-[#1A1D20]">
                        {compatibleDonors.length} Verified Volunteers in Radius
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-between">
                    <a
                      href={`tel:${req.contactNumber}`}
                      className="flex items-center gap-1.5 text-xs text-[#5A626A] hover:text-[#1A1D20] font-semibold"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{req.contactNumber}</span>
                    </a>

                    {req.status !== 'fulfilled' && (
                      <button
                        onClick={() => onUpdateStatus(req.id, 'fulfilled')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold cursor-pointer transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Fulfilled</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Broadcast Request Modal - Rendered via React Portal with Full Website Blur */}
      {isOpenModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/65 backdrop-blur-md animate-fade-in"
          onClick={handleCloseModal}
        >
          <div 
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl bg-white border border-[#D9C7C2] p-4 sm:p-6 md:p-8 shadow-2xl text-[#1A1D20]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg sm:text-xl font-black text-[#1A1D20] mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D72638]" />
              <span>Broadcast Emergency Transfusion Request</span>
            </h2>
            <p className="text-xs text-[#5A626A] mb-4">
              Transmits real-time alert to registered donors matching recipient ABO/Rh antibodies.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    Patient Name <span className="text-[#D72638]">*</span>
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => {
                      setPatientName(e.target.value);
                      if (formErrors.patientName) setFormErrors(prev => ({ ...prev, patientName: '' }));
                    }}
                    placeholder="Marcus Vance"
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.patientName ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.patientName && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.patientName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
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
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.patientAge ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.patientAge && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.patientAge}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    Blood Type <span className="text-[#D72638]">*</span>
                  </label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value as BloodType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] font-bold outline-hidden focus:border-[#D72638] cursor-pointer"
                  >
                    {bloodTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
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
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.unitsNeeded ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.unitsNeeded && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.unitsNeeded}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    Hospital / Clinic <span className="text-[#D72638]">*</span>
                  </label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => {
                      setHospitalName(e.target.value);
                      if (formErrors.hospitalName) setFormErrors(prev => ({ ...prev, hospitalName: '' }));
                    }}
                    placeholder="St. Jude Trauma Hospital"
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.hospitalName ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.hospitalName && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.hospitalName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    City <span className="text-[#D72638]">*</span>
                  </label>
                  <input
                    type="text"
                    value={hospitalCity}
                    onChange={(e) => {
                      setHospitalCity(e.target.value);
                      if (formErrors.hospitalCity) setFormErrors(prev => ({ ...prev, hospitalCity: '' }));
                    }}
                    placeholder="Metro City"
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.hospitalCity ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.hospitalCity && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.hospitalCity}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    Emergency Phone <span className="text-[#D72638]">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={countryDialCode}
                      onChange={(e) => {
                        setCountryDialCode(e.target.value);
                        if (formErrors.contactPhone) setFormErrors(prev => ({ ...prev, contactPhone: '' }));
                      }}
                      className="px-2 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs font-bold text-[#1A1D20] outline-hidden focus:border-[#D72638] shrink-0 cursor-pointer max-w-[105px]"
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
                      className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                        formErrors.contactPhone ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                      } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                    />
                  </div>
                  {formErrors.contactPhone && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.contactPhone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Triage Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] font-bold outline-hidden focus:border-[#D72638] cursor-pointer"
                  >
                    <option value="CRITICAL">CRITICAL (&lt; 1 Hour)</option>
                    <option value="URGENT">URGENT (&lt; 4 Hours)</option>
                    <option value="ROUTINE">ROUTINE (Within 24 Hours)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Clinical Indication / Diagnosis</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Emergency acute surgical hemoperitoneum, cross-matching required immediately..."
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] resize-none outline-hidden focus:border-[#D72638]"
                />
              </div>

              {/* Mandatory Emergency Confirmation Checkbox (Unchecked by Default) */}
              <div className="pt-2">
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
                  <span className="text-xs text-[#5A626A] leading-relaxed">
                    I confirm this is an authentic clinical transfusion emergency authorized by attending medical personnel for immediate donor dispatch. <span className="text-[#D72638]">*</span>
                  </span>
                </label>
                {formErrors.emergencyConfirmed && (
                  <p className="text-red-500 text-[11px] font-semibold mt-1.5 ml-6">{formErrors.emergencyConfirmed}</p>
                )}
              </div>

              <div className="pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#5A626A] hover:text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer active:scale-95 transition-all"
                >
                  Confirm & Broadcast Request
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}