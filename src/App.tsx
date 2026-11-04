import React, { useState, useEffect } from 'react';
import { ActiveTab, Donor, EmergencyRequest, BloodInventoryUnit, UserSession, BloodType } from './types';
import { BloodStorage } from './services/storage';
import BackgroundVideo from './components/BackgroundVideo';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import CompatibilityMatrix from './components/CompatibilityMatrix';
import DonorRegistry from './components/DonorRegistry';
import EmergencyRequests from './components/EmergencyRequests';
import InventoryManager from './components/InventoryManager';
import AuthModal from './components/AuthModal';
import { Droplet, Heart, ShieldAlert, Sparkles, Github, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<UserSession | null>(() => BloodStorage.getUser());
  const [donors, setDonors] = useState<Donor[]>(() => BloodStorage.getDonors());
  const [requests, setRequests] = useState<EmergencyRequest[]>(() => BloodStorage.getEmergencyRequests());
  const [inventory, setInventory] = useState<BloodInventoryUnit[]>(() => BloodStorage.getInventory());

  // Modal triggers
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Sync state changes with localStorage listeners
  useEffect(() => {
    const handleDonors = () => setDonors(BloodStorage.getDonors());
    const handleRequests = () => setRequests(BloodStorage.getEmergencyRequests());
    const handleInventory = () => setInventory(BloodStorage.getInventory());
    const handleUser = () => setUser(BloodStorage.getUser());

    window.addEventListener('bloodmatch_donors_updated', handleDonors);
    window.addEventListener('bloodmatch_requests_updated', handleRequests);
    window.addEventListener('bloodmatch_inventory_updated', handleInventory);
    window.addEventListener('bloodmatch_user_updated', handleUser);

    return () => {
      window.removeEventListener('bloodmatch_donors_updated', handleDonors);
      window.removeEventListener('bloodmatch_requests_updated', handleRequests);
      window.removeEventListener('bloodmatch_inventory_updated', handleInventory);
      window.removeEventListener('bloodmatch_user_updated', handleUser);
    };
  }, []);

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLogout = () => {
    BloodStorage.setUser(null);
    setUser(null);
  };

  const handleAddDonor = (donorData: Omit<Donor, 'id' | 'registeredAt' | 'unitsDonatedTotal'>) => {
    const created = BloodStorage.addDonor(donorData);
    setDonors(BloodStorage.getDonors());
  };

  const handleAddRequest = (reqData: Omit<EmergencyRequest, 'id' | 'status' | 'createdAt'>) => {
    const created = BloodStorage.addEmergencyRequest(reqData);
    setRequests(BloodStorage.getEmergencyRequests());
  };

  const handleUpdateStatus = (id: string, status: EmergencyRequest['status'], matchedDonorId?: string) => {
    BloodStorage.updateRequestStatus(id, status, matchedDonorId);
    setRequests(BloodStorage.getEmergencyRequests());
  };

  const handleUpdateUnits = (type: BloodType, delta: number) => {
    BloodStorage.updateUnits(type, delta);
    setInventory(BloodStorage.getInventory());
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col justify-between selection:bg-blood-600 selection:text-white">
      {/* 1. Fullscreen Atmospheric Video Background (background.mp4) */}
      <BackgroundVideo />

      {/* 2. Application Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={user}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onRequestBlood={() => setIsRequestModalOpen(true)}
          activeRequestsCount={requests.filter(r => r.status === 'PENDING').length}
          totalDonorsCount={donors.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeTab === 'dashboard' && (
            <Dashboard
              donors={donors}
              requests={requests}
              inventory={inventory}
              onNavigate={setActiveTab}
              onOpenDonorModal={() => setIsDonorModalOpen(true)}
              onOpenRequestModal={() => setIsRequestModalOpen(true)}
            />
          )}

          {activeTab === 'compatibility' && (
            <CompatibilityMatrix />
          )}

          {activeTab === 'donors' && (
            <DonorRegistry
              donors={donors}
              onAddDonor={handleAddDonor}
              isOpenModal={isDonorModalOpen}
              onOpenModal={() => setIsDonorModalOpen(true)}
              onCloseModal={() => setIsDonorModalOpen(false)}
            />
          )}

          {activeTab === 'requests' && (
            <EmergencyRequests
              requests={requests}
              donors={donors}
              onAddRequest={handleAddRequest}
              onUpdateStatus={handleUpdateStatus}
              isOpenModal={isRequestModalOpen}
              onOpenModal={() => setIsRequestModalOpen(true)}
              onCloseModal={() => setIsRequestModalOpen(false)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryManager
              inventory={inventory}
              onUpdateUnits={handleUpdateUnits}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blood-600 flex items-center justify-center text-white">
                <Droplet className="w-3.5 h-3.5 fill-white" />
              </div>
              <span className="font-bold text-white">BloodMatch Enterprise Network</span>
              <span>— Cloud Transfusion Safety</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <a
                href="https://github.com/HelloWorld-Farhan/Blood_Match_software"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Repository</span>
              </a>
              <span className="text-slate-600">·</span>
              <span>Created with React 19 & TypeScript</span>
            </div>
          </div>
        </footer>
      </div>

      {/* 3. Authentication Modal with Split Video Screen (Login.mp4 / signup.mp4) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />
    </div>
  );
}

