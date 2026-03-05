import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

const ALLOWED_ADMIN_EMAILS = ['cite.tms.admin@dlsl.edu.ph'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return; }
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, role, department, year_level, student_id, is_active, last_login')
        .eq('email', authUser.email)
        .single();
      setProfile(data ?? null);
    } catch (err) {
      console.warn('fetchProfile error (non-fatal):', err);
      setProfile(null);
    }
  };

  const validateAndSetSession = async (session) => {
    try {
      if (!session) {
        setUser(null);
        setProfile(null);
        return;
      }

      const email = session.user.email;

      // ✅ DLSL students — trust immediately, fetch profile in background
      if (email.endsWith('@dlsl.edu.ph')) {
        setUser(session.user);
        // Don't await — fetch profile in background so UI unblocks immediately
        fetchProfile(session.user);
        return;
      }

      // Admin check
      if (ALLOWED_ADMIN_EMAILS.includes(email)) {
        setUser(session.user);
        fetchProfile(session.user);
        return;
      }

      // Unknown email — sign out
      console.log('Unauthorized session, signing out:', email);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('validateAndSetSession error:', err);
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    // ✅ Reduced from 3000ms to 1000ms — unblocks UI faster
    const timeout = setTimeout(() => {
      console.warn('Auth timeout — forcing loading to false');
      setLoading(false);
    }, 1000);

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        await validateAndSetSession(session);
      })
      .catch((err) => {
        console.error('getSession error:', err);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await validateAndSetSession(session);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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

  return (
    <AuthContext.Provider value={{ user, profile, logout, loading }}>
      {loading ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at top, #f0fdf4 0, #ffffff 52%)',
          zIndex: 9999
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '3px solid #bbf7d0',
              borderTopColor: '#166534',
              animation: 'spin 0.9s ease-in-out infinite'
            }} />
            <div style={{
              fontSize: '13px',
              color: '#4b5563',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              animation: 'fadePulse 1.4s ease-in-out infinite'
            }}>
              Loading CITE‑TMS
            </div>
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes fadePulse {
              0%, 100% { opacity: 0.4; transform: translateY(0); }
              50% { opacity: 1; transform: translateY(-1px); }
            }
          `}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}