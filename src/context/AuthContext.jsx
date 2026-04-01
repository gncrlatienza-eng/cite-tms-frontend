import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { ALLOWED_ADMIN_EMAILS } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initializedRef        = useRef(false);

  // ── Fetch profile by primary email, fallback to secondary_email ──
  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return null; }
    try {
      const SELECT_FIELDS = 'id, email, full_name, role, is_author, is_active, secondary_email, department, year_level, student_id, last_login';

      // Primary lookup — match by DLSL email
      const { data: primaryData } = await supabase
        .from('users')
        .select(SELECT_FIELDS)
        .eq('email', authUser.email)
        .single();

      if (primaryData) {
        setProfile(primaryData);
        return primaryData;
      }

      // Fallback — logged-in email might be a registered secondary_email
      const { data: secondaryData } = await supabase
        .from('users')
        .select(SELECT_FIELDS)
        .eq('secondary_email', authUser.email)
        .single();

      setProfile(secondaryData ?? null);
      return secondaryData ?? null;

    } catch (err) {
      console.warn('fetchProfile error (non-fatal):', err);
      setProfile(null);
      return null;
    }
  };

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
        if (event === 'SIGNED_OUT') { setUser(null); setProfile(null); return; }
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
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
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('signOut error (non-fatal):', err);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user);
  };

  // FIX Bug 1: isAdmin must check profile.email (the primary DLSL email stored
  // in the DB), NOT user?.email (the Google auth email, which could be a
  // secondary Gmail). If we check user?.email, an author whose secondary Gmail
  // is also in ALLOWED_ADMIN_EMAILS would incorrectly get isAdmin = true.
  const isAdmin = !!(profile && (
    profile.role === 'admin' || ALLOWED_ADMIN_EMAILS.includes(profile.email)
  ));

  const isAuthor = profile?.is_author === true;

  // ── Author convenience exports ──
  // Pre-fill author name & secondary email for UploadPaper form
  const authorName = profile?.full_name || null;
  const secondaryEmail = profile?.secondary_email || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      logout, 
      loading, 
      isAdmin, 
      isAuthor, 
      refreshProfile,
      authorName,      // ← NEW: primary author name
      secondaryEmail   // ← NEW: backup email
    }}>
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