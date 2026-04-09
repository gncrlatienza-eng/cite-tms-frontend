import { useState, useEffect } from "react";
import authService from "../../services/authService";

export default function LoginPage({ onClose }) {
  const [mounted, setMounted]         = useState(false);
  const [accountType, setAccountType] = useState("student");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      if (accountType === "admin")  await authService.loginAsAdminWithGoogle();
      if (accountType === "author") await authService.loginAsAuthorWithGoogle();
      if (accountType === "student") await authService.loginWithGoogle();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const PORTALS = {
    student: {
      eyebrow: "Student Portal",
      title: "Welcome back",
      sub: "Sign in with your institutional Google account.",
      info: <>Access is exclusive to <strong>De La Salle Lipa</strong> students. Sign in using your institutional <strong>@dlsl.edu.ph</strong> Google account.</>,
      btnLabel: "Sign in as Student",
      note: <>Only <b>@dlsl.edu.ph</b> Google accounts are authorized.<br />No account creation needed — your DLSL Google account grants access.</>,
    },
    author: {
      eyebrow: "Author Portal",
      title: "Welcome back",
      sub: "Sign in with any Google account.",
      info: <>Access is available to <strong>whitelisted authors and researchers</strong>. Sign in using any Google account that has been authorized by the admin.</>,
      btnLabel: "Sign in as Author",
      note: <>Your Google account must be <b>whitelisted by an admin</b> to access the Author Portal.<br />Contact your administrator if you need access.</>,
    },
    admin: {
      eyebrow: "Admin Portal",
      title: "Admin Sign In",
      sub: "Use your authorized Google account to continue.",
      info: <>Access is restricted to <strong>authorized administrators</strong> of the CITE Thesis Management System. Sign in using your designated admin Google account.</>,
      btnLabel: "Sign in as Admin",
      note: <>Only pre-authorized admin accounts can access this portal.<br />Contact your system administrator if you need access.</>,
    },
  };

  const portal = PORTALS[accountType];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');

        .lb {
          position:fixed; inset:0; z-index:1000;
          display:flex; align-items:center; justify-content:center; padding:16px;
          background:rgba(0,0,0,0.52); backdrop-filter:blur(6px);
          opacity:0; transition:opacity 0.22s ease;
        }
        .lb.on { opacity:1; }

        .lw {
          display:flex; width:700px; max-width:100%; height:460px;
          border-radius:20px; overflow:hidden;
          box-shadow:0 32px 72px rgba(0,0,0,0.32);
          transform:translateY(14px) scale(0.98);
          transition:transform 0.32s cubic-bezier(0.34,1.4,0.64,1);
          background:#fff; position:relative;
        }
        .lb.on .lw { transform:translateY(0) scale(1); }

        .x-btn {
          width:28px; height:28px; border-radius:50%; flex-shrink:0;
          background:#f3f4f6; border:1.5px solid #e5e7eb; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          color:#374151; transition:background 0.15s, color 0.15s, border-color 0.15s;
          font-size:18px; line-height:1; padding:0; padding-bottom:1px;
          font-family:system-ui,sans-serif;
        }
        .x-btn:hover { background:#fee2e2; border-color:#fecaca; color:#b91c1c; }

        .lp {
          flex:0 0 240px;
          background:linear-gradient(160deg,#3b0000 0%,#5c0000 45%,#7a0000 80%,#3b0000 100%);
          padding:32px 26px;
          display:flex; flex-direction:column; justify-content:space-between;
          position:relative; overflow:hidden;
        }
        .lp::before {
          content:''; position:absolute; top:-70px; right:-70px;
          width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,0.06);
        }
        .lp::after {
          content:''; position:absolute; bottom:-50px; left:-30px;
          width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.04);
        }
        .lp-o { position:absolute; border-radius:50%; background:rgba(255,255,255,0.04); }
        .lp-o1 { width:90px; height:90px; top:42%; left:55%; }
        .lp-o2 { width:55px; height:55px; top:16%; left:8%; }
        .lp-logo { display:flex; align-items:center; gap:9px; z-index:1; }
        .lp-box {
          width:28px; height:28px; border-radius:6px;
          background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2);
          display:flex; align-items:center; justify-content:center;
          font-weight:700; font-size:10px; color:#fff;
        }
        .lp-name { font-size:10px; font-weight:600; color:rgba(255,255,255,0.82); letter-spacing:2px; text-transform:uppercase; }
        .lp-body { z-index:1; }
        .lp-h { font-family:'Schibsted Grotesk',serif; font-size:26px; color:#fff; line-height:1.2; margin-bottom:10px; }
        .lp-p { font-size:11.5px; color:rgba(255,255,255,0.55); line-height:1.65; font-weight:300; }
        .lp-foot { z-index:1; font-size:10px; color:rgba(255,255,255,0.25); }

        .rp {
          flex:1; background:#fff; padding:24px 30px 20px;
          display:flex; flex-direction:column;
        }

        .tabs-row { display:flex; align-items:center; gap:8px; margin-bottom:20px; }
        .tabs {
          display:flex; background:#f3f4f6;
          border-radius:9px; padding:3px; gap:2px; flex:1;
        }
        .tab {
          flex:1; padding:7px 4px; border:none; border-radius:7px;
          font-size:12.5px; font-weight:500; cursor:pointer;
          transition:all 0.15s; font-family:'DM Sans',sans-serif;
          background:transparent; color:#9ca3af;
        }
        .tab.on { background:#fff; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,0.1); }

        .eyebrow { font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#b91c1c; margin-bottom:3px; }
        .r-title { font-family:'Schibsted Grotesk',serif; font-size:21px; color:#111827; margin-bottom:2px; }
        .r-sub { font-size:12px; color:#9ca3af; margin-bottom:20px; font-weight:300; line-height:1.5; }

        .signin-panel { display:flex; flex-direction:column; gap:12px; flex:1; justify-content:center; }

        .gbtn {
          display:flex; align-items:center; justify-content:center; gap:10px;
          width:100%; padding:11px 16px; background:#fff;
          border:1.5px solid #e2e8f0; border-radius:10px;
          font-family:'DM Sans',sans-serif; font-size:13.5px; font-weight:500;
          color:#374151; cursor:pointer; transition:all 0.15s;
        }
        .gbtn:hover:not(:disabled) { border-color:#9b0000; box-shadow:0 2px 12px rgba(155,0,0,0.14); transform:translateY(-1px); }
        .gbtn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

        .ferr { font-size:11.5px; color:#dc2626; background:#fef2f2; border:1px solid #fecaca; border-radius:7px; padding:7px 11px; }

        .rnote { font-size:11px; color:#b0b7c3; text-align:center; line-height:1.55; }
        .rnote b { color:#9b0000; font-weight:600; }

        .info-box {
          background:#fef2f2; border:1px solid #fecaca;
          border-radius:10px; padding:12px 14px;
        }
        .info-box-text { font-size:11.5px; color:#991b1b; line-height:1.6; }
        .info-box-text strong { font-weight:600; }

        @keyframes spin { to { transform:rotate(360deg); } }

        @media (max-width:640px) {
          .lp { display:none; }
          .rp { padding:22px 20px 18px; }
          .lw { width:95vw; height:auto; max-height:90vh; overflow-y:auto; }
        }
      `}</style>

      <div className={`lb ${mounted ? "on" : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
        <div className="lw">

          {/* ── LEFT ── */}
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

          {/* ── RIGHT ── */}
          <div className="rp">
            <div className="tabs-row">
              <div className="tabs">
                {["student", "author", "admin"].map((t) => (
                  <button key={t} className={`tab ${accountType === t ? "on" : ""}`}
                    onClick={() => { setAccountType(t); setError(""); }}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              {onClose && (
                <button className="x-btn" onClick={onClose} aria-label="Close">×</button>
              )}
            </div>

            <div className="eyebrow">{portal.eyebrow}</div>
            <div className="r-title">{portal.title}</div>
            <div className="r-sub">{portal.sub}</div>

            <div className="signin-panel">
              <div className="info-box">
                <div className="info-box-text">{portal.info}</div>
              </div>

              {error && <div className="ferr">{error}</div>}

              <button className="gbtn" onClick={handleLogin} disabled={loading}>
                {loading
                  ? <div style={{width:16,height:16,borderRadius:"50%",border:"2px solid #e2e8f0",borderTopColor:"#9b0000",animation:"spin 0.8s linear infinite"}} />
                  : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt="G" />}
                {loading ? "Redirecting…" : portal.btnLabel}
              </button>

              <p className="rnote">{portal.note}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}