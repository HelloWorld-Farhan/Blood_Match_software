import React from 'react';
import { ActiveTab, UserSession } from '../types';
import { Droplet, Activity, Users, AlertTriangle, Package, LogIn, LogOut, HeartPulse } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  user: UserSession | null;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onLogout: () => void;
  onRequestBlood: () => void;
  activeRequestsCount: number;
  totalDonorsCount: number;
}

export default function Navbar({
  activeTab,
  onTabChange,
  user,
  onOpenAuth,
  onLogout,
  onRequestBlood,
  activeRequestsCount,
  totalDonorsCount,
}: NavbarProps) {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'compatibility', label: 'Match Engine', icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'donors', label: 'Donors', icon: <Users className="w-4 h-4" />, badge: totalDonorsCount },
    { id: 'requests', label: 'Requests', icon: <AlertTriangle className="w-4 h-4" />, badge: activeRequestsCount },
    { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => onTabChange('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blood-600 via-blood-700 to-blood-900 flex items-center justify-center shadow-lg shadow-blood-900/40 border border-blood-500/40 group-hover:scale-105 transition-transform">
            <Droplet className="w-5 h-5 text-white fill-white animate-pulse-subtle" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black text-white tracking-tight">Blood<span className="text-blood-500">Match</span></span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blood-600/30 text-blood-400 border border-blood-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Clinical Transfusion Network</p>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blood-600 text-white shadow-md shadow-blood-900/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Quick Emergency Request Trigger */}
          <button
            type="button"
            onClick={onRequestBlood}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blood-600/20 hover:bg-blood-600/30 border border-blood-500/50 text-blood-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-blood-500 animate-ping shrink-0" />
            <span className="hidden sm:inline">Emergency</span> Request
          </button>

          {/* User Profile or Auth */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white border border-slate-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <span className="block font-bold text-white leading-tight">{user.name}</span>
                <span className="block text-[10px] text-slate-400">{user.role.replace('_', ' ')}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="ml-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700/80 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-300" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-slate-800/60 bg-slate-950/90 overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              activeTab === item.id ? 'text-blood-400 font-bold' : 'text-slate-400'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
