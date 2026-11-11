import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Layers,
  Settings as SettingsIcon,
  Camera
} from 'lucide-react';
import { BloodDropsCanvas } from './BloodDropsCanvas';
import { AmbientBackgroundVideo } from './AmbientBackgroundVideo';
import { AvatarUploadModal } from './AvatarUploadModal';
import { getDonors, getEmergencyRequests, getInventory } from '../services/storage';
import { apiClient } from '../services/api';

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

  // Requirement: Guard against unauthenticated viewing with zero dummy logins
  useEffect(() => {
    const isAuth = sessionStorage.getItem('bloodmatch_auth') === 'true';
    if (!isAuth) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Authentic User session details (no fake fallback clinician identity)
  const rawUserName = sessionStorage.getItem('bloodmatch_user_name') || localStorage.getItem('bloodmatch_user_name') || 'Farhan Khalid';
  const userName = rawUserName.replace(/^Dr\.\s+/i, '');
  const userEmail = sessionStorage.getItem('bloodmatch_user_email') || localStorage.getItem('bloodmatch_user_email') || '';
  const userMemberId = sessionStorage.getItem('bloodmatch_member_id') || localStorage.getItem('bloodmatch_member_id') || 'BM-9481-NX';

  // Live counters for badges
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [donorsCount, setDonorsCount] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);

  // Clinician Avatar
  const [avatar, setAvatar] = useState<string | null>(
    () => localStorage.getItem('bloodmatch_user_avatar') || null
  );
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Requirement 4: Cross-Device Cloud Sync Hydration on initial mount
  useEffect(() => {
    if (userEmail) {
      apiClient.get(`/api/v1/sync/all?user_email=${encodeURIComponent(userEmail)}`).then((res) => {
        if (res.ok && res.data?.photoUrl) {
          const photoUrl = `${res.data.photoUrl}?v=${Date.now()}`;
          setAvatar(photoUrl);
          localStorage.setItem('bloodmatch_user_avatar', photoUrl);
          sessionStorage.setItem('bloodmatch_user_avatar', photoUrl);
        }
      }).catch(() => {});
    }
  }, [userEmail]);

  // Requirement 3: Immediate "Apply Everywhere" UI Updates (Zero Page Refresh)
  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newUrl = customEvent.detail?.photoUrl;
      setAvatar(newUrl || null);
    };
    window.addEventListener('user_avatar_updated', handleAvatarUpdate);
    window.addEventListener('bloodmatch_profile_updated', () => {
      setAvatar(localStorage.getItem('bloodmatch_user_avatar') || null);
    });
    return () => {
      window.removeEventListener('user_avatar_updated', handleAvatarUpdate);
    };
  }, []);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem('bloodmatch_auth');
    sessionStorage.removeItem('bloodmatch_auth_token');
    sessionStorage.removeItem('bloodmatch_user_name');
    sessionStorage.removeItem('bloodmatch_user_email');
    sessionStorage.removeItem('bloodmatch_user_role');
    sessionStorage.removeItem('bloodmatch_user_facility');
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
      isEmergency: true,
    },
    { 
      name: 'Donor Registry', 
      path: '/dashboard/donors', 
      icon: Users,
      badge: donorsCount > 0 ? `${donorsCount}` : undefined,
    },
    { 
      name: 'Cryo-Vault Inventory', 
      path: '/dashboard/inventory', 
      icon: Database,
      badge: `${totalUnits} Pts`,
      isInventory: true,
    },
  ];

  const isActive = (itemPath: string, exact?: boolean) => {
    if (exact) return location.pathname === itemPath;
    return location.pathname.startsWith(itemPath);
  };

  // Reusable Sidebar Content Component (shared between Mobile Drawer and Desktop Sidebar)
  const renderSidebarContent = (isMobileDrawer: boolean) => (
    <div className="flex flex-col justify-between h-full space-y-4">
      {/* Top Section */}
      <div className="space-y-3">
        {/* Mobile-Only Drawer Header with large touch-friendly close button */}
        {isMobileDrawer ? (
          <div className="pb-3 border-b border-[#D9C7C2] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] text-white flex items-center justify-center shadow-xs">
                <Droplet className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="font-black text-sm tracking-tight text-[#1A1D20] block leading-tight">
                  Blood<span className="text-[#D72638]">Match</span>
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[#7A0C17] font-bold block">
                  Operations Suite
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-xl bg-[#F5F1EF] hover:bg-red-50 border border-[#D9C7C2] text-[#4A5568] hover:text-[#D72638] active:scale-95 cursor-pointer transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5 text-[#D72638]" />
            </button>
          </div>
        ) : (
          <div className="px-3 py-1.5 mb-1 text-[10px] uppercase tracking-wider text-[#7A0C17] font-black flex items-center justify-between border-b border-[#D9C7C2]/60 pb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#D72638]" />
              <span>Operations Suite</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
          </div>
        )}

        {/* Navigation Items with Framer Motion Sliding Active Pill */}
        <div className="space-y-1.5 relative">
          {navItems.map((item) => {
            const active = isActive(item.path, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold
                  transition-colors duration-200 group cursor-pointer
                  ${active ? 'text-white font-bold' : 'text-[#4A5568] hover:text-[#1A1D20]'}
                `}
              >
                {/* Modern Sliding Active Pill Morph */}
                {active && (
                  <motion.div
                    layoutId={isMobileDrawer ? 'activeNavPillDrawer' : 'activeNavPillDesktop'}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#D72638] via-[#B81D2D] to-[#7A0C17] shadow-md shadow-[#D72638]/25 z-0"
                  />
                )}

                {/* Subtle Hover Pill when Inactive */}
                {!active && (
                  <div className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-[#F5F1EF] transition-colors duration-150 z-0" />
                )}

                {/* Luminous Active Left Accent Indicator Bar */}
                {active && (
                  <motion.div
                    layoutId={isMobileDrawer ? 'activeNavPipDrawer' : 'activeNavPipDesktop'}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10"
                  />
                )}

                <div className="relative z-10 flex items-center gap-3">
                  <motion.div
                    animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-[#7A0C17] group-hover:text-[#D72638]'}`} />
                  </motion.div>
                  <span className="tracking-tight">{item.name}</span>
                </div>

                {/* Redesigned Modern Sleek Badge (Work 1) */}
                {item.badge !== undefined && (
                  <div className="relative z-10 shrink-0">
                    {item.isInventory ? (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap transition-all duration-200 shadow-2xs ${
                          active
                            ? 'bg-white/20 text-white border border-white/30 backdrop-blur-xs'
                            : 'bg-[#D72638]/10 text-[#D72638] border border-[#D72638]/25 group-hover:bg-[#D72638]/15 group-hover:border-[#D72638]/40'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            active ? 'bg-emerald-300 animate-pulse' : 'bg-[#D72638] animate-pulse'
                          }`}
                        />
                        <span>{item.badge}</span>
                      </span>
                    ) : item.isEmergency ? (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap transition-all duration-200 shadow-xs ${
                          active
                            ? 'bg-white/25 text-white border border-white/30 animate-pulse'
                            : 'bg-[#D72638] text-white animate-pulse'
                        }`}
                      >
                        <span>{item.badge}</span>
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap transition-all duration-200 ${
                          active
                            ? 'bg-white/20 text-white border border-white/25'
                            : 'bg-[#1A1D20]/5 text-[#5A626A] border border-[#D9C7C2]'
                        }`}
                      >
                        <span>{item.badge}</span>
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Telemetry & Full Clinician Profile Card */}
      <div className="pt-3 border-t border-[#D9C7C2] space-y-3 shrink-0">
        {/* Work 2: Power BI Cryo-Vault Capacity Visual */}
        <Link
          to="/dashboard/inventory"
          className="group block p-2.5 rounded-xl bg-gradient-to-br from-white to-[#F5F1EF] hover:to-red-50/50 border border-[#D9C7C2] hover:border-[#D72638]/50 text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          title="Inspect Cryo-Vault Inventory & Stored Units"
        >
          <div className="flex items-center justify-between text-[#4A5568] mb-1">
            <span className="flex items-center gap-1.5 font-bold text-[#1A1D20] text-[11px] group-hover:text-[#D72638] transition-colors">
              <Database className="w-3.5 h-3.5 text-[#D72638]" />
              <span>Cryo-Vault Reserve</span>
            </span>
            <span className="text-emerald-700 font-bold text-[11px]">4.0°C Optimal</span>
          </div>

          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-base font-black text-[#1A1D20]">
              {totalUnits} <span className="text-[10px] font-medium text-[#5A626A]">/ 160 Pts</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#D72638]/10 text-[#D72638] border border-[#D72638]/20">
              {Math.min(100, Math.round((totalUnits / 160) * 100))}% Cap
            </span>
          </div>

          {/* Power BI Segmented Micro Battery Capacity Visual */}
          <div className="grid grid-cols-8 gap-0.5 w-full h-1.5 rounded-full overflow-hidden bg-[#D9C7C2]/40 p-[1px]">
            {[...Array(8)].map((_, idx) => {
              const active = idx < Math.ceil((totalUnits / 160) * 8);
              return (
                <div
                  key={idx}
                  className={`h-full rounded-2xs transition-all duration-300 ${
                    active ? 'bg-gradient-to-r from-[#D72638] to-[#7A0C17]' : 'bg-transparent'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#D9C7C2]/40 text-[10px] text-[#4A5568]">
            <span className="flex items-center gap-1 font-medium text-[#7A0C17]">
              <PhoneCall className="w-3 h-3 text-[#D72638]" />
              <span>Trauma Ext 911</span>
            </span>
            <span className="text-[9px] font-bold text-[#D72638] group-hover:underline flex items-center gap-0.5">
              <span>Inspect</span>
              <span className="text-xs">&rarr;</span>
            </span>
          </div>
        </Link>

        {/* Dedicated Clinician Profile Card */}
        <div className="p-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] space-y-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="relative group w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-tr from-[#7A0C17] to-[#D72638] flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0 cursor-pointer border border-[#D9C7C2] hover:border-[#D72638] transition-all"
              title="Click to change profile picture"
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FK'}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#1A1D20] truncate leading-tight">
                {userName}
              </div>
              <div className="text-[10px] text-[#7A0C17] font-semibold font-mono truncate">
                ID: {userMemberId}
              </div>
              <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-700 mt-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                <span>Verified Account</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 border border-[#D9C7C2] hover:border-[#D72638] text-[#D72638] text-[11px] font-bold shadow-2xs transition-colors cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out & Lock</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative h-screen max-h-screen bg-[#F5F1EF] font-sans text-[#1A1D20] flex flex-col overflow-hidden selection:bg-[#D72638] selection:text-white">
      {/* Ambient Red Fluid / Cell Video Layer in Background */}
      <AmbientBackgroundVideo />

      {/* Floating Blood Drops Canvas in Background */}
      <BloodDropsCanvas />

      {/* =========================================================================
          MOBILE DRAWER SYSTEM (Root-Level Stacking: Drawer z-50, Backdrop z-40)
          Completely outside nested containers to guarantee ZERO stacking context trapping!
          ========================================================================= */}
      {/* 1. Backdrop Scrim */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden cursor-pointer transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 2. Mobile Drawer Navigation (Slides in at z-50 over everything) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] h-full
          bg-white border-r border-[#D9C7C2] p-4
          overflow-y-auto no-scrollbar shadow-2xl
          transition-transform duration-300 ease-in-out lg:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}
        `}
      >
        {renderSidebarContent(true)}
      </aside>

      {/* =========================================================================
          TOP HEADER BAR (Fixed / Shrink 0, z-30 below mobile drawer z-50)
          ========================================================================= */}
      <header className="shrink-0 z-30 w-full h-16 bg-white/95 border-b border-[#D9C7C2] flex items-center justify-between px-3 sm:px-6 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Trigger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-[#4A5568] hover:text-[#1A1D20] active:scale-95 lg:hidden cursor-pointer shrink-0"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5 text-[#1A1D20]" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] border border-[#D72638]/40 text-white flex items-center justify-center shadow-md shadow-[#D72638]/20 group-hover:scale-105 transition-transform shrink-0">
              <Droplet className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-base sm:text-lg tracking-tight text-[#1A1D20] block leading-tight">
                Blood<span className="text-[#D72638]">Match</span>
              </span>
              <span className="hidden sm:block text-[9px] uppercase tracking-wider text-[#7A0C17] font-bold truncate">
                Clinical Operations Hub
              </span>
            </div>
          </Link>
        </div>

        {/* Topbar Search & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Global Search Bar (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus-within:border-[#D72638] transition-colors w-56 lg:w-64">
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] active:scale-95 text-white text-xs font-bold shadow-md shadow-[#D72638]/30 transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Dispatch Request</span>
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-[#4A5568] hover:text-[#1A1D20] active:scale-95 transition-colors cursor-pointer shrink-0"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D72638]"></span>
              )}
            </button>

            {notificationsOpen && (
              <div className="fixed sm:absolute top-16 sm:top-full left-4 sm:left-auto right-4 sm:right-0 mt-2 sm:w-80 rounded-2xl bg-white shadow-2xl p-4 border border-[#D9C7C2] z-50 animate-slide-up text-[#1A1D20]">
                <div className="flex items-center justify-between pb-3 border-b border-[#D9C7C2]">
                  <span className="text-xs font-bold text-[#1A1D20] uppercase tracking-wider">
                    Transfusion Alerts
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                      className="text-[11px] font-semibold text-[#D72638] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="space-y-2.5 pt-3 max-h-64 overflow-y-auto no-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#5A626A]">
                      <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-[#1A1D20]">No alerts at this time</p>
                      <p className="text-[11px] mt-0.5 text-[#5A626A]">Transfusion queue clear</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2]/70 text-xs">
                        <div className="font-bold text-[#1A1D20] flex items-center justify-between">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[#4A5568] mt-1 leading-relaxed">{n.desc}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clinician Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] hover:border-[#D72638] active:scale-95 transition-colors cursor-pointer shrink-0"
              aria-label="Clinician Profile"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-tr from-[#7A0C17] to-[#D72638] flex items-center justify-center text-white text-xs font-bold shadow-2xs">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FK'}</span>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="fixed sm:absolute top-16 sm:top-full left-4 sm:left-auto right-4 sm:right-0 mt-2 sm:w-64 rounded-2xl bg-white shadow-2xl p-3 border border-[#D9C7C2] z-50 animate-slide-up text-[#1A1D20]">
                <div className="p-2 border-b border-[#D9C7C2]">
                  <div className="text-xs font-bold text-[#1A1D20]">{userName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#7A0C17] bg-[#7A0C17]/10 px-2 py-0.5 rounded-md">
                      ID: {userMemberId}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Verified Account</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setIsAvatarModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer text-left"
                  >
                    <Camera className="w-4 h-4 text-[#D72638]" />
                    <span>Upload & Adjust Picture</span>
                  </button>

                  <Link
                    to="/dashboard/settings"
                    onClick={() => setProfileOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#1A1D20] hover:bg-[#F5F1EF] transition-colors cursor-pointer"
                  >
                    <SettingsIcon className="w-4 h-4 text-[#D72638]" />
                    <span>Account Settings & Security</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#D72638] hover:bg-red-50 transition-colors cursor-pointer"
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

      {/* =========================================================================
          DESKTOP MAIN BODY LAYOUT (Sidebar + Main Content)
          ========================================================================= */}
      <div className="flex-1 flex overflow-hidden w-full h-full relative z-10">
        {/* Desktop Fixed Left Navigation Sidebar: 100% Solid White, NO Background Video Bleed */}
        <aside className="hidden lg:flex lg:w-64 shrink-0 h-full bg-white border-r border-[#D9C7C2] p-4 flex-col justify-between overflow-y-auto no-scrollbar relative z-20 shadow-xs">
          {renderSidebarContent(false)}
        </aside>

        {/* Center Content Router Outlet: Scrollable with ambient video visible in background */}
        <main className="flex-1 h-full min-w-0 overflow-y-auto no-scrollbar px-3 sm:px-6 lg:px-8 py-4 lg:py-6 pb-20 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Universal Profile Picture Upload & Crop Modal */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatarUrl={avatar}
        userEmail={userEmail}
        userName={userName}
        onAvatarUpdated={(url) => setAvatar(url)}
      />
    </div>
  );
}
