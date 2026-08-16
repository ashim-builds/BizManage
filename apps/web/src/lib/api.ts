import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
