import { BloodInventoryUnit, BloodType, Donor, EmergencyRequest, UserSession } from '../types';

// Version 2 storage keys guaranteeing 100% clean zero-data state across all client devices
const STORAGE_KEYS = {
  DONORS: 'bloodmatch_donors_v2',
  REQUESTS: 'bloodmatch_requests_v2',
  INVENTORY: 'bloodmatch_inventory_v2',
  USER: 'bloodmatch_user_session_v2',
};

// Automatic one-time cleanup of any legacy v1 mock/simulation data cached in user browsers
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('bloodmatch_donors_data_v1');
    localStorage.removeItem('bloodmatch_emergency_requests_v1');
    localStorage.removeItem('bloodmatch_inventory_units_v1');
    localStorage.removeItem('bloodmatch_active_user_session_v1');
  } catch {
    // Ignore in non-browser or sandbox environments
  }
}

// Helper to isolate emergency request storage per user email account
function getUserRequestsKey(email?: string): string {
  if (typeof window === 'undefined') return STORAGE_KEYS.REQUESTS;
  const targetEmail = (
    email ||
    sessionStorage.getItem('bloodmatch_user_email') ||
    localStorage.getItem('bloodmatch_user_email') ||
    ''
  ).trim().toLowerCase();
  return targetEmail ? `bloodmatch_requests_v2_${targetEmail}` : STORAGE_KEYS.REQUESTS;
}

