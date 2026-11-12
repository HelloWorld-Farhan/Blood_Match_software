/**
 * BloodMatch Enterprise API Client with Cold-Start Resilience
 * Automatically recovers from network blocks and free-tier container sleep (15-20s cold starts)
 */

export const API_BASE_URL = (
  (import.meta as any).env?.VITE_BACKEND_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  ''
).replace(/\/+$/, '');

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  skipAuth?: boolean;
}

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes fetch with exponential backoff retry to seamlessly absorb cloud container spin-up cold starts.
 * Intercepts TypeError ("Failed to fetch") and gateway errors (502, 503, 504).
 */
export async function fetchWithRetry(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 12000,
    retries = 1,
    baseDelayMs = 800,
    skipAuth = false,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  // Attach session authorization token if present
  const headers = new Headers(customHeaders);
  if (!skipAuth && typeof window !== 'undefined') {
    const token = sessionStorage.getItem('bloodmatch_auth_token') || localStorage.getItem('bloodmatch_auth_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if server is in free-tier wake up mode (502 Bad Gateway / 503 Service Unavailable / 504 Gateway Timeout)
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        const backoff = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        await sleep(backoff);
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      // Never retry on deliberate aborts or cancellations
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        throw err;
      }

      const isNetworkError =
        err instanceof TypeError ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError');

      if (isNetworkError && attempt < retries) {
        const backoff = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        await sleep(backoff);
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error(`Failed to connect to BloodMatch API after ${retries} retries.`);
}

function parseErrorMessage(data: any): string | null {
  if (!data) return null;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
  }
  if (typeof data.detail === 'object' && data.detail !== null) {
    return JSON.stringify(data.detail);
  }
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  return null;
}

/**
 * High-level typed API service helper
 */
export const apiClient = {
  async get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      const res = await fetchWithRetry(endpoint, { ...options, method: 'GET' });
      const data = await res.json().catch(() => null);
      return {
        data,
        error: res.ok ? null : (parseErrorMessage(data) || 'Request failed'),
        status: res.status,
        ok: res.ok
      };
    } catch (err: any) {
      return {
        data: null,
        error: err?.message || 'Connection failure. Please check your network.',
        status: 0,
        ok: false
      };
    }
  },

  async post<T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      const res = await fetchWithRetry(endpoint, {
        ...options,
        method: 'POST',
        body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined)
      });
      const data = await res.json().catch(() => null);
      return {
        data,
        error: res.ok ? null : (parseErrorMessage(data) || 'Request failed'),
        status: res.status,
        ok: res.ok
      };
    } catch (err: any) {
      return {
        data: null,
        error: err?.message || 'Connection failure. Please check your network.',
        status: 0,
        ok: false
      };
    }
  },

  async put<T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      const res = await fetchWithRetry(endpoint, {
        ...options,
        method: 'PUT',
        body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined)
      });
      const data = await res.json().catch(() => null);
      return {
        data,
        error: res.ok ? null : (parseErrorMessage(data) || 'Request failed'),
        status: res.status,
        ok: res.ok
      };
    } catch (err: any) {
      return {
        data: null,
        error: err?.message || 'Connection failure. Please check your network.',
        status: 0,
        ok: false
      };
    }
  },

  async delete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      const res = await fetchWithRetry(endpoint, { ...options, method: 'DELETE' });
      const data = await res.json().catch(() => null);
      return {
        data,
        error: res.ok ? null : (parseErrorMessage(data) || 'Request failed'),
        status: res.status,
        ok: res.ok
      };
    } catch (err: any) {
      return {
        data: null,
        error: err?.message || 'Connection failure. Please check your network.',
        status: 0,
        ok: false
      };
    }
  }
};

/**
 * Donor API Helpers for Cross-Device Global Synchronization
 */
export async function fetchDonorsApi(bloodType?: string, userEmail?: string) {
  const params = new URLSearchParams();
  if (bloodType && bloodType !== 'ALL') params.append('blood_type', bloodType);
  if (userEmail) params.append('user_email', userEmail);
  const endpoint = `/api/donors${params.toString() ? `?${params.toString()}` : ''}`;
  return apiClient.get<any[]>(endpoint);
}

export async function sendDonorOtpApi(email: string, name: string) {
  return apiClient.post<{ message: string; success: boolean; cooldown_seconds: number }>(
    '/api/donors/send-otp',
    { email, name }
  );
}

export async function registerDonorApi(payload: {
  name: string;
  blood_type: string;
  phone: string;
  email: string;
  city: string;
  location?: string;
  hospital?: string;
  age?: number;
  gender?: string;
  user_email?: string;
  otp_code?: string;
}) {
  return apiClient.post<any>('/api/donors', payload);
}

export async function fetchInventoryApi() {
  return apiClient.get<any[]>('/api/inventory');
}

export async function fetchAlertsApi(userEmail?: string) {
  const endpoint = userEmail 
    ? `/api/alerts?user_email=${encodeURIComponent(userEmail)}` 
    : '/api/alerts';
  return apiClient.get<any[]>(endpoint);
}

export async function deleteDonorApi(donorId: string, userEmail: string) {
  const endpoint = `/api/donors/${encodeURIComponent(donorId)}?user_email=${encodeURIComponent(userEmail)}`;
  return apiClient.delete<{ message: string; deleted_id: string }>(endpoint);
}

export async function fetchEmergencyRequestsApi(userEmail?: string) {
  const params = new URLSearchParams();
  if (userEmail) params.append('user_email', userEmail);
  return apiClient.get<any[]>(`/api/emergency${params.toString() ? `?${params.toString()}` : ''}`);
}

export async function createEmergencyRequestApi(payload: {
  user_email?: string;
  patient_name: string;
  hospital?: string;
  blood_type: string;
  units_needed: number;
  status?: string;
  contact_person: string;
  contact_phone: string;
}) {
  return apiClient.post<any>('/api/emergency', payload);
}

export async function dispatchEmergencyDonorApi(payload: {
  donor_id?: string;
  donor_name: string;
  donor_email: string;
  donor_phone?: string;
  patient_name: string;
  recipient_blood_type: string;
  units_needed?: number;
  hospital: string;
  locality?: string;
  urgency?: string;
  clinician_name?: string;
  emergency_contact?: string;
  message?: string;
}) {
  return apiClient.post<{ message: string; success: boolean }>('/api/emergency/dispatch-donor', payload);
}

export async function emailEmergencyRosterApi(payload: {
  clinician_email: string;
  clinician_name?: string;
  patient_name: string;
  recipient_blood_type: string;
  units_needed?: number;
  hospital: string;
  locality?: string;
  urgency?: string;
  emergency_phone?: string;
  roster_items: any[];
  pdf_base64?: string;
  pdf_filename?: string;
  dispatch_id?: string;
}) {
  return apiClient.post<{ message: string; success: boolean; has_attachment?: boolean }>('/api/emergency/email-roster', payload);
}

export async function fetchSessionsApi() {
  return apiClient.get<any[]>(`/api/sessions?_t=${Date.now()}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

export async function revokeSessionApi(sessionId: string) {
  return apiClient.delete<{ message: string; session_id: string; status: string }>(`/api/sessions/${encodeURIComponent(sessionId)}`);
}

export async function revokeOtherSessionsApi() {
  return apiClient.delete<{ message: string; terminated_count: number }>('/api/sessions/others');
}
