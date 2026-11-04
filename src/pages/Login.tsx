import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Droplet, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Activity, 
  Sparkles
} from 'lucide-react';
import { BloodDropsCanvas } from '../components/BloodDropsCanvas';
import { AmbientBackgroundVideo } from '../components/AmbientBackgroundVideo';

export const OFFICIAL_CLINICIAN_CREDENTIALS = {
  email: 'clinician@bloodmatch.org',
  password: 'Transfusion@2026#',
  name: 'Dr. Farhan Khalid, MD',
  role: 'Chief Hematologist & Transfusion Director',
  facility: 'Metro Transfusion Center — Cryo-Vault 01',
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Seamless auto-play video reference with glitch-free loop
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.muted = true;
        video.play();
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

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    setTimeout(() => {
      const userEmail = email.trim() || OFFICIAL_CLINICIAN_CREDENTIALS.email;
      const userName = email.trim().split('@')[0] 
        ? `Dr. ${email.trim().split('@')[0].toUpperCase()}` 
        : OFFICIAL_CLINICIAN_CREDENTIALS.name;

      sessionStorage.setItem('bloodmatch_auth', 'true');
      sessionStorage.setItem('bloodmatch_user_email', userEmail);
      sessionStorage.setItem('bloodmatch_user_name', userName);
      sessionStorage.setItem('bloodmatch_user_facility', OFFICIAL_CLINICIAN_CREDENTIALS.facility);

      navigate('/dashboard');
    }, 350);
  };

  const handleDemoLogin = () => {
    setEmail(OFFICIAL_CLINICIAN_CREDENTIALS.email);
    setPassword(OFFICIAL_CLINICIAN_CREDENTIALS.password);
    setIsLoading(true);

    setTimeout(() => {
      sessionStorage.setItem('bloodmatch_auth', 'true');
      sessionStorage.setItem('bloodmatch_user_email', OFFICIAL_CLINICIAN_CREDENTIALS.email);
      sessionStorage.setItem('bloodmatch_user_name', OFFICIAL_CLINICIAN_CREDENTIALS.name);
      sessionStorage.setItem('bloodmatch_user_facility', OFFICIAL_CLINICIAN_CREDENTIALS.facility);
      navigate('/dashboard');
    }, 300);
  };

  return (
    <div className="relative min-h-screen bg-[#0E0E10] font-sans text-white flex flex-col justify-between overflow-x-hidden selection:bg-[#D00000] selection:text-white">
      {/* 4K UHD Ambient Background Video Layer */}
      <AmbientBackgroundVideo />

      {/* Floating Blood Drops Canvas Animation */}
      <BloodDropsCanvas />

      {/* Top Header */}
      <header className="relative w-full bg-[#0E0E10]/80 backdrop-blur-xl border-b border-[#6A040F]/40 z-30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D00000] to-[#6A040F] border border-[#D00000]/40 text-white flex items-center justify-center shadow-lg shadow-[#D00000]/20 group-hover:scale-105 transition-transform">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-white block leading-tight">
                Blood<span className="text-[#D00000]">Match</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-red-300 font-semibold block">
                Transfusion Network
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-200 text-xs font-medium bg-[#2A2A2F]/60 px-3 py-1.5 rounded-full border border-[#6A040F]/50 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>AABB & HIPAA Compliant 256-Bit</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#D00000]/20 text-red-200 border border-[#D00000]/40">
              <span className="w-2 h-2 rounded-full bg-[#D00000] animate-ping"></span>
              <span>Emergency Dispatch Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Viewport */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto py-2 sm:py-4">
          <div className="relative w-full rounded-2xl overflow-hidden bg-[#0E0E10]/80 backdrop-blur-2xl shadow-2xl shadow-black/90 border border-[#6A040F]/50 flex flex-col lg:flex-row min-h-[640px]">
            
            {/* LEFT PANEL: Login.mp4 Video Presentation with NO pause/mute icons */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full lg:w-1/2 relative bg-black/90 flex flex-col justify-between overflow-hidden p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-[#6A040F]/40"
            >
              {/* Responsive Video Container with Smooth Glitch-Free Loop */}
              <div className="absolute inset-0 w-full h-full">
                <video
                  ref={videoRef}
                  src="/Login.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover object-center filter brightness-95 contrast-110"
                />
                {/* Crimson Gradient Film blending into user palette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] via-black/30 to-[#6A040F]/25 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(208,0,0,0.3)_0%,_transparent_60%)] pointer-events-none"></div>
              </div>

              {/* Top Video Header (Clean, NO mute or pause buttons) */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E0E10]/70 backdrop-blur-md border border-[#6A040F]/50 text-xs font-semibold text-slate-100">
                  <Activity className="w-3.5 h-3.5 text-[#D00000] animate-pulse" />
                  <span>Clinical Cross-Match Portal</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#6A040F]/40 border border-[#D00000]/30 text-[11px] font-medium text-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Live Stream</span>
                </div>
              </div>

              {/* Bottom Video Telemetry Overlay */}
              <div className="relative z-10 pt-32 sm:pt-48">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D00000]/30 border border-[#D00000]/40 text-red-200 text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Zero-Tolerance ABO/Rh Triage
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2">
                  Emergency Transfusion <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-100 to-white">
                    Compatibility Network
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md font-light mb-4">
                  Autonomous 8-group ABO & RhD antigen cross-matching, instant cryo-reserve dispatch, and certified voluntary donor mobilization.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-200">
                  <div className="p-2 rounded-lg bg-[#0E0E10]/80 backdrop-blur-md border border-[#6A040F]/40 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Universal Donor O- Synced</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0E0E10]/80 backdrop-blur-md border border-[#6A040F]/40 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>Cryo-Vault Telemetry 0ms</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT PANEL: Clinician Sign In Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
              className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-[#0E0E10]/95 backdrop-blur-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Clinician Sign In
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1">
                      Enter credentials to manage emergency reserves and donors
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#6A040F]/30 border border-[#D00000]/30 flex items-center justify-center text-[#D00000] shadow-inner">
                    <Droplet className="w-6 h-6 fill-current animate-pulse-subtle" />
                  </div>
                </div>

                {loginError && (
                  <div className="mb-4 p-3 rounded-xl bg-[#6A040F]/60 border border-[#D00000]/60 text-red-200 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D00000]"></span>
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
                      Clinician Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="doctor@bloodmatch.org"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#2A2A2F]/70 border border-[#2A2A2F] focus:border-[#D00000] focus:ring-1 focus:ring-[#D00000] text-sm text-white placeholder-slate-400 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                        Security Password
                      </label>
                      <span className="text-[11px] text-[#D00000] hover:text-red-400 cursor-pointer">
                        Forgot Access?
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#2A2A2F]/70 border border-[#2A2A2F] focus:border-[#D00000] focus:ring-1 focus:ring-[#D00000] text-sm text-white placeholder-slate-400 outline-hidden transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-[#2A2A2F] bg-[#2A2A2F] text-[#D00000] focus:ring-[#D00000] accent-[#D00000] cursor-pointer"
                      />
                      <span className="text-xs text-slate-300">Remember this terminal</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Session: 30 Days</span>
                  </div>

                  {/* Primary Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#D00000] hover:bg-[#b00000] text-white font-bold text-sm shadow-lg shadow-[#D00000]/40 hover:shadow-[#D00000]/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Authenticating Clinician...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Transfusion Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Quick Demo Access Button */}
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2A2A2F]/60 hover:bg-[#2A2A2F] text-white border border-[#6A040F]/60 hover:border-[#D00000]/60 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D00000]" />
                    <span>Quick Demo Login (1-Click Instant Access)</span>
                  </button>
                </form>

                {/* Switch to Signup */}
                <div className="text-center pt-5">
                  <p className="text-xs text-slate-300">
                    New volunteer donor or facility registry?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="text-[#D00000] font-bold hover:text-red-400 hover:underline cursor-pointer ml-1"
                    >
                      Register here
                    </button>
                  </p>
                </div>
              </div>

              {/* Footer Security Badges */}
              <div className="pt-6 border-t border-[#2A2A2F] text-center text-slate-400 text-[11px] flex items-center justify-center gap-3">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  HIPAA Compliant
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Lock className="w-3.5 h-3.5 text-[#D00000]" />
                  256-Bit TLS
                </span>
                <span>•</span>
                <span className="font-medium">Tier-4 Encrypted</span>
              </div>
            </motion.div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 border-t border-[#6A040F]/30 bg-[#0E0E10]/80 backdrop-blur-md">
        <p>© 2026 BloodMatch Transfusion Network. Emergency Hotline: +1 (800) 555-BLOOD</p>
      </footer>
    </div>
  );
}
