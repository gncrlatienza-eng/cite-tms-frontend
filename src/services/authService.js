import { supabase } from './supabase';

const authService = {

  loginWithGoogle: async (intent = 'student') => {
    localStorage.setItem('login_intent', intent);
    sessionStorage.setItem('login_intent', intent);

    const redirect = window.location.pathname + window.location.search;
    sessionStorage.setItem('post_login_redirect', redirect);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: 'dlsl.edu.ph',
          prompt: 'select_account',
        },
      },
    });
    if (error) {
      localStorage.removeItem('login_intent');
      sessionStorage.removeItem('login_intent');
      throw error;
    }
  },

  loginAsAdminWithGoogle: async () => {
    // ── FIXED: timeout signOut so it doesn't hang if Supabase lock is busy
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000))
      ]);
    } catch (e) {
      console.warn('signOut timed out or failed, continuing anyway:', e.message);
    }

    localStorage.removeItem('login_intent');
    sessionStorage.removeItem('login_intent');
    localStorage.setItem('login_intent', 'admin');
    sessionStorage.setItem('login_intent', 'admin');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      localStorage.removeItem('login_intent');
      sessionStorage.removeItem('login_intent');
      throw error;
    }
  },

  loginAsAuthorWithGoogle: async () => {
    // ── FIXED: timeout signOut so it doesn't hang if Supabase lock is busy
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000))
      ]);
    } catch (e) {
      console.warn('signOut timed out or failed, continuing anyway:', e.message);
    }

    localStorage.removeItem('login_intent');
    sessionStorage.removeItem('login_intent');
    localStorage.setItem('login_intent', 'author');
    sessionStorage.setItem('login_intent', 'author');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) {
      localStorage.removeItem('login_intent');
      sessionStorage.removeItem('login_intent');
      throw error;
    }
  },

  loginWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signupWithEmail: async ({ name, email, password, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role } },
    });
    if (error) throw error;

    const user = data.user;
    if (user) {
      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        full_name: name,
        role,
        is_active: true,
        last_login: new Date().toISOString(),
      });
    }
    return data;
  },

  logout: async () => {
    // ── FIXED: timeout signOut so it doesn't hang
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000))
      ]);
    } catch (e) {
      console.warn('signOut timed out or failed:', e.message);
    }
    localStorage.removeItem('login_intent');
    sessionStorage.removeItem('login_intent');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  getUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },
};

export default authService;