import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { ALLOWED_ADMIN_EMAILS } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initializedRef        = useRef(false);

  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return null; }
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_author, is_active, secondary_email, department, year_level, student_id, last_login')
        .eq('email', authUser.email)
        .single();
      setProfile(data ?? null);
      return data ?? null;
    } catch (err) {
      console.warn('fetchProfile error (non-fatal):', err);
      setProfile(null);
      return null;
    }
  };

  // ── FIXED: removed the isAllowedEmail guard from applySession.
  // AuthCallback is the single source of truth for blocking unauthorized emails.
  // Having the guard here races with AuthCallback's signOut and causes an
  // infinite spinner instead of showing the "unauthorized" screen.
  const applySession = async (session) => {
    if (!session?.user) {
      setUser(null);
      setProfile(null);
      return;
    }

    setUser(session.user);
    await fetchProfile(session.user);
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await applySession(session);
      } catch (err) {
        console.error('Auth init error:', err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          await applySession(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('signOut error (non-fatal):', err);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user);
  };

  const isAdmin  = !!(profile && (
    profile.role === 'admin' || ALLOWED_ADMIN_EMAILS.includes(user?.email)
  ));
  const isAuthor = profile?.is_author === true;

  return (
    <AuthContext.Provider value={{ user, profile, logout, loading, isAdmin, isAuthor, refreshProfile }}>
      {loading ? (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at top, #f0fdf4 0, #ffffff 52%)',
          zIndex: 9999,
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid #bbf7d0', borderTopColor: '#166534',
              animation: 'spin 0.9s ease-in-out infinite',
            }} />
            <div style={{
              fontSize: 13, color: '#4b5563',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Loading CITE‑TMS
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}