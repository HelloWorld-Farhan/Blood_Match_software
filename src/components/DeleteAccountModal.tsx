import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ShieldAlert, 
  Mail, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Clock 
} from 'lucide-react';
import { apiClient } from '../services/api';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
  onDeleted: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  userEmail,
  userName,
  onDeleted
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<'CONFIRM_TEXT' | 'ENTER_OTP' | 'SUCCESS'>('CONFIRM_TEXT');
  const [confirmText, setConfirmText] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(600);
  const [resendTimer, setResendTimer] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (step === 'ENTER_OTP') {
      timer = setInterval(() => {
        setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      setStep('CONFIRM_TEXT');
      setConfirmText('');
      setOtpDigits(['', '', '', '', '', '']);
      setErrorMessage(null);
      setIsLoading(false);
      setOtpExpirySeconds(600);
      setResendTimer(30);
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (confirmText.trim() !== 'DELETE') {
      setErrorMessage('Please type DELETE in uppercase to authorize the deletion code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post('/api/auth/account-deletion/request-otp', {});
      setIsLoading(false);

      if (!res.ok) {
        setErrorMessage(res.error || 'Failed to dispatch deletion authorization code.');
        return;
      }

      setStep('ENTER_OTP');
      setOtpExpirySeconds(600);
      setResendTimer(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Connection failure. Please check server connectivity.');
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setErrorMessage(null);
    setIsResending(true);
    try {
      const res = await apiClient.post('/api/auth/account-deletion/request-otp', {});
      setIsResending(false);
      if (!res.ok) {
        setErrorMessage(res.error || 'Failed to dispatch new deletion code.');
        return;
      }
      setOtpExpirySeconds(600);
      setResendTimer(30);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setIsResending(false);
      setErrorMessage(err?.message || 'Failed to resend deletion authorization code.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    setErrorMessage(null);
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = clean;
    setOtpDigits(updated);
    if (clean && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirmDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const code = otpDigits.join('');

    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit deletion code sent to your email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post('/api/auth/account-deletion/confirm', {
        confirm_text: 'DELETE',
        otp_code: code
      });
      setIsLoading(false);

      if (!res.ok) {
        setErrorMessage(res.error || 'Failed to delete account. Please verify your OTP code.');
        return;
      }

      setStep('SUCCESS');
      // Trigger logout and session purge after short confirmation delay
      setTimeout(() => {
        onDeleted();
      }, 2500);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Error occurred while purging account.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-red-200 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between pb-4 border-b border-red-100">
          <div className="flex items-center gap-2.5 text-red-600">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1A1D20] tracking-tight">
                Permanent Account Deletion
              </h3>
              <p className="text-[11px] text-[#5A626A]">
                Irreversible purge of credentials, donor registry & cloud data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || step === 'SUCCESS'}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2 font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Type 'DELETE' */}
        {step === 'CONFIRM_TEXT' && (
          <form onSubmit={handleRequestOtp} className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 text-xs text-red-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Notice: This action CANNOT be undone</span>
              </div>
              <p className="leading-relaxed text-[11px] text-red-900">
                Deleting this account will permanently wipe out:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-red-800">
                <li>User identity & authentication credentials ({userEmail})</li>
                <li>Voluntary blood donor registration records</li>
                <li>Emergency blood requests and audit logs</li>
                <li>All profile images and Cloudflare R2 cloud storage files</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1D20] uppercase tracking-wider mb-1.5">
                Type <span className="text-red-600 font-mono">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-sm text-[#1A1D20] font-mono tracking-widest placeholder-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-hidden transition-all uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#D9C7C2] text-xs font-bold text-[#5A626A] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={confirmText.trim() !== 'DELETE' || isLoading}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching OTP...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Deletion Code to Email</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Enter 6-Digit Email OTP */}
        {step === 'ENTER_OTP' && (
          <form onSubmit={handleConfirmDeletion} className="mt-5 space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                <Mail className="w-3.5 h-3.5 text-red-600" />
                <span>Verification Code Sent</span>
              </div>
              <p className="text-xs text-[#5A626A] pt-1">
                A 6-digit deletion authorization code was sent to:
              </p>
              <p className="text-xs font-bold text-[#1A1D20] font-mono">
                {userEmail}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                  Enter 6-Digit Deletion Authorization Code
                </label>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${otpExpirySeconds > 60 ? 'text-slate-500' : otpExpirySeconds > 0 ? 'text-amber-600' : 'text-red-600 font-bold'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {otpExpirySeconds > 0
                      ? `Expires in ${Math.floor(otpExpirySeconds / 60)}:${(otpExpirySeconds % 60).toString().padStart(2, '0')}`
                      : 'Code Expired'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={otpExpirySeconds <= 0}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:bg-white outline-hidden transition-all text-[#1A1D20] disabled:opacity-40"
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs px-1">
                <span className="text-[#5A626A]">Didn't receive the email code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isResending}
                  className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : resendTimer > 0 ? (
                    `Resend Code (${resendTimer}s)`
                  ) : (
                    'Resend Code'
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep('CONFIRM_TEXT')}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-[#D9C7C2] text-xs font-bold text-[#5A626A] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={otpDigits.join('').length < 6 || isLoading || otpExpirySeconds <= 0}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Account & Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete My Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'SUCCESS' && (
          <div className="mt-5 text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-[#1A1D20]">
              Account Successfully Deleted
            </h4>
            <p className="text-xs text-[#5A626A] max-w-sm mx-auto leading-relaxed">
              Your profile, donor registry records, and Cloudflare R2 files have been completely wiped. A confirmation email has been dispatched to <strong>{userEmail}</strong>. Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

