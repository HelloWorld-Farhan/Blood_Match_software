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
  Sparkles,
  AlertCircle,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { BloodDropsCanvas } from '../components/BloodDropsCanvas';
import { AmbientBackgroundVideo } from '../components/AmbientBackgroundVideo';
import { validateEmail } from '../utils/countryCodes';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { apiClient } from '../services/api';
import { DrippingBloodBadge } from '../components/DrippingBloodBadge';

const getPersistentDeviceId = (): string => {
  if (typeof window === 'undefined') return 'terminal-default';
  let devId = localStorage.getItem('bloodmatch_client_device_id');
  if (!devId) {
    devId = 'dev-' + Math.random().toString(36).substring(2, 12);
    localStorage.setItem('bloodmatch_client_device_id', devId);
  }
  return devId;
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

  // Two-Factor Authentication Step
  const [step, setStep] = useState<'LOGIN' | 'TWO_FACTOR'>('LOGIN');
  const [twoFactorOtp, setTwoFactorOtp] = useState(['', '', '', '', '', '']);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Seamless synchronized video playback state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    // Check if preloader has already completed
    const isPreloaderDone = 
      typeof window !== 'undefined' && 
      (sessionStorage.getItem('bloodmatch_preloader_done') === 'true' || 
       !document.getElementById('preloader'));

    const startPlayback = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.loop = true;

      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsVideoPlaying(true))
          .catch(() => {
            v.muted = true;
            v.play()
              .then(() => setIsVideoPlaying(true))
              .catch(() => {});
          });
      }
    };

    const handleVideoPlaying = () => {
      setIsVideoPlaying(true);
    };

    const handleTimeUpdate = () => {
      if (video.currentTime > 0.05) {
        setIsVideoPlaying(true);
      }
    };

    video.addEventListener('playing', handleVideoPlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);

    if (isPreloaderDone) {
      // Preloader already completed or disabled: start video immediately
      startPlayback();
    } else {
      // Preloader is active: listen for opening/completion events before playback
      const onPreloaderReady = () => {
        startPlayback();
      };
      window.addEventListener('bloodmatch_preloader_opening', onPreloaderReady);
      window.addEventListener('bloodmatch_preloader_complete', onPreloaderReady);

      // Fallback timer: if preloader takes > 6s, start video anyway
      const fallbackTimer = setTimeout(startPlayback, 6000);

      return () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener('bloodmatch_preloader_opening', onPreloaderReady);
        window.removeEventListener('bloodmatch_preloader_complete', onPreloaderReady);
        video.removeEventListener('playing', handleVideoPlaying);
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }

    return () => {
      video.removeEventListener('playing', handleVideoPlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
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

    try {
      const deviceId = getPersistentDeviceId();
      const res = await apiClient.post('/api/auth/login', {
        email: email.trim(),
        password,
        device_id: deviceId,
        device_name: `${navigator.platform || 'Workstation'} Browser`,
        remember_device: rememberMe
      });

      setIsLoading(false);

      if (!res.ok) {
        setLoginError(res.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      // Step-up 2FA requirement
      if (res.data?.two_factor_required) {
        setStep('TWO_FACTOR');
        setTwoFactorOtp(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
        return;
      }

      // Direct Authentication Success
      if (res.data?.access_token) {
        sessionStorage.setItem('bloodmatch_auth', 'true');
        sessionStorage.setItem('bloodmatch_auth_token', res.data.access_token);
        sessionStorage.setItem('bloodmatch_user_email', res.data.user?.email || email.trim());
        sessionStorage.setItem('bloodmatch_user_name', res.data.user?.full_name || 'Clinician');
        const memberId = res.data.user?.member_id || ('BM-' + (res.data.user?.id || '9481NX01').replace(/-/g, '').slice(0, 8).toUpperCase());
        sessionStorage.setItem('bloodmatch_member_id', memberId);
        localStorage.setItem('bloodmatch_member_id', memberId);
        localStorage.setItem('bloodmatch_user_email', res.data.user?.email || email.trim());
        localStorage.setItem('bloodmatch_user_name', res.data.user?.full_name || 'Clinician');

        // Requirement 4: Cross-Device Cloud Sync Hydration on Login
        if (res.data.user?.photo_url) {
          const cacheBusted = `${res.data.user.photo_url}?v=${Date.now()}`;
          localStorage.setItem('bloodmatch_user_avatar', cacheBusted);
          sessionStorage.setItem('bloodmatch_user_avatar', cacheBusted);
        }

        navigate('/dashboard');
      } else {
        setLoginError('Authentication failed: Missing security token.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setLoginError(err?.message || 'Connection failure. Please verify backend status.');
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);
    const code = twoFactorOtp.join('');

    if (code.length < 6) {
      setTwoFactorError('Please enter the full 6-digit security code dispatched to your email.');
      return;
    }

    setIsLoading(true);

    try {
      const deviceId = getPersistentDeviceId();
      const res = await apiClient.post('/api/auth/2fa/verify', {
        email: email.trim(),
        otp_code: code,
        device_id: deviceId,
        device_name: `${navigator.platform || 'Workstation'} Browser`,
        remember_device: rememberMe
      });

      setIsLoading(false);

      if (!res.ok) {
        setTwoFactorError(res.error || 'Invalid or expired two-factor code.');
        return;
      }

      if (res.data?.access_token) {
        sessionStorage.setItem('bloodmatch_auth', 'true');
        sessionStorage.setItem('bloodmatch_auth_token', res.data.access_token);
        sessionStorage.setItem('bloodmatch_user_email', res.data.user?.email || email.trim());
        sessionStorage.setItem('bloodmatch_user_name', res.data.user?.full_name || 'Clinician');
        const memberId = res.data.user?.member_id || ('BM-' + (res.data.user?.id || '9481NX01').replace(/-/g, '').slice(0, 8).toUpperCase());
        sessionStorage.setItem('bloodmatch_member_id', memberId);
        localStorage.setItem('bloodmatch_member_id', memberId);
        localStorage.setItem('bloodmatch_user_email', res.data.user?.email || email.trim());
        localStorage.setItem('bloodmatch_user_name', res.data.user?.full_name || 'Clinician');

        if (res.data.user?.photo_url) {
          const cacheBusted = `${res.data.user.photo_url}?v=${Date.now()}`;
          localStorage.setItem('bloodmatch_user_avatar', cacheBusted);
          sessionStorage.setItem('bloodmatch_user_avatar', cacheBusted);
        }

        navigate('/dashboard');
      } else {
        setTwoFactorError('Two-factor verification failed to issue access token.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setTwoFactorError(err?.message || 'Connection failure during 2FA verification.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (twoFactorError) setTwoFactorError(null);
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const updated = [...twoFactorOtp];
    updated[index] = cleanVal;
    setTwoFactorOtp(updated);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !twoFactorOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
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
              <span className="text-lg font-black tracking-tight text-[#1A1D20] block leading-none">
                Blood<span className="text-[#D72638]">Match</span>
              </span>
              <span className="text-[10px] text-[#5A626A] font-medium tracking-wider uppercase block mt-0.5">
                Clinical Network
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-50 text-[#D72638] border border-red-200">
              <span className="w-2 h-2 rounded-full bg-[#D72638] animate-ping"></span>
              <span>Direct API Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#D9C7C2] shadow-xl overflow-hidden flex flex-col lg:flex-row">

            {/* LEFT PANEL: Cinematic Video Presentation */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative w-full lg:w-1/2 min-h-[300px] sm:min-h-[360px] lg:min-h-[580px] p-6 sm:p-8 lg:p-12 flex flex-col justify-between overflow-hidden bg-[#7A0C17]"
            >
              {/* Permanent High-Resolution Poster Layer (Guarantees zero blank/black screen flash) */}
              <img
                src="/login_poster.jpg"
                alt="BloodMatch Clinical Cross-Match"
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-700 ease-out ${
                  isVideoPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              />

              {/* Hardware-Accelerated Video Layer (Fades in smoothly upon preloader completion) */}
              <video
                ref={videoRef}
                src="/Login.mp4"
                poster="/login_poster.jpg"
                loop
                muted
                playsInline
                preload="auto"
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-700 ease-out ${
                  isVideoPlaying ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Atmospheric Clinical Contrast Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 z-[1] pointer-events-none" />

              {/* Top Video Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold tracking-wide">
                  <Droplet className="w-3.5 h-3.5 fill-current text-red-400" />
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

            {/* RIGHT PANEL: Clinician Sign In / 2FA Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
              className="w-full lg:w-1/2 flex flex-col justify-between p-5 sm:p-8 lg:p-12 xl:p-14 bg-white"
            >
              <div>
                {step === 'LOGIN' ? (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
                          Clinician Sign In
                        </h1>
                        <p className="text-xs sm:text-sm text-[#5A626A] mt-1">
                          Enter authenticated credentials to manage reserves and donors
                        </p>
                      </div>
                      <DrippingBloodBadge />
                    </div>

                    {loginError && (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#D72638] text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D72638] shrink-0"></span>
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
                            placeholder="clinician@bloodmatch.io"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                              emailError 
                                ? 'border-red-400 bg-red-50/40 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20' 
                                : 'border-[#D9C7C2] hover:border-[#D72638]/50 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 focus:bg-white'
                            }`}
                          />
                        </div>
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
                          <span className="text-xs text-[#5A626A]">Remember this workstation (Skip 2FA)</span>
                        </label>
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
                            <span>Verifying Credentials...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In to Transfusion Portal</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    {/* 2FA Step-Up Screen */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => setStep('LOGIN')}
                          className="inline-flex items-center gap-1.5 text-xs text-[#5A626A] hover:text-[#D72638] font-bold mb-2 cursor-pointer transition-colors"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Back to Sign In
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight flex items-center gap-2">
                          <KeyRound className="w-6 h-6 text-[#D72638]" />
                          Two-Factor Check
                        </h1>
                        <p className="text-xs text-[#5A626A] mt-1">
                          A 6-digit security OTP was dispatched to <strong className="text-[#1A1D20]">{email}</strong>
                        </p>
                      </div>
                      <DrippingBloodBadge />
                    </div>

                    {twoFactorError && (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#D72638] text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{twoFactorError}</span>
                      </div>
                    )}

                    <form onSubmit={handleVerify2FA} className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-2 text-center">
                          Enter 6-Digit Verification Code
                        </label>
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          {twoFactorOtp.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => { otpInputRefs.current[idx] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpChange(idx, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                              className="w-11 h-12 text-center text-lg font-bold rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 focus:bg-white outline-hidden transition-all text-[#1A1D20]"
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/30 hover:shadow-[#D72638]/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        {isLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Validating Token...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify & Enter Dashboard</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}

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

      {/* Forgot Password Recovery Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
