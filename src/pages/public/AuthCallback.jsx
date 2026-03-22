import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const ALLOWED_ADMIN_EMAILS = [
  'gncrlatienza@gmail.com',
  'cite.tms.admin@dlsl.edu.ph',
];

export default function AuthCallback() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [blockedEmail, setBlockedEmail] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    const intent = sessionStorage.getItem('login_intent')
      || localStorage.getItem('login_intent');

    console.log('[CALLBACK] intent:', intent);
    console.log('[CALLBACK] localStorage:', localStorage.getItem('login_intent'));
    console.log('[CALLBACK] sessionStorage:', sessionStorage.getItem('login_intent'));

    sessionStorage.removeItem('login_intent');
    localStorage.removeItem('login_intent');

    const process = async (session) => {
      if (handled.current) return;
      handled.current = true;

      if (!session) { navigate('/'); return; }

      const email = session.user.email;
      console.log('[CALLBACK] email:', email);
      console.log('[CALLBACK] processing with intent:', intent);

      // ── Admin login ───────────────────────────────────────
      if (intent === 'admin') {
        if (!ALLOWED_ADMIN_EMAILS.includes(email)) {
          await supabase.auth.signOut();
          setBlockedEmail(email);
          setBlockReason('admin');
          setPhase('unauthorized');
          return;
        }
        navigate('/admin/dashboard');
        return;
      }

      // ── Student & Author login — must be @dlsl.edu.ph ─────
      if (!email.endsWith('@dlsl.edu.ph')) {
        await supabase.auth.signOut();
        setBlockedEmail(email);
        setBlockReason('domain');
        setPhase('unauthorized');
        return;
      }

      // ── Author login — must also have is_author = true ────
      if (intent === 'author') {
        try {
          const { data: userRecord } = await supabase
            .from('users')
            .select('is_author')
            .eq('email', email)
            .single();

          console.log('[CALLBACK] userRecord:', userRecord);

          if (userRecord?.is_author) {
            console.log('[CALLBACK] is_author = true, redirecting to /author/dashboard');
            navigate('/author/dashboard');
            return;
          }

          console.log('[CALLBACK] is_author = false, blocking');
          await supabase.auth.signOut();
          setBlockedEmail(email);
          setBlockReason('not_author');
          setPhase('unauthorized');
          return;
        } catch (e) {
          console.warn('Could not fetch user record:', e.message);
          await supabase.auth.signOut();
          navigate('/?error=auth_failed');
          return;
        }
      }

      // ── Student login — land on home ──────────────────────
      console.log('[CALLBACK] student login, redirecting to /');
      navigate('/');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[CALLBACK] onAuthStateChange event:', event);
      if (event === 'SIGNED_IN') process(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[CALLBACK] getSession session exists:', !!session);
      if (session) process(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTryAgain = async (intent) => {
    localStorage.setItem('login_intent', intent);
    sessionStorage.setItem('login_intent', intent);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
          ...(intent !== 'admin' && { hd: 'dlsl.edu.ph' }),
        },
      },
    });
  };

  // ── UNAUTHORIZED SCREEN ────────────────────────────────────
  if (phase === 'unauthorized') {
    const messages = {
      admin: {
        title: 'Unauthorized Access',
        desc: 'The Google account you selected does not have admin privileges for CITE-TMS.',
        tryAgainIntent: 'admin',
      },
      domain: {
        title: 'Invalid Account',
        desc: `Only @dlsl.edu.ph Google accounts are authorized. "${blockedEmail}" is not a valid institutional account.`,
        tryAgainIntent: 'student',
      },
      not_author: {
        title: 'Not an Author Yet',
        desc: `Your account (${blockedEmail}) has not been granted author access. You need to upload at least one study and have it approved by an admin.`,
        tryAgainIntent: 'author',
      },
    };

    const msg = messages[blockReason] || messages.domain;

    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .ua-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top, #fff5f5 0%, #ffffff 60%); font-family: 'DM Sans', system-ui, sans-serif; padding: 24px; }
          .ua-card { background: #fff; border: 1px solid #fecaca; border-radius: 20px; padding: 44px 40px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 8px 40px rgba(220,38,38,0.08); }
          .ua-icon { width: 60px; height: 60px; border-radius: 50%; background: #fef2f2; border: 2px solid #fecaca; display: flex; align-items: center; justify-content: center; margin: 0 auto 22px; }
          .ua-title { font-family: 'DM Serif Display', serif; font-size: 25px; color: #111827; margin-bottom: 10px; }
          .ua-desc { font-size: 13.5px; color: #6b7280; line-height: 1.65; margin-bottom: 24px; }
          .ua-allowed { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; text-align: left; }
          .ua-allowed-label { font-size: 10.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #15803d; margin-bottom: 10px; }
          .ua-allowed-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #166534; padding: 3px 0; }
          .ua-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; flex-shrink: 0; }
          .ua-btn { width: 100%; padding: 12px; background: #111827; color: #fff; border: none; border-radius: 10px; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; }
          .ua-btn:hover { background: #1f2937; }
          .ua-ghost { width: 100%; padding: 11px; background: transparent; color: #6b7280; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 13.5px; font-weight: 500; font-family: inherit; cursor: pointer; transition: all 0.15s; }
          .ua-ghost:hover { border-color: #9ca3af; color: #374151; }
        `}</style>
        <div className="ua-page">
          <div className="ua-card">
            <div className="ua-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="ua-title">{msg.title}</div>
            <div className="ua-desc">{msg.desc}</div>

            {blockReason === 'admin' && (
              <div className="ua-allowed">
                <div className="ua-allowed-label">Authorized admin accounts</div>
                {ALLOWED_ADMIN_EMAILS.map(e => (
                  <div key={e} className="ua-allowed-row"><div className="ua-dot" />{e}</div>
                ))}
              </div>
            )}

            <button className="ua-btn" onClick={() => handleTryAgain(msg.tryAgainIntent)}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={16} height={16} alt="G" />
              Try a different account
            </button>
            <button className="ua-ghost" onClick={() => navigate('/')}>← Back to homepage</button>
          </div>
        </div>
      </>
    );
  }

  // ── LOADING SCREEN ─────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', gap: 12,
      background: 'radial-gradient(circle at top, #f0fdf4 0, #ffffff 52%)',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        border: '3px solid #bbf7d0', borderTopColor: '#166534',
        animation: 'spin 0.9s ease-in-out infinite'
      }} />
      <p style={{ color: '#4b5563', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Signing you in…
      </p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}