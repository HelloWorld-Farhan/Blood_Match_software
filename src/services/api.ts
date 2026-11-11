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
    timeoutMs = 18000,
    retries = 3,
    baseDelayMs = 1200,
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
        const backoff = baseDelayMs * Math.pow(2, attempt) + Math.random() * 250;
        console.warn(
          `[BloodMatch API] Server waking up (${response.status}). Retrying in ${Math.round(backoff)}ms (Attempt ${attempt + 1}/${retries})...`
        );
        await sleep(backoff);
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      const isNetworkError =
        err instanceof TypeError ||
        err?.name === 'AbortError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError');

      if (isNetworkError && attempt < retries) {
        const backoff = baseDelayMs * Math.pow(2, attempt) + Math.random() * 250;
        console.warn(
          `[BloodMatch API] Cold-start connection retry in ${Math.round(backoff)}ms (Attempt ${attempt + 1}/${retries}): ${err?.message || 'Network unreachable'}`
        );
        await sleep(backoff);
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error(`Failed to connect to BloodMatch API after ${retries} retries.`);
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
        error: res.ok ? null : (data?.detail || data?.message || 'Request failed'),
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
      const res = await fetchWithRetry(endpoint, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => null);
      return {
        data,
        error: res.ok ? null : (data?.detail || data?.message || 'Request failed'),
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
      const res = await fetchWithRetry(endpoint, {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => null);
      return {
        data,
        error: res.ok ? null : (data?.detail || data?.message || 'Request failed'),
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
        error: res.ok ? null : (data?.detail || data?.message || 'Request failed'),
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
