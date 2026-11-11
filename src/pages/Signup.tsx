import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Droplet, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  ArrowRight, 
  ShieldCheck, 
  Heart,
  Sparkles,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { BloodDropsCanvas } from '../components/BloodDropsCanvas';
import { AmbientBackgroundVideo } from '../components/AmbientBackgroundVideo';
import { COUNTRY_CODES, validatePhoneNumber, validateEmail, checkPasswordCriteria } from '../utils/countryCodes';
import { apiClient } from '../services/api';
import { DrippingBloodBadge } from '../components/DrippingBloodBadge';

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'FORM' | 'OTP_VERIFY'>('FORM');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryDialCode, setCountryDialCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false); // Unchecked by default
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // OTP Verification States
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Real-time password criteria evaluation
  const passwordCriteria = useMemo(() => checkPasswordCriteria(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Seamless auto-play video reference with preloader synchronization
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

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

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };
    video.addEventListener('ended', handleEnded);

    if (isPreloaderDone) {
      startPlayback();
    } else {
      const onPreloaderReady = () => {
        startPlayback();
      };
      window.addEventListener('bloodmatch_preloader_opening', onPreloaderReady);
      window.addEventListener('bloodmatch_preloader_complete', onPreloaderReady);

      const fallbackTimer = setTimeout(startPlayback, 6000);

      return () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener('bloodmatch_preloader_opening', onPreloaderReady);
        window.removeEventListener('bloodmatch_preloader_complete', onPreloaderReady);
        video.removeEventListener('playing', handleVideoPlaying);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      };
    }

    return () => {
      video.removeEventListener('playing', handleVideoPlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [step]);

  // Resend timer countdown for OTP step
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'OTP_VERIFY' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Full legal name is required (at least 2 characters)';
    }

    const emailRes = validateEmail(email);
    if (!emailRes.isValid) {
      errors.email = emailRes.message || 'Please enter a valid email address';
    }

    const phoneRes = validatePhoneNumber(countryDialCode, phone);
    if (!phoneRes.isValid) {
      errors.phone = phoneRes.message || 'Please enter a valid mobile number';
    }

    if (!passwordCriteria.allValid) {
      errors.password = 'Password must satisfy all security requirements (8+ chars, 1 uppercase, 2 numbers, 1 symbol)';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!consentChecked) {
      errors.consent = 'Please check the authorization box above to register your profile';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsLoading(true);

    try {
      const res = await apiClient.post('/api/auth/register', {
        full_name: name.trim(),
        email: email.trim(),
        phone: `${countryDialCode} ${phone.trim()}`,
        password
      });

      setIsLoading(false);

      if (!res.ok) {
        setFormErrors({ email: res.error || 'Registration failed. Please check your credentials.' });
        return;
      }

      setStep('OTP_VERIFY');
      setResendTimer(30);
      setCanResend(false);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setIsLoading(false);
      setFormErrors({ email: err?.message || 'Network connection failed during registration.' });
    }
  };

  // OTP Handlers
  const handleOtpChange = (index: number, value: string) => {
    if (otpError) setOtpError(null);
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = cleanVal;
    setOtp(updated);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setOtp(['', '', '', '', '', '']);
    setResendTimer(30);
    setCanResend(false);
    setOtpError(null);
    otpInputRefs.current[0]?.focus();

    try {
      const res = await apiClient.post('/api/auth/resend-otp', { email: email.trim() });
      if (!res.ok) {
        setOtpError(res.error || 'Could not resend OTP code.');
      }
    } catch {
      // Handled silently
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setOtpError('Please enter the complete 6-digit verification token sent to your email');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.post('/api/auth/verify-otp', {
        email: email.trim(),
        otp_code: fullCode
      });

      setIsLoading(false);

      if (!res.ok) {
        setOtpError(res.error || 'Invalid or expired OTP token.');
        return;
      }

      const registeredName = name.trim();
      const registeredEmail = email.trim();
      const registeredPhone = `${countryDialCode} ${phone.trim()}`;

      sessionStorage.setItem('bloodmatch_auth', 'true');
      if (res.data?.access_token) {
        sessionStorage.setItem('bloodmatch_auth_token', res.data.access_token);
      }
      sessionStorage.setItem('bloodmatch_user_email', registeredEmail);
      sessionStorage.setItem('bloodmatch_user_name', registeredName);
      sessionStorage.setItem('bloodmatch_user_phone', registeredPhone);
      const memberId = res.data?.user?.member_id || ('BM-' + (res.data?.user?.id || '9481NX01').replace(/-/g, '').slice(0, 8).toUpperCase());
      sessionStorage.setItem('bloodmatch_member_id', memberId);
      localStorage.setItem('bloodmatch_member_id', memberId);
      localStorage.setItem('bloodmatch_user_email', registeredEmail);
      localStorage.setItem('bloodmatch_user_name', registeredName);
      localStorage.setItem('bloodmatch_user_phone', registeredPhone);

      navigate('/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setOtpError(err?.message || 'Verification connection failed.');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F5F1EF] font-sans text-[#1A1D20] flex flex-col justify-between overflow-x-hidden selection:bg-[#D72638] selection:text-white">
      {/* 4K UHD Ambient Background Video Layer (Pristine Alabaster Clinical Flow) */}
      <AmbientBackgroundVideo />

      {/* Hidden browser preloader for OTP video to ensure 0-latency instant playback */}
      <video
        src="/287987.mp4"
        poster="/287987_poster.jpg"
        preload="auto"
        muted
        playsInline
        className="hidden"
        aria-hidden="true"
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
            
            {/* LEFT PANEL: Voluntary Transfusion Flow (signup.mp4) or OTP Token Verification (287987.mp4) */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full lg:w-1/2 relative bg-black/90 flex flex-col justify-between overflow-hidden p-5 sm:p-8 border-b lg:border-b-0 lg:border-r border-[#D9C7C2] min-h-[240px] sm:min-h-[320px] lg:min-h-full"
            >
              <div className="absolute inset-0 w-full h-full">
                {/* Permanent High-Resolution Poster Layer (Guarantees zero blank/black screen flash) */}
                <img
                  src={step === 'OTP_VERIFY' ? '/287987_poster.jpg' : '/signup_poster.jpg'}
                  alt="BloodMatch Clinical Registry"
                  className={`w-full h-full object-cover object-center pointer-events-none transition-opacity duration-700 ease-out ${
                    isVideoPlaying ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <video
                  ref={videoRef}
                  key={step === 'OTP_VERIFY' ? 'otp-video-287987' : 'signup-flow-video'}
                  src={step === 'OTP_VERIFY' ? '/287987.mp4' : '/signup.mp4'}
                  poster={step === 'OTP_VERIFY' ? '/287987_poster.jpg' : '/signup_poster.jpg'}
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-700 ease-out ${
                    isVideoPlaying ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ transform: 'translateZ(0)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-[#7A0C17]/40 pointer-events-none z-[1]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(215,38,56,0.35)_0%,_transparent_60%)] pointer-events-none z-[1]"></div>
              </div>

              {/* Clean Video Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-semibold text-white">
                  {step === 'OTP_VERIFY' ? (
                    <>
                      <KeyRound className="w-3.5 h-3.5 text-[#D72638] animate-pulse" />
                      <span>Encrypted Token Verification</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-3.5 h-3.5 text-[#D72638] animate-pulse" />
                      <span>Join Verified Transfusion Registry</span>
                    </>
                  )}
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
                  {step === 'OTP_VERIFY' ? 'Cryptographic Token Security' : 'Life-Saving Rapid Response'}
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-2">
                  {step === 'OTP_VERIFY' ? (
                    <>
                      Validate Clinician <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-100 to-white">
                        Authorization Token
                      </span>
                    </>
                  ) : (
                    <>
                      Empower Immediate <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-100 to-white">
                        Emergency Matchmaking
                      </span>
                    </>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md font-light mb-3">
                  {step === 'OTP_VERIFY' 
                    ? 'Two-factor cryptographic token authentication strictly protects emergency transfusion dispatch orders and voluntary donor health records.'
                    : 'Every certified donor and registered clinician bridges the gap in critical trauma cases, open-heart surgeries, and blood bank shortfalls.'}
                </p>

                <div className="p-2.5 sm:p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-xs text-white flex items-center justify-between">
                  <span>⚡ 100% Cryptographic Security</span>
                  <span className="text-red-200 font-bold">AABB Verified Protocol</span>
                </div>
              </div>
            </motion.div>

            {/* RIGHT PANEL: Registration Form OR Email OTP Verification */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
              className="w-full lg:w-1/2 flex flex-col justify-between p-5 sm:p-8 lg:p-12 xl:p-14 bg-white text-[#1A1D20]"
            >
              <div>
                {/* Dynamic Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-[11px] font-bold border border-[#D72638]/20 mb-2">
                      {step === 'OTP_VERIFY' ? <KeyRound className="w-3 h-3 text-[#D72638]" /> : <User className="w-3 h-3 text-[#D72638]" />}
                      <span>{step === 'OTP_VERIFY' ? 'Email Token Validation' : 'Portal Enrollment'}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
                      {step === 'OTP_VERIFY' ? 'Verify Email Token' : 'Create Portal Profile'}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#5A626A] mt-1">
                      {step === 'OTP_VERIFY' 
                        ? `Enter the 6-digit cryptographic verification code sent to ${email}`
                        : 'Register as a voluntary donor or clinical emergency officer'}
                    </p>
                  </div>
                  <DrippingBloodBadge />
                </div>

                {step === 'OTP_VERIFY' ? (
                  /* =================================================================
                      STEP 2: EMAIL OTP VERIFICATION WITH ANIMATED BLOOD DROPLET
                      ================================================================= */
                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    {/* Pulsing Liquid Blood Droplet Animation */}
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="relative flex items-center justify-center mb-3">
                        <motion.span
                          animate={{ scale: [1, 1.7, 2.3], opacity: [0.65, 0.25, 0] }}
                          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeOut' }}
                          className="absolute w-20 h-20 rounded-full border-2 border-[#D72638] pointer-events-none"
                        />
                        <motion.span
                          animate={{ scale: [1, 1.35, 1.8], opacity: [0.75, 0.35, 0] }}
                          transition={{ repeat: Infinity, duration: 2.4, delay: 0.35, ease: 'easeOut' }}
                          className="absolute w-20 h-20 rounded-full bg-[#D72638]/25 pointer-events-none"
                        />
                        <DrippingBloodBadge 
                          size="xl" 
                          className="relative z-10 shadow-2xl shadow-[#D72638]/40 border-2 border-[#D72638]/40 bg-[#7A0C17]/15" 
                        />
                      </div>

                      <p className="text-xs text-[#5A626A] text-center">
                        Dispatched authorization code to: <br />
                        <span className="font-bold text-[#1A1D20]">{email}</span>
                      </p>
                    </div>

                    {/* 6-Digit OTP Inputs */}
                    <div>
                      <div className="flex justify-center gap-2 sm:gap-3">
                        {otp.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl text-center text-xl font-mono font-black border transition-all duration-200 outline-hidden ${
                              otpError 
                                ? 'border-red-400 bg-red-50/40 text-[#D72638]' 
                                : digit 
                                ? 'border-[#D72638] bg-white text-[#1A1D20] shadow-sm' 
                                : 'border-[#D9C7C2] bg-[#F5F1EF] focus:border-[#D72638] focus:bg-white focus:ring-2 focus:ring-[#D72638]/20'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Inline Error Below OTP */}
                      {otpError && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-[#D72638] mt-2 text-center flex items-center justify-center gap-1.5 font-semibold"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{otpError}</span>
                        </motion.p>
                      )}
                    </div>

                    {/* Resend Token Timer */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#D9C7C2]/60">
                      <span className="text-[#5A626A]">Didn't receive code?</span>
                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          className="font-bold text-[#D72638] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Resend Token</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 font-mono">
                          Resend in {resendTimer}s
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setStep('FORM')}
                        className="px-4 py-3 rounded-xl bg-[#F5F1EF] hover:bg-slate-200 text-[#1A1D20] border border-[#D9C7C2] font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/30 hover:shadow-[#D72638]/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        {isLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Activating Clinical Account...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify OTP & Launch Portal</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* =================================================================
                      STEP 1: REGISTRATION FORM
                      ================================================================= */

                <form onSubmit={handleSignup} className="space-y-3.5">
                  {/* Full Legal Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative group">
                      <User className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                        formErrors.name ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                      }`} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                        }}
                        placeholder="Alex Mercer"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                          formErrors.name 
                            ? 'border-red-400 bg-red-50/40 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20' 
                            : 'border-[#D9C7C2] hover:border-[#D72638]/50 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 focus:bg-white'
                        }`}
                      />
                    </div>
                    {formErrors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.name}</span>
                      </motion.p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                        formErrors.email ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                      }`} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                        }}
                        placeholder="alex.mercer@hospital.org"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                          formErrors.email 
                            ? 'border-red-400 bg-red-50/40 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20' 
                            : 'border-[#D9C7C2] hover:border-[#D72638]/50 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 focus:bg-white'
                        }`}
                      />
                    </div>
                    {formErrors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.email}</span>
                      </motion.p>
                    )}
                  </div>

                  {/* Verified Mobile Number with Country Flags & Codes */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1">
                      Verified Contact Number
                    </label>
                    <div className="flex gap-2">
                      {/* Country Dial Code Selector (Default India 🇮🇳 +91) */}
                      <div className="relative w-36 shrink-0">
                        <select
                          value={countryDialCode}
                          onChange={(e) => {
                            setCountryDialCode(e.target.value);
                            if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
                          }}
                          className="w-full px-2.5 py-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] hover:border-[#D72638]/50 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 text-xs font-bold text-[#1A1D20] outline-hidden transition-all cursor-pointer"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                              {c.flag} {c.dialCode} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Phone Number Input */}
                      <div className="relative flex-1 group">
                        <Phone className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                          formErrors.phone ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                        }`} />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
                          }}
                          placeholder={countryDialCode === '+91' ? '98765 43210' : 'Mobile number'}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                            formErrors.phone 
                              ? 'border-red-400 bg-red-50/40 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20' 
                              : 'border-[#D9C7C2] hover:border-[#D72638]/50 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 focus:bg-white'
                          }`}
                        />
                      </div>
                    </div>
                    {formErrors.phone && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.phone}</span>
                      </motion.p>
                    )}
                  </div>

                  {/* Account Security Password with Blood Fill Strength Animation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                        Security Password
                      </label>
                      <span className="text-[11px] font-mono font-bold text-[#D72638] flex items-center gap-1">
                        <Droplet className="w-3 h-3 fill-current animate-pulse" />
                        <span>{passwordCriteria.strengthPercent}% Validated</span>
                      </span>
                    </div>
                    <div className="relative group">
                      <Lock className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                        formErrors.password ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                      }`} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (formErrors.password) setFormErrors(prev => ({ ...prev, password: '' }));
                        }}
                        placeholder="Min. 8 chars, 1 uppercase, 2 numbers, 1 symbol"
                        className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                          formErrors.password 
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

                    {/* Animated Liquid Blood Bar */}
                    <div className="w-full bg-[#F5F1EF] border border-[#D9C7C2]/70 h-2 rounded-full overflow-hidden mt-1.5 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${passwordCriteria.strengthPercent}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          passwordCriteria.strengthPercent === 100
                            ? 'bg-gradient-to-r from-[#D72638] to-emerald-500 shadow-[0_0_8px_rgba(215,38,56,0.5)]'
                            : passwordCriteria.strengthPercent >= 50
                            ? 'bg-gradient-to-r from-amber-500 to-[#D72638]'
                            : 'bg-[#D72638]'
                        }`}
                      />
                    </div>

                    {/* Real-Time Password Criteria Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                        passwordCriteria.hasMinLength 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-[#F5F1EF] text-[#5A626A] border-[#D9C7C2]'
                      }`}>
                        {passwordCriteria.hasMinLength ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        <span>8+ Chars</span>
                      </span>

                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                        passwordCriteria.hasUppercase 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-[#F5F1EF] text-[#5A626A] border-[#D9C7C2]'
                      }`}>
                        {passwordCriteria.hasUppercase ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        <span>1 Big (A-Z)</span>
                      </span>

                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                        passwordCriteria.hasTwoNumbers 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-[#F5F1EF] text-[#5A626A] border-[#D9C7C2]'
                      }`}>
                        {passwordCriteria.hasTwoNumbers ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        <span>2 Numbers</span>
                      </span>

                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                        passwordCriteria.hasSpecialChar 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-[#F5F1EF] text-[#5A626A] border-[#D9C7C2]'
                      }`}>
                        {passwordCriteria.hasSpecialChar ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        <span>1 Symbol (!@#)</span>
                      </span>
                    </div>

                    {formErrors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.password}</span>
                      </motion.p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                        Confirm Security Password
                      </label>
                      {confirmPassword && (
                        <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                          passwordsMatch ? 'text-emerald-700' : 'text-[#D72638]'
                        }`}>
                          {passwordsMatch ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Passwords Match</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-[#D72638]" />
                              <span>Does Not Match</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                        formErrors.confirmPassword ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                      }`} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (formErrors.confirmPassword) setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }}
                        placeholder="Re-enter password to verify"
                        className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                          formErrors.confirmPassword 
                            ? 'border-red-400 bg-red-50/40 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20' 
                            : 'border-[#D9C7C2] hover:border-[#D72638]/50 focus:border-[#D72638] focus:ring-2 focus:ring-[#D72638]/20 focus:bg-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-[#1A1D20] transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.confirmPassword}</span>
                      </motion.p>
                    )}
                  </div>

                  {/* Easy-Language 2-Line Consent Checkbox (Unselected by default) */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => {
                          setConsentChecked(e.target.checked);
                          if (formErrors.consent) setFormErrors(prev => ({ ...prev, consent: '' }));
                        }}
                        className="w-4 h-4 mt-0.5 rounded-sm border-[#D9C7C2] bg-[#F5F1EF] text-[#D72638] focus:ring-[#D72638] accent-[#D72638] cursor-pointer shrink-0"
                      />
                      <div className="text-xs text-[#5A626A] leading-relaxed group-hover:text-[#1A1D20] transition-colors">
                        <p className="font-semibold text-[#1A1D20]">
                          I agree to receive urgent blood match notifications & transfusion alerts.
                        </p>
                        <p className="text-[11px] text-[#5A626A] mt-0.5">
                          I certify that my contact number and medical credentials are authentic and verified.
                        </p>
                      </div>
                    </label>
                    {formErrors.consent && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.consent}</span>
                      </motion.p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/30 hover:shadow-[#D72638]/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
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
                )}

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
