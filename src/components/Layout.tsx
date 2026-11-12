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
  Camera,
  ArrowRight,
  MapPin,
  Sparkles,
  Phone
} from 'lucide-react';
import { BloodDropsCanvas } from './BloodDropsCanvas';
import { AmbientBackgroundVideo } from './AmbientBackgroundVideo';
import { AvatarUploadModal } from './AvatarUploadModal';
import { getDonors, getEmergencyRequests, getInventory } from '../services/storage';
import { apiClient, fetchAlertsApi } from '../services/api';
import { Donor } from '../types';

interface TransfusionAlertItem {
  id: string;
  creator_email: string;
  donor_id: string;
  blood_type: string;
  donor_name: string;
  location: string;
  title: string;
  message: string;
  created_at: string;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Requirement: Guard against unauthenticated viewing with zero dummy logins & rehydrate across tab closures
  useEffect(() => {
    const isAuth = sessionStorage.getItem('bloodmatch_auth') === 'true' || localStorage.getItem('bloodmatch_auth') === 'true';
    if (!isAuth) {
      navigate('/login', { replace: true });
      return;
    }

    // Rehydrate sessionStorage from localStorage if restoring after window/tab close
    const token = localStorage.getItem('bloodmatch_auth_token');
    if (token && !sessionStorage.getItem('bloodmatch_auth_token')) {
      sessionStorage.setItem('bloodmatch_auth_token', token);
      sessionStorage.setItem('bloodmatch_auth', 'true');
      const email = localStorage.getItem('bloodmatch_user_email');
      if (email) sessionStorage.setItem('bloodmatch_user_email', email);
      const name = localStorage.getItem('bloodmatch_user_name');
      if (name) sessionStorage.setItem('bloodmatch_user_name', name);
      const memberId = localStorage.getItem('bloodmatch_member_id');
      if (memberId) sessionStorage.setItem('bloodmatch_member_id', memberId);
      const avatar = localStorage.getItem('bloodmatch_user_avatar');
      if (avatar) sessionStorage.setItem('bloodmatch_user_avatar', avatar);
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

  // Transfusion Alerts state (Targeted alerts excluding current creator)
  const [alerts, setAlerts] = useState<TransfusionAlertItem[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined' || !userEmail) return new Set();
    try {
      const raw = localStorage.getItem(`bloodmatch_read_alerts_${userEmail}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Global Multi-Field Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut (⌘K or Ctrl+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Transfusion Alerts from Backend (Excluding creator's own registrations)
  const loadAlerts = async () => {
    try {
      const res = await fetchAlertsApi(userEmail);
      if (res.ok && Array.isArray(res.data)) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.warn('[Layout] Alerts fetch fallback:', err);
    }
  };

  useEffect(() => {
    loadAlerts();
    // 8-second continuous cross-device background sync
    const alertInterval = setInterval(loadAlerts, 8000);
    const handleStorageChange = () => loadAlerts();
    window.addEventListener('bloodmatch_alerts_updated', handleStorageChange);
    window.addEventListener('bloodmatch_donors_updated', handleStorageChange);
    return () => {
      clearInterval(alertInterval);
      window.removeEventListener('bloodmatch_alerts_updated', handleStorageChange);
      window.removeEventListener('bloodmatch_donors_updated', handleStorageChange);
    };
  }, [userEmail]);

  const markAlertAsRead = (id: string) => {
    setReadAlertIds(prev => {
      const next = new Set(prev).add(id);
      if (userEmail) {
        localStorage.setItem(`bloodmatch_read_alerts_${userEmail}`, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const markAllAlertsAsRead = () => {
    const allIds = new Set(alerts.map(a => a.id));
    setReadAlertIds(allIds);
    if (userEmail) {
      localStorage.setItem(`bloodmatch_read_alerts_${userEmail}`, JSON.stringify(Array.from(allIds)));
    }
  };

  const unreadAlertsCount = alerts.filter(a => !readAlertIds.has(a.id)).length;

  // Real-time Global Search results across all registered donors
  const searchResults = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const allDonors = getDonors();
    if (!Array.isArray(allDonors)) return [];
    return allDonors.filter(d => {
      if (!d) return false;
      const fn = (d.fullName || (d as any).full_name || '').toLowerCase();
      const bt = (d.bloodType || (d as any).blood_type || '').toLowerCase();
      const ct = (d.city || '').toLowerCase();
      const loc = (d.location || '').toLowerCase();
      const ph = (d.phone || '');
      const em = (d.email || '').toLowerCase();
      const did = (d.id || '').toLowerCase();
      return (
        fn.includes(q) ||
        bt.includes(q) ||
        ct.includes(q) ||
        loc.includes(q) ||
        ph.includes(q) ||
        em.includes(q) ||
        did.includes(q)
      );
    }).slice(0, 8);
  }, [searchQuery]);

  const handleSelectDonor = (donorId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(`/dashboard/donors?highlight=${encodeURIComponent(donorId)}`);
  };

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
    window.addEventListener('bloodmatch_donors_updated', updateStats);
    window.addEventListener('bloodmatch_inventory_updated', updateStats);
    return () => {
      window.removeEventListener('storage', updateStats);
      window.removeEventListener('bloodmatch_donors_updated', updateStats);
      window.removeEventListener('bloodmatch_inventory_updated', updateStats);
    };
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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return 'Recent';
    }
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock background screen scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    sessionStorage.removeItem('bloodmatch_auth');
    sessionStorage.removeItem('bloodmatch_auth_token');
    sessionStorage.removeItem('bloodmatch_user_name');
    sessionStorage.removeItem('bloodmatch_user_email');
    sessionStorage.removeItem('bloodmatch_user_role');
    sessionStorage.removeItem('bloodmatch_user_facility');
    sessionStorage.removeItem('bloodmatch_member_id');
    localStorage.removeItem('bloodmatch_auth');
    localStorage.removeItem('bloodmatch_auth_token');
    localStorage.removeItem('bloodmatch_user_name');
    localStorage.removeItem('bloodmatch_user_email');
    localStorage.removeItem('bloodmatch_member_id');
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
      name: 'Blood Bank Reserve', 
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
        {/* Work 2: Power BI Blood Bank Capacity Visual */}
        <Link
          to="/dashboard/inventory"
          className="group block p-2.5 rounded-xl bg-gradient-to-br from-white to-[#F5F1EF] hover:to-red-50/50 border border-[#D9C7C2] hover:border-[#D72638]/50 text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          title="Inspect Blood Bank Reserve & Stored Units"
        >
          <div className="flex items-center justify-between text-[#4A5568] mb-1">
            <span className="flex items-center gap-1.5 font-bold text-[#1A1D20] text-[11px] group-hover:text-[#D72638] transition-colors">
              <Database className="w-3.5 h-3.5 text-[#D72638]" />
              <span>Blood Bank Reserve</span>
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
                <span>{userName ? userName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FK' : 'FK'}</span>
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
          {/* Global Multi-Field Search Bar (Interactive Dropdown & Direct Donor Highlight) */}
          <div className="relative" ref={searchRef}>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] focus-within:border-[#D72638] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D72638]/15 transition-all w-56 lg:w-72">
              <Search className="w-4 h-4 text-[#7A0C17]/60 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search donor, group, locality..."
                className="w-full bg-transparent text-xs text-[#1A1D20] placeholder-slate-400 outline-hidden font-medium"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-[#1A1D20] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-white border border-[#D9C7C2] shrink-0 select-none">
                  ⌘K
                </span>
              )}
            </div>

            {/* Floating Live Search Dropdown */}
            {searchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 w-72 lg:w-96 rounded-2xl bg-white shadow-2xl p-3 border border-[#D9C7C2] z-50 animate-slide-up text-[#1A1D20]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D9C7C2]/60 px-1">
                  <span className="text-[10px] font-bold text-[#7A0C17] uppercase tracking-wider">
                    Donor Directory Matches ({searchResults.length})
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Esc to close</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                  {searchResults.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#5A626A]">
                      <Search className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                      <p className="font-semibold text-[#1A1D20]">No donors match "{searchQuery}"</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Search by blood group (e.g. O-, A+), locality, or name</p>
                    </div>
                  ) : (
                    searchResults.map((donor) => (
                      <div
                        key={donor.id}
                        onClick={() => handleSelectDonor(donor.id)}
                        className="p-2.5 rounded-xl bg-[#F5F1EF] hover:bg-red-50/50 border border-[#D9C7C2]/70 hover:border-[#D72638]/50 transition-all cursor-pointer group flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D72638] to-[#7A0C17] text-white font-black text-xs flex flex-col items-center justify-center shrink-0 shadow-xs">
                            <span className="text-[8px] font-bold text-red-200 uppercase leading-none">Type</span>
                            <span className="leading-none mt-0.5">{donor.bloodType}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#1A1D20] truncate group-hover:text-[#D72638] transition-colors">
                              {donor.fullName}
                            </h4>
                            <div className="text-[10px] text-[#5A626A] flex items-center gap-1 truncate mt-0.5">
                              <MapPin className="w-3 h-3 text-[#D72638] shrink-0" />
                              <span className="truncate">{donor.location || donor.city}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDonor(donor.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#D72638] hover:bg-[#b51d2c] text-white text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>View</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Emergency Broadcast */}
          <Link
            to="/dashboard/emergency"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] active:scale-95 text-white text-xs font-bold shadow-md shadow-[#D72638]/30 transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Dispatch Request</span>
          </Link>

          {/* Notifications Dropdown with Animated Red Blinking Beacon */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl bg-[#F5F1EF] border border-[#D9C7C2] text-[#4A5568] hover:text-[#1A1D20] active:scale-95 transition-colors cursor-pointer shrink-0"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {/* Red Color Blinking Notification Beacon (Animates whenever there are unread alerts) */}
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D72638] opacity-80" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D72638] border-2 border-white shadow-xs" />
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="fixed sm:absolute top-16 sm:top-full left-4 sm:left-auto right-4 sm:right-0 mt-2 sm:w-88 rounded-2xl bg-white shadow-2xl p-4 border border-[#D9C7C2] z-50 animate-slide-up text-[#1A1D20]">
                <div className="flex items-center justify-between pb-3 border-b border-[#D9C7C2]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#1A1D20] uppercase tracking-wider">
                      Transfusion Alerts
                    </span>
                    {unreadAlertsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#D72638] text-white text-[10px] font-black">
                        {unreadAlertsCount} New
                      </span>
                    )}
                  </div>
                  {alerts.length > 0 && (
                    <button
                      onClick={markAllAlertsAsRead}
                      className="text-[11px] font-semibold text-[#D72638] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 pt-3 max-h-72 overflow-y-auto no-scrollbar">
                  {alerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#5A626A]">
                      <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-[#1A1D20]">No alerts at this time</p>
                      <p className="text-[11px] mt-0.5 text-[#5A626A]">Transfusion queue clear</p>
                    </div>
                  ) : (
                    alerts.map(a => {
                      const isUnread = !readAlertIds.has(a.id);
                      return (
                        <div 
                          key={a.id} 
                          className={`p-3 rounded-xl border text-xs transition-all ${
                            isUnread 
                              ? 'bg-red-50/50 border-[#D72638]/40 shadow-xs' 
                              : 'bg-[#F5F1EF] border-[#D9C7C2]/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-[#1A1D20]">
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-[#D72638] animate-pulse shrink-0" />
                              )}
                              <span>{a.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              {formatRelativeTime(a.created_at)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-[#D72638] text-white text-[10px] font-black">
                              Type {a.blood_type}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-[#D9C7C2] text-[10px] text-[#5A626A] font-semibold flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-[#D72638]" />
                              <span>{a.location}</span>
                            </span>
                          </div>

                          <p className="text-[11px] text-[#4A5568] mt-1.5 leading-relaxed">
                            {a.message}
                          </p>

                          {/* Direct Action Button to View Exact Donor Record with Highlighting */}
                          <button
                            type="button"
                            onClick={() => {
                              markAlertAsRead(a.id);
                              setNotificationsOpen(false);
                              navigate(`/dashboard/donors?highlight=${encodeURIComponent(a.donor_id)}`);
                            }}
                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#D72638] hover:bg-[#b51d2c] active:scale-95 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                          >
                            <span>View Donor Record</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
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
                  <span>{userName ? userName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FK' : 'FK'}</span>
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
