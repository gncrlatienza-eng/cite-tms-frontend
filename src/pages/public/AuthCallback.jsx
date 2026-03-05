import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const ALLOWED_ADMIN_EMAILS = ['cite.tms.admin@dlsl.edu.ph'];

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/'); return; }

      const { user } = session;
      const email = user.email;
      const intent = localStorage.getItem('login_intent');
      localStorage.removeItem('login_intent');
      const isAdmin = intent === 'admin';

      console.log('email:', email);
      console.log('intent:', intent);
      console.log('isAdmin:', isAdmin);

      // ✅ Track last_login on every sign in — visible in Supabase dashboard
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      if (isAdmin) {
        if (!ALLOWED_ADMIN_EMAILS.includes(email)) {
          await supabase.auth.signOut();
          navigate('/?error=unauthorized');
          return;
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();

        if (error || !userData || userData.role !== 'admin') {
          await supabase.auth.signOut();
          navigate('/?error=unauthorized');
        } else {
          navigate('/admin');
        }
      } else {
        if (!email.endsWith('@dlsl.edu.ph')) {
          await supabase.auth.signOut();
          navigate('/?error=invalid_domain');
        } else {
          navigate('/');
        }
      }
    });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      background: 'radial-gradient(circle at top, #f0fdf4 0, #ffffff 52%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '3px solid #bbf7d0',
        borderTopColor: '#166534',
        animation: 'spin 0.9s ease-in-out infinite'
      }} />
      <p style={{
        color: '#4b5563',
        fontSize: 14,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        animation: 'fadePulse 1.4s ease-in-out infinite'
      }}>
        Signing you in…
      </p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadePulse {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-1px); }
        }
      `}</style>
    </div>
  );
}