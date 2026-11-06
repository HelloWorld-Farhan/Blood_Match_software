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
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { BloodDropsCanvas } from '../components/BloodDropsCanvas';
import { AmbientBackgroundVideo } from '../components/AmbientBackgroundVideo';
import { validateEmail } from '../utils/countryCodes';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Seamless instant auto-play video reference with glitch-free loop and zero black frames
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    // Faststart seek to 0.52s to immediately bypass initial black frames (0.0s - 0.5s)
    const handleLoadedMetadata = () => {
      if (video.currentTime < 0.52) {
        video.currentTime = 0.52;
      }
      video.play().catch(() => {});
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', () => video.play().catch(() => {}));

    if (video.readyState >= 1) {
      if (video.currentTime < 0.52) video.currentTime = 0.52;
      video.play().catch(() => {});
    }

    // Seamless loop returning to 0.52s to eliminate the black frame flash on repeat
    const handleTimeUpdate = () => {
      if (video.duration && video.currentTime >= video.duration - 0.1) {
        video.currentTime = 0.52;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setEmailError(null);
    setPasswordError(null);

    let hasError = false;

    // Strict Email validation
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      setEmailError(emailResult.message || 'Please enter a valid clinician email address');
      hasError = true;
    }

    // Strict Password validation
    if (!password.trim()) {
      setPasswordError('Security password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) return;

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
    <div className="relative min-h-screen bg-[#F5F1EF] font-sans text-[#1A1D20] flex flex-col justify-between overflow-x-hidden selection:bg-[#D72638] selection:text-white">
      {/* 4K UHD Ambient Background Video Layer */}
      <AmbientBackgroundVideo />

      {/* Floating Blood Drops Canvas Animation */}
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
            <div className="hidden sm:flex items-center gap-1.5 text-[#5A626A] text-xs font-medium bg-[#F5F1EF] px-3 py-1.5 rounded-full border border-[#D9C7C2]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>AABB & HIPAA Compliant 256-Bit</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] border border-[#D72638]/30">
              <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping"></span>
              <span>Emergency Dispatch Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Viewport */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto py-2 sm:py-4">
          <div className="relative w-full rounded-2xl overflow-hidden bg-white shadow-2xl border border-[#D9C7C2] flex flex-col lg:flex-row min-h-0 lg:min-h-[640px]">
            
            {/* LEFT PANEL: Login.mp4 Video Presentation with NO pause/mute icons */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full lg:w-1/2 relative bg-black/90 flex flex-col justify-between overflow-hidden p-5 sm:p-8 border-b lg:border-b-0 lg:border-r border-[#D9C7C2] min-h-[240px] sm:min-h-[320px] lg:min-h-full"
            >
              {/* Responsive Video Container with Smooth Glitch-Free Loop */}
              <div className="absolute inset-0 w-full h-full">
                <video
                  ref={videoRef}
                  src="/Login.mp4#t=0.52"
                  poster="/login_poster.jpg"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover object-center pointer-events-none"
                  style={{ transform: 'translateZ(0)' }}
                />
                {/* Crimson Gradient Film blending into user palette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-[#7A0C17]/35 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(215,38,56,0.35)_0%,_transparent_60%)] pointer-events-none"></div>
              </div>

              {/* Top Video Header (Clean, NO mute or pause buttons) */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-semibold text-white">
                  <Activity className="w-3.5 h-3.5 text-[#D72638] animate-pulse" />
                  <span>Clinical Cross-Match Portal</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7A0C17]/60 border border-[#D72638]/40 text-[11px] font-semibold text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Live Stream</span>
                </div>
              </div>

              {/* Bottom Video Telemetry Overlay */}
              <div className="relative z-10 pt-8 sm:pt-16 lg:pt-48">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D72638]/40 border border-[#D72638]/50 text-white text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Zero-Tolerance ABO/Rh Triage
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-2">
                  Emergency Transfusion <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-100 to-white">
                    Compatibility Network
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md font-light mb-3">
                  Autonomous 8-group ABO & RhD antigen cross-matching, instant cryo-reserve dispatch, and certified voluntary donor mobilization.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] text-white">
                  <div className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="truncate">Universal O- Synced</span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                    <span className="truncate">Cryo Telemetry 0ms</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT PANEL: Clinician Sign In Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
              className="w-full lg:w-1/2 flex flex-col justify-between p-5 sm:p-8 lg:p-12 xl:p-14 bg-white"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
                      Clinician Sign In
                    </h1>
                    <p className="text-xs sm:text-sm text-[#5A626A] mt-1">
                      Enter credentials to manage emergency reserves and donors
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#7A0C17]/10 border border-[#D72638]/20 flex items-center justify-center text-[#D72638] shadow-inner">
                    <Droplet className="w-6 h-6 fill-current animate-pulse-subtle" />
                  </div>
                </div>

                {loginError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#D72638] text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D72638]"></span>
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1.5">
                      Clinician Work Email
                    </label>
                    <div className="relative group">
                      <Mail className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                        emailError ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                      }`} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError(null);
                        }}
                        placeholder="doctor@bloodmatch.org"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                          emailError 
                            ? 'border-red-400 bg-red-50/40 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20' 
                            : 'border-[#D9C7C2] hover:border-[#D72638]/50 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 focus:bg-white'
                        }`}
                      />
                    </div>
                    {/* Error Below Field (Work 1) */}
                    {emailError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{emailError}</span>
                      </motion.p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                        Security Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsForgotModalOpen(true)}
                        className="text-[11px] text-[#D72638] hover:underline cursor-pointer font-semibold"
                      >
                        Forgot Access?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                        passwordError ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                      }`} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        placeholder="••••••••••••"
                        className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                          passwordError 
                            ? 'border-red-400 bg-red-50/40 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20' 
                            : 'border-[#D9C7C2] hover:border-[#D72638]/50 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 focus:bg-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-[#1A1D20] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Error Below Field (Work 1) */}
                    {passwordError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{passwordError}</span>
                      </motion.p>
                    )}
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-[#D9C7C2] bg-[#F5F1EF] text-[#D72638] focus:ring-[#D72638] accent-[#D72638] cursor-pointer"
                      />
                      <span className="text-xs text-[#5A626A]">Remember this terminal</span>
                    </label>
                    <span className="text-[11px] text-[#5A626A]">Session: 30 Days</span>
                  </div>

                  {/* Primary Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/30 hover:shadow-[#D72638]/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
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
                </form>

                {/* Switch to Signup */}
                <div className="text-center pt-5">
                  <p className="text-xs text-[#5A626A]">
                    New volunteer donor or facility registry?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="text-[#D72638] font-bold hover:underline cursor-pointer ml-1"
                    >
                      Register here
                    </button>
                  </p>
                </div>
              </div>

              {/* Footer Security Badges */}
              <div className="pt-6 border-t border-[#D9C7C2] text-center text-[#5A626A] text-[11px] flex items-center justify-center gap-3">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  HIPAA Compliant
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Lock className="w-3.5 h-3.5 text-[#D72638]" />
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
      <footer className="relative z-10 w-full py-4 text-center text-xs text-[#5A626A] border-t border-[#D9C7C2] bg-white/80 backdrop-blur-md">
        <p>© 2026 BloodMatch Transfusion Network. Emergency Hotline: +1 (800) 555-BLOOD</p>
      </footer>

      {/* Hidden browser preloader for 299518.mp4 to ensure 0-latency instant modal opening */}
      <video
        src="/299518.mp4"
        poster="/299518_poster.jpg"
        preload="auto"
        muted
        playsInline
        className="hidden"
        aria-hidden="true"
      />

      {/* Horizontal Forgot Password Recovery Modal with 299518.mp4 & Animated Blood Droplet */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={email}
      />
    </div>
  );
}
