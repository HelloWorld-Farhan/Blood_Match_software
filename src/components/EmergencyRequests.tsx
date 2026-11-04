import React, { useState } from 'react';
import { BloodType, EmergencyRequest, UrgencyLevel, Donor } from '../types';
import { BLOOD_COMPATIBILITY_TABLE } from '../utils/bloodCompatibility';
import { AlertTriangle, Plus, CheckCircle, Clock, MapPin, Phone, Hospital, Heart, ShieldAlert, Sparkles } from 'lucide-react';

interface EmergencyRequestsProps {
  requests: EmergencyRequest[];
  donors: Donor[];
  onAddRequest: (req: Omit<EmergencyRequest, 'id' | 'status' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: EmergencyRequest['status'], matchedDonorId?: string) => void;
  isOpenModal: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
}

export default function EmergencyRequests({
  requests,
  donors,
  onAddRequest,
  onUpdateStatus,
  isOpenModal,
  onOpenModal,
  onCloseModal,
}: EmergencyRequestsProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

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

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !hospitalName || !contactPhone) return;

    onAddRequest({
      patientName: patientName.trim(),
      patientAge: Number(patientAge),
      bloodType,
      unitsNeeded: Number(unitsNeeded),
      hospitalName: hospitalName.trim(),
      hospitalCity: hospitalCity.trim() || 'Metro Hospital Zone',
      hospitalWard: hospitalWard.trim() || 'ICU / Emergency Wing',
      urgency,
      contactName: contactName.trim() || 'Attending Coordinator',
      contactPhone: contactPhone.trim(),
      reason: reason.trim() || 'Immediate surgical blood replacement',
    });

    // Reset
    setPatientName('');
    setHospitalName('');
    setHospitalCity('');
    setHospitalWard('');
    setContactName('');
    setContactPhone('');
    setReason('');
    onCloseModal();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blood-600/20 text-blood-300 text-xs font-bold border border-blood-500/30 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-blood-400" />
            <span>Emergency Transfusion Alarm</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Active Blood Requests Board
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Broadcast emergency hospital calls, identify antigen-compatible donors in real-time, and log transfusion handoffs.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blood-600 to-blood-700 hover:from-blood-500 hover:to-blood-600 text-white text-xs font-bold shadow-lg shadow-blood-900/50 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Emergency Call</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['ALL', 'PENDING', 'MATCHED', 'FULFILLED'].map(status => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === status
                ? 'bg-blood-600 text-white shadow-md shadow-blood-900/40'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {status} ({requests.filter(r => status === 'ALL' || r.status === status).length})
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Emergency Requests</h3>
            <p className="text-xs text-slate-400">
              There are no active emergency blood calls logged in the system. Hospital supplies are stable.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenModal}
            className="px-5 py-2.5 rounded-xl bg-blood-600 hover:bg-blood-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            + Create First Call
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(req => {
            const compatibleDonorTypes = BLOOD_COMPATIBILITY_TABLE[req.bloodType].canReceiveFrom;
            const eligibleDonors = donors.filter(
              d => d.available && compatibleDonorTypes.includes(d.bloodType)
            );

            return (
              <div
                key={req.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 backdrop-blur-xl transition-all shadow-md space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blood-600 to-blood-800 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blood-950/80 border border-blood-500/40 shrink-0">
                      {req.bloodType}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{req.patientName}</h3>
                        <span className="text-xs text-slate-400">({req.patientAge} yrs)</span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-blood-400">{req.id}</span>
                        <span>·</span>
                        <span>{req.unitsNeeded} Units Required</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      req.urgency === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : req.urgency === 'URGENT'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {req.urgency} Urgency
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      req.status === 'PENDING'
                        ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                        : req.status === 'MATCHED'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Details Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Hospital className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{req.hospitalName} ({req.hospitalWard})</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{req.hospitalCity}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 font-mono">
                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                    <a href={`tel:${req.contactPhone}`} className="hover:text-blood-400">
                      {req.contactName}: {req.contactPhone}
                    </a>
                  </div>
                </div>

                {/* Clinical Notes & Matching Donors */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-slate-400">Clinical Reason: </span>
                    <span className="text-slate-200">{req.reason}</span>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Eligible Donor Types:</span>
                      {compatibleDonorTypes.map(t => (
                        <span key={t} className="px-1.5 py-0.2 rounded bg-slate-800 text-blood-400 font-black">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(req.id, 'MATCHED')}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 font-bold transition-all cursor-pointer"
                        >
                          Match Available Donors ({eligibleDonors.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(req.id, 'FULFILLED')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Mark Fulfilled
                        </button>
                      </>
                    )}
                    {req.status === 'MATCHED' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(req.id, 'FULFILLED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer"
                      >
                        Confirm Transfusion Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Emergency Request Creation Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blood-500" />
                <h3 className="text-base font-bold text-white">Broadcast Emergency Blood Call</h3>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Patient Age</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={patientAge}
                    onChange={(e) => setPatientAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blood-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Blood Type</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value as BloodType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-blood-400 font-bold focus:outline-none focus:border-blood-500"
                  >
                    {bloodTypes.map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Units Needed</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={unitsNeeded}
                    onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blood-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-rose-400 font-bold focus:outline-none focus:border-blood-500"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="URGENT">Urgent</option>
                    <option value="STANDARD">Standard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Hospital / Clinic</label>
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="Metro City General Hospital"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City / Region</label>
                  <input
                    type="text"
                    value={hospitalCity}
                    onChange={(e) => setHospitalCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Coordinator</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Dr. Nurse In-Charge"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91-9988776655"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Clinical Indication / Reason</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Post-operative hemorrhage, acute trauma resuscitation..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blood-600 to-blood-700 hover:from-blood-500 hover:to-blood-600 text-white font-bold cursor-pointer shadow-lg shadow-blood-900/40"
                >
                  Broadcast Emergency Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
