import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { ALLOWED_ADMIN_EMAILS } from '../utils/constants';

const AuthContext = createContext(null);

let _resolveSessionReady;
export const sessionReady = new Promise((resolve) => {
  _resolveSessionReady = resolve;
});

export function AuthProvider({ children }) {
  const [user, setUser]                     = useState(null);
  const [profile, setProfile]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileFetchedRef                   = useRef(false);

  const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('fetchProfile timeout')), ms)
    )
  ]);

  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return null; }
    setProfileLoading(true);
    try {
      const SELECT_FIELDS = 'id, email, full_name, role, is_author, is_active, secondary_email, department, year_level, student_id, last_login';
      const { data: primaryData } = await withTimeout(
        supabase.from('users').select(SELECT_FIELDS).eq('email', authUser.email).single(),
        5000
      );
      if (primaryData) {
        setProfile(primaryData);
        profileFetchedRef.current = true;
        return primaryData;
      }
      const { data: secondaryData } = await withTimeout(
        supabase.from('users').select(SELECT_FIELDS).eq('secondary_email', authUser.email).single(),
        5000
      );
      setProfile(secondaryData ?? null);
      profileFetchedRef.current = true;
      return secondaryData ?? null;
    } catch (err) {
      console.warn('fetchProfile error (non-fatal):', err);
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  const applySession = async (session) => {
    if (!session?.user) {
      setUser(null);
      setProfile(null);
      profileFetchedRef.current = false;
      return;
    }
    setUser(session.user);
    if (!profileFetchedRef.current) {
      await fetchProfile(session.user);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('Auth init timed out — forcing loading to stop');
      setLoading(false);
      _resolveSessionReady();
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          try {
            await applySession(session);
          } catch (err) {
            console.error('Auth init error:', err);
            setUser(null);
            setProfile(null);
          } finally {
            clearTimeout(timeout);
            setLoading(false);
            _resolveSessionReady();
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          profileFetchedRef.current = false;
          return;
        }

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await applySession(session);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) setUser(session.user);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    // Clear ALL saved state so next login starts completely fresh
    localStorage.removeItem('last_route');
    localStorage.removeItem('login_intent');
    localStorage.removeItem('active_role');           // ← localStorage now
    sessionStorage.removeItem('login_intent');
    sessionStorage.removeItem('post_login_redirect');
    sessionStorage.removeItem('admin_active_tab');
    sessionStorage.removeItem('author_active_tab');
    setUser(null);
    setProfile(null);
    profileFetchedRef.current = false;
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('signOut error (non-fatal):', err);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    profileFetchedRef.current = false;
    await fetchProfile(user);
  };

  const isAdmin        = !!(profile && (
    profile.role === 'admin' || ALLOWED_ADMIN_EMAILS.includes(profile.email)
  ));
  const isAuthor       = profile?.is_author === true;
  const authorName     = profile?.full_name || null;
  const secondaryEmail = profile?.secondary_email || null;

  return (
    <AuthContext.Provider value={{
      user, profile, profileLoading, logout, loading,
      isAdmin, isAuthor, refreshProfile, authorName, secondaryEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}