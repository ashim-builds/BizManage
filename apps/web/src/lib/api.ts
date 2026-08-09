import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bizmanage_token');
    const businessId = localStorage.getItem('bizmanage_active_business_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (businessId) {
      config.headers['X-Business-Id'] = businessId;
    }
  }
  return config;
});
