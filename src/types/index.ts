export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UrgencyLevel = 'CRITICAL' | 'URGENT' | 'STANDARD';

export type RequestStatus = 'PENDING' | 'MATCHED' | 'FULFILLED' | 'CANCELLED';

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
  available: boolean;
  registeredAt: string;
  unitsDonatedTotal: number;
}

export interface EmergencyRequest {
  id: string;
  patientName: string;
  patientAge: number;
  bloodType: BloodType;
  unitsNeeded: number;
  hospitalName: string;
  hospitalCity: string;
  hospitalWard?: string;
  urgency: UrgencyLevel;
  contactName: string;
  contactPhone: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  matchedDonorId?: string;
}

export interface BloodInventoryUnit {
  id: string;
  bloodType: BloodType;
  unitsAvailable: number;
  storageFacility: string;
  lastTestedDate: string;
  status: 'OPTIMAL' | 'LOW' | 'CRITICAL';
}

export interface UserSession {
  email: string;
  name: string;
  role: 'CLINICIAN' | 'DONOR' | 'HOSPITAL_STAFF';
  token?: string;
  bloodType?: BloodType;
}

export type ActiveTab = 'dashboard' | 'compatibility' | 'donors' | 'requests' | 'inventory';

