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
        className="p-6 sm:p-8 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/30 mb-2">
            <Users className="w-3.5 h-3.5 text-[#D72638]" />
            <span>Voluntary Transfusion Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
            Certified Donor Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-1 max-w-xl">
            Directory of screened, voluntary blood donors on standby for emergency cross-matching and local hospital response.
          </p>
        </div>

        <button
          onClick={() => setIsOpenModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/25 transition-all cursor-pointer shrink-0"
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#D9C7C2] focus:border-[#D72638] text-xs text-[#1A1D20] placeholder-slate-400 outline-hidden shadow-xs"
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
                  ? 'bg-[#D72638] text-white shadow-md shadow-[#D72638]/30 scale-105'
                  : 'bg-white text-[#4A5568] hover:text-[#1A1D20] border border-[#D9C7C2]'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      {/* Donors Grid */}
      {filteredDonors.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/80 border border-dashed border-[#D9C7C2]">
          <Heart className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#1A1D20]">No registered donors found</h3>
          <p className="text-xs text-[#5A626A] mt-1 max-w-md mx-auto">
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
              className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] flex flex-col items-center justify-center font-black text-white shadow-md shadow-[#D72638]/20 border border-[#D72638]/40">
                      <span className="text-[10px] uppercase font-bold text-red-100">Blood</span>
                      <span className="text-base">{donor.bloodType}</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[#1A1D20] text-base">{donor.fullName}</h3>
                      <div className="text-xs text-[#5A626A] mt-0.5">
                        {donor.age} yrs • {donor.gender}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                    donor.isAvailable 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-[#F5F1EF] text-slate-500 border-[#D9C7C2]'
                  }`}>
                    {donor.isAvailable ? 'Ready' : 'Resting'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#5A626A] py-2 border-y border-[#D9C7C2]/60">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#D72638] shrink-0" />
                    <span>{donor.city}, {donor.state}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{donor.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-mono">{donor.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                <span className="text-[#5A626A] text-[11px]">
                  Total Pints: <strong className="text-[#1A1D20]">{donor.unitsDonatedTotal}</strong>
                </span>
                <a
                  href={`tel:${donor.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D72638]/10 hover:bg-[#D72638]/20 text-[#D72638] border border-[#D72638]/30 font-bold transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl bg-white border border-[#D9C7C2] p-5 sm:p-6 shadow-2xl text-[#1A1D20]">
            <button
              onClick={() => setIsOpenModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-[#1A1D20] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-[#1A1D20] mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D72638]" />
              <span>Register Voluntary Blood Donor</span>
            </h2>
            <p className="text-xs text-[#5A626A] mb-4">
              Enrolls candidate into the emergency mobilization ledger with ABO/Rh screening.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Blood Group</label>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Age (18 - 65)</label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Biological Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Donor['gender'])}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane.doe@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Metropolis"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">State / Province</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="NY"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
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
