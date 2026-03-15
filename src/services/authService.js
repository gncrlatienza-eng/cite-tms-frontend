import { supabase } from './supabase';

const authService = {

  loginWithGoogle: async () => {
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
    if (error) throw error;
  },

  loginAsAdmin: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      await supabase.auth.signOut();
      throw new Error('Could not verify account. Please contact your administrator.');
    }

    if (userData.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('Access denied. This account does not have admin privileges.');
    }

    return data;
  },

  loginAsAdminWithGoogle: async () => {
    // ✅ Write to BOTH storages — React StrictMode double-mount can wipe one
    localStorage.setItem('login_intent', 'admin');
    sessionStorage.setItem('login_intent', 'admin');

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

  loginWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  logout: async () => {
    await supabase.auth.signOut();
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
    const session = await supabase.auth.getSession();
    return !!session.data.session;
  },
};

export default authService;