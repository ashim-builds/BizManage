import axios from 'axios';
import { decryptRecord } from './e2eeInterceptor';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  async (response) => {
    // If we have an active private key, decrypt any E2EE records in the response
    if (typeof window !== 'undefined') {
      const pk = sessionStorage.getItem('e2ee_private_key');
      const token = localStorage.getItem('accessToken');
      if (pk && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId || payload.id;

          if (response.data?.data) {
            response.data.data = await decryptRecord(response.data.data, pk, userId);
          }
        } catch (e) {
          console.error('Failed to parse JWT for E2EE decryption', e);
        }
      }
    }
    return response;
  },
  async (error) => {
    // Automatic Session Expiration & Logout Handler
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPath =
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/register') ||
        currentPath.startsWith('/forgot-password') ||
        currentPath.startsWith('/verify-email') ||
        currentPath.startsWith('/reset-password') ||
        currentPath === '/';

      const isLoginRequest =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/admin-login') ||
        error.config?.url?.includes('/auth/register');

      // Only trigger auto logout if user was on a protected application page
      if (!isAuthPath && !isLoginRequest) {
        // Clear tokens and credentials
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('e2ee_private_key');
        sessionStorage.removeItem('e2ee_public_key');
        delete api.defaults.headers.common['Authorization'];

        const isAdmin = currentPath.startsWith('/admin');
        const loginUrl = isAdmin ? '/admin/login?sessionExpired=true' : '/login?sessionExpired=true';

        if (!window.location.search.includes('sessionExpired=true')) {
          window.location.href = loginUrl;
        }
      }
    }
    return Promise.reject(error);
  }
);

// On page load, restore the access token from localStorage (for mobile browsers
// that block cross-origin cookies). This sets the Authorization header so all
// subsequent requests are authenticated even without cookie support.
if (typeof window !== 'undefined') {
  const storedToken = localStorage.getItem('accessToken');
  if (storedToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
  }
}

/**
 * Persists an access token to localStorage and sets it as the
 * Authorization header. Call this after a successful login or token refresh.
 */
export const setAccessToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('accessToken', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('accessToken');
    delete api.defaults.headers.common['Authorization'];
  }
};

export const setApiBusinessId = (businessId: string | null) => {
  if (businessId) {
    api.defaults.headers.common['X-Business-Id'] = businessId;
  } else {
    delete api.defaults.headers.common['X-Business-Id'];
  }
};
