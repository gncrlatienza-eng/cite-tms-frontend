import axios from 'axios';
import { supabase } from './supabase';
import { sessionReady } from '../context/AuthContext'; // ── NEW

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  // ── NEW: Wait until AuthContext has finished restoring the session.
  // On the very first load this blocks until getSession() + fetchProfile()
  // complete. After that it resolves instantly with zero cost.
  await sessionReady;

  // 1. Try FastAPI token first (students/faculty who used email login)
  const fastapiToken = localStorage.getItem('access_token');
  if (fastapiToken) {
    config.headers.Authorization = `Bearer ${fastapiToken}`;
    return config;
  }

  // 2. Fall back to Supabase session token (Google OAuth users)
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

      const fastapiToken = localStorage.getItem('access_token');
      if (fastapiToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Session refresh failed:', refreshError);
      }

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;