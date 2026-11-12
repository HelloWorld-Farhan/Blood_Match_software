import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BloodPreloader } from './components/BloodPreloader';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import { Dashboard } from './components/Dashboard';
import CompatibilityMatrix from './components/CompatibilityMatrix';
import EmergencyRequests from './components/EmergencyRequests';
import DonorRegistry from './components/DonorRegistry';
import InventoryManager from './components/InventoryManager';
import Settings from './components/Settings';

function AppRoutes() {
  return (
    <Routes>
      {/* Authentication Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Clinical Suite Protected/Dashboard Routes (Layout stays permanently mounted) */}
      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="matrix" element={<CompatibilityMatrix />} />
        <Route path="emergency" element={<EmergencyRequests />} />
        <Route path="donors" element={<DonorRegistry />} />
        <Route path="matcher" element={<Navigate to="/dashboard/emergency?action=broadcast" replace />} />
        <Route path="search" element={<Navigate to="/dashboard/emergency?action=broadcast" replace />} />
        <Route path="inventory" element={<InventoryManager />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [showPreloader, setShowPreloader] = useState(() => {
    // Work 2: The preloader will not work when user is in the dashboard (disabled on dashboard refresh).
    // It only shows when first visiting the site (/ or /login) or when refreshing /login and /signup.
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
      return false;
    }
    return true;
  });
  const [isApertureOpening, setIsApertureOpening] = useState(false);

  const handleOpeningChange = (opening: boolean) => {
    setIsApertureOpening(opening);
    if (opening) {
      document.documentElement.classList.remove('is-loading');
      document.body.classList.remove('is-loading');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bloodmatch_preloader_opening'));
      }
    }
  };

  const handlePreloaderComplete = () => {
    setShowPreloader(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bloodmatch_preloader_done', 'true');
      window.dispatchEvent(new CustomEvent('bloodmatch_preloader_complete'));
    }
    document.documentElement.classList.remove('is-loading');
    document.body.classList.remove('is-loading');
  };

  return (
    <Router>
      {showPreloader && (
        <BloodPreloader 
          onOpeningChange={handleOpeningChange}
          onComplete={handlePreloaderComplete} 
        />
      )}
      <div
        id="site-root"
        className={`w-full min-h-screen ${!showPreloader || isApertureOpening ? 'ready' : ''}`}
      >
        <AppRoutes />
      </div>
    </Router>
  );
}
