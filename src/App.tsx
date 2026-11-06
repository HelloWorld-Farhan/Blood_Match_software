import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import { Dashboard } from './components/Dashboard';
import CompatibilityMatrix from './components/CompatibilityMatrix';
import EmergencyRequests from './components/EmergencyRequests';
import DonorRegistry from './components/DonorRegistry';
import InventoryManager from './components/InventoryManager';
import Settings from './components/Settings';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Authentication Routes (Starting entrypoints) */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Clinical Suite Protected/Dashboard Routes */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="matrix" element={<CompatibilityMatrix />} />
          <Route path="emergency" element={<EmergencyRequests />} />
          <Route path="donors" element={<DonorRegistry />} />
          <Route path="inventory" element={<InventoryManager />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}
