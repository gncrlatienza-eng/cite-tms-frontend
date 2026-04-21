import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ALLOWED_ADMIN_EMAILS } from '../../utils/constants';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [blockedEmail, setBlockedEmail] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    // ── Read intent from URL first (reliable on mobile), fallback to storage ──
    const urlParams = new URLSearchParams(window.location.search);
    const intent = urlParams.get('intent')
      || sessionStorage.getItem('login_intent')
      || localStorage.getItem('login_intent');

    sessionStorage.removeItem('login_intent');
    localStorage.removeItem('login_intent');

    const process = async (session) => {
      if (handled.current) return;
      handled.current = true;

      if (!session) { navigate('/'); return; }

      const email = session.user.email;
      console.log('🔐 [AuthCallback] Processing login for:', email);
      console.log('🎯 [AuthCallback] Login intent:', intent);

      // ── Check has_accepted_terms ──────────────────────────────────────
      const { data: termsRecord } = await supabase
        .from('users')
        .select('has_accepted_terms, is_author, role')
        .or(`email.eq.${email},secondary_email.eq.${email}`)
        .maybeSingle();

      if (termsRecord && termsRecord.has_accepted_terms === false) {
        let redirectAfter = '/';
        if (intent === 'admin' || ALLOWED_ADMIN_EMAILS.includes(email) || termsRecord.role === 'admin') {
          redirectAfter = '/admin/dashboard';
        } else if (termsRecord.is_author) {
          redirectAfter = '/author/dashboard';
        }
        navigate(`/terms?new=true&redirect=${encodeURIComponent(redirectAfter)}`);
        return;
      }

      // ── Admin login via primary email ─────────────────────────────────
      if (ALLOWED_ADMIN_EMAILS.includes(email)) {
        localStorage.setItem('active_role', 'admin');
        navigate('/admin/dashboard');
        return;
      }

      // ── Explicit admin intent but not in allowed list ─────────────────
      if (intent === 'admin') {
        await supabase.auth.signOut({ scope: 'global' });
        setBlockedEmail(email);
        setBlockReason('admin');
        setPhase('unauthorized');
        return;
      }

      // ── Non-DLSL email (secondary email / external) ───────────────────
      if (!email.endsWith('@dlsl.edu.ph')) {
        const { data: secondaryUser } = await supabase
          .from('users')
          .select('is_author, role')
          .eq('secondary_email', email)
          .maybeSingle();

        if (secondaryUser) {
          // ── Admin via secondary email ──
          if (secondaryUser.role === 'admin') {
            localStorage.setItem('active_role', 'admin');
            navigate('/admin/dashboard');
            return;
          }
          // ── Author via secondary email — always author, no intent needed ──
          if (secondaryUser.is_author) {
            localStorage.setItem('active_role', 'author');
            navigate('/author/dashboard');
            return;
          }
          // ── Secondary email exists but is NOT author or admin — block ──
          await supabase.auth.signOut({ scope: 'global' });
          setBlockedEmail(email);
          setBlockReason('domain');
          setPhase('unauthorized');
          return;
        }

        // ── Secondary email not found in DB at all ──
        await supabase.auth.signOut({ scope: 'global' });
        setBlockedEmail(email);
        setBlockReason('domain');
        setPhase('unauthorized');
        return;
      }

      // ── DLSL email ────────────────────────────────────────────────────
      const { data: dlslUser } = await supabase
        .from('users')
        .select('id, role, is_author')
        .eq('email', email)
        .maybeSingle();

      if (!dlslUser) {
        await supabase.auth.signOut({ scope: 'global' });
        setBlockedEmail(email);
        setBlockReason('domain');
        setPhase('unauthorized');
        return;
      }

      // ── Explicit author intent — enforce author check ─────────────────
      if (intent === 'author') {
        if (dlslUser.is_author) {
          localStorage.setItem('active_role', 'author');
          navigate('/author/dashboard');
          return;
        }
        await supabase.auth.signOut({ scope: 'global' });
        setBlockedEmail(email);
        setBlockReason('not_author');
        setPhase('unauthorized');
        return;
      }

      // ── Explicit student intent OR no intent ──────────────────────────
      if (intent === 'student' || !intent) {
        const postLoginRedirect = sessionStorage.getItem('post_login_redirect');
        sessionStorage.removeItem('post_login_redirect');
        const safeFallback =
          postLoginRedirect &&
          postLoginRedirect !== '/' &&
          !postLoginRedirect.startsWith('/author') &&
          !postLoginRedirect.startsWith('/admin')
            ? postLoginRedirect
            : '/';
        localStorage.setItem('active_role', 'student');
        navigate(safeFallback);
        return;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') process(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) process(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Also pass intent via URL in handleTryAgain for mobile reliability ──
  const handleTryAgain = async (intent) => {
    handled.current = false;
    setPhase('loading');
    setBlockedEmail('');
    setBlockReason('');

    await supabase.auth.signOut({ scope: 'global' });
    localStorage.setItem('login_intent', intent);
    sessionStorage.setItem('login_intent', intent);

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?intent=${intent}`,
        queryParams: {
          prompt: 'select_account',
          ...(intent !== 'admin' && intent !== 'author' && { hd: 'dlsl.edu.ph' }),
        },
      },
    });
  };

  if (phase === 'unauthorized') {
    const messages = {
      admin: {
        title: 'Unauthorized Access',
        desc: 'The Google account you selected does not have admin privileges for CITE-TMS.',
        tryAgainIntent: 'admin',
      },
      domain: {
        title: 'Invalid Account',
        desc: `Only @dlsl.edu.ph accounts or registered secondary emails are authorized. "${blockedEmail}" is not recognized.`,
        tryAgainIntent: 'student',
      },
      not_author: {
        title: 'Not an Author Yet',
        desc: `Your account (${blockedEmail}) has not been granted author access. Upload a study and have it approved by an admin.`,
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
          .ua-title { font-family: 'Schibsted Grotesk', serif; font-size: 25px; color: #111827; margin-bottom: 10px; }
          .ua-desc { font-size: 13.5px; color: #6b7280; line-height: 1.65; margin-bottom: 24px; }
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
            <button className="ua-btn" onClick={() => handleTryAgain(msg.tryAgainIntent)}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={16} height={16} alt="G" />
              Try a different account
            </button>
            <button className="ua-ghost" onClick={async () => {
              await supabase.auth.signOut({ scope: 'global' });
              window.location.href = '/';
            }}>← Back to homepage</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', gap: 12,
      background: 'radial-gradient(circle at top, #f0fdf4 0, #ffffff 52%)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        border: '3px solid #bbf7d0', borderTopColor: '#166534',
        animation: 'spin 0.9s ease-in-out infinite',
      }} />
      <p style={{ color: '#4b5563', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Signing you in…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}