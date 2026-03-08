import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await authService.loginAsAdminWithGoogle();
      // Redirect handled by AuthCallback
    } catch (err) {
      setError(err.message || "Login failed.");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .al-page {
          min-height: 100vh; display: flex;
          background: #f8f9fa;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .al-left {
          flex: 1;
          background: linear-gradient(145deg, #004d00 0%, #006400 45%, #1a8a1a 100%);
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 52px 48px;
          position: relative; overflow: hidden;
        }
        .al-left::before {
          content: ''; position: absolute; top: -100px; right: -100px;
          width: 360px; height: 360px; border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .al-left::after {
          content: ''; position: absolute; bottom: -80px; left: -60px;
          width: 260px; height: 260px; border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }
        .al-brand { display: flex; align-items: center; gap: 12px; z-index: 1; }
        .al-brand-icon {
          width: 40px; height: 40px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .al-brand-name {
          font-size: 14px; font-weight: 600;
          color: rgba(255,255,255,0.9);
          letter-spacing: 1.5px; text-transform: uppercase;
        }
        .al-hero { z-index: 1; }
        .al-hero h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 42px; color: #fff;
          line-height: 1.2; margin-bottom: 18px;
        }
        .al-hero p {
          font-size: 14px; color: rgba(255,255,255,0.6);
          line-height: 1.75; max-width: 300px;
        }
        .al-left-footer { z-index: 1; font-size: 12px; color: rgba(255,255,255,0.3); }

        .al-right {
          width: 460px; background: #fff;
          display: flex; align-items: center; justify-content: center;
          padding: 48px 52px;
          border-left: 1px solid #e8eaed;
        }
        .al-form-wrap { width: 100%; }

        .al-badge {
          display: inline-block;
          font-size: 11px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: #b91c1c; background: #fef2f2;
          border: 1px solid #fecaca; border-radius: 20px;
          padding: 3px 10px; margin-bottom: 16px;
        }
        .al-title {
          font-family: 'DM Serif Display', serif;
          font-size: 30px; color: #202124; margin-bottom: 6px;
        }
        .al-subtitle {
          font-size: 13.5px; color: #70757a;
          margin-bottom: 36px; line-height: 1.6;
        }
        .al-error {
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 8px; padding: 10px 14px;
          font-size: 13px; color: #b91c1c; margin-bottom: 20px;
          display: flex; align-items: flex-start; gap: 8px;
        }
        .al-google-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; width: 100%; padding: 14px 20px;
          background: #fff; border: 1.5px solid #dadce0;
          border-radius: 10px; cursor: pointer;
          font-size: 14px; font-weight: 600;
          font-family: inherit; color: #202124;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .al-google-btn:hover:not(:disabled) {
          border-color: #006400;
          box-shadow: 0 4px 16px rgba(0,100,0,0.12);
          transform: translateY(-1px);
        }
        .al-google-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .al-divider {
          display: flex; align-items: center; gap: 12px; margin: 24px 0;
        }
        .al-divider-line { flex: 1; height: 1px; background: #e8eaed; }
        .al-divider-text { font-size: 11px; color: #c4c9d0; letter-spacing: 1px; text-transform: uppercase; }

        .al-back {
          display: block; text-align: center;
          font-size: 13px; color: #70757a; cursor: pointer;
          background: none; border: none; font-family: inherit;
          width: 100%; transition: color 0.15s;
        }
        .al-back:hover { color: #202124; }

        .al-note {
          margin-top: 28px; padding-top: 20px;
          border-top: 1px solid #f1f3f4;
          font-size: 11.5px; color: #9aa0a6;
          text-align: center; line-height: 1.7;
        }
        .al-note strong { color: #5f6368; }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 820px) {
          .al-left { display: none; }
          .al-right { width: 100%; padding: 40px 28px; }
        }
      `}</style>

      <div className="al-page">
        <div className="al-left">
          <div className="al-brand">
            <div className="al-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <span className="al-brand-name">CITE-TMS</span>
          </div>
          <div className="al-hero">
            <h1>Admin<br />Control<br />Panel</h1>
            <p>Manage thesis submissions, access requests, and the full CITE research repository.</p>
          </div>
          <div className="al-left-footer">
            © {new Date().getFullYear()} De La Salle Lipa · CITE Department
          </div>
        </div>

        <div className="al-right">
          <div className="al-form-wrap">
            <div className="al-badge">Admin Only</div>
            <div className="al-title">Sign In</div>
            <div className="al-subtitle">
              Use your authorized Google account to access the admin panel.
            </div>

            {error && (
              <div className="al-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              className="al-google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? (
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid #dadce0", borderTopColor: "#006400",
                  animation: "spin 0.8s linear infinite"
                }} />
              ) : (
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  width={20} height={20}
                />
              )}
              {loading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="al-divider">
              <div className="al-divider-line" />
              <span className="al-divider-text">or</span>
              <div className="al-divider-line" />
            </div>

            <button className="al-back" onClick={() => navigate("/")}>
              ← Back to site
            </button>

            <div className="al-note">
              Only authorized admin accounts are permitted.<br />
              <strong>gncrlatienza@gmail.com</strong> · <strong>cite.tms.admin@dlsl.edu.ph</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}