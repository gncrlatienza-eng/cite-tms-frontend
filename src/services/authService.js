import { supabase } from './supabase';

const authService = {

  loginWithGoogle: async (intent = 'student') => {
    localStorage.setItem('login_intent', intent);
    sessionStorage.setItem('login_intent', intent);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: 'dlsl.edu.ph',       // ← both student AND author must be @dlsl.edu.ph
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
    // Authors are @dlsl.edu.ph students — same OAuth flow, different intent
    return authService.loginWithGoogle('author');
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
    await supabase.auth.signOut();
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