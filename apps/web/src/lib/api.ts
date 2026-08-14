import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setApiBusinessId = (businessId: string | null) => {
  if (businessId) {
    api.defaults.headers.common['X-Business-Id'] = businessId;
  } else {
    delete api.defaults.headers.common['X-Business-Id'];
  }
};
