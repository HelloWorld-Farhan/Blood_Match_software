/**
 * BloodMatch Enterprise Authentication & Security SDK
 * Comprehensive typed client combining all 9 security, persistence, and disaster-recovery layers.
 */

import { apiClient, ApiResponse } from './api';
import { 
  AuthUser, 
  AuthResponse, 
  ActiveSessionItem, 
  TrustedDeviceItem, 
  SyncTelemetryResponse,
  ClinicalCheckItem,
  ClinicalDocumentItem,
  ClinicalAuditLogItem,
  MasterSyncData
} from '../types';

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  device_id?: string;
  device_name?: string;
  remember_device?: boolean;
}

export interface OtpVerifyPayload {
  email: string;
  otp_code: string;
}

export interface TwoFactorVerifyPayload {
  email: string;
  otp_code: string;
  device_id?: string;
  device_name?: string;
  remember_device?: boolean;
}

export interface TwoFactorTogglePayload {
  enable_2fa: boolean;
  password: string;
}

export interface PasswordResetConfirmPayload {
  email: string;
  reset_session_token: string;
  new_password: string;
}

export interface UnlockAccountPayload {
  email: string;
  unlock_code: string;
}

export const getPersistentDeviceId = (): string => {
  if (typeof window === 'undefined') return 'terminal-default';
  let devId = localStorage.getItem('bloodmatch_client_device_id');
  if (!devId) {
    devId = 'dev-' + Math.random().toString(36).substring(2, 12);
    localStorage.setItem('bloodmatch_client_device_id', devId);
  }
  return devId;
};

