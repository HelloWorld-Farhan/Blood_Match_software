import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BloodPreloader } from './components/BloodPreloader';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const CompatibilityMatrix = lazy(() => import('./components/CompatibilityMatrix'));
const EmergencyRequests = lazy(() => import('./components/EmergencyRequests'));
const DonorRegistry = lazy(() => import('./components/DonorRegistry'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const Settings = lazy(() => import('./components/Settings'));

function RouteLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F5F1EF]/70 backdrop-blur-[2px] transition-opacity">
      <div className="w-9 h-9 rounded-full border-2 border-[#D72638]/20 border-t-[#D72638] animate-spin" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
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
    </Suspense>
  );
}

export default function App() {
  const [showPreloader, setShowPreloader] = useState(true);
  const [isApertureOpening, setIsApertureOpening] = useState(false);

  return (
    <Router>
      {showPreloader && (
        <BloodPreloader 
          onOpeningChange={(opening) => setIsApertureOpening(opening)}
          onComplete={() => setShowPreloader(false)} 
        />
      )}
      <motion.div
        animate={
          showPreloader && !isApertureOpening
            ? { opacity: 0, scale: 1.08, filter: 'blur(8px)' }
            : { opacity: 1, scale: 1, filter: 'blur(0px)' }
        }
        transition={{
          opacity: { duration: 1.2, ease: 'easeOut' },
          scale: { duration: 1.8, ease: [0.2, 0.7, 0.2, 1] },
          filter: { duration: 1.2, ease: 'easeOut' },
        }}
        className="w-full min-h-screen"
      >
        <AnimatedRoutes />
      </motion.div>
    </Router>
  );
}
