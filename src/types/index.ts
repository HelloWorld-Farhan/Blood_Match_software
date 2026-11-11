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
  location?: string;
  hospital?: string;
  user_email?: string;
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

export interface ClinicalCheckItem {
  id: string;
  user_email: string;
  patient_name: string;
  patient_id?: string;
  blood_type: BloodType;
  check_type: string;
  status: 'passed' | 'flagged' | 'inconclusive' | string;
  notes?: string;
  created_at?: string;
}

export interface ClinicalDocumentItem {
  id: string;
  user_email: string;
  title: string;
  doc_type: string;
  file_url: string;
  file_size_kb?: number;
  created_at?: string;
}

export interface ClinicalAuditLogItem {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
  timestamp?: string;
}

export interface SyncTelemetryResponse {
  authenticated: boolean;
  reconciled_from_r2?: boolean;
  userEmail?: string;
  user?: AuthUser;
  photoUrl?: string | null;
  profile?: Record<string, any> | null;
  checks?: ClinicalCheckItem[];
  documents?: ClinicalDocumentItem[];
  auditLogs?: ClinicalAuditLogItem[];
  donors?: Donor[];
  emergencyRequests?: EmergencyRequest[];
  inventory?: BloodInventoryUnit[];
  synced_at: string;
}

export interface MasterSyncData {
  version: number;
  userEmail: string;
  userId?: string;
  fullName: string;
  photoUrl?: string | null;
  profile?: Record<string, any>;
  checks: ClinicalCheckItem[];
  auditLogs: ClinicalAuditLogItem[];
  documents: ClinicalDocumentItem[];
  donors: Donor[];
  emergencyRequests: EmergencyRequest[];
  inventory: BloodInventoryUnit[];
  lastSyncedAt: string;
}

export type ActiveTab = 'dashboard' | 'compatibility' | 'donors' | 'requests' | 'inventory';
