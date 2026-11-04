import { BloodInventoryUnit, BloodType, Donor, EmergencyRequest, UserSession } from '../types';

const STORAGE_KEYS = {
  DONORS: 'bloodmatch_donors_data_v1',
  REQUESTS: 'bloodmatch_emergency_requests_v1',
  INVENTORY: 'bloodmatch_inventory_units_v1',
  USER: 'bloodmatch_active_user_session_v1',
};

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

  saveDonors(donors: Donor[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.DONORS, JSON.stringify(donors));
      window.dispatchEvent(new CustomEvent('bloodmatch_donors_updated'));
    } catch (e) {
      console.warn('Failed to save donors', e);
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

  // --- Emergency Requests (Initially 0) ---
  getEmergencyRequests(): EmergencyRequest[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveEmergencyRequests(requests: EmergencyRequest[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
      window.dispatchEvent(new CustomEvent('bloodmatch_requests_updated'));
    } catch (e) {
      console.warn('Failed to save requests', e);
    }
  },

  addEmergencyRequest(reqData: Omit<EmergencyRequest, 'id' | 'status' | 'createdAt'>): EmergencyRequest {
    const current = this.getEmergencyRequests();
    const newReq: EmergencyRequest = {
      ...reqData,
      id: 'REQ-' + Date.now().toString().slice(-6),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.saveEmergencyRequests([newReq, ...current]);
    return newReq;
  },

  updateRequestStatus(id: string, status: EmergencyRequest['status'], matchedDonorId?: string): void {
    const list = this.getEmergencyRequests().map(r => {
      if (r.id === id) {
        return { ...r, status, matchedDonorId: matchedDonorId || r.matchedDonorId };
      }
      return r;
    });
    this.saveEmergencyRequests(list);
  },

  // --- Blood Inventory (Initially 0) ---
  getInventory(): BloodInventoryUnit[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (raw) return JSON.parse(raw);
      // Clean initial zero units for all 8 types
      const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const initial: BloodInventoryUnit[] = bloodTypes.map(type => ({
        id: `INV-${type}`,
        bloodType: type,
        unitsAvailable: 0,
        storageFacility: 'Central Blood Bank',
        lastTestedDate: new Date().toISOString().split('T')[0],
        status: 'CRITICAL',
      }));
      return initial;
    } catch {
      return [];
    }
  },

  saveInventory(units: BloodInventoryUnit[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(units));
      window.dispatchEvent(new CustomEvent('bloodmatch_inventory_updated'));
    } catch (e) {
      console.warn('Failed to save inventory', e);
    }
  },

  updateUnits(bloodType: BloodType, delta: number): void {
    const list = this.getInventory().map(item => {
      if (item.bloodType === bloodType) {
        const nextUnits = Math.max(0, item.unitsAvailable + delta);
        return {
          ...item,
          unitsAvailable: nextUnits,
          status: nextUnits >= 15 ? 'OPTIMAL' : nextUnits >= 5 ? 'LOW' : 'CRITICAL',
        } as BloodInventoryUnit;
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
    } catch (e) {
      console.warn('Failed to set user', e);
    }
  },
};
