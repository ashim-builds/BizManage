import axios from 'axios';
import { decryptRecord } from './e2eeInterceptor';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(async (response) => {
  // If we have an active private key, decrypt any E2EE records in the response
  if (typeof window !== 'undefined') {
    const pk = sessionStorage.getItem('e2ee_private_key');
    // We need userId as well! Where to get userId? 
    // Wait, the API returns data to the user, but `decryptRecord` needs `userId` to pick the correct DEK.
    // We can fetch user id from AuthProvider, or just fetch the me route, or parse JWT.
    // Let's decode the JWT token from localStorage.
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
}, (error) => Promise.reject(error));

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
