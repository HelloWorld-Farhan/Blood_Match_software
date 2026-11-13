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
  ArrowLeft,
  Clock,
  RefreshCw
} from 'lucide-react';
import { BloodDropsCanvas } from '../components/BloodDropsCanvas';
import { AmbientBackgroundVideo } from '../components/AmbientBackgroundVideo';
import { validateEmail } from '../utils/countryCodes';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { apiClient } from '../services/api';

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
  const [sessionNotice, setSessionNotice] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('reason') === 'terminated') {
        return 'Your previous session was remotely terminated from another device. Please sign in with your password and 6-digit email OTP.';
      }
    }
    return null;
  });

  // Two-Factor Authentication Step
  const [step, setStep] = useState<'LOGIN' | 'TWO_FACTOR'>('LOGIN');
  const [twoFactorOtp, setTwoFactorOtp] = useState(['', '', '', '', '', '']);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorExpirySeconds, setTwoFactorExpirySeconds] = useState(600); // 10 minutes exact
  const [twoFactorResendTimer, setTwoFactorResendTimer] = useState(30); // 30s rate-limit cooldown
  const [canResend2FA, setCanResend2FA] = useState(false);
  const [isResending2FA, setIsResending2FA] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 2FA Expiry (10m) and Resend Cooldown (30s) timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'TWO_FACTOR') {
      interval = setInterval(() => {
        setTwoFactorResendTimer(prev => {
          if (prev <= 1) {
            setCanResend2FA(true);
            return 0;
          }
          return prev - 1;
        });

        setTwoFactorExpirySeconds(prev => {
          if (prev <= 1) {
            setTwoFactorError('Two-factor verification code has expired (strictly valid for 10 minutes). Please click Resend Code.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Guard against browser Back button navigating back to logged out dashboard sessions
  useEffect(() => {
    const isAuth = sessionStorage.getItem('bloodmatch_auth') === 'true' || localStorage.getItem('bloodmatch_auth') === 'true';
    if (isAuth) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Push state trap so pressing browser Back cannot return to previous protected views
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      const currentAuth = sessionStorage.getItem('bloodmatch_auth') === 'true' || localStorage.getItem('bloodmatch_auth') === 'true';
      if (!currentAuth) {
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

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

    // Start buffering and playback immediately on mount so video frames are warm & ready
    startPlayback();

    const onPreloaderReady = () => {
      startPlayback();
    };
    window.addEventListener('bloodmatch_preloader_opening', onPreloaderReady);
    window.addEventListener('bloodmatch_preloader_complete', onPreloaderReady);

    return () => {
      window.removeEventListener('bloodmatch_preloader_opening', onPreloaderReady);
      window.removeEventListener('bloodmatch_preloader_complete', onPreloaderReady);
      video.removeEventListener('playing', handleVideoPlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  // Performance optimization: Pause background page video while ForgotPasswordModal is open to eliminate GPU lag
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isForgotModalOpen) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [isForgotModalOpen]);

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
        setTwoFactorExpirySeconds(600);
        setTwoFactorResendTimer(30);
        setCanResend2FA(false);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
        return;
      }

      // Direct Authentication Success
      if (res.data?.access_token) {
        sessionStorage.setItem('bloodmatch_auth', 'true');
        sessionStorage.setItem('bloodmatch_auth_token', res.data.access_token);
        localStorage.setItem('bloodmatch_auth', 'true');
        localStorage.setItem('bloodmatch_auth_token', res.data.access_token);
        sessionStorage.setItem('bloodmatch_user_email', res.data.user?.email || email.trim());
        sessionStorage.setItem('bloodmatch_user_name', res.data.user?.full_name || 'Clinician');
        const memberId = res.data.user?.member_id || ('BM-' + (res.data.user?.id || '9481NX01').replace(/-/g, '').slice(0, 8).toUpperCase());
        sessionStorage.setItem('bloodmatch_member_id', memberId);
        localStorage.setItem('bloodmatch_member_id', memberId);
        localStorage.setItem('bloodmatch_user_email', res.data.user?.email || email.trim());
        localStorage.setItem('bloodmatch_user_name', res.data.user?.full_name || 'Clinician');
        if (typeof res.data.user?.is_2fa_enabled === 'boolean') {
          localStorage.setItem('bloodmatch_2fa_enabled', res.data.user.is_2fa_enabled ? 'true' : 'false');
          sessionStorage.setItem('bloodmatch_2fa_enabled', res.data.user.is_2fa_enabled ? 'true' : 'false');
        }

        // Cross-Device Synced User Phone Numbers & Emails
        if (res.data.user?.phone) {
          localStorage.setItem('bloodmatch_user_phone', res.data.user.phone);
          sessionStorage.setItem('bloodmatch_user_phone', res.data.user.phone);
        }
        if (Array.isArray(res.data.user?.saved_phones)) {
          const userKey = `bloodmatch_saved_phones_${(res.data.user?.email || email).trim().toLowerCase()}`;
          localStorage.setItem(userKey, JSON.stringify(res.data.user.saved_phones));
        }
        if (Array.isArray(res.data.user?.verified_emails)) {
          localStorage.setItem('bloodmatch_verified_emails', JSON.stringify(res.data.user.verified_emails));
        }

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
        localStorage.setItem('bloodmatch_auth', 'true');
        localStorage.setItem('bloodmatch_auth_token', res.data.access_token);
        sessionStorage.setItem('bloodmatch_user_email', res.data.user?.email || email.trim());
        sessionStorage.setItem('bloodmatch_user_name', res.data.user?.full_name || 'Clinician');
        const memberId = res.data.user?.member_id || ('BM-' + (res.data.user?.id || '9481NX01').replace(/-/g, '').slice(0, 8).toUpperCase());
        sessionStorage.setItem('bloodmatch_member_id', memberId);
        localStorage.setItem('bloodmatch_member_id', memberId);
        localStorage.setItem('bloodmatch_user_email', res.data.user?.email || email.trim());
        localStorage.setItem('bloodmatch_user_name', res.data.user?.full_name || 'Clinician');
        localStorage.setItem('bloodmatch_2fa_enabled', 'true');
        sessionStorage.setItem('bloodmatch_2fa_enabled', 'true');

        if (res.data.user?.phone) {
          localStorage.setItem('bloodmatch_user_phone', res.data.user.phone);
          sessionStorage.setItem('bloodmatch_user_phone', res.data.user.phone);
        }
        if (Array.isArray(res.data.user?.saved_phones)) {
          const userKey = `bloodmatch_saved_phones_${(res.data.user?.email || email).trim().toLowerCase()}`;
          localStorage.setItem(userKey, JSON.stringify(res.data.user.saved_phones));
        }
        if (Array.isArray(res.data.user?.verified_emails)) {
          localStorage.setItem('bloodmatch_verified_emails', JSON.stringify(res.data.user.verified_emails));
        }

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

  const handleResend2FA = async () => {
    if (!canResend2FA || isResending2FA) return;
    setIsResending2FA(true);
    setTwoFactorError(null);
    setTwoFactorOtp(['', '', '', '', '', '']);
    setTwoFactorResendTimer(30);
    setTwoFactorExpirySeconds(600);
    setCanResend2FA(false);

    try {
      const res = await apiClient.post('/api/auth/2fa/resend', { email: email.trim() });
      setIsResending2FA(false);
      if (!res.ok) {
        setTwoFactorError(res.error || 'Failed to resend two-factor code.');
      }
    } catch (err: any) {
      setIsResending2FA(false);
      setTwoFactorError(err?.message || 'Connection failure while resending 2FA code.');
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
              {/* Permanent High-Resolution Poster Layer (Zero blank/black screen flash) */}
              <img
                src="/login_poster.jpg"
                alt="BloodMatch Clinical Cross-Match"
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
              />

              {/* Hardware-Accelerated Video Layer (Smooth native playback with poster warmup & 2FA Email OTP video) */}
              <video
                key={step}
                ref={videoRef}
                src={step === 'TWO_FACTOR' ? '/287987.mp4' : '/Login.mp4'}
                poster="/login_poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
                style={{
                  transform: 'translateZ(0)',
                  willChange: 'transform'
                }}
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
                  Instant Blood Matching
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-2">
                  Emergency Transfusion <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-100 to-white">
                    Compatibility Network
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md font-light mb-3">
                  Instant blood compatibility matching, live blood stock monitoring, and rapid voluntary donor coordination.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] text-white">
                  <div className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="truncate">Universal O- Synced</span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                    <span className="truncate">Live Stock Monitored</span>
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
              style={{ contain: 'content' }}
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
                          Sign in to check blood stock, find donors, and manage requests
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#7A0C17]/10 border border-[#D72638]/20 flex items-center justify-center text-[#D72638]">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    </div>

                    {sessionNotice && (
                      <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0"></span>
                        <span>{sessionNotice}</span>
                      </div>
                    )}

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
                      <div className="w-10 h-10 rounded-xl bg-[#7A0C17]/10 border border-[#D72638]/20 flex items-center justify-center text-[#D72638]">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    </div>

                    {twoFactorError && (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#D72638] text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{twoFactorError}</span>
                      </div>
                    )}

                    <form onSubmit={handleVerify2FA} className="space-y-4">
                      {/* Center Email OTP Video Telemetry Presentation */}
                      <div className="relative rounded-2xl overflow-hidden border border-[#D9C7C2] bg-black shadow-xs aspect-16/7 w-full">
                        <video
                          src="/287987.mp4"
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                          className="w-full h-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20 pointer-events-none" />
                        <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-10">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-white tracking-wide uppercase">
                            Email OTP Security Relay
                          </span>
                        </div>
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold z-10">
                          <span className="truncate text-slate-200 text-xs">
                            Encrypted code dispatched to {email}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                            AABB Verified
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-[#5A626A] mb-2 px-1 max-w-xs mx-auto">
                          <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                            Enter 6-Digit Code
                          </label>
                          <span className="text-[11px] font-mono font-bold text-[#D72638] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {twoFactorExpirySeconds > 0 ? (
                              <span>Expires in {Math.floor(twoFactorExpirySeconds / 60)}:{(twoFactorExpirySeconds % 60).toString().padStart(2, '0')}</span>
                            ) : (
                              <span className="text-red-600 font-extrabold">Expired (10m Limit)</span>
                            )}
                          </span>
                        </div>
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
                          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center justify-center gap-2 sm:gap-3"
                        >
                          {twoFactorOtp.map((digit, idx) => (
                            <motion.input
                              key={idx}
                              initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                              transition={{ duration: 0.25, delay: idx * 0.04 }}
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
                        </motion.div>

                        {/* Resend 2FA Action */}
                        <div className="flex items-center justify-between text-xs text-[#5A626A] pt-3 max-w-xs mx-auto">
                          <span>Didn't receive code?</span>
                          <button
                            type="button"
                            onClick={handleResend2FA}
                            disabled={!canResend2FA || isResending2FA}
                            className="font-bold text-[#D72638] hover:underline disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${isResending2FA ? 'animate-spin' : ''}`} />
                            <span>{isResending2FA ? 'Sending...' : !canResend2FA ? `Resend Code (${twoFactorResendTimer}s)` : 'Resend Code'}</span>
                          </button>
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
