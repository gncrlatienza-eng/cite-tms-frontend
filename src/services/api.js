import axios from 'axios';
import { supabase } from './supabase'; // ← adjust path if needed

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  // 1. Try FastAPI token first (students/faculty who used email login)
  const fastapiToken = localStorage.getItem('access_token');
  if (fastapiToken) {
    config.headers.Authorization = `Bearer ${fastapiToken}`;
    return config;
  }

  // 2. Fall back to Supabase session token (admin who used Google OAuth)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If FastAPI token expired, clear it and redirect to login
      const fastapiToken = localStorage.getItem('access_token');
      if (fastapiToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // If Supabase token expired, try refreshing it
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Session refresh failed:', refreshError);
      }

      // Refresh failed, redirect to login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;