export const BloodStorage = {
  // --- Donors (Initially 0) ---
  getDonors(): Donor[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DONORS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveDonors(donors: Donor[], emitCustomEvent: boolean = true): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.DONORS, JSON.stringify(donors));
      if (emitCustomEvent) {
        window.dispatchEvent(new CustomEvent('bloodmatch_donors_updated'));
        window.dispatchEvent(new CustomEvent('bloodmatch_inventory_updated'));
      }
    } catch {
      // Quiet storage fallback
    }
  },

  addDonor(donorData: Omit<Donor, 'id' | 'registeredAt' | 'unitsDonatedTotal'>): Donor {
    const donors = this.getDonors();
    const newDonor: Donor = {
      ...donorData,
      id: 'DNR-' + Date.now().toString().slice(-6),
      registeredAt: new Date().toISOString(),
      unitsDonatedTotal: 0,
    };
    this.saveDonors([newDonor, ...donors]);
    return newDonor;
  },

  deleteDonor(donorId: string): void {
    const currentDonors = this.getDonors();
    const donorToDelete = currentDonors.find(d => d.id === donorId);
    const updatedDonors = currentDonors.filter(d => d.id !== donorId);
    
    // 1. Save updated donors list
    try {
      localStorage.setItem(STORAGE_KEYS.DONORS, JSON.stringify(updatedDonors));
    } catch { }

    // 2. Synchronize and decrement blood bank inventory immediately
    if (donorToDelete) {
      const bt = donorToDelete.bloodType;
      const rawInv = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (rawInv) {
        try {
          const invList: BloodInventoryUnit[] = JSON.parse(rawInv);
          const remainingPledges = updatedDonors.filter(d => d.bloodType === bt && (d.isAvailable ?? true)).length;
          const updatedInv = invList.map(item => {
            if (item.bloodType === bt) {
              return {
                ...item,
                unitsAvailable: remainingPledges,
                status: (remainingPledges >= 15 ? 'optimal' : remainingPledges >= 5 ? 'moderate' : 'critical') as BloodInventoryUnit['status'],
              };
            }
            return item;
          });
          localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInv));
        } catch { }
      }
    }

    // 3. Dispatch real-time events across windows & components
    window.dispatchEvent(new CustomEvent('bloodmatch_donors_updated'));
    window.dispatchEvent(new CustomEvent('bloodmatch_inventory_updated'));
  },

  // --- Emergency Requests (Isolated strictly per authenticated user) ---
  getEmergencyRequests(userEmail?: string): EmergencyRequest[] {
    if (typeof window === 'undefined') return [];
    try {
      const key = getUserRequestsKey(userEmail);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveEmergencyRequests(requests: EmergencyRequest[], userEmail?: string, emitCustomEvent: boolean = true): void {
    if (typeof window === 'undefined') return;
    try {
      const key = getUserRequestsKey(userEmail);
      localStorage.setItem(key, JSON.stringify(requests));
      if (emitCustomEvent) {
        window.dispatchEvent(new CustomEvent('bloodmatch_requests_updated'));
      }
    } catch {
      // Quiet storage fallback
    }
  },

  addEmergencyRequest(reqData: Omit<EmergencyRequest, 'id' | 'status' | 'createdAt'>, userEmail?: string): EmergencyRequest {
    const current = this.getEmergencyRequests(userEmail);
    const newReq: EmergencyRequest = {
      ...reqData,
      id: 'REQ-' + Date.now().toString().slice(-6),
      status: 'urgent',
      createdAt: new Date().toISOString(),
    };
    this.saveEmergencyRequests([newReq, ...current], userEmail);
    return newReq;
  },

  updateRequestStatus(
    id: string, 
    status: EmergencyRequest['status'], 
    matchedDonorId?: string, 
    userEmail?: string,
    fulfillmentMeta?: { fulfilledByDonorName?: string; fulfilledByDonorEmail?: string; fulfilledAt?: string }
  ): void {
    const list = this.getEmergencyRequests(userEmail).map(r => {
      if (r.id === id) {
        return { 
          ...r, 
          status, 
          matchedDonorId: matchedDonorId || r.matchedDonorId,
          fulfilledAt: status === 'fulfilled' ? (fulfillmentMeta?.fulfilledAt || new Date().toISOString()) : r.fulfilledAt,
          fulfilledByDonorName: fulfillmentMeta?.fulfilledByDonorName || r.fulfilledByDonorName,
          fulfilledByDonorEmail: fulfillmentMeta?.fulfilledByDonorEmail || r.fulfilledByDonorEmail
        };
      }
      return r;
    });
    this.saveEmergencyRequests(list, userEmail);
  },

  // --- Blood Bank Inventory (Live Synchronized with Registered Donors) ---
  getInventory(): BloodInventoryUnit[] {
    if (typeof window === 'undefined') return [];
    try {
      const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      const savedMap = new Map<BloodType, BloodInventoryUnit>();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: BloodInventoryUnit) => savedMap.set(item.bloodType, item));
        }
      }

      // Aggregate live registered donors per blood group
      const donors = this.getDonors();
      const donorPledgedCounts: Record<BloodType, number> = {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
      };
      donors.forEach(d => {
        if (donorPledgedCounts[d.bloodType] !== undefined && (d.isAvailable ?? true)) {
          donorPledgedCounts[d.bloodType] += Math.max(1, d.unitsDonatedTotal || 1);
        }
      });

      const result: BloodInventoryUnit[] = bloodTypes.map(type => {
        const existing = savedMap.get(type);
        const donorUnits = donorPledgedCounts[type] || 0;
        const totalUnits = donorUnits;
        return {
          id: existing?.id || `INV-${type}`,
          bloodType: type,
          unitsAvailable: totalUnits,
          storageFacility: 'Central Blood Bank',
          lastTestedDate: existing?.lastTestedDate || new Date().toISOString().split('T')[0],
          status: (totalUnits >= 15 ? 'optimal' : totalUnits >= 5 ? 'moderate' : 'critical') as BloodInventoryUnit['status'],
        };
      });
      return result;
    } catch {
      return [];
    }
  },

  saveInventory(units: BloodInventoryUnit[], emitCustomEvent: boolean = true): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(units));
      if (emitCustomEvent) {
        window.dispatchEvent(new CustomEvent('bloodmatch_inventory_updated'));
      }
    } catch {
      // Quiet storage fallback
    }
  },

  updateUnits(bloodType: BloodType, delta: number): void {
    const list = this.getInventory().map(item => {
      if (item.bloodType === bloodType) {
        const nextUnits = Math.max(0, item.unitsAvailable + delta);
        return {
          ...item,
          unitsAvailable: nextUnits,
          status: (nextUnits >= 15 ? 'optimal' : nextUnits >= 5 ? 'low' : 'critical') as BloodInventoryUnit['status'],
        };
      }
      return item;
    });
    this.saveInventory(list);
  },

  // --- User Session ---
  getUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user: UserSession | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      window.dispatchEvent(new CustomEvent('bloodmatch_user_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // Quiet storage fallback
    }
  },

  resetAllDataToZero(): void {
    if (typeof window === 'undefined') return;
    try {
      const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const zeroInventory: BloodInventoryUnit[] = bloodTypes.map(type => ({
        id: `INV-${type}`,
        bloodType: type,
        unitsAvailable: 0,
        storageFacility: 'Central Cryo-Vault 01',
        lastTestedDate: new Date().toISOString().split('T')[0],
        status: 'critical',
      }));
      localStorage.setItem(STORAGE_KEYS.DONORS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(zeroInventory));
      window.dispatchEvent(new CustomEvent('bloodmatch_donors_updated'));
      window.dispatchEvent(new CustomEvent('bloodmatch_requests_updated'));
      window.dispatchEvent(new CustomEvent('bloodmatch_inventory_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // Quiet storage fallback
    }
  },
};

export const getDonors = () => BloodStorage.getDonors();
export const saveDonors = (donors: Donor[], emitCustomEvent: boolean = true) => BloodStorage.saveDonors(donors, emitCustomEvent);
export const deleteDonor = (donorId: string) => BloodStorage.deleteDonor(donorId);
export const getEmergencyRequests = (userEmail?: string) => BloodStorage.getEmergencyRequests(userEmail);
export const saveEmergencyRequests = (requests: EmergencyRequest[], userEmail?: string, emitCustomEvent: boolean = true) => BloodStorage.saveEmergencyRequests(requests, userEmail, emitCustomEvent);
export const getInventory = () => BloodStorage.getInventory();
export const saveInventory = (units: BloodInventoryUnit[], emitCustomEvent: boolean = true) => BloodStorage.saveInventory(units, emitCustomEvent);
export const resetAllDataToZero = () => BloodStorage.resetAllDataToZero();
export const updateInventoryUnits = (type: BloodType, delta: number) => {
  BloodStorage.updateUnits(type, delta);
  return BloodStorage.getInventory();
};
