import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Droplet, 
  Lock, 
  Mail, 
  User, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Heart,
  Sparkles
} from 'lucide-react';
import { BloodDropsCanvas } from '../components/BloodDropsCanvas';
import { AmbientBackgroundVideo } from '../components/AmbientBackgroundVideo';
import { BloodType } from '../types';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [isDonor, setIsDonor] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Seamless auto-play video reference with glitch-free loop
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    video.addEventListener('canplay', () => video.play().catch(() => {}));

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const registeredName = name.trim() || 'Dr. Alex Mercer';
      const registeredEmail = email.trim() || 'alex.mercer@hospital.org';

      sessionStorage.setItem('bloodmatch_auth', 'true');
      sessionStorage.setItem('bloodmatch_user_email', registeredEmail);
      sessionStorage.setItem('bloodmatch_user_name', registeredName);
      sessionStorage.setItem('bloodmatch_user_blood', bloodType);
      sessionStorage.setItem('bloodmatch_user_facility', city.trim() || 'Regional Emergency Center');

      navigate('/dashboard');
    }, 400);
  };

  return (
    <div className="relative min-h-screen bg-[#F5F1EF] font-sans text-[#1A1D20] flex flex-col justify-between overflow-x-hidden selection:bg-[#D72638] selection:text-white">
      {/* 4K UHD Ambient Background Video Layer — Using signup.mp4 as cinematic background */}
      <AmbientBackgroundVideo 
        videoSrc="/signup.mp4"
        posterSrc="/signup_poster.jpg"
        overlayClassName="bg-black/55 backdrop-blur-[1px]"
      />

      {/* Floating Blood Drops Canvas */}
      <BloodDropsCanvas />

      {/* Top Header */}
      <header className="relative w-full bg-white/90 backdrop-blur-md border-b border-[#D9C7C2] z-30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] border border-[#D72638]/40 text-white flex items-center justify-center shadow-md shadow-[#D72638]/20 group-hover:scale-105 transition-transform">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-[#1A1D20] block leading-tight">
                Blood<span className="text-[#D72638]">Match</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#7A0C17] font-bold block">
                Transfusion Network
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-xs font-bold px-4 py-2 rounded-xl bg-[#F5F1EF] hover:bg-white text-[#1A1D20] border border-[#D9C7C2] transition-colors"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </header>

      {/* Main Split Viewport */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto py-2 sm:py-4">
          <div className="relative w-full rounded-2xl overflow-hidden bg-white shadow-2xl border border-[#D9C7C2] flex flex-col lg:flex-row min-h-0 lg:min-h-[640px]">
            
            {/* LEFT PANEL: Arterial Luminous Flow Video Presentation with NO pause/mute icons */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full lg:w-1/2 relative bg-black/90 flex flex-col justify-between overflow-hidden p-5 sm:p-8 border-b lg:border-b-0 lg:border-r border-[#D9C7C2] min-h-[240px] sm:min-h-[320px] lg:min-h-full"
            >
              <div className="absolute inset-0 w-full h-full">
                <video
                  ref={videoRef}
                  src="/3995-176277710.mp4?v=3"
                  poster="/3995-176277710_poster.jpg"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover object-center pointer-events-none"
                  style={{ transform: 'translateZ(0)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-[#7A0C17]/40 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(215,38,56,0.35)_0%,_transparent_60%)] pointer-events-none"></div>
              </div>

              {/* Clean Video Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-semibold text-white">
                  <Heart className="w-3.5 h-3.5 text-[#D72638] animate-pulse" />
                  <span>Join Verified Transfusion Registry</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7A0C17]/60 border border-[#D72638]/40 text-[11px] font-semibold text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Direct Enrollment</span>
                </div>
              </div>

              {/* Telemetry info */}
              <div className="relative z-10 pt-8 sm:pt-16 lg:pt-48">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D72638]/40 border border-[#D72638]/50 text-white text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Life-Saving Rapid Response
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-2">
                  Empower Immediate <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-100 to-white">
                    Emergency Matchmaking
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md font-light mb-3">
                  Every certified donor and registered clinician bridges the gap in critical trauma cases, open-heart surgeries, and blood bank shortfalls.
                </p>

                <div className="p-2.5 sm:p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-xs text-white flex items-center justify-between">
                  <span>⚡ 1 Unit saves up to 3 lives</span>
                  <span className="text-red-200 font-bold">100% Volunteer Network</span>
                </div>
              </div>
            </motion.div>

            {/* RIGHT PANEL: Registration Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
              className="w-full lg:w-1/2 flex flex-col justify-between p-5 sm:p-8 lg:p-12 xl:p-14 bg-white text-[#1A1D20]"
            >
              <div>
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
                    Create Portal Profile
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5A626A] mt-1">
                    Register as a voluntary donor or clinical emergency officer
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dr. Alex Mercer"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus:border-[#D72638] focus:ring-1 focus:ring-[#D72638] text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex.mercer@hospital.org"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus:border-[#D72638] focus:ring-1 focus:ring-[#D72638] text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Blood Group & Location Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1">
                        Blood Type (ABO/Rh)
                      </label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value as BloodType)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus:border-[#D72638] focus:ring-1 focus:ring-[#D72638] text-sm text-[#1A1D20] font-bold outline-hidden transition-all"
                      >
                        <option value="O-">O- (Universal Donor)</option>
                        <option value="O+">O+</option>
                        <option value="A-">A-</option>
                        <option value="A+">A+</option>
                        <option value="B-">B-</option>
                        <option value="B+">B+</option>
                        <option value="AB-">AB-</option>
                        <option value="AB+">AB+ (Universal Recipient)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1">
                        Hospital / City
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Metro Central"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus:border-[#D72638] focus:ring-1 focus:ring-[#D72638] text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1">
                      Account Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus:border-[#D72638] focus:ring-1 focus:ring-[#D72638] text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Donor Mobilization opt-in */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isDonor}
                        onChange={(e) => setIsDonor(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-[#D9C7C2] bg-[#F5F1EF] text-[#D72638] focus:ring-[#D72638] accent-[#D72638] cursor-pointer"
                      />
                      <span className="text-xs text-[#5A626A]">
                        Authorize emergency alerts for immediate blood matching
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/30 hover:shadow-[#D72638]/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Setting Up Session...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Registration & Launch Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Login */}
                <div className="text-center pt-5">
                  <p className="text-xs text-[#5A626A]">
                    Already registered with BloodMatch?{' '}
                    <Link
                      to="/login"
                      className="text-[#D72638] font-bold hover:underline cursor-pointer ml-1"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </div>

              {/* Security info */}
              <div className="pt-6 border-t border-[#D9C7C2] text-center text-[#5A626A] text-[11px] flex items-center justify-center gap-3">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  AABB Verified
                </span>
                <span>•</span>
                <span className="font-medium">Confidential Medical Ledger</span>
              </div>
            </motion.div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-[#5A626A] border-t border-[#D9C7C2] bg-white/80 backdrop-blur-md">
        <p>© 2026 BloodMatch Transfusion Network. Emergency Hotline: +1 (800) 555-BLOOD</p>
      </footer>
    </div>
  );
}
