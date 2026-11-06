import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, Variants } from 'framer-motion';
import { BloodType, Donor } from '../types';
import { Users, Plus, Search, Phone, MapPin, Heart, X, Mail, Activity, ShieldCheck } from 'lucide-react';
import { getDonors, saveDonors } from '../services/storage';
import { COUNTRY_CODES, validatePhoneNumber, validateEmail } from '../utils/countryCodes';

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
  const [countryDialCode, setCountryDialCode] = useState<string>('+91'); // Default Indian country code
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [consentChecked, setConsentChecked] = useState<boolean>(false); // Unchecked by default
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const loadData = () => {
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

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Full legal name is required (at least 2 characters)';
    }

    if (!age || age < 18 || age > 65) {
      errors.age = 'Donor age must be between 18 and 65 years';
    }

    const phoneValidation = validatePhoneNumber(countryDialCode, phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.message || 'Please enter a valid phone number';
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message || 'Please enter a valid email address';
    }

    if (!city.trim()) {
      errors.city = 'City is required for localized donor matching';
    }

    if (!consentChecked) {
      errors.consent = 'You must certify donor eligibility and consent to proceed';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onAddDonor({
      fullName: fullName.trim(),
      bloodType,
      age,
      gender,
      phone: `${countryDialCode} ${phone.trim()}`,
      email: email.trim(),
      city: city.trim(),
      state: state.trim() || 'Central',
      isAvailable: true,
    });

    setFullName('');
    setPhone('');
    setEmail('');
    setCity('');
    setState('');
    setConsentChecked(false);
    setFormErrors({});
    setIsOpenModal(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 relative z-10">
      {/* Header */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
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
          onClick={() => {
            setIsOpenModal(true);
            setFormErrors({});
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Donor</span>
        </button>
      </motion.div>

      {/* Featured Large-Format Apheresis Mobilization Live Monitor (6973-197914400_medium.mp4) */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="p-5 sm:p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D9C7C2] shadow-sm overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-6">
          {/* Prominent High-Definition Cellular Apheresis Video Monitor */}
          <div 
            className="relative w-full lg:w-3/5 rounded-2xl overflow-hidden border border-[#D72638]/40 shadow-md bg-black min-h-[260px] sm:min-h-[300px] flex items-center justify-center"
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
              className="w-full h-full object-cover pointer-events-none"
              style={{ transform: 'translateZ(0)' }}
            />
            {/* Live Mobilization Telemetry Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
            
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold">
                <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping" />
                Live Apheresis Mobilization Bay
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D72638]/90 text-white font-mono font-bold text-[11px] shadow-xs">
                Cellular Stream 60fps
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white pointer-events-none">
              <div>
                <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Apheresis Readiness Pool</span>
                <span className="text-sm font-black font-mono">{donors.length} Screened Voluntary Donors</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Mobilization Latency</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">24m Avg Response</span>
                </div>
                <div className="text-right border-l border-white/20 pl-3">
                  <span className="text-[10px] text-red-200 uppercase tracking-wider block font-semibold">Standby Status</span>
                  <span className="text-sm font-black text-white font-mono">100% Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* Apheresis Mobilization Insights */}
          <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-xs font-bold border border-[#D72638]/20 mb-2">
                <Activity className="w-3.5 h-3.5 text-[#D72638]" />
                <span>Apheresis & Voluntary Extraction</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#1A1D20] tracking-tight">
                Platelet & Packed RBC Cellular Mobilization
              </h2>
              <p className="text-xs text-[#5A626A] mt-1 leading-relaxed">
                Direct monitoring of active apheresis centrifuges separating whole blood into red cell concentrates, fresh frozen plasma, and high-titer platelets for trauma response.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Active Roster</span>
                <span className="text-sm font-black text-[#1A1D20] mt-0.5 block truncate">{donors.length} Verified Donors</span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">100% Screened</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]">
                <span className="text-[10px] text-[#7A0C17] uppercase tracking-wider font-bold block">Emergency Standby</span>
                <span className="text-sm font-black text-emerald-700 mt-0.5 block truncate">
                  {donors.filter(d => d.isAvailable).length} Available
                </span>
                <span className="text-[10px] text-[#5A626A] mt-0.5 block">Immediate dispatch</span>
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

      {/* Controls & Blood Group Filters with Scroll Blur-In */}
      <motion.div 
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="flex flex-col md:flex-row gap-4 items-center justify-between"
      >
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
      </motion.div>

      {/* Donors Grid with Scroll Blur-In */}
      <motion.div
        variants={scrollBlurVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
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
      </motion.div>

      {/* Register Donor Modal - Rendered via React Portal with Full Website Blur */}
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

            <h2 className="text-xl font-black text-[#1A1D20] mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D72638]" />
              <span>Register Voluntary Blood Donor</span>
            </h2>
            <p className="text-xs text-[#5A626A] mb-4">
              Enrolls candidate into the emergency mobilization ledger with ABO/Rh screening.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    placeholder="Jane Doe"
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.fullName && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    Blood Group <span className="text-[#D72638]">*</span>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    Age (18 - 65) <span className="text-[#D72638]">*</span>
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={age}
                    onChange={(e) => {
                      setAge(Number(e.target.value));
                      if (formErrors.age) setFormErrors(prev => ({ ...prev, age: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.age ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.age && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.age}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">Biological Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Donor['gender'])}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] cursor-pointer"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      placeholder={countryDialCode === '+91' ? '98765 43210' : 'Mobile number'}
                      className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                        formErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                      } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    Email Address <span className="text-[#D72638]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                    }}
                    placeholder="donor@example.com"
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.email ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                    City <span className="text-[#D72638]">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (formErrors.city) setFormErrors(prev => ({ ...prev, city: '' }));
                    }}
                    placeholder="Mumbai / Delhi / Metropolis"
                    className={`w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border ${
                      formErrors.city ? 'border-red-500 bg-red-50/20' : 'border-[#D9C7C2]'
                    } text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638] transition-colors`}
                  />
                  {formErrors.city && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{formErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D20] mb-1">State / Province</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Maharashtra / State"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs text-[#1A1D20] outline-hidden focus:border-[#D72638]"
                  />
                </div>
              </div>

              {/* Mandatory Consent Checkbox (Unchecked by Default) */}
              <div className="pt-2">
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
                  <span className="text-xs text-[#5A626A] leading-relaxed">
                    I certify that I meet voluntary blood donation health criteria, have no transmissible illnesses, and consent to emergency transfusion notifications. <span className="text-[#D72638]">*</span>
                  </span>
                </label>
                {formErrors.consent && (
                  <p className="text-red-500 text-[11px] font-semibold mt-1.5 ml-6">{formErrors.consent}</p>
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
                  Register Donor
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