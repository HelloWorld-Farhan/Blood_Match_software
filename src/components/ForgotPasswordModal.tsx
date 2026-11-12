import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  Smartphone, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Droplet, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  KeyRound,
  Check,
  Clock
} from 'lucide-react';
import { validateEmail, checkPasswordCriteria } from '../utils/countryCodes';
import { apiClient } from '../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  onSuccess?: () => void;
}

type RecoveryStep = 'CHANNEL_OR_EMAIL' | 'OTP_VERIFICATION' | 'NEW_PASSWORD' | 'SUCCESS';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  onSuccess,
}) => {
  const [step, setStep] = useState<RecoveryStep>('CHANNEL_OR_EMAIL');
  const [email, setEmail] = useState(defaultEmail);
  const [emailError, setEmailError] = useState<string | null>(null);

  // OTP states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(600); // 10 minutes exact
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password reset states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [resetSessionToken, setResetSessionToken] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);

  // Video reference for left panel
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Evaluate password criteria in real time
  const passwordCriteria = useMemo(() => checkPasswordCriteria(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Strict dual-tier background screen scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      // Reset flow
      setStep('CHANNEL_OR_EMAIL');
      setEmail(defaultEmail);
      setEmailError(null);
      setOtp(['', '', '', '', '', '']);
      setOtpError(null);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      setConfirmPasswordError(null);
      setResendTimer(30);
      setCanResend(false);
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen, defaultEmail]);

  // Resend cooldown timer (30s) + strict token expiry (10 minutes)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'OTP_VERIFICATION') {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });

        setOtpExpirySeconds(prev => {
          if (prev <= 1) {
            setOtpError('Verification code has expired (strictly valid for 10 minutes). Please click Resend Token.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // High-performance video lifecycle: play on open, strictly pause on close/unmount
  useEffect(() => {
    const video = videoRef.current;
    if (isOpen && video) {
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});
    } else if (video) {
      video.pause();
    }
    return () => {
      if (video) video.pause();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Step 1: Send OTP to Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setEmailError(emailCheck.message || 'Please enter a valid clinician email address');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.post('/api/auth/password-reset/request', { email: email.trim() });
      setIsLoading(false);

      if (!res.ok) {
        setEmailError(res.error || 'Failed to dispatch reset code.');
        return;
      }

      setStep('OTP_VERIFICATION');
      setResendTimer(30);
      setOtpExpirySeconds(600);
      setCanResend(false);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setIsLoading(false);
      setEmailError(err?.message || 'Connection failure.');
    }
  };

  // Handle OTP digit entry
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
    setOtpExpirySeconds(600);
    setCanResend(false);
    setOtpError(null);
    otpInputRefs.current[0]?.focus();

    try {
      const res = await apiClient.post('/api/auth/password-reset/request', { email: email.trim() });
      if (!res.ok) {
        setOtpError(res.error || 'Could not resend reset code.');
      }
    } catch {
      // Ignored
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setOtpError('Please enter the full 6-digit security code dispatched to your email');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.post('/api/auth/password-reset/verify', {
        email: email.trim(),
        otp_code: fullCode
      });
      setIsLoading(false);

      if (!res.ok) {
        setOtpError(res.error || 'Invalid or expired recovery code.');
        return;
      }

      setResetSessionToken(res.data?.reset_token || res.data?.reset_session_token || '');
      setStep('NEW_PASSWORD');
    } catch (err: any) {
      setIsLoading(false);
      setOtpError(err?.message || 'Verification connection failure.');
    }
  };

  // Handle Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setConfirmPasswordError(null);

    let hasError = false;

    if (!passwordCriteria.allValid) {
      setPasswordError('New password must satisfy all 4 security criteria below');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      const res = await apiClient.post('/api/auth/password-reset/confirm', {
        email: email.trim(),
        reset_token: resetSessionToken,
        reset_session_token: resetSessionToken,
        new_password: newPassword
      });
      setIsLoading(false);

      if (!res.ok) {
        setPasswordError(res.error || 'Failed to update security password.');
        return;
      }

      setStep('SUCCESS');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setIsLoading(false);
      setPasswordError(err?.message || 'Password update failure.');
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#D9C7C2] flex flex-col md:flex-row overflow-hidden my-auto"
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-xl bg-white/80 hover:bg-red-50 border border-[#D9C7C2] text-[#4A5568] hover:text-[#D72638] transition-colors cursor-pointer"
          aria-label="Close recovery modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =========================================================================
            LEFT PANEL: 299518.mp4 Video Presentation with Clinical Overlays
            ========================================================================= */}
        <div className="relative w-full md:w-5/12 bg-black min-h-[220px] sm:min-h-[280px] md:min-h-[560px] flex flex-col justify-between p-6 sm:p-8 overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-[#D9C7C2]">
          <div className="absolute inset-0 w-full h-full">
            <video
              ref={videoRef}
              src="/299518.mp4"
              poster="/299518_poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover object-center pointer-events-none"
              style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-[#7A0C17]/40 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(215,38,56,0.35)_0%,_transparent_60%)] pointer-events-none" />
          </div>

          {/* Top Video Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-semibold text-white">
              <KeyRound className="w-3.5 h-3.5 text-[#D72638] animate-pulse" />
              <span>Access Recovery Protocol</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7A0C17]/70 border border-[#D72638]/40 text-[11px] font-semibold text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Encrypted Relay</span>
            </div>
          </div>

          {/* Bottom Video Telemetry Details */}
          <div className="relative z-10 pt-12 md:pt-32">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D72638]/40 border border-[#D72638]/50 text-white text-xs font-bold mb-2">
              <Droplet className="w-3.5 h-3.5 fill-current" />
              Multi-Factor Transfusion Security
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2">
              Clinician Identity <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-100 to-white">
                Credential Recovery
              </span>
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed font-light mb-4">
              Autonomous verification safeguards clinical emergency transfusion authorization and patient anonymity.
            </p>

            <div className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-[11px] text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit Cryptographic Ledger</span>
              </span>
              <span className="text-red-200 font-mono font-bold">AABB Verified</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: Interactive Recovery Flow
            ========================================================================= */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white text-[#1A1D20]" style={{ contain: 'content' }}>
          <div>
            {/* Modal Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7A0C17]/10 text-[#7A0C17] text-[11px] font-bold border border-[#D72638]/20 mb-2">
                <KeyRound className="w-3 h-3 text-[#D72638]" />
                <span>Clinician Terminal Recovery</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D20] tracking-tight">
                {step === 'CHANNEL_OR_EMAIL' && 'Recover Portal Access'}
                {step === 'OTP_VERIFICATION' && 'Verify Security Code'}
                {step === 'NEW_PASSWORD' && 'Create New Password'}
                {step === 'SUCCESS' && 'Access Restored'}
              </h1>
              <p className="text-xs sm:text-sm text-[#5A626A] mt-1">
                {step === 'CHANNEL_OR_EMAIL' && 'Select your verification channel and provide your registered work email.'}
                {step === 'OTP_VERIFICATION' && `Enter the 6-digit transfusion authorization token sent to ${email}.`}
                {step === 'NEW_PASSWORD' && 'Configure a new 256-bit compliant security password for clinical operations.'}
                {step === 'SUCCESS' && 'Your clinical terminal credentials have been successfully updated.'}
              </p>
            </div>

            {/* Verification Channel Selector (Email OTP vs Mobile OTP Coming Soon) */}
            {step === 'CHANNEL_OR_EMAIL' && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-2">
                  Recovery Channel
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Email OTP Option (Active) */}
                  <div className="p-3 rounded-xl border-2 border-[#D72638] bg-red-50/50 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#D72638] text-white flex items-center justify-center shadow-xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1A1D20]">Email OTP</div>
                        <div className="text-[10px] text-emerald-700 font-semibold">Instant Dispatch</div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[#D72638]" />
                  </div>

                  {/* Mobile SMS OTP Option (Coming Soon) */}
                  <div className="p-3 rounded-xl border border-[#D9C7C2] bg-[#F5F1EF]/60 flex items-center justify-between opacity-80 cursor-not-allowed">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-600">Mobile OTP</div>
                        <div className="text-[10px] text-slate-500">SMS cellular gateway</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black tracking-wider">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                STEP 1: EMAIL INPUT FORM
                ===================================================================== */}
            {step === 'CHANNEL_OR_EMAIL' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1.5">
                    Registered Clinician Email
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
                  {/* Inline Error Below Field */}
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/30 hover:shadow-[#D72638]/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Dispatching Security Token...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* =====================================================================
                STEP 2: OTP VERIFICATION & PROPER BLOOD DROP ANIMATION
                ===================================================================== */}
            {step === 'OTP_VERIFICATION' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* Custom Blood Droplet Pulsing Animation */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative flex items-center justify-center mb-3">
                    {/* Expanding Outer Ripple Rings */}
                    <motion.span
                      animate={{ scale: [1, 1.8, 2.2], opacity: [0.6, 0.25, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                      className="absolute w-16 h-16 rounded-full border-2 border-[#D72638] pointer-events-none"
                    />
                    <motion.span
                      animate={{ scale: [1, 1.4, 1.8], opacity: [0.8, 0.4, 0] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 0.4, ease: 'easeOut' }}
                      className="absolute w-16 h-16 rounded-full bg-[#D72638]/20 pointer-events-none"
                    />

                    {/* Central Liquid Blood Drop Container */}
                    <motion.div
                      animate={{ 
                        scale: [1, 1.08, 1],
                        y: [0, -4, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                      className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D72638] via-[#B81D2D] to-[#7A0C17] flex items-center justify-center text-white shadow-xl shadow-[#D72638]/40 border border-white/30"
                    >
                      <Droplet className="w-9 h-9 fill-current animate-pulse-subtle" />
                    </motion.div>
                  </div>

                  <p className="text-xs text-[#5A626A] text-center">
                    Enter the 6-digit verification code dispatched to <br />
                    <span className="font-bold text-[#1A1D20]">{email}</span>
                  </p>
                </div>

                {/* 6-Digit OTP Inputs */}
                <div>
                  <div className="flex items-center justify-between text-xs text-[#5A626A] mb-2 px-1 max-w-xs mx-auto">
                    <span className="font-semibold text-slate-600">6-Digit Code</span>
                    <span className="text-[11px] font-mono font-bold text-[#D72638] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {otpExpirySeconds > 0 ? (
                        <span>Expires in {Math.floor(otpExpirySeconds / 60)}:{(otpExpirySeconds % 60).toString().padStart(2, '0')}</span>
                      ) : (
                        <span className="text-red-600 font-extrabold">Expired (10m Limit)</span>
                      )}
                    </span>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex justify-center gap-2 sm:gap-3"
                  >
                    {otp.map((digit, idx) => (
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
                        className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl text-center text-xl font-mono font-black border transition-all duration-200 outline-hidden ${
                          otpError 
                            ? 'border-red-400 bg-red-50/40 text-[#D72638]' 
                            : digit 
                            ? 'border-[#D72638] bg-white text-[#1A1D20] shadow-sm' 
                            : 'border-[#D9C7C2] bg-[#F5F1EF] focus:border-[#D72638] focus:bg-white focus:ring-2 focus:ring-[#D72638]/20'
                        }`}
                      />
                    ))}
                  </motion.div>

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

                {/* Resend Timer & Link */}
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

                {/* Verify Button */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('CHANNEL_OR_EMAIL')}
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
                        <span>Verifying Token...</span>
                      </>
                    ) : (
                      <>
                        <span>Validate Code & Proceed</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* =====================================================================
                STEP 3: NEW PASSWORD CREATION
                ===================================================================== */}
            {step === 'NEW_PASSWORD' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                      New Security Password
                    </label>
                    <span className="text-[11px] font-mono font-bold text-[#D72638] flex items-center gap-1">
                      <Droplet className="w-3 h-3 fill-current animate-pulse" />
                      <span>{passwordCriteria.strengthPercent}% Validated</span>
                    </span>
                  </div>
                  <div className="relative group">
                    <Lock className={`absolute left-3.5 top-3 w-4 h-4 transition-colors ${
                      passwordError ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Min. 8 chars, 1 uppercase, 2 numbers, 1 symbol"
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

                  {/* Liquid Blood Strength Meter (Fast GPU CSS Transition) */}
                  <div className="w-full bg-[#F5F1EF] border border-[#D9C7C2]/70 h-2 rounded-full overflow-hidden mt-1.5 relative">
                    <div
                      style={{ width: `${passwordCriteria.strengthPercent}%` }}
                      className={`h-full rounded-full transition-all duration-200 ease-out ${
                        passwordCriteria.strengthPercent === 100
                          ? 'bg-gradient-to-r from-[#D72638] to-emerald-500 shadow-[0_0_8px_rgba(215,38,56,0.5)]'
                          : passwordCriteria.strengthPercent >= 50
                          ? 'bg-gradient-to-r from-amber-500 to-[#D72638]'
                          : 'bg-[#D72638]'
                      }`}
                    />
                  </div>

                  {/* Real-Time Checklist Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                      passwordCriteria.hasMinLength ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-[#F5F1EF] text-[#5A626A] border-[#D9C7C2]'
                    }`}>
                      {passwordCriteria.hasMinLength ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                      <span>8+ Chars</span>
                    </span>

                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                      passwordCriteria.hasUppercase ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-[#F5F1EF] text-[#5A626A] border-[#D9C7C2]'
                    }`}>
                      {passwordCriteria.hasUppercase ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                      <span>1 Big (A-Z)</span>
                    </span>

                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                      passwordCriteria.hasTwoNumbers ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-[#F5F1EF] text-[#5A626A] border-[#D9C7C2]'
                    }`}>
                      {passwordCriteria.hasTwoNumbers ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                      <span>2 Numbers</span>
                    </span>

                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                      passwordCriteria.hasSpecialChar ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-[#F5F1EF] text-[#5A626A] border-[#D9C7C2]'
                    }`}>
                      {passwordCriteria.hasSpecialChar ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                      <span>1 Symbol (!@#)</span>
                    </span>
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

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                      Confirm New Password
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
                      confirmPasswordError ? 'text-[#D72638]' : 'text-slate-400 group-focus-within:text-[#D72638]'
                    }`} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError(null);
                      }}
                      placeholder="Re-enter new password"
                      className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#F5F1EF] border text-sm text-[#1A1D20] placeholder-slate-400 outline-hidden transition-all duration-200 ${
                        confirmPasswordError 
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
                  {confirmPasswordError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#D72638] mt-1.5 flex items-center gap-1.5 font-semibold"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{confirmPasswordError}</span>
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-sm shadow-md shadow-[#D72638]/30 hover:shadow-[#D72638]/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Password & Unlock Terminal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* =====================================================================
                STEP 4: SUCCESS STATE
                ===================================================================== */}
            {step === 'SUCCESS' && (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1D20]">
                  Access Credentials Restored!
                </h3>
                <p className="text-xs text-[#5A626A] max-w-sm mx-auto">
                  Your clinical password has been securely updated. A confirmation email with audit telemetry has been dispatched to your registered address.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white font-bold text-xs shadow-md shadow-[#D72638]/25 transition-all cursor-pointer"
                >
                  Return to Clinician Sign In
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer Note */}
          <div className="pt-6 border-t border-[#D9C7C2] text-center text-[#5A626A] text-[11px] flex items-center justify-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>AABB Cryptographic Verification</span>
            </span>
            <span>•</span>
            <span className="font-medium">Encrypted Clinical Relay</span>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