export const authService = {
  // --- Layer 2: Registration & Verification ---
  async register(payload: RegisterPayload): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/register', payload);
  },

  async verifyOtp(payload: OtpVerifyPayload): Promise<ApiResponse<AuthResponse>> {
    const res = await apiClient.post<AuthResponse>('/api/auth/verify-otp', payload);
    if (res.ok && res.data?.access_token) {
      this.persistSession(res.data);
    }
    return res;
  },

  async resendOtp(email: string): Promise<ApiResponse<{ message: string; cooldown_seconds: number }>> {
    return apiClient.post('/api/auth/resend-otp', { email });
  },

  // --- Layer 2 & 3: Login, Brute-Force Defense & Adaptive 2FA ---
  async login(payload: LoginPayload): Promise<ApiResponse<AuthResponse>> {
    const deviceId = payload.device_id || getPersistentDeviceId();
    const deviceName = payload.device_name || `${navigator.platform || 'Workstation'} Browser`;
    const res = await apiClient.post<AuthResponse>('/api/auth/login', {
      ...payload,
      device_id: deviceId,
      device_name: deviceName
    });

    if (res.ok && res.data?.access_token && !res.data?.two_factor_required) {
      this.persistSession(res.data);
    }
    return res;
  },

  async verify2fa(payload: TwoFactorVerifyPayload): Promise<ApiResponse<AuthResponse>> {
    const deviceId = payload.device_id || getPersistentDeviceId();
    const deviceName = payload.device_name || `${navigator.platform || 'Workstation'} Browser`;
    const res = await apiClient.post<AuthResponse>('/api/auth/2fa/verify', {
      ...payload,
      device_id: deviceId,
      device_name: deviceName
    });

    if (res.ok && res.data?.access_token) {
      this.persistSession(res.data);
    }
    return res;
  },

  async toggle2fa(payload: TwoFactorTogglePayload): Promise<ApiResponse<{ message: string; is_2fa_enabled: boolean }>> {
    return apiClient.put('/api/auth/2fa/toggle', payload);
  },

  async unlockAccount(payload: UnlockAccountPayload): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/api/auth/unlock-account', payload);
  },

  // --- Layer 8: Multi-Step Password Recovery ---
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string; cooldown_seconds: number }>> {
    return apiClient.post('/api/auth/password-reset/request', { email });
  },

  async verifyPasswordReset(email: string, otp_code: string): Promise<ApiResponse<{ message: string; reset_session_token: string }>> {
    return apiClient.post('/api/auth/password-reset/verify', { email, otp_code });
  },

  async confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/api/auth/password-reset/confirm', payload);
  },

  // --- Layer 9: Multi-Device Active Session Registry ---
  async getActiveSessions(): Promise<ApiResponse<ActiveSessionItem[]>> {
    return apiClient.get<ActiveSessionItem[]>('/api/sessions');
  },

  async revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/sessions/${sessionId}`);
  },

  async revokeOtherSessions(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete('/api/sessions/others');
  },

  // --- Layer 10: Trusted Device Whitelist ---
  async getTrustedDevices(): Promise<ApiResponse<TrustedDeviceItem[]>> {
    return apiClient.get<TrustedDeviceItem[]>('/api/auth/trusted-devices');
  },

  async removeTrustedDevice(deviceId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/auth/trusted-devices/${deviceId}`);
  },

  // --- Layer 3 & 12: Universal Profile Picture & Cloudflare R2 Sync ---
  async uploadAvatar(
    file: Blob,
    cropData?: { crop_x?: number; crop_y?: number; crop_width?: number; crop_height?: number },
    email?: string
  ): Promise<ApiResponse<{ photoUrl: string; message: string; s3_key?: string }>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const formData = new FormData();
    formData.append('file', file, 'avatar.webp');
    if (userEmail) {
      formData.append('user_email', userEmail);
    }
    if (cropData) {
      if (cropData.crop_x !== undefined) formData.append('crop_x', cropData.crop_x.toString());
      if (cropData.crop_y !== undefined) formData.append('crop_y', cropData.crop_y.toString());
      if (cropData.crop_width !== undefined) formData.append('crop_width', cropData.crop_width.toString());
      if (cropData.crop_height !== undefined) formData.append('crop_height', cropData.crop_height.toString());
    }
    const res = await apiClient.post<{ photoUrl: string; message: string; s3_key?: string }>('/api/v1/storage/avatar', formData);
    if (res.ok && res.data?.photoUrl) {
      const cacheBusted = `${res.data.photoUrl}?v=${Date.now()}`;
      localStorage.setItem('bloodmatch_user_avatar', cacheBusted);
      sessionStorage.setItem('bloodmatch_user_avatar', cacheBusted);
      window.dispatchEvent(new CustomEvent('user_avatar_updated', { detail: { photoUrl: cacheBusted } }));
      window.dispatchEvent(new Event('bloodmatch_profile_updated'));
    }
    return res;
  },

  async uploadScopedAsset(
    file: Blob | File,
    category: string = 'documents',
    email?: string
  ): Promise<ApiResponse<{ s3_key: string; public_url: string; category: string; size_bytes: number }>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const formData = new FormData();
    formData.append('file', file, (file as File).name || 'asset.bin');
    formData.append('category', category);
    if (userEmail) {
      formData.append('user_email', userEmail);
    }
    return apiClient.post<{ s3_key: string; public_url: string; category: string; size_bytes: number }>('/api/v1/storage/upload', formData);
  },

  async listScopedFiles(category?: string, email?: string): Promise<ApiResponse<Array<{ s3_key: string; public_url: string; size_bytes: number }>>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    let url = '/api/v1/storage/files';
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (userEmail) params.append('user_email', userEmail);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return apiClient.get<Array<{ s3_key: string; public_url: string; size_bytes: number }>>(url);
  },

  async deleteScopedFile(s3Key: string): Promise<ApiResponse<{ success: boolean; deleted_key: string; message: string }>> {
    return apiClient.delete<{ success: boolean; deleted_key: string; message: string }>(`/api/v1/storage/files?s3_key=${encodeURIComponent(s3Key)}`);
  },

  async removeAvatar(email?: string): Promise<ApiResponse<{ photoUrl: null; message: string }>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/auth/avatar?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/auth/avatar';
    const res = await apiClient.delete<{ photoUrl: null; message: string }>(endpoint);
    if (res.ok) {
      localStorage.removeItem('bloodmatch_user_avatar');
      sessionStorage.removeItem('bloodmatch_user_avatar');
      window.dispatchEvent(new CustomEvent('user_avatar_updated', { detail: { photoUrl: null } }));
      window.dispatchEvent(new Event('bloodmatch_profile_updated'));
    }
    return res;
  },

  // --- Layer 4: Cross-Device Disaster-Proof Telemetry Sync ---
  async syncAll(email?: string): Promise<ApiResponse<SyncTelemetryResponse>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/sync/all?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/sync/all';
    const res = await apiClient.get<SyncTelemetryResponse>(endpoint);
    if (res.ok && res.data?.photoUrl) {
      const cacheBusted = `${res.data.photoUrl}?v=${Date.now()}`;
      localStorage.setItem('bloodmatch_user_avatar', cacheBusted);
      sessionStorage.setItem('bloodmatch_user_avatar', cacheBusted);
      window.dispatchEvent(new CustomEvent('user_avatar_updated', { detail: { photoUrl: cacheBusted } }));
    }
    return res;
  },

  async pushSyncState(email?: string): Promise<ApiResponse<{ status: string; message: string; data: MasterSyncData }>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/sync/push?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/sync/push';
    return apiClient.post<{ status: string; message: string; data: MasterSyncData }>(endpoint, {});
  },

  async pullSyncState(email?: string): Promise<ApiResponse<{ status: string; message: string; data: MasterSyncData }>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/sync/pull?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/sync/pull';
    return apiClient.post<{ status: string; message: string; data: MasterSyncData }>(endpoint, {});
  },

  // --- Clinical Checks & Screening Consultations ---
  async getClinicalChecks(email?: string): Promise<ApiResponse<ClinicalCheckItem[]>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/clinical/checks?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/clinical/checks';
    return apiClient.get<ClinicalCheckItem[]>(endpoint);
  },

  async createClinicalCheck(checkData: Partial<ClinicalCheckItem>, email?: string): Promise<ApiResponse<ClinicalCheckItem>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/clinical/checks?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/clinical/checks';
    return apiClient.post<ClinicalCheckItem>(endpoint, checkData);
  },

  async deleteClinicalCheck(checkId: string, email?: string): Promise<ApiResponse<{ message: string; deleted_id: string }>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/clinical/checks/${encodeURIComponent(checkId)}?user_email=${encodeURIComponent(userEmail)}` : `/api/v1/clinical/checks/${encodeURIComponent(checkId)}`;
    return apiClient.delete<{ message: string; deleted_id: string }>(endpoint);
  },

  // --- Clinical Documents & Lab Reports ---
  async getClinicalDocuments(email?: string): Promise<ApiResponse<ClinicalDocumentItem[]>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/clinical/documents?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/clinical/documents';
    return apiClient.get<ClinicalDocumentItem[]>(endpoint);
  },

  async createClinicalDocument(docData: Partial<ClinicalDocumentItem>, email?: string): Promise<ApiResponse<ClinicalDocumentItem>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/clinical/documents?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/clinical/documents';
    return apiClient.post<ClinicalDocumentItem>(endpoint, docData);
  },

  async deleteClinicalDocument(docId: string, email?: string): Promise<ApiResponse<{ message: string; deleted_id: string }>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/clinical/documents/${encodeURIComponent(docId)}?user_email=${encodeURIComponent(userEmail)}` : `/api/v1/clinical/documents/${encodeURIComponent(docId)}`;
    return apiClient.delete<{ message: string; deleted_id: string }>(endpoint);
  },

  // --- Clinical Audit Logs ---
  async getClinicalAuditLogs(email?: string): Promise<ApiResponse<ClinicalAuditLogItem[]>> {
    const userEmail = email || sessionStorage.getItem('bloodmatch_user_email') || '';
    const endpoint = userEmail ? `/api/v1/clinical/audit-logs?user_email=${encodeURIComponent(userEmail)}` : '/api/v1/clinical/audit-logs';
    return apiClient.get<ClinicalAuditLogItem[]>(endpoint);
  },

  // --- Session State Helpers ---
  persistSession(data: AuthResponse) {
    if (data.access_token) {
      sessionStorage.setItem('bloodmatch_auth_token', data.access_token);
      sessionStorage.setItem('bloodmatch_auth', 'true');
    }
    if (data.user) {
      sessionStorage.setItem('bloodmatch_user_email', data.user.email);
      sessionStorage.setItem('bloodmatch_user_name', data.user.full_name);
      sessionStorage.setItem('bloodmatch_user_role', data.user.role || 'Clinician');
      if (data.user.phone) {
        sessionStorage.setItem('bloodmatch_user_phone', data.user.phone);
        localStorage.setItem('bloodmatch_user_phone', data.user.phone);
      }
      if (Array.isArray((data.user as any).saved_phones)) {
        const userKey = `bloodmatch_saved_phones_${data.user.email.trim().toLowerCase()}`;
        localStorage.setItem(userKey, JSON.stringify((data.user as any).saved_phones));
      }
      if (Array.isArray((data.user as any).verified_emails)) {
        localStorage.setItem('bloodmatch_verified_emails', JSON.stringify((data.user as any).verified_emails));
      }
      if (data.user.photo_url) {
        const cacheBusted = `${data.user.photo_url}?v=${Date.now()}`;
        localStorage.setItem('bloodmatch_user_avatar', cacheBusted);
        sessionStorage.setItem('bloodmatch_user_avatar', cacheBusted);
      }
    }
  },

  logout() {
    sessionStorage.removeItem('bloodmatch_auth');
    sessionStorage.removeItem('bloodmatch_auth_token');
    sessionStorage.removeItem('bloodmatch_user_name');
    sessionStorage.removeItem('bloodmatch_user_email');
    sessionStorage.removeItem('bloodmatch_user_role');
    sessionStorage.removeItem('bloodmatch_user_phone');
    sessionStorage.removeItem('bloodmatch_user_facility');
    window.location.href = '/login';
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('bloodmatch_auth') === 'true' && Boolean(sessionStorage.getItem('bloodmatch_auth_token'));
  },

  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('bloodmatch_auth_token') || localStorage.getItem('bloodmatch_auth_token');
  }
};

