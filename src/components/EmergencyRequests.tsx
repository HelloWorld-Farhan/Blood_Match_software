import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { BloodType, EmergencyRequest, UrgencyLevel, Donor } from '../types';
import { BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';
import { AlertTriangle, Plus, CheckCircle, Hospital, Heart, ShieldAlert, Sparkles, X, Phone } from 'lucide-react';
import { getEmergencyRequests, saveEmergencyRequests, getDonors } from '../services/storage';

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
  const [contactPhone, setContactPhone] = useState('');
  const [reason, setReason] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !hospitalName || !contactPhone) return;

    onAddRequest({
      patientName,
      patientAge,
      bloodType,
      unitsNeeded,
      hospital: hospitalName,
      hospitalCity,
      ward: hospitalWard,
      urgency,
      contactName,
      contactNumber: contactPhone,
      reason,
    });

    setPatientName('');
    setHospitalName('');
    setHospitalCity('');
    setHospitalWard('');
    setContactName('');
    setContactPhone('');
    setReason('');
    setIsOpenModal(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 sm:space-y-8 pb-12 relative z-10"
    >
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
          onClick={() => setIsOpenModal(true)}
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
            const compatibleTypes = BLOOD_COMPATIBILITY_TABLE[req.bloodType].canReceiveFrom;
            const eligibleDonors = donors.filter(d => compatibleTypes.includes(d.bloodType) && d.isAvailable);

            return (
              <motion.div 
                key={req.id} 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                whileHover={{ y: -3, scale: 1.015 }}
                className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] flex flex-col items-center justify-center font-black text-white shadow-md shadow-[#D72638]/20 border border-[#D72638]/40">
                        <span className="text-[10px] uppercase font-bold text-red-100">Type</span>
                        <span className="text-base">{req.bloodType}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-[#1A1D20] text-base">{req.patientName}</h3>
                          <span className="text-xs text-[#5A626A]">({req.patientAge}y)</span>
                        </div>
                        <div className="text-xs text-[#5A626A] flex items-center gap-1.5 mt-0.5">
                          <Hospital className="w-3.5 h-3.5 text-[#D72638]" />
                          <span>{req.hospital}</span>
                          {req.hospitalCity && <span>• {req.hospitalCity}</span>}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      req.status === 'urgent' ? 'bg-red-100 text-[#D72638] border-red-200 animate-pulse' :
                      req.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {req.reason && (
                    <p className="text-xs text-[#1A1D20] bg-[#F5F1EF] p-2.5 rounded-xl border border-[#D9C7C2] mb-3">
                      <span className="text-[#7A0C17] font-bold mr-1">Clinical Note:</span>
                      {req.reason}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#5A626A] mb-3">
                    <div className="p-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                      <span className="text-[10px] text-[#5A626A] block">Units Required</span>
                      <span className="font-bold text-[#1A1D20] text-sm">{req.unitsNeeded} Pints Whole Blood</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                      <span className="text-[10px] text-[#5A626A] block">Contact Desk</span>
                      <span className="font-bold text-[#1A1D20] text-xs truncate block">{req.contactNumber}</span>
                    </div>
                  </div>

                  {/* Compatible Donor Alert Matcher */}
                  <div className="p-3 rounded-xl bg-[#7A0C17]/10 border border-[#7A0C17]/20 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[#7A0C17] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#D72638]" />
                        <span>Eligible Donor Match Pool</span>
                      </span>
                      <span className="text-[10px] text-[#7A0C17] font-mono font-bold">
                        {eligibleDonors.length} Ready Donors
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A626A]">
                      Can receive red cells from: <strong className="text-[#1A1D20]">{compatibleTypes.join(', ')}</strong>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#D9C7C2]/60 flex items-center justify-between">
                  <a
                    href={`tel:${req.contactNumber}`}
                    className="flex items-center gap-1.5 text-xs text-[#5A626A] hover:text-[#1A1D20] font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Call Coordinator</span>
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

      {/* Broadcast Request Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-[#D9C7C2] p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar text-[#1A1D20]">
            <button
              onClick={() => setIsOpenModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-[#1A1D20] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-[#1A1D20] mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D72638]" />
              <span>Broadcast Emergency Transfusion Request</span>
            </h2>
            <p className="text-xs text-[#5A626A] mb-4">
              Transmits real-time alert to registered donors matching recipient ABO/Rh antibodies.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Marcus Vance"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Blood Type</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value as BloodType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] font-bold outline-hidden focus:border-[#D72638]"
                  >
                    {bloodTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Units Needed (Pints)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={unitsNeeded}
                    onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Hospital / Clinic</label>
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="St. Jude Trauma Hospital"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">City</label>
                  <input
                    type="text"
                    value={hospitalCity}
                    onChange={(e) => setHospitalCity(e.target.value)}
                    placeholder="Metro City"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (555) 921-0021"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Triage Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] font-bold outline-hidden focus:border-[#D72638]"
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

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A626A] hover:text-[#1A1D20] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 cursor-pointer"
                >
                  Confirm & Broadcast Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
