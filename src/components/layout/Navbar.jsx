import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Settings, PenLine, Lock, FileText, User, LogOut } from 'lucide-react';

export default function Navbar({ onLoginClick }) {
  const { user, profile, logout, isAuthor } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!confirmLogoutOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setConfirmLogoutOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmLogoutOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/');
  };

  const handleNavClick = (target) => {
    if (target === 'papers') {
      navigate('/papers');
      return;
    }
    if (!user) {
      onLoginClick?.();
      return;
    }
    if (target === 'bookmark') navigate('/bookmarks');
    else if (target === 'requests') navigate('/requests');
  };

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  // Role badge — use is_author flag for badge, not the role field
  const isAdmin = profile?.role === 'admin';
  const roleBadge = isAdmin
    ? { label: 'Admin',   color: '#7c3aed', bg: '#f5f3ff' }
    : isAuthor
    ? { label: 'Author',  color: '#b45309', bg: '#fffbeb' }
    : user
    ? { label: 'Student', color: '#006400', bg: '#f0faf0' }
    : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

        .nb-nav-link {
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; color: #6b7280;
          padding: 6px 10px; border-radius: 8px;
          transition: color 0.15s, background 0.15s;
          display: flex; align-items: center; gap: 6px;
          white-space: nowrap;
        }
        .nb-nav-link:hover { color: #111827; background: #f9fafb; }
        .nb-nav-link.active { color: #9b0000; background: #fef2f2; font-weight: 600; }

        .nb-signin-btn {
          background: none; border: 1.5px solid #e5e7eb;
          color: #374151; font-weight: 600; font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          padding: 7px 18px; border-radius: 50px; cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .nb-signin-btn:hover { border-color: #9b0000; color: #9b0000; background: #fef2f2; }

        .nb-avatar-img {
          width: 30px; height: 30px; border-radius: 50%;
          object-fit: cover; border: 2px solid #e5e7eb; flex-shrink: 0;
        }
        .nb-avatar-initials {
          width: 30px; height: 30px; border-radius: 50%;
          background: #9b0000; color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fecaca; flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-user-btn {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1.5px solid #e5e7eb;
          border-radius: 20px; padding: 4px 12px 4px 5px;
          cursor: pointer; transition: all 0.2s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-user-btn:hover { border-color: #9b0000; background: #fef2f2; }
        .nb-user-name {
          font-size: 13px; font-weight: 500; color: #374151;
          max-width: 110px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .nb-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          min-width: 230px; z-index: 999; overflow: hidden;
          animation: nbDropIn 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes nbDropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nb-dropdown-header {
          padding: 16px 16px 14px;
          border-bottom: 1px solid #f3f4f6;
          display: flex; align-items: center; gap: 10px;
        }
        .nb-dropdown-name {
          font-size: 14px; font-weight: 600; color: #111827;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;
        }
        .nb-dropdown-email {
          font-size: 11px; color: #9ca3af; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-role-badge {
          display: inline-block; margin-top: 5px;
          font-size: 10px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; padding: 2px 9px; border-radius: 20px;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; font-size: 13px; color: #374151;
          cursor: pointer; transition: background 0.15s;
          border: none; background: none; width: 100%; text-align: left;
          font-family: 'DM Sans', sans-serif; font-weight: 400;
        }
        .nb-dropdown-item:hover { background: #f9fafb; }
        .nb-dropdown-item.danger { color: #dc2626; }
        .nb-dropdown-item.danger:hover { background: #fff5f5; }

        /* Locked author item — grayed out, not clickable */
        .nb-dropdown-item.locked {
          color: #9ca3af;
          cursor: not-allowed;
        }
        .nb-dropdown-item.locked:hover { background: #f9fafb; }
        .nb-lock-tooltip {
          margin-left: auto;
          font-size: 10px;
          color: #9ca3af;
          background: #f3f4f6;
          border-radius: 6px;
          padding: 2px 7px;
          white-space: nowrap;
        }

        .nb-divider { height: 1px; background: #f3f4f6; }

        .nb-modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
          z-index: 2000; display: flex; align-items: center;
          justify-content: center; padding: 20px;
        }
        .nb-modal {
          width: 100%; max-width: 420px; background: #fff;
          border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          border: 1px solid #e5e7eb; overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-modal-header { padding: 16px 18px 10px; font-size: 15px; font-weight: 600; color: #111827; }
        .nb-modal-body { padding: 0 18px 16px; font-size: 13px; color: #6b7280; line-height: 1.5; }
        .nb-modal-actions {
          display: flex; gap: 10px; justify-content: flex-end;
          padding: 14px 18px 16px; border-top: 1px solid #f3f4f6; background: #fff;
        }
        .nb-modal-btn {
          border-radius: 10px; padding: 9px 12px; font-size: 13px; font-weight: 600;
          border: 1px solid #e5e7eb; background: #fff; color: #111827;
          cursor: pointer; transition: background 0.15s, border-color 0.15s;
        }
        .nb-modal-btn:hover { background: #f9fafb; border-color: #d1d5db; }
        .nb-modal-btn.danger { background: #dc2626; border-color: #dc2626; color: #fff; }
        .nb-modal-btn.danger:hover { background: #b91c1c; border-color: #b91c1c; }
      `}</style>

      <nav style={styles.nav}>
        <div style={styles.leftSection}>
          <button
            type="button"
            style={styles.logoButton}
            onClick={() => navigate('/')}
            aria-label="Go to home"
          >
            <div style={styles.logoPlaceholder}>
              <span style={styles.logoText}>CITE</span>
            </div>
          </button>

          <div style={styles.links}>
            <button type="button" className={`nb-nav-link${location.pathname.startsWith('/papers') ? ' active' : ''}`} onClick={() => handleNavClick('papers')}>
              Papers
            </button>
            <button type="button" className={`nb-nav-link${location.pathname.startsWith('/bookmarks') ? ' active' : ''}`} onClick={() => handleNavClick('bookmark')}>
              Bookmark
            </button>
            <button type="button" className={`nb-nav-link${location.pathname.startsWith('/requests') ? ' active' : ''}`} onClick={() => handleNavClick('requests')}>
              Requests
            </button>
          </div>
        </div>

        <div style={{ ...styles.rightSection, position: 'relative' }} ref={dropdownRef}>
          {user ? (
            <>
              <button className="nb-user-btn" onClick={() => setDropdownOpen((o) => !o)}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="nb-avatar-img" referrerPolicy="no-referrer" />
                  : <div className="nb-avatar-initials">{initials}</div>
                }
                <span className="nb-user-name">{displayName.split(' ')[0]}</span>
              </button>

              {dropdownOpen && (
                <div className="nb-dropdown">
                  {/* ── Header ── */}
                  <div className="nb-dropdown-header">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="nb-avatar-img" style={{ width: 36, height: 36 }} referrerPolicy="no-referrer" />
                      : <div className="nb-avatar-initials" style={{ width: 36, height: 36, fontSize: 13 }}>{initials}</div>
                    }
                    <div style={{ minWidth: 0 }}>
                      <div className="nb-dropdown-name">{displayName}</div>
                      <div className="nb-dropdown-email">{user.email}</div>
                      {roleBadge && (
                        <span className="nb-role-badge" style={{ color: roleBadge.color, background: roleBadge.bg }}>
                          {roleBadge.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Admin Dashboard ── */}
                  {isAdmin && (
                    <button className="nb-dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/admin'); }}>
                      <Settings size={14} />&nbsp;Admin Dashboard
                    </button>
                  )}

                  {/* ── Author Dashboard — locked or unlocked ── */}
                  {!isAdmin && (
                    isAuthor ? (
                      <button
                        className="nb-dropdown-item"
                        onClick={() => { setDropdownOpen(false); navigate('/author/dashboard'); }}
                      >
                        <PenLine size={14} />&nbsp;Author Dashboard
                      </button>
                    ) : (
                      <button className="nb-dropdown-item locked" disabled title="Upload a paper and get approved by admin to unlock">
                        <Lock size={14} />&nbsp;Author Dashboard
                        <span className="nb-lock-tooltip">Not yet author</span>
                      </button>
                    )
                  )}

                  {/* ── Upload paper (students only, not yet author) ── */}
                  {!isAdmin && !isAuthor && (
                    <button
                      className="nb-dropdown-item"
                      onClick={() => { setDropdownOpen(false); navigate('/student/upload'); }}
                    >
                      <FileText size={14} />&nbsp;Become an Author
                    </button>
                  )}

                  <button className="nb-dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/profile'); }}>
                    <User size={14} />&nbsp;My Profile
                  </button>

                  <div className="nb-divider" />

                  <button
                    className="nb-dropdown-item danger"
                    onClick={() => { setDropdownOpen(false); setConfirmLogoutOpen(true); }}
                  >
                    <LogOut size={14} />&nbsp;Sign Out
                  </button>
                </div>
              )}
            </>
          ) : (
            <button className="nb-signin-btn" onClick={onLoginClick}>
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* ── Logout confirm modal ── */}
      {confirmLogoutOpen && (
        <div
          className="nb-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmLogoutOpen(false); }}
        >
          <div className="nb-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="nb-modal-header">Sign out?</div>
            <div className="nb-modal-body">
              Are you sure you want to sign out of your account?
            </div>
            <div className="nb-modal-actions">
              <button className="nb-modal-btn" onClick={() => setConfirmLogoutOpen(false)}>
                Cancel
              </button>
              <button
                className="nb-modal-btn danger"
                onClick={async () => { setConfirmLogoutOpen(false); await handleLogout(); }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  nav: {
    position: 'fixed', top: 0, left: 0,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 20px', backgroundColor: '#ffffff',
    borderBottom: '1px solid #ebebeb', width: '100%', boxSizing: 'border-box',
    zIndex: 100,
  },
  leftSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  logoButton: {
    background: 'none', border: 'none', padding: 0,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    marginRight: '8px',
  },
  logoPlaceholder: {
    width: 34, height: 34, borderRadius: 8,
    background: 'linear-gradient(135deg, #9b0000, #c0392b)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  logoText: {
    color: '#fff', fontSize: '9px', fontWeight: '800',
    letterSpacing: '0.5px', fontFamily: "'DM Sans', sans-serif",
    userSelect: 'none',
  },
  links: { display: 'flex', gap: '4px' },
  linkButton: {
    textDecoration: 'none', color: '#5f6368', fontSize: '13px',
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'none', border: 'none', padding: '6px 10px',
    cursor: 'pointer', borderRadius: '8px',
    fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
    transition: 'color 0.15s, background 0.15s',
  },
  rightSection: { display: 'flex', alignItems: 'center' },
};