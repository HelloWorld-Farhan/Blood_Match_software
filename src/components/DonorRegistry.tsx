import React, { useState } from 'react';
import { BloodType, Donor } from '../types';
import { Users, Plus, Search, Filter, Phone, MapPin, Calendar, Heart, ShieldCheck, Droplet } from 'lucide-react';

interface DonorRegistryProps {
  donors: Donor[];
  onAddDonor: (donor: Omit<Donor, 'id' | 'registeredAt' | 'unitsDonatedTotal'>) => void;
  isOpenModal: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
}

export default function DonorRegistry({
  donors,
  onAddDonor,
  isOpenModal,
  onOpenModal,
  onCloseModal,
}: DonorRegistryProps) {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

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
      fullName: fullName.trim(),
      bloodType,
      age: Number(age),
      gender,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      city: city.trim(),
      state: state.trim() || 'Active Jurisdiction',
      available,
      lastDonationDate: new Date().toISOString().split('T')[0],
    });

    // Reset form
    setFullName('');
    setPhone('');
    setEmail('');
    setCity('');
    setState('');
    onCloseModal();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 mb-2">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Voluntary Donor Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Registered Donor Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Locate and coordinate certified voluntary blood donors with verified RhD status and immediate mobilization readiness.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blood-600 to-blood-700 hover:from-blood-500 hover:to-blood-600 text-white text-xs font-bold shadow-lg shadow-blood-900/50 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Donor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search donors by name, city, blood type or phone..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blood-500 backdrop-blur-md"
          />
        </div>

        {/* Blood Group Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === 'ALL'
                ? 'bg-blood-600 text-white shadow-md shadow-blood-900/40'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Groups
          </button>
          {bloodTypes.map(bt => (
            <button
              key={bt}
              type="button"
              onClick={() => setSelectedFilter(bt)}
              className={`px-2.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedFilter === bt
                  ? 'bg-blood-600 text-white shadow-md shadow-blood-900/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      {/* Donor Grid or Empty State */}
      {filteredDonors.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
            <Users className="w-8 h-8 text-blood-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Donors in Directory</h3>
            <p className="text-xs text-slate-400">
              {search || selectedFilter !== 'ALL'
                ? 'No donors match your search or filter parameters. Try clearing your filters.'
                : 'The donor directory is initially zero. Register verified volunteer donors to begin coordination.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenModal}
            className="px-5 py-2.5 rounded-xl bg-blood-600 hover:bg-blood-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            + Register First Donor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map(donor => (
            <div
              key={donor.id}
              className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 backdrop-blur-xl transition-all shadow-md hover:shadow-xl space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{donor.fullName}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {donor.id} · {donor.age} yrs · {donor.gender}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blood-600 to-blood-800 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blood-950/60 border border-blood-500/40">
                  {donor.bloodType}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <a href={`tel:${donor.phone}`} className="hover:text-blood-400 transition-colors">
                    {donor.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{donor.city}, {donor.state}</span>
                </div>
                {donor.lastDonationDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Last Donated: {donor.lastDonationDate}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                  donor.available ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${donor.available ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  {donor.available ? 'Ready to Donate' : 'Unavailable'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {donor.unitsDonatedTotal} units logged
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Donor Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-blood-500" />
                <h3 className="text-base font-bold text-white">Register Blood Donor</h3>
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
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Farhan Khalid"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                />
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
                  <label className="block text-slate-300 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blood-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blood-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="donor@mail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City / District</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blood-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="rounded border-slate-800 text-blood-600 focus:ring-blood-500"
                />
                <label htmlFor="availCheck" className="text-slate-300">
                  Donor is currently healthy, eligible, and ready for call
                </label>
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
                  className="px-5 py-2 rounded-xl bg-blood-600 hover:bg-blood-500 text-white font-bold cursor-pointer shadow-md shadow-blood-900/40"
                >
                  Save Donor Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
