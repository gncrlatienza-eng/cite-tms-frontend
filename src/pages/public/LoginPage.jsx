import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";

export default function LoginPage({ onClose }) {
  const [mounted, setMounted] = useState(false);

  // 'student' | 'author' | 'admin'
  const [accountType, setAccountType] = useState("student");
  // 'existing' | 'new'
  const [authMode, setAuthMode] = useState("existing");

  // Admin-only email/password login (kept separate because of extra checks)
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // New user (create account)
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newError, setNewError] = useState("");
  const [newLoading, setNewLoading] = useState(false);

  // Existing user (email + password)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await authService.loginWithGoogle();
      // Redirect happens via AuthCallback + AuthContext
    } catch (error) {
      console.error("Login failed:", error.message);
    }
  };

  const handleAdminGoogleLogin = async () => {
    try {
      await authService.loginAsAdminWithGoogle();
      // AuthCallback already redirects to /admin when intent=admin
    } catch (error) {
      setAdminError(error.message);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      await authService.loginAsAdmin(adminEmail, adminPassword);
      navigate("/admin");
      onClose?.();
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };

  const resolveRoleForSignup = () => {
    if (accountType === "admin") return "admin";
    if (accountType === "author") return "faculty"; // map "Author" to faculty
    return "student";
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setNewError("");
    setNewLoading(true);
    try {
      const role = resolveRoleForSignup();
      await authService.signupWithEmail({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role,
      });
      onClose?.();
    } catch (error) {
      setNewError(error.message || "Failed to create account.");
    } finally {
      setNewLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await authService.loginWithEmail(loginEmail.trim(), loginPassword);
      if (accountType === "admin") {
        // Non-admins will still be blocked by backend/admin checks
        navigate("/admin");
      }
      onClose?.();
    } catch (error) {
      setLoginError(error.message || "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');

        .login-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .login-backdrop.mounted { opacity: 1; }

        .login-wrapper {
          display: flex;
          width: 780px;
          max-width: 100%;
          min-height: 480px;
          max-height: 90vh;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 70px rgba(0,0,0,0.28);
          transform: translateY(20px) scale(0.97);
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          background: #fff;
        }
        .login-backdrop.mounted .login-wrapper {
          transform: translateY(0) scale(1);
        }

        .close-btn {
          position: absolute;
          top: 14px; right: 14px;
          z-index: 10;
          width: 30px; height: 30px;
          border-radius: 50%;
          background: rgba(0,0,0,0.08);
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #374151;
          font-size: 14px;
          transition: background 0.2s;
        }
        .close-btn:hover { background: rgba(0,0,0,0.15); }

        .left-panel {
          flex: 1.1;
          background: linear-gradient(145deg, #004d00 0%, #006400 40%, #1a8a1a 75%, #145214 100%);
          padding: 52px 44px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .left-panel::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .left-panel::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -40px;
          width: 220px; height: 220px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }
        .orb { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.04); }
        .orb-1 { width: 140px; height: 140px; top: 40%; left: 60%; }
        .orb-2 { width: 80px; height: 80px; top: 20%; left: 15%; }

        .left-logo {
          display: flex; align-items: center; gap: 10px; z-index: 1;
        }
        .left-logo-badge {
          width: 36px; height: 36px;
          border-radius: 8px;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13px; color: #fff;
        }
        .left-logo-text {
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.8);
          letter-spacing: 1.5px; text-transform: uppercase;
        }
        .left-content { z-index: 1; }
        .left-heading {
          font-family: 'Playfair Display', serif;
          font-size: 36px; font-weight: 700;
          color: #fff; line-height: 1.2; margin-bottom: 16px;
        }
        .left-desc {
          font-size: 14px; color: rgba(255,255,255,0.65);
          line-height: 1.7; max-width: 280px; font-weight: 300;
        }
        .left-footer {
          z-index: 1; font-size: 12px;
          color: rgba(255,255,255,0.35); font-weight: 300;
        }

        .right-panel {
          flex: 0.9;
          background: #fff;
          padding: 36px 40px 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .toggle-row {
          display: flex;
          background: #f3f4f6;
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 32px;
          gap: 4px;
        }
        .toggle-btn {
          flex: 1; padding: 9px;
          border: none; border-radius: 7px;
          font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s ease;
          font-family: 'DM Sans', sans-serif;
          background: transparent; color: #9ca3af;
        }
        .toggle-btn.active {
          background: #fff; color: #111827;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }

        .right-eyebrow {
          font-size: 11px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase;
          color: #cc0000; margin-bottom: 8px;
        }
        .right-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px; font-weight: 600;
          color: #111827; margin-bottom: 6px;
        }
        .right-subtitle {
          font-size: 13px; color: #9ca3af;
          margin-bottom: 28px; font-weight: 300; line-height: 1.5;
        }

        .divider-row {
          display: flex; align-items: center; gap: 10px; margin: 12px 0;
        }
        .or-divider {
          display: flex; align-items: center; gap: 10px;
          margin: 12px 0;
        }
        .divider-line { flex: 1; height: 1px; background: #e5e7eb; }
        .divider-text {
          font-size: 11px; color: #d1d5db;
          letter-spacing: 1px; text-transform: uppercase;
        }

        .google-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; width: 100%; padding: 13px 20px;
          background: #fff; border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500; color: #374151;
          cursor: pointer; transition: all 0.2s ease;
        }
        .google-btn:hover {
          border-color: #006400;
          box-shadow: 0 4px 16px rgba(0,100,0,0.12);
          transform: translateY(-1px);
        }
        .google-icon { width: 20px; height: 20px; }

        .admin-form { display: flex; flex-direction: column; gap: 12px; }
        .form-field { display: flex; flex-direction: column; gap: 6px; }
        .form-label {
          font-size: 12px; font-weight: 500;
          color: #6b7280; letter-spacing: 0.5px;
        }
        .form-input {
          padding: 11px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #111827; outline: none;
          transition: border-color 0.2s;
          background: #fff;
        }
        .form-input:focus { border-color: #006400; }
        .form-input:disabled { background: #f9fafb; color: #9ca3af; }

        .admin-submit {
          padding: 13px;
          background: #006400; color: #fff;
          border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: background 0.2s;
          margin-top: 4px;
        }
        .admin-submit:hover:not(:disabled) { background: #004d00; }
        .admin-submit:disabled { background: #9ca3af; cursor: not-allowed; }

        .admin-error {
          font-size: 12px; color: #cc0000;
          text-align: center;
          padding: 8px 12px;
          background: #fff5f5;
          border-radius: 6px;
          border: 1px solid #fecaca;
        }

        .right-note {
          margin-top: 16px;
          font-size: 11.5px; color: #d1d5db;
          text-align: center; line-height: 1.6; font-weight: 300;
        }
        .right-note span { color: #cc0000; font-weight: 500; }

        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: 8px;
        }

        .mode-toggle {
          display: inline-flex;
          border-radius: 999px;
          padding: 2px;
          background: #f3f4f6;
          margin-bottom: 16px;
          gap: 2px;
        }
        .mode-chip {
          border: none;
          border-radius: 999px;
          font-size: 11px;
          padding: 6px 10px;
          cursor: pointer;
          background: transparent;
          color: #6b7280;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: all 0.15s ease;
        }
        .mode-chip.active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        @media (max-width: 820px) {
          .login-wrapper { flex-direction: column; width: 95vw; max-height: 95vh; }
          .left-panel { padding: 32px 26px; min-height: 180px; }
          .left-heading { font-size: 26px; }
          .right-panel { padding: 32px 24px 26px; }
        }
      `}</style>

      <div
        className={`login-backdrop ${mounted ? "mounted" : ""}`}
        onClick={handleBackdropClick}
      >
        <div className="login-wrapper">
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}

          {/* LEFT */}
          <div className="left-panel">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="left-logo">
              <div className="left-logo-badge">CT</div>
              <span className="left-logo-text">CITE-TMS</span>
            </div>
            <div className="left-content">
              <h1 className="left-heading">
                Research.<br />
                Discover.<br />
                Innovate.
              </h1>
              <p className="left-desc">
                Access the De La Salle Lipa thesis repository — a curated
                archive of academic research from the CITE department.
              </p>
            </div>
            <div className="left-footer">
              © {new Date().getFullYear()} De La Salle Lipa · CITE Department
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            <div className="toggle-row">
              <button
                className={`toggle-btn ${
                  accountType === "student" ? "active" : ""
                }`}
                onClick={() => {
                  setAccountType("student");
                  setAdminError("");
                }}
              >
                Student
              </button>
              <button
                className={`toggle-btn ${
                  accountType === "author" ? "active" : ""
                }`}
                onClick={() => {
                  setAccountType("author");
                  setAdminError("");
                }}
              >
                Author
              </button>
              <button
                className={`toggle-btn ${
                  accountType === "admin" ? "active" : ""
                }`}
                onClick={() => {
                  setAccountType("admin");
                  setAdminError("");
                }}
              >
                Admin
              </button>
            </div>

            <p className="right-eyebrow">
              {accountType === "admin"
                ? "Admin Portal"
                : accountType === "author"
                ? "Author Portal"
                : "Student Portal"}
            </p>
            <h2 className="right-title">
              {accountType === "admin"
                ? "Admin Sign In"
                : "Welcome to CITE-TMS"}
            </h2>
            <p className="right-subtitle">
              {accountType === "admin"
                ? "Use your admin credentials or sign in with Google."
                : "Sign in to access the research repository, or create a new account."}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-chip ${authMode === "existing" ? "active" : ""}`}
                  onClick={() => setAuthMode("existing")}
                >
                  Existing user
                </button>
                <button
                  type="button"
                  className={`mode-chip ${authMode === "new" ? "active" : ""}`}
                  onClick={() => setAuthMode("new")}
                >
                  New user
                </button>
              </div>
            </div>

            {authMode === "new" ? (
              <div>
                <div className="section-title">Create account</div>
                <form onSubmit={handleSignup} className="admin-form">
                  <div className="form-field">
                    <label className="form-label">Name</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Full name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      disabled={newLoading}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Gmail</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="you@dlsl.edu.ph"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      disabled={newLoading}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Create a password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={newLoading}
                    />
                  </div>
                  {newError && <p className="admin-error">{newError}</p>}
                  <button
                    type="submit"
                    className="admin-submit"
                    disabled={
                      newLoading ||
                      !newName.trim() ||
                      !newEmail.trim() ||
                      !newPassword
                    }
                  >
                    {newLoading ? "Creating account..." : "Create Account"}
                  </button>
                </form>

                <div className="or-divider">
                  <div className="divider-line" />
                  <span className="divider-text">or</span>
                  <div className="divider-line" />
                </div>

                <div className="divider-row">
                  <div className="divider-line" />
                  <span className="divider-text">Continue with</span>
                  <div className="divider-line" />
                </div>
                <button
                  className="google-btn"
                  onClick={
                    accountType === "admin"
                      ? handleAdminGoogleLogin
                      : handleGoogleLogin
                  }
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="google-icon"
                  />
                  Sign up with Google
                </button>

                {accountType === "admin" ? (
                  <p className="right-note">
                    Only authorized <span>admin accounts</span> are permitted.
                  </p>
                ) : (
                  <p className="right-note">
                    Only <span>@dlsl.edu.ph</span> accounts are authorized.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="section-title">Sign in</div>
                <form
                  onSubmit={
                    accountType === "admin"
                      ? handleAdminLogin
                      : handlePasswordLogin
                  }
                  className="admin-form"
                >
                  <div className="form-field">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder={
                        accountType === "admin"
                          ? "admin@dlsl.edu.ph"
                          : "you@dlsl.edu.ph"
                      }
                      value={accountType === "admin" ? adminEmail : loginEmail}
                      onChange={(e) =>
                        accountType === "admin"
                          ? setAdminEmail(e.target.value)
                          : setLoginEmail(e.target.value)
                      }
                      disabled={
                        accountType === "admin" ? adminLoading : loginLoading
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="••••••••"
                      value={
                        accountType === "admin"
                          ? adminPassword
                          : loginPassword
                      }
                      onChange={(e) =>
                        accountType === "admin"
                          ? setAdminPassword(e.target.value)
                          : setLoginPassword(e.target.value)
                      }
                      disabled={
                        accountType === "admin" ? adminLoading : loginLoading
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (accountType === "admin"
                          ? handleAdminLogin(e)
                          : handlePasswordLogin(e))
                      }
                    />
                  </div>
                  {(accountType === "admin" ? adminError : loginError) && (
                    <p className="admin-error">
                      {accountType === "admin" ? adminError : loginError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="admin-submit"
                    disabled={
                      accountType === "admin"
                        ? adminLoading || !adminEmail || !adminPassword
                        : loginLoading || !loginEmail || !loginPassword
                    }
                  >
                    {accountType === "admin"
                      ? adminLoading
                        ? "Signing in..."
                        : "Sign In as Admin"
                      : loginLoading
                      ? "Signing in..."
                      : "Sign In"}
                  </button>
                </form>

                <div className="or-divider">
                  <div className="divider-line" />
                  <span className="divider-text">or</span>
                  <div className="divider-line" />
                </div>

                <div className="divider-row">
                  <div className="divider-line" />
                  <span className="divider-text">Continue with</span>
                  <div className="divider-line" />
                </div>
                <button
                  className="google-btn"
                  onClick={
                    accountType === "admin"
                      ? handleAdminGoogleLogin
                      : handleGoogleLogin
                  }
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="google-icon"
                  />
                  Sign in with Google
                </button>

                {accountType === "admin" ? (
                  <p className="right-note">
                    Only authorized <span>admin accounts</span> are permitted.
                  </p>
                ) : (
                  <p className="right-note">
                    Only <span>@dlsl.edu.ph</span> accounts are authorized.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}