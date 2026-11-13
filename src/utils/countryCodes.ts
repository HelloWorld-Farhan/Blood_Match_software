export interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AE', dialCode: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'PK', dialCode: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', dialCode: '+880', name: 'Bangladesh', flag: '🇧🇩' },
];

export const validatePhoneNumber = (dialCode: string, number: string): { isValid: boolean; message?: string } => {
  const digits = number.replace(/\D/g, '');
  if (!digits) {
    return { isValid: false, message: 'Phone number is required' };
  }

  if (dialCode === '+91') {
    if (digits.length !== 10) {
      return { isValid: false, message: 'Indian mobile number must be exactly 10 digits' };
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { isValid: false, message: 'Indian mobile number must start with 6, 7, 8, or 9' };
    }
  } else {
    if (digits.length < 7 || digits.length > 15) {
      return { isValid: false, message: 'Phone number must be between 7 and 15 digits' };
    }
  }

  return { isValid: true };
};

export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, message: 'Email address is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid email address (e.g. name@domain.com)' };
  }
  return { isValid: true };
};

export interface PasswordCriteria {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasTwoNumbers: boolean;
  hasSpecialChar: boolean;
  allValid: boolean;
  strengthPercent: number;
}

export const checkPasswordCriteria = (password: string): PasswordCriteria => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const numberMatches = password.match(/\d/g);
  const hasTwoNumbers = (numberMatches ? numberMatches.length : 0) >= 2;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=[\]~`\\/]/.test(password);

  let passedCount = 0;
  if (hasMinLength) passedCount++;
  if (hasUppercase) passedCount++;
  if (hasTwoNumbers) passedCount++;
  if (hasSpecialChar) passedCount++;

  const strengthPercent = Math.round((passedCount / 4) * 100);
  const allValid = passedCount === 4;

  return {
    hasMinLength,
    hasUppercase,
    hasTwoNumbers,
    hasSpecialChar,
    allValid,
    strengthPercent,
  };
};

/**
 * Calculates clinician initials according to exact institutional standard:
 * - Multi-word name (e.g. "Farhan Khalid") -> first char of first name + first char of last name ("FK")
 * - Single-word name (e.g. "Farhan") -> first 2 characters of the name ("FA")
 * - Handles optional medical honorific prefixes (Dr., Prof., Mr., Ms., etc.)
 */
export const getInitials = (name?: string | null): string => {
  if (!name) return 'FK';
  const clean = name.trim().replace(/^(Dr\.|Dr|Mr\.|Mr|Ms\.|Ms|Mrs\.|Mrs|Prof\.)\s+/i, '').trim();
  if (!clean) return 'FK';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  }
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.toUpperCase();
};

export const parsePhoneNumberWithCountry = (fullPhone?: string | null): { dialCode: string; number: string } => {
  if (!fullPhone) return { dialCode: '+91', number: '' };
  const clean = fullPhone.trim();
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (clean.startsWith(c.dialCode)) {
      const rest = clean.slice(c.dialCode.length).trim().replace(/^[- ]+/, '');
      return { dialCode: c.dialCode, number: rest };
    }
  }
  if (clean.startsWith('+')) {
    const parts = clean.split(/\s+/);
    if (parts.length > 1) {
      return { dialCode: parts[0], number: parts.slice(1).join(' ') };
    }
  }
  return { dialCode: '+91', number: clean };
};

export const formatFullPhone = (dialCode: string, number: string): string => {
  const cleanNum = (number || '').trim();
  if (!cleanNum) return '';
  return `${dialCode} ${cleanNum}`;
};


