import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BloodType, Donor } from '../types';
import { Users, Plus, Search, Phone, MapPin, Heart, X, Mail } from 'lucide-react';
import { getDonors, saveDonors } from '../services/storage';

export default function DonorRegistry() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  // Form states for donor registration
  const [fullName, setFullName] = useState('');
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [age, setAge] = useState<number>(28);
  const [gender, setGender] = useState<Donor['gender']>('MALE');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [available, setAvailable] = useState(true);

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const loadData = () => {
    setDonors(getDonors());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const onAddDonor = (newDonorData: Omit<Donor, 'id' | 'registeredAt' | 'unitsDonatedTotal'>) => {
    const newDonor: Donor = {
      ...newDonorData,
      id: `DNR-${Date.now().toString().slice(-6)}`,
      registeredAt: new Date().toISOString(),
      unitsDonatedTotal: 0,
    };
    const updated = [newDonor, ...donors];
    saveDonors(updated);
    setDonors(updated);
  };

  const filteredDonors = donors.filter(d => {
    const matchesFilter = selectedFilter === 'ALL' || d.bloodType === selectedFilter;
    const query = search.toLowerCase();
    const matchesSearch = 
      d.fullName.toLowerCase().includes(query) ||
      d.city.toLowerCase().includes(query) ||
      d.phone.includes(query) ||
      d.bloodType.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email || !city) return;

    onAddDonor({
      fullName,
      bloodType,
      age,
      gender,
      phone,
      email,
      city,
      state: state || 'Central',
      isAvailable: available,
    });

    setFullName('');
    setPhone('');
    setEmail('');
    setCity('');
    setState('');
    setIsOpenModal(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 sm:space-y-8 pb-12"
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="p-6 sm:p-8 rounded-2xl bg-[#0E0E10]/85 backdrop-blur-xl border border-[#6A040F]/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D00000]/20 text-red-200 text-xs font-bold border border-[#D00000]/40 mb-2">
            <Users className="w-3.5 h-3.5 text-[#D00000]" />
            <span>Voluntary Transfusion Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Certified Donor Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Directory of screened, voluntary blood donors on standby for emergency cross-matching and local hospital response.
          </p>
        </div>

        <button
          onClick={() => setIsOpenModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D00000] hover:bg-[#b00000] text-white font-bold text-sm shadow-xl shadow-[#D00000]/30 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Donor</span>
        </button>
      </motion.div>

      {/* Controls & Blood Group Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, city, phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#2A2A2F]/80 border border-[#2A2A2F] focus:border-[#D00000] text-xs text-white placeholder-slate-400 outline-hidden"
          />
        </div>

        {/* Blood Group Filter Pills */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {['ALL', ...bloodTypes].map(bt => (
            <button
              key={bt}
              onClick={() => setSelectedFilter(bt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === bt
                  ? 'bg-[#D00000] text-white shadow-md shadow-[#D00000]/40 scale-105'
                  : 'bg-[#2A2A2F]/70 text-slate-300 hover:text-white border border-[#2A2A2F]'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      {/* Donors Grid */}
      {filteredDonors.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0E0E10]/80 border border-dashed border-[#6A040F]/50">
          <Heart className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No registered donors found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {search || selectedFilter !== 'ALL'
              ? 'No donors match your search or filter criteria. Try resetting your filters.'
              : 'The voluntary donor registry currently has zero donors. Register your first donor using the button above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map((donor, index) => (
            <motion.div
              key={donor.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              whileHover={{ y: -3, scale: 1.015 }}
              className="p-5 rounded-2xl bg-[#0E0E10]/85 backdrop-blur-xl border border-[#6A040F]/45 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D00000] to-[#6A040F] flex flex-col items-center justify-center font-black text-white shadow-lg shadow-black/60 border border-[#D00000]/40">
                      <span className="text-[10px] uppercase font-bold text-red-200">Blood</span>
                      <span className="text-base">{donor.bloodType}</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base">{donor.fullName}</h3>
                      <div className="text-xs text-slate-300 mt-0.5">
                        {donor.age} yrs • {donor.gender}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                    donor.isAvailable 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-[#2A2A2F] text-slate-400 border-[#2A2A2F]'
                  }`}>
                    {donor.isAvailable ? 'Ready' : 'Resting'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 py-2 border-y border-[#2A2A2F]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#D00000] shrink-0" />
                    <span>{donor.city}, {donor.state}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{donor.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono">{donor.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Total Pints: <strong className="text-white">{donor.unitsDonatedTotal}</strong>
                </span>
                <a
                  href={`tel:${donor.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D00000]/25 hover:bg-[#D00000]/40 text-red-100 border border-[#D00000]/40 font-semibold transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  <span>Mobilize</span>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Register Donor Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl bg-[#0E0E10]/95 backdrop-blur-2xl border border-[#6A040F]/60 p-5 sm:p-6 shadow-2xl">
            <button
              onClick={() => setIsOpenModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D00000]" />
              <span>Register Voluntary Blood Donor</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enrolls candidate into the emergency mobilization ledger with ABO/Rh screening.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2A2F] border border-[#2A2A2F] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Blood Group</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value as BloodType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2A2F] border border-[#2A2A2F] text-xs text-white font-bold"
                  >
                    {bloodTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Age (18 - 65)</label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2A2F] border border-[#2A2A2F] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Biological Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Donor['gender'])}
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2A2F] border border-[#2A2A2F] text-xs text-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2A2F] border border-[#2A2A2F] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane.doe@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2A2F] border border-[#2A2A2F] text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Metropolis"
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2A2F] border border-[#2A2A2F] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State / Province</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="NY"
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2A2F] border border-[#2A2A2F] text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#D00000] hover:bg-[#b00000] text-white text-xs font-bold shadow-md shadow-[#D00000]/40 cursor-pointer"
                >
                  Register Donor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
