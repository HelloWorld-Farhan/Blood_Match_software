import React, { useState, useRef } from 'react';
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
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Heart,
  Sparkles
} from 'lucide-react';
import { BloodDropsCanvas } from '../components/BloodDropsCanvas';
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

  // Video controls
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

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
    }, 450);
  };

  return (
    <div className="relative min-h-screen bg-crimson-void font-sans text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-red-600 selection:text-white">
      {/* Floating Blood Drops Canvas */}
      <BloodDropsCanvas />

      {/* Top Header */}
      <header className="relative w-full bg-black/40 backdrop-blur-xl border-b border-red-900/30 z-30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 border border-red-500/40 text-white flex items-center justify-center shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-white block leading-tight">
                Blood<span className="text-red-500">Match</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-red-400 font-semibold block">
                Transfusion Network
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition-colors"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </header>

      {/* Main Split Viewport */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto py-2 sm:py-4">
          <div className="relative w-full rounded-2xl overflow-hidden glass-card shadow-2xl shadow-red-950/80 flex flex-col lg:flex-row min-h-[640px]">
            
            {/* LEFT PANEL: signup.mp4 Video Presentation */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full lg:w-1/2 relative bg-black/80 flex flex-col justify-between overflow-hidden p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-red-900/30"
            >
              <div className="absolute inset-0 w-full h-full">
                <video
                  ref={videoRef}
                  src="/signup.mp4"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-red-950/30"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(220,38,38,0.25)_0%,_transparent_60%)]"></div>
              </div>

              {/* Controls */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-200">
                  <Heart className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span>Join Verified Transfusion Registry</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Telemetry info */}
              <div className="relative z-10 pt-32 sm:pt-48">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Life-Saving Rapid Response
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2">
                  Empower Immediate <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-200 to-white">
                    Emergency Matchmaking
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md font-light mb-4">
                  Every certified donor and registered clinician bridges the gap in critical trauma cases, open-heart surgeries, and blood bank shortfalls.
                </p>

                <div className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                  <span>⚡ 1 Unit Donated can save up to 3 lives</span>
                  <span className="text-red-400 font-bold">100% Volunteer Network</span>
                </div>
              </div>
            </motion.div>

            {/* RIGHT PANEL: Registration Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
              className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-slate-950/90 backdrop-blur-xl"
            >
              <div>
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Create Portal Profile
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Register as a voluntary donor or clinical emergency officer
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dr. Alex Mercer"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-500 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex.mercer@hospital.org"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-500 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Blood Group & Location Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Blood Type (ABO/Rh)
                      </label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value as BloodType)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white font-bold outline-hidden transition-all"
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
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Hospital / City
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Metro Central"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-500 outline-hidden transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Account Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-500 outline-hidden transition-all"
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
                        className="w-4 h-4 rounded-sm border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300">
                        Authorize emergency alerts for immediate blood matching
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-red-900/40 hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
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
                  <p className="text-xs text-slate-400">
                    Already registered with BloodMatch?{' '}
                    <Link
                      to="/login"
                      className="text-red-400 font-bold hover:text-red-300 hover:underline cursor-pointer ml-1"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </div>

              {/* Security info */}
              <div className="pt-6 border-t border-slate-900 text-center text-slate-500 text-[11px] flex items-center justify-center gap-3">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 border-t border-red-950/40 bg-black/40 backdrop-blur-md">
        <p>© 2026 BloodMatch Transfusion Network. Emergency Hotline: +1 (800) 555-BLOOD</p>
      </footer>
    </div>
  );
}
