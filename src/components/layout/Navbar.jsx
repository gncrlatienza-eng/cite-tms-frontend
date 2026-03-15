import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onLoginClick }) {
  const { user, profile, logout } = useAuth();
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

    if (target === 'bookmark') {
      navigate('/bookmarks');
    } else if (target === 'requests') {
      navigate('/requests');
    }
  };

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const displayName = profile?.full_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const fromProfile =
    profile?.role ||
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    null;

  const effectiveRole =
    fromProfile || (user?.email?.endsWith('@dlsl.edu.ph') ? 'student' : null);

  const roleBadge = effectiveRole === 'admin'   ? { label: 'Admin',   color: '#7c3aed', bg: '#f5f3ff' }
                  : effectiveRole === 'faculty' ? { label: 'Author', color: '#b45309', bg: '#fffbeb' }
                  : effectiveRole === 'student' ? { label: 'Student', color: '#006400', bg: '#f0faf0' }
                  : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

        .nb-avatar-img {
          width: 30px; height: 30px; border-radius: 50%;
          object-fit: cover; border: 2px solid #e5e7eb; flex-shrink: 0;
        }
        .nb-avatar-initials {
          width: 30px; height: 30px; border-radius: 50%;
          background: #006400; color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #d1fae5; flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-user-btn {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1.5px solid #e5e7eb;
          border-radius: 20px; padding: 4px 12px 4px 5px;
          cursor: pointer; transition: all 0.2s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-user-btn:hover { border-color: #006400; background: #f0faf0; }
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
        .nb-divider { height: 1px; background: #f3f4f6; }

        .nb-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .nb-modal {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .nb-modal-header {
          padding: 16px 18px 10px;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }
        .nb-modal-body {
          padding: 0 18px 16px;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }
        .nb-modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding: 14px 18px 16px;
          border-top: 1px solid #f3f4f6;
          background: #fff;
        }
        .nb-modal-btn {
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #111827;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.05s;
        }
        .nb-modal-btn:hover { background: #f9fafb; border-color: #d1d5db; }
        .nb-modal-btn:active { transform: translateY(1px); }
        .nb-modal-btn.danger {
          background: #dc2626;
          border-color: #dc2626;
          color: #fff;
        }
        .nb-modal-btn.danger:hover { background: #b91c1c; border-color: #b91c1c; }
      `}</style>

      <nav style={styles.nav}>
        <div style={styles.leftSection}>
          <div style={styles.links}>
            <button
              type="button"
              style={styles.linkButton}
              onClick={() => handleNavClick('papers')}
            >
              Papers
            </button>
            <button
              type="button"
              style={styles.linkButton}
              onClick={() => handleNavClick('bookmark')}
            >
              Bookmark
            </button>
            <button
              type="button"
              style={styles.linkButton}
              onClick={() => handleNavClick('requests')}
            >
              Requests
            </button>
          </div>
        </div>

        <div style={{ ...styles.rightSection, position: 'relative' }} ref={dropdownRef}>
          {user ? (
            <>
              {/* Avatar button — toggles dropdown */}
              <button className="nb-user-btn" onClick={() => setDropdownOpen(o => !o)}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="nb-avatar-img" />
                  : <div className="nb-avatar-initials">{initials}</div>
                }
                <span className="nb-user-name">{displayName.split(' ')[0]}</span>
              </button>

              {/* Dropdown — NO stopPropagation so button clicks fire normally */}
              {dropdownOpen && (
                <div className="nb-dropdown">
                  <div className="nb-dropdown-header">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="nb-avatar-img" style={{ width: 36, height: 36 }} />
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

                  {profile?.role === 'admin' && (
                    <button className="nb-dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/admin'); }}>
                      ⚙️ &nbsp;Admin Dashboard
                    </button>
                  )}

                  <button className="nb-dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/profile'); }}>
                    👤 &nbsp;My Profile
                  </button>

                  <div className="nb-divider" />

                  <button
                    className="nb-dropdown-item danger"
                    onClick={() => { setDropdownOpen(false); setConfirmLogoutOpen(true); }}
                  >
                    ↪ &nbsp;Sign Out
                  </button>
                </div>
              )}
            </>
          ) : (
            <button style={styles.signInButton} onClick={onLoginClick}>
              SIGN IN
            </button>
          )}
        </div>
      </nav>

      {confirmLogoutOpen && (
        <div
          className="nb-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm sign out"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmLogoutOpen(false);
          }}
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
                onClick={async () => {
                  setConfirmLogoutOpen(false);
                  await handleLogout();
                }}
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
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 20px', backgroundColor: '#ffffff',
    borderBottom: '1px solid #ebebeb', width: '100%', boxSizing: 'border-box',
  },
  leftSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  links: { display: 'flex', gap: '25px' },
  link: {
    textDecoration: 'none', color: '#5f6368', fontSize: '13px',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  linkButton: {
    textDecoration: 'none', color: '#5f6368', fontSize: '13px',
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  rightSection: { display: 'flex', alignItems: 'center' },
  signInButton: {
    background: 'none', border: 'none', color: '#5f6368',
    fontWeight: '500', fontSize: '13px', cursor: 'pointer', padding: '5px 10px',
  },
};