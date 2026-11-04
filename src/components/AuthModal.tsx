import React, { useState } from 'react';
import { BloodStorage } from '../services/storage';
import { BloodType, UserSession } from '../types';
import { X, ShieldAlert, Heart, Lock, Mail, User, Droplet, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess: (user: UserSession) => void;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserSession['role']>('CLINICIAN');
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const user: UserSession = {
        email: email.trim().toLowerCase(),
        name: mode === 'signup' ? fullName.trim() : email.split('@')[0],
        role,
        bloodType: role === 'DONOR' ? bloodType : undefined,
        token: 'BM-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      };

      BloodStorage.setUser(user);
      setIsSubmitting(false);
      onSuccess(user);
      onClose();
    }, 600);
  };

  const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Main Split Container */}
      <div className="relative w-full max-w-4xl bg-slate-900/90 border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-blood-950/60 flex flex-col md:flex-row z-10 backdrop-blur-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT SIDE: Video Showcase (Login.mp4 vs signup.mp4) */}
        <div className="md:w-5/12 relative min-h-[260px] md:min-h-[580px] overflow-hidden bg-slate-950 flex flex-col justify-end p-6 border-b md:border-b-0 md:border-r border-slate-800/80">
          {mode === 'login' ? (
            <video
              key="login-video"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover filter brightness-85 contrast-110 transition-opacity duration-500"
            >
              <source src="/Login.mp4" type="video/mp4" />
            </video>
          ) : (
            <video
              key="signup-video"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover filter brightness-85 contrast-110 transition-opacity duration-500"
            >
              <source src="/signup.mp4" type="video/mp4" />
            </video>
          )}

          {/* Video Gradient Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-900/20" />

          {/* Left Overlay Info Card */}
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blood-600/30 border border-blood-500/40 text-blood-300 text-xs font-semibold backdrop-blur-md">
              <Droplet className="w-3.5 h-3.5 fill-blood-400 text-blood-400 animate-pulse" />
              <span>{mode === 'login' ? 'Secure Clinical Access' : 'Join Transfusion Network'}</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {mode === 'login' ? 'Welcome Back to BloodMatch' : 'Save Lives with BloodMatch'}
            </h3>
            <p className="text-xs text-slate-300/90 leading-relaxed">
              {mode === 'login'
                ? 'Authenticate to screen donor compatibility, dispatch urgent requests, and verify safe transfusions.'
                : 'Register as an emergency blood donor, attending clinician, or blood bank coordinator.'}
            </p>

            {/* Micro Feature Indicators */}
            <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Instant RhD & Antigen Cross-Matching</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Real-Time Cloud Emergency Broadcasts</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Authentication Form */}
        <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Header / Mode Switch Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-blood-600 text-white shadow-md shadow-blood-900/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-blood-600 text-white shadow-md shadow-blood-900/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                SSL 256-Bit Encrypted
              </span>
            </div>

            {/* Title */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {mode === 'login' ? 'Clinician & Staff Sign In' : 'Create New Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Access your clinical safety dashboard and donor directory'
                  : 'Start coordinating emergency blood requests in seconds'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Farhan Khalid"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blood-500 focus:ring-1 focus:ring-blood-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.org"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blood-500 focus:ring-1 focus:ring-blood-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blood-500 focus:ring-1 focus:ring-blood-500"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none focus:border-blood-500"
                    >
                      <option value="CLINICIAN">Attending Clinician</option>
                      <option value="DONOR">Emergency Donor</option>
                      <option value="HOSPITAL_STAFF">Blood Bank Staff</option>
                    </select>
                  </div>

                  {role === 'DONOR' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Blood Group
                      </label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value as BloodType)}
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none focus:border-blood-500 font-bold text-blood-400"
                      >
                        {bloodTypes.map(bt => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blood-600 to-blood-700 hover:from-blood-500 hover:to-blood-600 text-white font-bold text-xs shadow-lg shadow-blood-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer notice */}
          <div className="pt-4 mt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              {mode === 'login' ? "Don't have an account yet?" : 'Already have credentials?'}{' '}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-blood-400 hover:underline font-bold cursor-pointer ml-1"
              >
                {mode === 'login' ? 'Create Account' : 'Sign In Here'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

