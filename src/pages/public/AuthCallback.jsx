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
  const blocked = useRef(false); // ← prevents re-entry after signOut

  const block = async (email, reason) => {
    blocked.current = true;
    await supabase.auth.signOut({ scope: 'global' });
    setBlockedEmail(email);
    setBlockReason(reason);
    setPhase('unauthorized');
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const intent = urlParams.get('intent')
      || sessionStorage.getItem('login_intent')
      || localStorage.getItem('login_intent');

    sessionStorage.removeItem('login_intent');
    localStorage.removeItem('login_intent');

    const process = async (session) => {
      if (handled.current) return;
      if (blocked.current) return;
      handled.current = true;

      if (!session) { navigate('/'); return; }

      const email = session.user.email;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 [AuthCallback] email:', email);
      console.log('🎯 [AuthCallback] intent:', intent);
      console.log('📌 [AuthCallback] is DLSL email:', email.endsWith('@dlsl.edu.ph'));

      // ── Check has_accepted_terms ──────────────────────────────────────
      const { data: termsRecord, error: termsError } = await supabase
        .from('users')
        .select('has_accepted_terms, is_author, role')
        .or(`email.eq.${email},secondary_email.eq.${email}`)
        .maybeSingle();

      console.log('📋 [AuthCallback] termsRecord:', termsRecord);
      console.log('📋 [AuthCallback] termsError:', termsError);

      if (termsRecord && termsRecord.has_accepted_terms === false) {
        let redirectAfter = '/';

        if (intent === 'admin' || ALLOWED_ADMIN_EMAILS.includes(email) || termsRecord.role === 'admin') {
          redirectAfter = '/admin/dashboard';
          localStorage.setItem('active_role', 'admin');
        } else if (termsRecord.is_author) {
          redirectAfter = '/author/dashboard';
          localStorage.setItem('active_role', 'author');
        } else {
          localStorage.setItem('active_role', 'student');
        }

        console.log('📜 [AuthCallback] terms not accepted → redirect to:', redirectAfter);
        navigate(`/terms?new=true&redirect=${encodeURIComponent(redirectAfter)}`);
        return;
      }

      // ── Admin login via primary email ─────────────────────────────────
      if (ALLOWED_ADMIN_EMAILS.includes(email)) {
        console.log('👑 [AuthCallback] admin via primary email → /admin/dashboard');
        localStorage.setItem('active_role', 'admin');
        navigate('/admin/dashboard');
        return;
      }

      // ── Explicit admin intent but not in allowed list ─────────────────
      if (intent === 'admin') {
        console.log('🚫 [AuthCallback] admin intent but not in allowed list → unauthorized');
        await block(email, 'admin');
        return;
      }

      // ── Non-DLSL email (secondary email / external) ───────────────────
      if (!email.endsWith('@dlsl.edu.ph')) {
        console.log('🔍 [AuthCallback] non-DLSL email → checking secondary_email in DB...');

        const { data: secondaryUser, error: secondaryError } = await supabase
          .from('users')
          .select('is_author, role')
          .eq('secondary_email', email)
          .maybeSingle();

        console.log('👤 [AuthCallback] secondaryUser:', secondaryUser);
        console.log('👤 [AuthCallback] secondaryError:', secondaryError);

        if (secondaryUser) {
          console.log('✅ [AuthCallback] secondary user found');
          console.log('   is_author:', secondaryUser.is_author);
          console.log('   role:', secondaryUser.role);

          if (secondaryUser.role === 'admin') {
            console.log('👑 [AuthCallback] admin via secondary email → /admin/dashboard');
            localStorage.setItem('active_role', 'admin');
            navigate('/admin/dashboard');
            return;
          }
          if (secondaryUser.is_author) {
            console.log('✍️  [AuthCallback] author via secondary email → /author/dashboard');
            localStorage.setItem('active_role', 'author');
            navigate('/author/dashboard');
            return;
          }
          console.log('🚫 [AuthCallback] secondary user found but not author/admin → block');
          await block(email, 'domain');
          return;
        }

        console.log('🚫 [AuthCallback] secondary email not found in DB → block');
        await block(email, 'domain');
        return;
      }

      // ── DLSL email ────────────────────────────────────────────────────
      console.log('🏫 [AuthCallback] DLSL email → checking primary users table...');

      const { data: dlslUser, error: dlslError } = await supabase
        .from('users')
        .select('id, role, is_author')
        .eq('email', email)
        .maybeSingle();

      console.log('🏫 [AuthCallback] dlslUser:', dlslUser);
      console.log('🏫 [AuthCallback] dlslError:', dlslError);

      if (!dlslUser) {
        console.log('🚫 [AuthCallback] DLSL user not found in DB → block');
        await block(email, 'domain');
        return;
      }

      // ── Explicit author intent ────────────────────────────────────────
      if (intent === 'author') {
        console.log('✍️  [AuthCallback] author intent → is_author:', dlslUser.is_author);
        if (dlslUser.is_author) {
          localStorage.setItem('active_role', 'author');
          navigate('/author/dashboard');
          return;
        }
        console.log('🚫 [AuthCallback] not an author → block');
        await block(email, 'not_author');
        return;
      }

      // ── Student intent or no intent ───────────────────────────────────
      console.log('🎓 [AuthCallback] student/no intent branch hit');

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
        console.log('💾 [AuthCallback] active_role set to: student');
        console.log('➡️  [AuthCallback] navigating to:', safeFallback);
        navigate(safeFallback);
        return;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (blocked.current) return; // ← ignore all events once blocked
      if (event === 'SIGNED_IN') process(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (blocked.current) return;
      if (session) process(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTryAgain = async (intent) => {
    handled.current = false;
    blocked.current = false; // ← reset so new login attempt can proceed
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