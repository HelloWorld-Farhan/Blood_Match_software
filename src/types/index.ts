export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UrgencyLevel = 'CRITICAL' | 'URGENT' | 'STANDARD' | 'ROUTINE';

export type RequestStatus = 'urgent' | 'critical' | 'fulfilled' | 'pending' | 'PENDING' | 'MATCHED' | 'FULFILLED' | 'CANCELLED';

export interface BloodCompatibility {
  type: BloodType;
  canGiveTo: BloodType[];
  canReceiveFrom: BloodType[];
  antigens: string;
  antibodies: string;
  rhFactor: boolean;
  frequency: string;
}

export interface Donor {
  id: string;
  fullName: string;
  bloodType: BloodType;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  email: string;
  city: string;
  state: string;
  lastDonationDate?: string;
  available?: boolean;
  isAvailable?: boolean;
  registeredAt: string;
  unitsDonatedTotal: number;
}

export interface EmergencyRequest {
  id: string;
  patientName: string;
  patientAge: number;
  bloodType: BloodType;
  unitsNeeded: number;
  hospital: string;
  hospitalCity?: string;
  ward?: string;
  urgency: UrgencyLevel;
  contactName: string;
  contactNumber: string;
  reason?: string;
  status: RequestStatus;
  createdAt: string;
  matchedDonorId?: string;
  fulfilledAt?: string;
}

export interface BloodInventoryUnit {
  id: string;
  bloodType: BloodType;
  unitsAvailable: number;
  storageFacility: string;
  lastTestedDate: string;
  status: 'optimal' | 'low' | 'critical' | 'OPTIMAL' | 'LOW' | 'CRITICAL';
}

export interface UserSession {
  email: string;
  name: string;
  role: 'CLINICIAN' | 'DONOR' | 'HOSPITAL_STAFF';
  token?: string;
  bloodType?: BloodType;
  photoUrl?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role?: string;
  is_verified: boolean;
  is_2fa_enabled: boolean;
  photo_url?: string | null;
  created_at?: string;
}

export interface AuthResponse {
  message?: string;
  access_token?: string;
  token_type?: string;
  user?: AuthUser;
  is_verified?: boolean;
  two_factor_required?: boolean;
  device_id?: string;
  remember_device?: boolean;
}

export interface ActiveSessionItem {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt?: string;
}

export interface TrustedDeviceItem {
  id: string;
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  trustedAt: string;
  lastUsedAt: string;
}

export interface SyncTelemetryResponse {
  authenticated: boolean;
  user?: AuthUser;
  photoUrl?: string | null;
  synced_at: string;
}

export type ActiveTab = 'dashboard' | 'compatibility' | 'donors' | 'requests' | 'inventory';
