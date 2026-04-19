import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import SearchBar from "../../components/search/SearchBar";
import LoginPage from "./LoginPage";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .lp-page {
          min-height: 100vh;
          padding-top: 57px;
          overflow-x: clip;
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
          overflow: visible;
        }

        .lp-hero > * { position: relative; z-index: 1; }

        .lp-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          will-change: transform;
        }
        .lp-blob-1 {
          width: 500px; height: 500px;
          top: -120px; left: -80px;
          background: rgba(155,0,0,0.07);
          filter: blur(90px);
          animation: blobDrift1 22s ease-in-out infinite;
        }
        .lp-blob-2 {
          width: 420px; height: 420px;
          top: -60px; right: -60px;
          background: rgba(220,38,38,0.05);
          filter: blur(110px);
          animation: blobDrift2 28s ease-in-out infinite;
        }
        .lp-blob-3 {
          width: 380px; height: 380px;
          bottom: 0; left: 50%;
          transform: translateX(-50%);
          background: rgba(254,202,202,0.09);
          filter: blur(80px);
          animation: blobDrift3 18s ease-in-out infinite;
        }
        @keyframes blobDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, 30px) scale(1.05); }
          66%       { transform: translate(-20px, 50px) scale(0.97); }
        }
        @keyframes blobDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%       { transform: translate(-50px, 40px) scale(1.08); }
          70%       { transform: translate(20px, 20px) scale(0.95); }
        }
        @keyframes blobDrift3 {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50%       { transform: translateX(-50%) scale(1.1) translateY(-30px); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(var(--rise, 16px)); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .lp-anim {
          opacity: 0;
          animation-fill-mode: forwards;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          animation-duration: 0.7s;
        }
        .lp-anim-up  { animation-name: fadeUp; }
        .lp-anim-in  { animation-name: fadeIn; }
        .lp-d0   { animation-delay: 0ms; }
        .lp-d100 { animation-delay: 100ms; }
        .lp-d220 { animation-delay: 220ms; }
        .lp-d340 { animation-delay: 340ms; }
        .lp-d440 { animation-delay: 440ms; }
        .lp-d500 { animation-delay: 500ms; }
        .lp-d600 { animation-delay: 600ms; }

        .lp-title {
          font-family: 'Schibsted Grotesk', serif;
          font-size: 76px;
          font-weight: 400;
          letter-spacing: -2px;
          color: #0f1117;
          line-height: 1.0;
          margin: 0 0 10px;
        }
        .lp-title-accent { color: #9b0000; }

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
          position: relative;
          z-index: 10;
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
        .lp-stat { flex: 1; text-align: center; padding: 0 20px; }
        .lp-stat + .lp-stat { border-left: 1px solid #f3f4f6; }
        .lp-stat-num {
          font-family: 'Schibsted Grotesk', serif;
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

        .lp-terms-link {
          font-size: 12px;
          color: #9ca3af;
          text-decoration: none;
          font-weight: 500;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: color 0.15s;
          margin-top: 20px;
        }
        .lp-terms-link:hover { color: #9b0000; }

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
          <div className="lp-blob lp-blob-1" />
          <div className="lp-blob lp-blob-2" />
          <div className="lp-blob lp-blob-3" />

          <h1 className="lp-title lp-anim lp-anim-up lp-d100" style={{'--rise': '20px'}}>
            Research,<br />
            <span className="lp-title-accent">Discovered.</span>
          </h1>

          <p className="lp-sub lp-anim lp-anim-up lp-d220">
            Explore theses, capstone projects, and academic papers from the College of Information Technology Education.
          </p>

          <div className="lp-search-wrap lp-anim lp-anim-up lp-d340">
            <SearchBar />
          </div>

          <p className="lp-hint lp-anim lp-anim-in lp-d440">
            Try{" "}
            <button className="lp-hint-link" onClick={() => navigate('/papers?q=machine+learning')}>"machine learning"</button>
            {", "}
            <button className="lp-hint-link" onClick={() => navigate('/papers?q=BSIT')}>"BSIT"</button>
            {", or an author's name"}
          </p>

          <button className="lp-browse-btn lp-anim lp-anim-up lp-d500" onClick={() => navigate('/papers')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Browse all papers
          </button>

          <div className="lp-divider lp-anim lp-anim-in lp-d600" />

          <div className="lp-stats lp-anim lp-anim-in lp-d600">
            <div className="lp-stat">
              <div className="lp-stat-num">100+</div>
              <div className="lp-stat-label">Papers</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num">8</div>
              <div className="lp-stat-label">Programs</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num">Free</div>
              <div className="lp-stat-label">Access</div>
            </div>
          </div>

          {/* ── T&C link inside hero — visible without scrolling ── */}
          <Link
            to="/terms"
            className="lp-terms-link lp-anim lp-anim-in lp-d600"
          >
            Terms & Conditions
          </Link>

        </section>
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}