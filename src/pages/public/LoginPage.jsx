import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";

const ALLOWED_ADMIN_EMAILS = [
  "gncrlatienza@gmail.com",
  "cite.tms.admin@dlsl.edu.ph",
];

export default function LoginPage({ onClose }) {
  const [mounted, setMounted] = useState(false);
  const [accountType, setAccountType] = useState("student");
  const [authMode, setAuthMode] = useState("existing");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newError, setNewError] = useState("");
  const [newLoading, setNewLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleGoogleLogin = async () => {
    try { await authService.loginWithGoogle(); }
    catch (e) { console.error(e.message); }
  };

  const handleAdminGoogleLogin = async () => {
    setAdminError("");
    setAdminLoading(true);
    try {
      await authService.loginAsAdminWithGoogle();
    } catch (e) {
      setAdminError(e.message);
      setAdminLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setNewError("");
    setNewLoading(true);
    try {
      await authService.signupWithEmail({
        name: newName.trim(), email: newEmail.trim(),
        password: newPassword,
        role: accountType === "author" ? "faculty" : "student",
      });
      onClose?.();
    } catch (e) { setNewError(e.message || "Failed to create account."); }
    finally { setNewLoading(false); }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await authService.loginWithEmail(loginEmail.trim(), loginPassword);
      onClose?.();
    } catch (e) { setLoginError(e.message || "Login failed."); }
    finally { setLoginLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');

        .lb {
          position: fixed; inset: 0; z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          background: rgba(0,0,0,0.52);
          backdrop-filter: blur(6px);
          opacity: 0; transition: opacity 0.22s ease;
        }
        .lb.on { opacity: 1; }

        .lw {
          display: flex;
          width: 760px; max-width: 100%;
          /* Fixed height — no scroll needed */
          height: 500px;
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 32px 72px rgba(0,0,0,0.32);
          transform: translateY(14px) scale(0.98);
          transition: transform 0.32s cubic-bezier(0.34,1.4,0.64,1);
          background: #fff; position: relative;
        }
        .lb.on .lw { transform: translateY(0) scale(1); }

        .x-btn {
          position: absolute; top: 14px; right: 14px; z-index: 20;
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(0,0,0,0.07); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #555; font-size: 12px; transition: background 0.15s;
        }
        .x-btn:hover { background: rgba(0,0,0,0.14); }

        /* LEFT — fixed width, no overflow */
        .lp {
          flex: 0 0 260px;
          background: linear-gradient(160deg,#003800 0%,#005c00 45%,#007000 80%,#003800 100%);
          padding: 36px 30px;
          display: flex; flex-direction: column; justify-content: space-between;
          position: relative; overflow: hidden;
        }
        .lp::before {
          content: ''; position: absolute; top: -70px; right: -70px;
          width: 240px; height: 240px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .lp::after {
          content: ''; position: absolute; bottom: -50px; left: -30px;
          width: 180px; height: 180px; border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }
        .lp-o { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.04); }
        .lp-o1 { width: 100px; height: 100px; top: 42%; left: 55%; }
        .lp-o2 { width: 60px; height: 60px; top: 16%; left: 8%; }

        .lp-logo { display: flex; align-items: center; gap: 9px; z-index: 1; }
        .lp-box {
          width: 30px; height: 30px; border-radius: 7px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 11px; color: #fff;
        }
        .lp-name { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.82); letter-spacing: 2px; text-transform: uppercase; }

        .lp-body { z-index: 1; }
        .lp-h { font-family: 'DM Serif Display', serif; font-size: 28px; color: #fff; line-height: 1.2; margin-bottom: 12px; }
        .lp-p { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.65; font-weight: 300; }
        .lp-foot { z-index: 1; font-size: 10px; color: rgba(255,255,255,0.25); }

        /* RIGHT — fixed, no scroll */
        .rp {
          flex: 1; background: #fff;
          padding: 28px 34px 24px;
          display: flex; flex-direction: column;
          /* No overflow-y */
        }

        /* Tabs */
        .tabs {
          display: flex; background: #f3f4f6;
          border-radius: 9px; padding: 3px; margin-bottom: 20px; gap: 2px;
          flex-shrink: 0;
        }
        .tab {
          flex: 1; padding: 7px 4px; border: none; border-radius: 7px;
          font-size: 12.5px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; font-family: 'DM Sans', sans-serif;
          background: transparent; color: #9ca3af;
        }
        .tab.on { background: #fff; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

        .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #b91c1c; margin-bottom: 4px; flex-shrink: 0; }
        .r-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: #111827; margin-bottom: 3px; flex-shrink: 0; }
        .r-sub { font-size: 12.5px; color: #9ca3af; margin-bottom: 16px; font-weight: 300; line-height: 1.45; flex-shrink: 0; }

        /* Chips */
        .chips {
          display: inline-flex; border-radius: 999px; padding: 2px;
          background: #f3f4f6; margin-bottom: 14px; gap: 2px; flex-shrink: 0;
        }
        .chip {
          border: none; border-radius: 999px; font-size: 10.5px;
          padding: 5px 11px; cursor: pointer; background: transparent;
          color: #6b7280; font-weight: 500; letter-spacing: 0.05em;
          text-transform: uppercase; transition: all 0.13s; font-family: 'DM Sans', sans-serif;
        }
        .chip.on { background: #fff; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        /* Form */
        .fgrp { display: flex; flex-direction: column; gap: 9px; margin-bottom: 10px; }
        .flabel { font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 3px; display: block; }
        .finput {
          width: 100%; padding: 9px 12px;
          border: 1.5px solid #e5e7eb; border-radius: 8px;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          color: #111827; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s; background: #fff;
        }
        .finput:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }
        .finput:disabled { background: #f9fafb; color: #9ca3af; }

        .ferr { font-size: 11.5px; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 7px; padding: 7px 11px; margin-bottom: 8px; }

        .sbtn {
          width: 100%; padding: 10px; background: #16a34a; color: #fff;
          border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer; transition: background 0.15s;
        }
        .sbtn:hover:not(:disabled) { background: #15803d; }
        .sbtn:disabled { background: #9ca3af; cursor: not-allowed; }

        .divrow { display: flex; align-items: center; gap: 8px; margin: 10px 0; flex-shrink: 0; }
        .divline { flex: 1; height: 1px; background: #e5e7eb; }
        .divtxt { font-size: 10px; color: #d1d5db; letter-spacing: 1px; text-transform: uppercase; }

        .gbtn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 10px 16px; background: #fff;
          border: 1.5px solid #e2e8f0; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: #374151; cursor: pointer; transition: all 0.15s;
        }
        .gbtn:hover:not(:disabled) { border-color: #16a34a; box-shadow: 0 2px 10px rgba(22,163,74,0.12); transform: translateY(-1px); }
        .gbtn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .rnote { margin-top: 10px; font-size: 10.5px; color: #c4c9d0; text-align: center; line-height: 1.5; flex-shrink: 0; }
        .rnote b { color: #ef4444; font-weight: 500; }

        /* Admin panel */
        .admin-panel { display: flex; flex-direction: column; gap: 12px; flex: 1; justify-content: center; }
        .admin-info {
          background: linear-gradient(135deg,#f0fdf4,#dcfce7);
          border: 1px solid #bbf7d0; border-radius: 10px;
          padding: 14px 16px; text-align: center;
        }
        .admin-info-title { font-size: 12.5px; font-weight: 600; color: #14532d; margin-bottom: 7px; }
        .admin-info-emails { font-size: 11px; color: #166534; line-height: 1.9; }
        .admin-info-emails span {
          display: inline-block; background: #fff; border: 1px solid #86efac;
          border-radius: 20px; padding: 1px 9px; margin: 2px 2px;
          font-family: 'DM Sans', monospace; font-size: 10.5px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 680px) {
          .lp { display: none; }
          .rp { padding: 24px 22px 18px; }
          .lw { width: 95vw; height: auto; max-height: 90vh; }
        }
      `}</style>

      <div className={`lb ${mounted ? "on" : ""}`} onClick={handleBackdropClick}>
        <div className="lw">
          {onClose && <button className="x-btn" onClick={onClose}>✕</button>}

          {/* LEFT */}
          <div className="lp">
            <div className="lp-o lp-o1" /><div className="lp-o lp-o2" />
            <div className="lp-logo">
              <div className="lp-box">CT</div>
              <span className="lp-name">CITE-TMS</span>
            </div>
            <div className="lp-body">
              <h1 className="lp-h">Research.<br />Discover.<br />Innovate.</h1>
              <p className="lp-p">Access the De La Salle Lipa thesis repository — a curated archive of academic research from the CITE department.</p>
            </div>
            <div className="lp-foot">© {new Date().getFullYear()} De La Salle Lipa · CITE</div>
          </div>

          {/* RIGHT */}
          <div className="rp">
            <div className="tabs">
              {["student","author","admin"].map(t => (
                <button key={t} className={`tab ${accountType===t?"on":""}`}
                  onClick={() => { setAccountType(t); setAdminError(""); setLoginError(""); setNewError(""); }}>
                  {t[0].toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            <div className="eyebrow">
              {accountType==="admin" ? "Admin Portal" : accountType==="author" ? "Author Portal" : "Student Portal"}
            </div>
            <div className="r-title">
              {accountType==="admin" ? "Admin Sign In" : "Welcome back"}
            </div>
            <div className="r-sub">
              {accountType==="admin"
                ? "Use your authorized Google account to continue."
                : "Sign in to access the research repository."}
            </div>

            {/* ── ADMIN ── */}
            {accountType === "admin" ? (
              <div className="admin-panel">
                <div className="admin-info">
                  <div className="admin-info-title">🔐 Authorized accounts only</div>
                  <div className="admin-info-emails">
                    {ALLOWED_ADMIN_EMAILS.map(e => <span key={e}>{e}</span>)}
                  </div>
                </div>

                {adminError && <div className="ferr">{adminError}</div>}

                <button className="gbtn" onClick={handleAdminGoogleLogin} disabled={adminLoading}>
                  {adminLoading ? (
                    <div style={{width:16,height:16,borderRadius:"50%",border:"2px solid #e2e8f0",borderTopColor:"#16a34a",animation:"spin 0.8s linear infinite"}} />
                  ) : (
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={17} height={17} alt="G" />
                  )}
                  {adminLoading ? "Redirecting…" : "Sign in with Google"}
                </button>

                <p className="rnote">Only the accounts listed above can access the admin panel.</p>
              </div>

            ) : (
              /* ── STUDENT / AUTHOR ── */
              <>
                <div className="chips">
                  <button className={`chip ${authMode==="existing"?"on":""}`} onClick={() => setAuthMode("existing")}>Sign in</button>
                  <button className={`chip ${authMode==="new"?"on":""}`} onClick={() => setAuthMode("new")}>Create account</button>
                </div>

                {authMode === "new" ? (
                  <form onSubmit={handleSignup} style={{display:"flex",flexDirection:"column",flex:1}}>
                    <div className="fgrp">
                      <div>
                        <label className="flabel">Full name</label>
                        <input className="finput" type="text" placeholder="Juan dela Cruz"
                          value={newName} onChange={e=>setNewName(e.target.value)} disabled={newLoading} />
                      </div>
                      <div>
                        <label className="flabel">Email</label>
                        <input className="finput" type="email" placeholder="you@dlsl.edu.ph"
                          value={newEmail} onChange={e=>setNewEmail(e.target.value)} disabled={newLoading} />
                      </div>
                      <div>
                        <label className="flabel">Password</label>
                        <input className="finput" type="password" placeholder="Create a password"
                          value={newPassword} onChange={e=>setNewPassword(e.target.value)} disabled={newLoading} />
                      </div>
                    </div>
                    {newError && <div className="ferr">{newError}</div>}
                    <button className="sbtn" type="submit" disabled={newLoading||!newName.trim()||!newEmail.trim()||!newPassword}>
                      {newLoading ? "Creating…" : "Create Account"}
                    </button>
                    <div className="divrow"><div className="divline"/><span className="divtxt">or</span><div className="divline"/></div>
                    <button className="gbtn" type="button" onClick={handleGoogleLogin}>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={17} height={17} alt="G" />
                      Sign up with Google
                    </button>
                    <p className="rnote">Only <b>@dlsl.edu.ph</b> accounts are authorized.</p>
                  </form>
                ) : (
                  <form onSubmit={handlePasswordLogin} style={{display:"flex",flexDirection:"column",flex:1}}>
                    <div className="fgrp">
                      <div>
                        <label className="flabel">Email</label>
                        <input className="finput" type="email" placeholder="you@dlsl.edu.ph"
                          value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} disabled={loginLoading} />
                      </div>
                      <div>
                        <label className="flabel">Password</label>
                        <input className="finput" type="password" placeholder="••••••••"
                          value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} disabled={loginLoading} />
                      </div>
                    </div>
                    {loginError && <div className="ferr">{loginError}</div>}
                    <button className="sbtn" type="submit" disabled={loginLoading||!loginEmail||!loginPassword}>
                      {loginLoading ? "Signing in…" : "Sign In"}
                    </button>
                    <div className="divrow"><div className="divline"/><span className="divtxt">or</span><div className="divline"/></div>
                    <button className="gbtn" type="button" onClick={handleGoogleLogin}>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={17} height={17} alt="G" />
                      Sign in with Google
                    </button>
                    <p className="rnote">Only <b>@dlsl.edu.ph</b> accounts are authorized.</p>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}