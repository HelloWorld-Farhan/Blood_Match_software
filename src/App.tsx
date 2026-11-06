import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

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
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}
