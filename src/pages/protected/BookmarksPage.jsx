import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "../public/LoginPage";
import { supabase } from "../../services/supabase";

const BUCKET = "cite-tms-backend-bucket";

export default function BookmarksPage() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [removing, setRemoving]   = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true); setError("");
      try {
        const { data, error: err } = await supabase
          .from("bookmarks")
          .select("id, paper_id, papers(id, title, authors, year, course_or_program, abstract, file_path)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (err) throw err;

        const withUrls = data?.map(({ id, paper_id, papers: p }) => {
          if (!p) return null;
          const { data: u } = p.file_path
            ? supabase.storage.from(BUCKET).getPublicUrl(p.file_path)
            : { data: null };
          return { bookmarkId: id, paper_id, ...p, publicUrl: u?.publicUrl ?? null };
        }).filter(Boolean) ?? [];

        setBookmarks(withUrls);
      } catch (e) {
        setError(e.message || "Failed to load bookmarks.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleRemove = async (bookmarkId, paper_id) => {
    setRemoving(paper_id);
    try {
      const { error } = await supabase.from("bookmarks").delete().eq("id", bookmarkId);
      if (error) throw error;
      setBookmarks((prev) => prev.filter((b) => b.bookmarkId !== bookmarkId));
    } catch (e) {
      console.error("Failed to remove bookmark:", e.message);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

        .bm-page {
          min-height: 100vh;
          background: #fafafa;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Header bar ── */
        .bm-header {
          background: #fff;
          border-bottom: 1px solid #efefef;
          padding: 20px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .bm-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .bm-header-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(155,0,0,0.25);
        }

        .bm-header-text h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 20px;
          font-weight: 400;
          color: #111827;
          line-height: 1;
          margin-bottom: 3px;
        }

        .bm-header-text p {
          font-size: 12.5px;
          color: #9ca3af;
          margin: 0;
        }

        .bm-count-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #fef2f2;
          color: #9b0000;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid #fecaca;
          white-space: nowrap;
        }

        /* ── Body ── */
        .bm-body {
          max-width: 860px;
          margin: 0 auto;
          padding: 32px 40px 80px;
        }

        /* ── Paper card ── */
        .bm-card {
          display: flex;
          gap: 20px;
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 14px;
          padding: 20px 22px;
          margin-bottom: 14px;
          transition: box-shadow 0.18s, border-color 0.18s, transform 0.15s;
          animation: bmFadeUp 0.22s ease both;
          position: relative;
        }

        .bm-card:hover {
          box-shadow: 0 6px 24px rgba(0,0,0,0.07);
          border-color: #e5e7eb;
          transform: translateY(-1px);
        }

        @keyframes bmFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .bm-card-main { flex: 1; min-width: 0; }

        .bm-card-title {
          font-size: 16.5px;
          font-family: 'DM Serif Display', serif;
          color: #111827;
          text-decoration: none;
          line-height: 1.4;
          display: block;
          margin-bottom: 6px;
          transition: color 0.15s;
        }
        .bm-card-title:hover { color: #9b0000; }

        .bm-card-meta {
          font-size: 12.5px;
          color: #6b7280;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 10px;
        }

        .bm-dot { color: #d1d5db; }

        .bm-year-pill {
          background: #fef2f2;
          color: #9b0000;
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          border: 1px solid #fecaca;
        }

        .bm-prog-pill {
          background: #f3f4f6;
          color: #374151;
          font-size: 10.5px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
        }

        .bm-snippet {
          font-size: 13.5px;
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .bm-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .bm-action-link {
          font-size: 12.5px;
          color: #9b0000;
          text-decoration: none;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: color 0.15s;
        }
        .bm-action-link:hover { color: #7f1d1d; text-decoration: underline; text-underline-offset: 2px; }

        .bm-remove-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          font-weight: 500;
          color: #9ca3af;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          transition: color 0.15s;
        }
        .bm-remove-btn:hover { color: #dc2626; }
        .bm-remove-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* PDF tile */
        .bm-pdf-tile {
          flex-shrink: 0;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 70px;
          padding: 10px 6px 8px;
          gap: 5px;
          border: 1px solid #f0f0f0;
          border-radius: 10px;
          background: #fafafa;
          text-decoration: none;
          transition: box-shadow 0.15s, border-color 0.15s, background 0.15s;
          align-self: flex-start;
        }
        .bm-pdf-tile:hover {
          box-shadow: 0 3px 10px rgba(155,0,0,0.12);
          border-color: #fecaca;
          background: #fff;
        }
        .bm-pdf-src {
          font-size: 9px;
          color: #9ca3af;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }

        /* ── Skeleton ── */
        .bm-skel-card {
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 14px;
          padding: 20px 22px;
          margin-bottom: 14px;
        }
        .bm-skel {
          border-radius: 6px;
          background: linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%);
          background-size: 900px 100%;
          animation: bmShimmer 1.4s infinite linear;
        }
        @keyframes bmShimmer {
          0%   { background-position: -900px 0; }
          100% { background-position:  900px 0; }
        }
        .bm-skel-t  { height: 19px; width: 55%; margin-bottom: 10px; }
        .bm-skel-m  { height: 12px; width: 32%; margin-bottom: 10px; }
        .bm-skel-l1 { height: 12px; width: 92%; margin-bottom: 6px; }
        .bm-skel-l2 { height: 12px; width: 70%; }

        /* ── Empty / error ── */
        .bm-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 72px 20px;
        }

        .bm-empty-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: #fca5a5;
        }

        .bm-empty-title {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          font-weight: 400;
          color: #111827;
          margin-bottom: 10px;
        }

        .bm-empty-sub {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.65;
          max-width: 360px;
          margin-bottom: 28px;
        }

        .bm-browse-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          color: #fff;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(155,0,0,0.28);
          transition: opacity 0.15s, transform 0.1s;
          text-decoration: none;
        }
        .bm-browse-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .bm-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 14px 18px;
          color: #b91c1c;
          font-size: 13px;
          margin-bottom: 20px;
        }

        /* ── Sign-in gate ── */
        .bm-gate {
          min-height: calc(100vh - 57px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .bm-gate-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.07);
          padding: 48px 36px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .bm-gate-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
          color: #9b0000;
        }

        .bm-gate-title {
          font-family: 'DM Serif Display', serif;
          font-size: 24px;
          font-weight: 400;
          color: #111827;
          margin-bottom: 10px;
        }

        .bm-gate-sub {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.65;
          max-width: 300px;
          margin-bottom: 28px;
        }

        .bm-gate-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 26px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(155,0,0,0.28);
          transition: opacity 0.15s, transform 0.1s;
        }
        .bm-gate-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        @media (max-width: 768px) {
          .bm-header { padding: 16px 20px; }
          .bm-body { padding: 20px 16px 60px; }
          .bm-card { padding: 16px 16px; }
        }
      `}</style>

      <div
        className="bm-page"
        style={{
          filter: showLogin ? 'blur(3px)' : 'none',
          transition: 'filter 0.3s ease',
          pointerEvents: showLogin ? 'none' : 'auto',
        }}
      >
        <Navbar onLoginClick={() => setShowLogin(true)} />

        {!user ? (
          <div className="bm-gate">
            <div className="bm-gate-card">
              <div className="bm-gate-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h1 className="bm-gate-title">Your Bookmarks</h1>
              <p className="bm-gate-sub">Sign in to save papers and access your reading list from any device.</p>
              <button className="bm-gate-btn" onClick={() => setShowLogin(true)}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={16} height={16} alt="G" />
                Sign in with Google
              </button>
            </div>
          </div>

        ) : (
          <>
            {/* Header */}
            <div className="bm-header">
              <div className="bm-header-left">
                <div className="bm-header-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="bm-header-text">
                  <h1>Bookmarks</h1>
                  <p>Your saved papers</p>
                </div>
              </div>
              {!loading && bookmarks.length > 0 && (
                <span className="bm-count-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                  {bookmarks.length} saved
                </span>
              )}
            </div>

            {/* Body */}
            <div className="bm-body">
              {error && <div className="bm-error">{error}</div>}

              {/* Skeletons */}
              {loading && [1, 2, 3].map((i) => (
                <div className="bm-skel-card" key={i}>
                  <div className="bm-skel bm-skel-t" />
                  <div className="bm-skel bm-skel-m" />
                  <div className="bm-skel bm-skel-l1" />
                  <div className="bm-skel bm-skel-l2" />
                </div>
              ))}

              {/* Empty state */}
              {!loading && !error && bookmarks.length === 0 && (
                <div className="bm-empty">
                  <div className="bm-empty-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="bm-empty-title">No bookmarks yet</div>
                  <p className="bm-empty-sub">
                    Papers you save will appear here. Browse the repository and click the bookmark icon on any paper.
                  </p>
                  <a className="bm-browse-btn" href="/papers">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Browse Papers
                  </a>
                </div>
              )}

              {/* Cards */}
              {!loading && !error && bookmarks.map((paper, i) => (
                <article
                  className="bm-card"
                  key={paper.bookmarkId}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="bm-card-main">
                    <a
                      href={paper.publicUrl || "#"}
                      target={paper.publicUrl ? "_blank" : undefined}
                      rel={paper.publicUrl ? "noopener noreferrer" : undefined}
                      className="bm-card-title"
                    >
                      {paper.title || "Untitled paper"}
                    </a>

                    <div className="bm-card-meta">
                      {paper.authors?.length > 0 && <span>{paper.authors.join(", ")}</span>}
                      {paper.year && (
                        <>
                          {paper.authors?.length > 0 && <span className="bm-dot">·</span>}
                          <span className="bm-year-pill">{paper.year}</span>
                        </>
                      )}
                      {paper.course_or_program && (
                        <>
                          <span className="bm-dot">·</span>
                          <span className="bm-prog-pill">{paper.course_or_program}</span>
                        </>
                      )}
                    </div>

                    {paper.abstract && (
                      <p className="bm-snippet">
                        {paper.abstract}
                      </p>
                    )}

                    <div className="bm-actions">
                      {paper.publicUrl && (
                        <a
                          href={paper.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bm-action-link"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          View PDF
                        </a>
                      )}

                      <button
                        className="bm-remove-btn"
                        disabled={removing === paper.paper_id}
                        onClick={() => handleRemove(paper.bookmarkId, paper.paper_id)}
                      >
                        {removing === paper.paper_id ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'bmShimmer 0s' }}>
                              <circle cx="12" cy="12" r="10"/>
                            </svg>
                            Removing…
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6"/><path d="M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                            Remove
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {paper.publicUrl && (
                    <a
                      href={paper.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bm-pdf-tile"
                    >
                      <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
                        <rect x="1" y="1" width="26" height="32" rx="3" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5"/>
                        <path d="M17 1v8h8" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeLinejoin="round"/>
                        <rect x="4" y="17" width="20" height="10" rx="2" fill="#9b0000"/>
                        <text x="14" y="25.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="'DM Sans',sans-serif" letterSpacing="0.5">PDF</text>
                        <line x1="6" y1="13" x2="22" y2="13" stroke="#e5e7eb" strokeWidth="1.2"/>
                        <line x1="6" y1="10" x2="14" y2="10" stroke="#e5e7eb" strokeWidth="1.2"/>
                      </svg>
                      <span className="bm-pdf-src">dlsl.edu.ph</span>
                    </a>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}
