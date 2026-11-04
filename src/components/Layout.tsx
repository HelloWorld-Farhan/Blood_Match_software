import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { 
  Droplet, 
  LayoutDashboard, 
  Grid, 
  AlertTriangle, 
  Users, 
  Database, 
  Bell, 
  Search, 
  LogOut, 
  Menu, 
  X, 
  PlusCircle, 
  CheckCircle2, 
  ChevronDown,
  PhoneCall,
  Activity,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BloodDropsCanvas } from './BloodDropsCanvas';
import { AmbientBackgroundVideo } from './AmbientBackgroundVideo';
import { getDonors, getEmergencyRequests, getInventory } from '../services/storage';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'urgent' | 'donor' | 'inventory';
  unread: boolean;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // User session details
  const userName = sessionStorage.getItem('bloodmatch_user_name') || 'Dr. Farhan Khalid, MD';
  const userEmail = sessionStorage.getItem('bloodmatch_user_email') || 'clinician@bloodmatch.org';
  const userFacility = sessionStorage.getItem('bloodmatch_user_facility') || 'Metro Transfusion Cryo-Vault';

  // Live counters for badges
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [donorsCount, setDonorsCount] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Transfusion Engine Initialized',
      desc: 'Zero-synthetic-data vault connected. Ready for clinical triage.',
      time: 'Just now',
      type: 'inventory',
      unread: true,
    },
    {
      id: '2',
      title: 'Universal Donor O- Reserve Guard',
      desc: 'Automatic threshold surveillance enabled for all 8 blood groups.',
      time: '2m ago',
      type: 'urgent',
      unread: true,
    }
  ]);

  useEffect(() => {
    const updateStats = () => {
      const reqs = getEmergencyRequests();
      setActiveRequestsCount(reqs.filter(r => r.status === 'urgent' || r.status === 'critical').length);
      const donors = getDonors();
      setDonorsCount(donors.length);
      const inv = getInventory();
      setTotalUnits(inv.reduce((sum, item) => sum + item.unitsAvailable, 0));
    };

    updateStats();
    window.addEventListener('storage', updateStats);
    return () => window.removeEventListener('storage', updateStats);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('bloodmatch_auth');
    sessionStorage.removeItem('bloodmatch_user_name');
    sessionStorage.removeItem('bloodmatch_user_email');
    navigate('/login');
  };

  const navItems = [
    { name: 'Power BI Executive Hub', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { name: '8x8 Compatibility Matrix', path: '/dashboard/matrix', icon: Grid },
    { 
      name: 'Emergency Requests', 
      path: '/dashboard/emergency', 
      icon: AlertTriangle,
      badge: activeRequestsCount > 0 ? `${activeRequestsCount}` : undefined,
      badgeColor: 'bg-[#D00000] text-white animate-pulse'
    },
    { 
      name: 'Donor Registry', 
      path: '/dashboard/donors', 
      icon: Users,
      badge: donorsCount > 0 ? `${donorsCount}` : undefined,
      badgeColor: 'bg-[#2A2A2F] text-slate-200'
    },
    { 
      name: 'Cryo-Vault Inventory', 
      path: '/dashboard/inventory', 
      icon: Database,
      badge: `${totalUnits} Pints`,
      badgeColor: 'bg-[#6A040F]/80 text-red-200 border border-[#D00000]/40'
    },
  ];

  const isActive = (itemPath: string, exact?: boolean) => {
    if (exact) return location.pathname === itemPath;
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="relative h-screen max-h-screen bg-[#F5F1EF] font-sans text-[#1A1D20] flex flex-col overflow-hidden selection:bg-[#D72638] selection:text-white">
      {/* Ambient Red Fluid / Cell Video Layer in Background */}
      <AmbientBackgroundVideo />

      {/* Floating Blood Drops Canvas in Background */}
      <BloodDropsCanvas />

      {/* Mobile Sidebar Overlay - Clean dark tint WITHOUT blur to prevent whole-screen smudging */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top Header Bar (Fixed / Shrink 0) - Crisp Solid White with #D9C7C2 border */}
      <header className="shrink-0 z-30 w-full h-16 bg-white/95 backdrop-blur-md border-b border-[#D9C7C2] flex items-center justify-between px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-[#4A5568] hover:text-[#1A1D20] lg:hidden cursor-pointer"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] border border-[#D72638]/40 text-white flex items-center justify-center shadow-md shadow-[#D72638]/20 group-hover:scale-105 transition-transform">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[#1A1D20] block leading-tight">
                Blood<span className="text-[#D72638]">Match</span>
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#7A0C17] font-bold block">
                Clinical Operations Hub
              </span>
            </div>
          </Link>
        </div>

        {/* Topbar Search & Actions */}
        <div className="flex items-center gap-3">
          {/* Global Search Bar */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus-within:border-[#D72638] transition-colors w-64">
            <Search className="w-4 h-4 text-[#7A0C17]/60" />
            <input
              type="text"
              placeholder="Search donor, group, case..."
              className="w-full bg-transparent text-xs text-[#1A1D20] placeholder-slate-400 outline-hidden"
            />
            <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-white border border-[#D9C7C2]">
              ⌘K
            </span>
          </div>

          {/* Quick Emergency Broadcast */}
          <Link
            to="/dashboard/emergency"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Dispatch Request</span>
          </Link>

          {/* Notifications Dropdown - Responsive Full Mobile Alignment (No Left Cutoff) */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-[#4A5568] hover:text-[#1A1D20] transition-colors cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D72638] animate-ping"></span>
              )}
            </button>

            {notificationsOpen && (
              <div className="fixed sm:absolute top-16 sm:top-full left-4 sm:left-auto right-4 sm:right-0 mt-2 sm:w-80 rounded-2xl bg-white shadow-2xl p-4 border border-[#D9C7C2] z-50 animate-slide-up text-[#1A1D20]">
                <div className="flex items-center justify-between pb-3 border-b border-[#D9C7C2]">
                  <span className="text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                    Transfusion Alerts
                  </span>
                  <button
                    onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                    className="text-[11px] font-semibold text-[#D72638] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="space-y-2.5 pt-3 max-h-64 overflow-y-auto no-scrollbar">
                  {notifications.map(n => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]/70 text-xs">
                      <div className="font-bold text-[#1A1D20] flex items-center justify-between">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-[#4A5568] mt-1 leading-relaxed">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clinician Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] hover:border-[#D72638] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7A0C17] to-[#D72638] flex items-center justify-center text-white text-xs font-bold">
                FK
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-[#1A1D20] leading-tight">{userName}</div>
                <div className="text-[10px] text-[#7A0C17] font-semibold">{userFacility}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="fixed sm:absolute top-16 sm:top-full left-4 sm:left-auto right-4 sm:right-0 mt-2 sm:w-64 rounded-2xl bg-white shadow-2xl p-3 border border-[#D9C7C2] z-50 animate-slide-up text-[#1A1D20]">
                <div className="p-2 border-b border-[#D9C7C2]">
                  <div className="text-xs font-bold text-[#1A1D20]">{userName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Medical Practitioner</span>
                  </div>
                </div>

                <div className="pt-2 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#D72638] hover:bg-[#F5F1EF] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Lock Session & Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Layout: Fixed Solid Sidebar Docked to Full Left + Scrollable Center Content */}
      <div className="relative z-10 flex-1 flex overflow-hidden w-full h-full">
        {/* Fixed Left Navigation Sidebar: 100% Solid White, NO Background Video Bleed */}
        <aside
          className={`
            fixed lg:static top-0 lg:top-auto bottom-0 left-0 z-50 lg:z-40 
            w-72 lg:w-64 shrink-0 h-full
            bg-white border-r border-[#D9C7C2]
            p-4 lg:p-4
            flex flex-col justify-between overflow-y-auto no-scrollbar
            shadow-xl lg:shadow-none
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Navigation Items */}
          <div className="space-y-1.5">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#7A0C17] font-black flex items-center justify-between">
              <span>Operations Suite</span>
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#D72638]" />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1 rounded-md text-slate-400 hover:text-[#1A1D20]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {navItems.map((item) => {
              const active = isActive(item.path, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold
                    transition-all duration-200 group
                    ${active
                      ? 'bg-gradient-to-r from-[#D72638] to-[#7A0C17] text-white shadow-md shadow-[#D72638]/25 font-bold scale-[1.01]'
                      : 'text-[#4A5568] hover:bg-[#F5F1EF] hover:text-[#1A1D20]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-[#7A0C17] group-hover:text-[#D72638]'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      active 
                        ? 'bg-white/20 text-white' 
                        : (item.badgeColor || 'bg-[#F5F1EF] text-[#7A0C17] border border-[#D9C7C2]')
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick Telemetry & Support in Solid Left Sidebar */}
          <div className="pt-4 border-t border-[#D9C7C2] space-y-2 shrink-0">
            <div className="p-3 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-xs">
              <div className="flex items-center justify-between text-[#4A5568] mb-1">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cryo-Vault State</span>
                </span>
                <span className="text-emerald-700 font-bold">4.0°C</span>
              </div>
              <div className="w-full bg-[#D9C7C2]/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-[#D72638] via-[#7A0C17] to-emerald-500 h-full w-full"></div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-[11px] text-[#4A5568]">
              <span className="flex items-center gap-1 font-medium">
                <PhoneCall className="w-3 h-3 text-[#D72638]" />
                <span>Trauma Hotline</span>
              </span>
              <span className="text-[#D72638] font-mono font-bold">Ext 911</span>
            </div>
          </div>
        </aside>

        {/* Center Content Router Outlet: Scrollable with ambient video visible in background */}
        <main className="flex-1 h-full min-w-0 overflow-y-auto no-scrollbar px-3 sm:px-6 lg:px-8 py-4 lg:py-6 pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
