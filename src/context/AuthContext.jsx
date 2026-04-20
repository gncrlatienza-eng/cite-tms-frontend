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
  const profileFetchedRef                   = useRef(false); // ← guard: fetch once

  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return null; }

    setProfileLoading(true);
    try {
      const SELECT_FIELDS = 'id, email, full_name, role, is_author, is_active, secondary_email, department, year_level, student_id, last_login';

      const { data: primaryData } = await supabase
        .from('users')
        .select(SELECT_FIELDS)
        .eq('email', authUser.email)
        .single();

      if (primaryData) {
        setProfile(primaryData);
        profileFetchedRef.current = true;
        return primaryData;
      }

      const { data: secondaryData } = await supabase
        .from('users')
        .select(SELECT_FIELDS)
        .eq('secondary_email', authUser.email)
        .single();

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

    // ✅ Skip fetchProfile if already fetched — prevents tab refocus re-fetch
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

        // SIGNED_IN / USER_UPDATED — only fetch profile if not already fetched
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await applySession(session);
          return;
        }

        // TOKEN_REFRESHED — just update token, never touch profile
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
    profileFetchedRef.current = false; // allow re-fetch on manual refresh
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
      user,
      profile,
      profileLoading,
      logout,
      loading,
      isAdmin,
      isAuthor,
      refreshProfile,
      authorName,
      secondaryEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}