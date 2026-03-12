import axios from 'axios';
import { getToken, clearToken } from './auth';

// One shared axios instance for the whole app
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
});

// BEFORE every request: attach the JWT token if we have one
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// AFTER every response: if the server returns 401, the token is expired or invalid
// Clear it and send the user to login — applies to every page automatically
api.interceptors.response.use(
  (response) => response, // success — just pass it through unchanged
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      // window.location is used instead of Next.js router because this interceptor
      // lives outside of React — it has no access to useRouter()
      window.location.href = '/login';
    }
    // Re-throw so individual pages can still catch other errors (404, 422, 500...)
    return Promise.reject(error);
  },
);

export default api;
