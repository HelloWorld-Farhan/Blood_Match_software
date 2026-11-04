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
}

export type ActiveTab = 'dashboard' | 'compatibility' | 'donors' | 'requests' | 'inventory';
