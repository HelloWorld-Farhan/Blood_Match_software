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
  ExternalLink,
  ChevronDown,
  PhoneCall
} from 'lucide-react';
import { BloodDropsCanvas } from './BloodDropsCanvas';
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
    { name: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { name: '8x8 Compatibility Matrix', path: '/dashboard/matrix', icon: Grid },
    { 
      name: 'Emergency Requests', 
      path: '/dashboard/emergency', 
      icon: AlertTriangle,
      badge: activeRequestsCount > 0 ? `${activeRequestsCount}` : undefined,
      badgeColor: 'bg-red-500 text-white animate-pulse'
    },
    { 
      name: 'Donor Registry', 
      path: '/dashboard/donors', 
      icon: Users,
      badge: donorsCount > 0 ? `${donorsCount}` : undefined,
      badgeColor: 'bg-slate-800 text-slate-300'
    },
    { 
      name: 'Cryo-Vault Inventory', 
      path: '/dashboard/inventory', 
      icon: Database,
      badge: `${totalUnits} Units`,
      badgeColor: 'bg-red-950/80 text-red-300 border border-red-800/40'
    },
  ];

  const isActive = (itemPath: string, exact?: boolean) => {
    if (exact) return location.pathname === itemPath;
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="relative min-h-screen bg-crimson-void font-sans text-slate-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Floating Blood Drops Canvas in Background */}
      <BloodDropsCanvas />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 w-full h-16 bg-slate-950/80 backdrop-blur-xl border-b border-red-900/30 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white lg:hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-900 border border-red-500/40 text-white flex items-center justify-center shadow-md shadow-red-900/30 group-hover:scale-105 transition-transform">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-tight">
                Blood<span className="text-red-500">Match</span>
              </span>
              <span className="text-[9px] uppercase tracking-wider text-red-400 font-semibold block">
                Clinical Operatory
              </span>
            </div>
          </Link>
        </div>

        {/* Topbar Search & Actions */}
        <div className="flex items-center gap-3">
          {/* Global Search Bar */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 focus-within:border-red-500 transition-colors w-64">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search donor, group, case..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-hidden"
            />
            <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
              ⌘K
            </span>
          </div>

          {/* Quick Emergency Broadcast */}
          <Link
            to="/dashboard/emergency"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-md shadow-red-900/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Dispatch Request</span>
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-card shadow-2xl p-4 border border-red-900/40 z-50 animate-slide-up">
                <div className="flex items-center justify-between pb-3 border-b border-red-900/30">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Transfusion Alerts
                  </span>
                  <button
                    onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                    className="text-[11px] text-red-400 hover:underline"
                  >
                    Mark read
                  </button>
                </div>
                <div className="space-y-2.5 pt-3 max-h-64 overflow-y-auto no-scrollbar">
                  {notifications.map(n => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
                      <div className="font-semibold text-white flex items-center justify-between">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{n.desc}</p>
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
              className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-red-900/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-red-700 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                FK
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-white leading-tight">{userName}</div>
                <div className="text-[10px] text-red-400">{userFacility}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-card shadow-2xl p-3 border border-red-900/40 z-50 animate-slide-up">
                <div className="p-2 border-b border-red-900/30">
                  <div className="text-xs font-bold text-white">{userName}</div>
                  <div className="text-[11px] text-slate-400 truncate">{userEmail}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Medical Practitioner</span>
                  </div>
                </div>

                <div className="pt-2 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/60 transition-colors cursor-pointer"
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

      {/* Main Container: Sidebar + Active Content */}
      <div className="relative z-10 flex-1 flex w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 gap-4">
        {/* Fixed / Responsive Sidebar */}
        <aside
          className={`
            fixed lg:static top-16 bottom-0 left-0 z-40 w-64 
            glass-card p-3 rounded-2xl flex flex-col justify-between
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Transfusion Suite
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
                    transition-all group
                    ${active
                      ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-md shadow-red-950'
                      : 'text-slate-300 hover:bg-red-950/40 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400 group-hover:text-red-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick System Telemetry in Sidebar */}
          <div className="pt-4 border-t border-red-900/30 space-y-2">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Vault Status</span>
                <span className="text-emerald-400 font-bold">Optimal 4°C</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-emerald-400 h-full w-full"></div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <PhoneCall className="w-3 h-3 text-red-400" />
                <span>Trauma Hotline</span>
              </span>
              <span className="text-red-400 font-mono font-bold">Ext 911</span>
            </div>
          </div>
        </aside>

        {/* Center Content Router Outlet */}
        <main className="flex-1 w-full min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
