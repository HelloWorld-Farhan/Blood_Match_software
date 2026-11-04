import React, { useState, useRef } from 'react';
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
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Sparkles
} from 'lucide-react';
import { BloodDropsCanvas } from '../components/BloodDropsCanvas';

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

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    setTimeout(() => {
      // Save authenticated session (allow quick demo or typed credentials)
      const userEmail = email.trim() || OFFICIAL_CLINICIAN_CREDENTIALS.email;
      const userName = email.trim().split('@')[0] 
        ? `Dr. ${email.trim().split('@')[0].toUpperCase()}` 
        : OFFICIAL_CLINICIAN_CREDENTIALS.name;

      sessionStorage.setItem('bloodmatch_auth', 'true');
      sessionStorage.setItem('bloodmatch_user_email', userEmail);
      sessionStorage.setItem('bloodmatch_user_name', userName);
      sessionStorage.setItem('bloodmatch_user_facility', OFFICIAL_CLINICIAN_CREDENTIALS.facility);

      navigate('/dashboard');
    }, 400);
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
    }, 350);
  };

  return (
    <div className="relative min-h-screen bg-crimson-void font-sans text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-red-600 selection:text-white">
      {/* Floating Blood Drops Canvas Animation */}
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
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300 text-xs font-medium bg-red-950/40 px-3 py-1.5 rounded-full border border-red-900/40 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>AABB & HIPAA Compliant 256-Bit</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>Emergency Dispatch Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Viewport */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto py-2 sm:py-4">
          <div className="relative w-full rounded-2xl overflow-hidden glass-card shadow-2xl shadow-red-950/80 flex flex-col lg:flex-row min-h-[640px]">
            
            {/* LEFT PANEL: Login.mp4 Video Presentation */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full lg:w-1/2 relative bg-black/80 flex flex-col justify-between overflow-hidden p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-red-900/30"
            >
              {/* Responsive Video Container */}
              <div className="absolute inset-0 w-full h-full">
                <video
                  ref={videoRef}
                  src="/Login.mp4"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
                />
                {/* Crimson Gradient Film */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-red-950/30"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(220,38,38,0.25)_0%,_transparent_60%)]"></div>
              </div>

              {/* Top Video Header & Controls */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-200">
                  <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span>Clinical Cross-Match Portal</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
                    title={isPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bottom Video Telemetry Overlay */}
              <div className="relative z-10 pt-32 sm:pt-48">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Zero-Tolerance ABO/Rh Triage
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2">
                  Emergency Transfusion <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-200 to-white">
                    Compatibility Network
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md font-light mb-4">
                  Autonomous 8-group ABO & RhD antigen cross-matching, instant cryo-reserve dispatch, and certified voluntary donor mobilization.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Universal Donor O- Synced</span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
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
              className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-slate-950/90 backdrop-blur-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Clinician Sign In
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Enter credentials to manage emergency reserves and donors
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-500 shadow-inner">
                    <Droplet className="w-6 h-6 fill-current animate-pulse-subtle" />
                  </div>
                </div>

                {loginError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-600/50 text-red-300 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Clinician Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="doctor@bloodmatch.org"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-500 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Security Password
                      </label>
                      <span className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer">
                        Forgot Access?
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-500 outline-hidden transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
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
                        className="w-4 h-4 rounded-sm border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300">Remember this terminal</span>
                    </label>
                    <span className="text-[11px] text-slate-500">Session: 30 Days</span>
                  </div>

                  {/* Primary Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-red-900/40 hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
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
                    className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-800/40 hover:border-red-600/50 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span>Quick Demo Login (1-Click Instant Access)</span>
                  </button>
                </form>

                {/* Switch to Signup */}
                <div className="text-center pt-5">
                  <p className="text-xs text-slate-400">
                    New volunteer donor or facility registry?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="text-red-400 font-bold hover:text-red-300 hover:underline cursor-pointer ml-1"
                    >
                      Register here
                    </button>
                  </p>
                </div>
              </div>

              {/* Footer Security Badges */}
              <div className="pt-6 border-t border-slate-900 text-center text-slate-500 text-[11px] flex items-center justify-center gap-3">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  HIPAA Compliant
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Lock className="w-3.5 h-3.5 text-red-400" />
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
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 border-t border-red-950/40 bg-black/40 backdrop-blur-md">
        <p>© 2026 BloodMatch Transfusion Network. Emergency Hotline: +1 (800) 555-BLOOD</p>
      </footer>
    </div>
  );
}
