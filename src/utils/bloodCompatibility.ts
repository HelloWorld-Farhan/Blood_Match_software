import { BloodCompatibility, BloodType } from '../types';

export const BLOOD_COMPATIBILITY_TABLE: Record<BloodType, BloodCompatibility> = {
  'O-': {
    type: 'O-',
    canGiveTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    canReceiveFrom: ['O-'],
    antigens: 'None',
    antibodies: 'Anti-A & Anti-B',
    rhFactor: false,
    frequency: '7% (Universal Red Blood Cell Donor)',
  },
  'O+': {
    type: 'O+',
    canGiveTo: ['O+', 'A+', 'B+', 'AB+'],
    canReceiveFrom: ['O+', 'O-'],
    antigens: 'Rh factor only',
    antibodies: 'Anti-A & Anti-B',
    rhFactor: true,
    frequency: '37% (Most Common Blood Type)',
  },
  'A-': {
    type: 'A-',
    canGiveTo: ['A-', 'A+', 'AB-', 'AB+'],
    canReceiveFrom: ['A-', 'O-'],
    antigens: 'A antigen',
    antibodies: 'Anti-B',
    rhFactor: false,
    frequency: '6% of population',
  },
  'A+': {
    type: 'A+',
    canGiveTo: ['A+', 'AB+'],
    canReceiveFrom: ['A+', 'A-', 'O+', 'O-'],
    antigens: 'A & Rh antigens',
    antibodies: 'Anti-B',
    rhFactor: true,
    frequency: '34% of population',
  },
  'B-': {
    type: 'B-',
    canGiveTo: ['B-', 'B+', 'AB-', 'AB+'],
    canReceiveFrom: ['B-', 'O-'],
    antigens: 'B antigen',
    antibodies: 'Anti-A',
    rhFactor: false,
    frequency: '2% of population',
  },
  'B+': {
    type: 'B+',
    canGiveTo: ['B+', 'AB+'],
    canReceiveFrom: ['B+', 'B-', 'O+', 'O-'],
    antigens: 'B & Rh antigens',
    antibodies: 'Anti-A',
    rhFactor: true,
    frequency: '10% of population',
  },
  'AB-': {
    type: 'AB-',
    canGiveTo: ['AB-', 'AB+'],
    canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'],
    antigens: 'A & B antigens',
    antibodies: 'None',
    rhFactor: false,
    frequency: '1% (Rarest Blood Type)',
  },
  'AB+': {
    type: 'AB+',
    canGiveTo: ['AB+'],
    canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    antigens: 'A, B & Rh antigens',
    antibodies: 'None (Universal Recipient)',
    rhFactor: true,
    frequency: '3% of population',
  },
};

export function checkCompatibility(donorType: BloodType, recipientType: BloodType): {
  isCompatible: boolean;
  matchScore: number;
  clinicalNote: string;
} {
  const donorRules = BLOOD_COMPATIBILITY_TABLE[donorType];
  const isCompatible = donorRules.canGiveTo.includes(recipientType);

  if (!isCompatible) {
    return {
      isCompatible: false,
      matchScore: 0,
      clinicalNote: `INCOMPATIBLE: ${donorType} red blood cells carry antigens that will provoke acute hemolytic transfusion reaction in a ${recipientType} recipient.`,
    };
  }

  // Exact type match is 100%, universal match is 95%
  const isExact = donorType === recipientType;
  return {
    isCompatible: true,
    matchScore: isExact ? 100 : 92,
    clinicalNote: isExact
      ? `EXACT MATCH: Perfect antigenic compatibility between ${donorType} donor and ${recipientType} recipient.`
      : `SAFE COMPATIBLE MATCH: ${donorType} blood can be safely transfused to ${recipientType} recipient.`,
  };
}

