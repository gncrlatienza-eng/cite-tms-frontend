import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import SearchBar from "../../components/search/SearchBar";
import LoginPage from "./LoginPage";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .lp-page {
          min-height: 100vh;
          padding-top: 57px;
          overflow-x: hidden;
          background: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .lp-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: calc(100vh - 57px);
          padding: 60px 24px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .lp-hero::before {
          content: '';
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 1000px;
          height: 700px;
          background: radial-gradient(ellipse at center, rgba(155,0,0,0.055) 0%, transparent 68%);
          pointer-events: none;
          z-index: 0;
        }

        .lp-hero > * { position: relative; z-index: 1; }

        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          padding: 6px 16px;
          border-radius: 20px;
          margin-bottom: 28px;
          border: 1px solid #fecaca;
          cursor: default;
        }

        .lp-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #dc2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.2);
          flex-shrink: 0;
        }

        .lp-title {
          font-family: 'DM Serif Display', serif;
          font-size: 76px;
          font-weight: 400;
          letter-spacing: -2px;
          color: #0f1117;
          line-height: 1.0;
          margin: 0 0 10px;
        }

        .lp-title-accent {
          color: #9b0000;
        }

        .lp-sub {
          font-size: 17px;
          color: #6b7280;
          line-height: 1.7;
          max-width: 460px;
          margin: 0 auto 48px;
          font-weight: 400;
        }

        .lp-search-wrap {
          width: 100%;
          max-width: 640px;
          margin-bottom: 16px;
        }

        .lp-hint {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 14px;
          line-height: 1.6;
        }

        .lp-hint-link {
          color: #9b0000;
          font-weight: 600;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-size: inherit;
          font-family: inherit;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.15s;
        }
        .lp-hint-link:hover { color: #7f1d1d; }

        .lp-divider {
          width: 100%;
          max-width: 640px;
          height: 1px;
          background: #f3f4f6;
          margin: 48px auto 0;
        }

        .lp-stats {
          display: flex;
          align-items: stretch;
          width: 100%;
          max-width: 440px;
          margin-top: 36px;
          justify-content: center;
        }

        .lp-stat {
          flex: 1;
          text-align: center;
          padding: 0 20px;
        }

        .lp-stat + .lp-stat {
          border-left: 1px solid #f3f4f6;
        }

        .lp-stat-num {
          font-family: 'DM Serif Display', serif;
          font-size: 30px;
          color: #111827;
          line-height: 1;
          margin-bottom: 5px;
        }

        .lp-stat-label {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .lp-browse-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 36px;
          padding: 10px 22px;
          border-radius: 50px;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          color: #374151;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.1s;
          text-decoration: none;
        }
        .lp-browse-btn:hover {
          border-color: #9b0000;
          color: #9b0000;
          box-shadow: 0 2px 12px rgba(155,0,0,0.1);
          transform: translateY(-1px);
        }
        .lp-browse-btn:active { transform: translateY(0); }

        @media (max-width: 640px) {
          .lp-title { font-size: 52px; letter-spacing: -1px; }
          .lp-sub { font-size: 16px; }
          .lp-hero { padding: 40px 20px 60px; }
          .lp-stats { max-width: 100%; }
        }
      `}</style>

      <div
        className="lp-page"
        style={{
          filter: showLogin ? 'blur(3px)' : 'none',
          transition: 'filter 0.3s ease',
          pointerEvents: showLogin ? 'none' : 'auto',
        }}
      >
        <Navbar onLoginClick={() => setShowLogin(true)} />

        <section className="lp-hero">

          <h1 className="lp-title">
            Research,<br />
            <span className="lp-title-accent">Discovered.</span>
          </h1>

          <p className="lp-sub">
            Explore theses, capstone projects, and academic papers from the College of Information Technology Education.
          </p>

          <div className="lp-search-wrap">
            <SearchBar />
          </div>

          <p className="lp-hint">
            Try{" "}
            <button className="lp-hint-link" onClick={() => navigate('/papers?q=machine+learning')}>"machine learning"</button>
            {", "}
            <button className="lp-hint-link" onClick={() => navigate('/papers?q=BSIT')}>"BSIT"</button>
            {", or an author's name"}
          </p>

          <button className="lp-browse-btn" onClick={() => navigate('/papers')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Browse all papers
          </button>

          <div className="lp-divider" />

          <div className="lp-stats">
            <div className="lp-stat">
              <div className="lp-stat-num">100+</div>
              <div className="lp-stat-label">Papers</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num">3</div>
              <div className="lp-stat-label">Programs</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num">Free</div>
              <div className="lp-stat-label">Access</div>
            </div>
          </div>
        </section>
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}
