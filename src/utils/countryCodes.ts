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
