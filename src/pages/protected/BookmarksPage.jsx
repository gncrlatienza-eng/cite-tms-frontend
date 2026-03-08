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
  const [removing, setRemoving]   = useState(null); // paper_id being removed

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetch = async () => {
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
    fetch();
  }, [user]);

  const handleRemove = async (bookmarkId, paper_id) => {
    setRemoving(paper_id);
    try {
      const { error } = await supabase.from("bookmarks").delete().eq("id", bookmarkId);
      if (error) throw error;
      setBookmarks((prev) => prev.filter((b) => b.bookmarkId !== bookmarkId));
    } catch (e) {
      alert("Failed to remove bookmark: " + e.message);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .bm-page { min-height:100vh; background:#f8f9fa; font-family:'DM Sans',system-ui,sans-serif; }

        /* ── Hero bar ── */
        .bm-hero {
          background:#fff; border-bottom:1px solid #e8eaed; padding:20px 40px;
          display:flex; align-items:center; justify-content:space-between; gap:16px;
        }
        .bm-hero-left { display:flex; align-items:center; gap:12px; }
        .bm-hero-icon {
          width:34px; height:34px;
          background:linear-gradient(135deg,#1a73e8,#0d47a1);
          border-radius:8px; display:flex; align-items:center; justify-content:center;
        }
        .bm-hero-title { font-family:'DM Serif Display',serif; font-size:20px; color:#202124; }
        .bm-hero-count {
          font-size:12px; font-weight:600; color:#1a73e8;
          background:#e8f0fe; border-radius:20px; padding:2px 10px;
        }

        /* ── Body ── */
        .bm-body { padding:28px 40px 60px; max-width:860px; margin:0 auto; }

        /* ── Result card (matches PapersPage style) ── */
        .bm-result {
          display:flex; gap:20px; padding:18px 0;
          border-bottom:1px solid #e8eaed;
          animation:bmFadeUp 0.22s ease both;
          position:relative;
        }
        @keyframes bmFadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }

        .bm-result-main { flex:1; min-width:0; }

        .bm-result-title {
          font-size:17px; font-family:'DM Serif Display',serif; color:#1a0dab;
          text-decoration:none; line-height:1.35; display:block; margin-bottom:3px;
          transition:color 0.15s;
        }
        .bm-result-title:hover { color:#1557b0; text-decoration:underline; }

        .bm-result-meta {
          font-size:12.5px; color:#006621; margin-bottom:6px;
          display:flex; align-items:center; flex-wrap:wrap; gap:3px;
        }
        .bm-dot { color:#bbb; }
        .bm-year-pill {
          background:#e8f5e9; color:#2e7d32; font-size:10.5px; font-weight:700;
          padding:1px 7px; border-radius:10px; margin-left:3px;
        }
        .bm-prog-pill {
          background:#e8f0fe; color:#1a73e8; font-size:10.5px; font-weight:600;
          padding:1px 7px; border-radius:10px; margin-left:3px;
        }

        .bm-snippet { font-size:13.5px; color:#3c4043; line-height:1.58; margin-bottom:9px; }

        .bm-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
        .bm-action-link {
          font-size:12.5px; color:#1a73e8; text-decoration:none; font-weight:500;
          display:flex; align-items:center; gap:4px; transition:color 0.15s;
        }
        .bm-action-link:hover { color:#1557b0; text-decoration:underline; }

        /* Remove bookmark button */
        .bm-remove-btn {
          display:inline-flex; align-items:center; gap:5px;
          font-size:12px; font-weight:500; color:#9aa0a6;
          background:none; border:none; cursor:pointer; padding:0;
          transition:color 0.15s; font-family:inherit;
        }
        .bm-remove-btn:hover { color:#b91c1c; }
        .bm-remove-btn:disabled { opacity:.4; cursor:not-allowed; }

        /* PDF tile */
        .bm-pdf-tile {
          flex-shrink:0; display:inline-flex; flex-direction:column;
          align-items:center; justify-content:center;
          width:72px; padding:10px 6px 8px; gap:4px;
          border:1px solid #dadce0; border-radius:8px;
          background:#fff; text-decoration:none;
          transition:box-shadow 0.15s, border-color 0.15s;
        }
        .bm-pdf-tile:hover { box-shadow:0 2px 8px rgba(32,33,36,.15); border-color:#1a73e8; }
        .bm-pdf-src { font-size:9px; color:#70757a; }

        /* Skeleton */
        .bm-skel-card { padding:18px 0; border-bottom:1px solid #e8eaed; }
        .bm-skel {
          border-radius:4px;
          background:linear-gradient(90deg,#efefef 25%,#e6e6e6 50%,#efefef 75%);
          background-size:900px 100%; animation:bmShimmer 1.4s infinite linear;
        }
        @keyframes bmShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .bm-skel-t  { height:20px; width:55%; margin-bottom:9px; }
        .bm-skel-m  { height:13px; width:30%; margin-bottom:9px; }
        .bm-skel-l1 { height:13px; width:90%; margin-bottom:5px; }
        .bm-skel-l2 { height:13px; width:65%; }

        /* Empty / error / unauthenticated */
        .bm-center {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          min-height:60vh; gap:16px; text-align:center;
        }
        .bm-center-icon { opacity:.2; }
        .bm-center-title { font-family:'DM Serif Display',serif; font-size:22px; color:#202124; }
        .bm-center-sub { font-size:14px; color:#70757a; max-width:340px; line-height:1.55; }
        .bm-signin-btn {
          margin-top:4px; padding:10px 24px;
          background:linear-gradient(135deg,#006400,#1a8a1a); color:#fff;
          border:none; border-radius:8px; font-size:13.5px; font-weight:600;
          font-family:inherit; cursor:pointer;
          box-shadow:0 2px 8px rgba(0,100,0,0.2); transition:opacity 0.15s;
        }
        .bm-signin-btn:hover { opacity:.9; }

        .bm-error {
          padding:14px 16px; background:#fef2f2; border-radius:8px;
          color:#b91c1c; font-size:13px; border:1px solid #fecaca;
          margin-bottom:16px;
        }

        @media (max-width:768px) {
          .bm-hero { padding:16px 20px; }
          .bm-body { padding:20px 20px 40px; }
        }
      `}</style>

      <div className="bm-page">
        <Navbar onLoginClick={() => setShowLogin(true)} />

        {!user ? (
          /* ── Not logged in ── */
          <div className="bm-center">
            <svg className="bm-center-icon" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <div className="bm-center-title">Your bookmarks</div>
            <div className="bm-center-sub">Sign in to save and view papers you've bookmarked.</div>
            <button className="bm-signin-btn" onClick={() => setShowLogin(true)}>Sign in to continue</button>
          </div>

        ) : (
          <>
            {/* ── Hero bar ── */}
            <div className="bm-hero">
              <div className="bm-hero-left">
                <div className="bm-hero-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="bm-hero-title">Bookmarks</div>
                {!loading && (
                  <span className="bm-hero-count">
                    {bookmarks.length} saved
                  </span>
                )}
              </div>
            </div>

            {/* ── Results ── */}
            <div className="bm-body">
              {error && <div className="bm-error">{error}</div>}

              {loading && [1,2,3].map((i) => (
                <div className="bm-skel-card" key={i}>
                  <div className="bm-skel bm-skel-t" />
                  <div className="bm-skel bm-skel-m" />
                  <div className="bm-skel bm-skel-l1" />
                  <div className="bm-skel bm-skel-l2" />
                </div>
              ))}

              {!loading && !error && bookmarks.length === 0 && (
                <div className="bm-center">
                  <svg className="bm-center-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                  <div className="bm-center-title">No bookmarks yet</div>
                  <div className="bm-center-sub">Papers you bookmark will appear here. Browse papers and click the bookmark icon to save them.</div>
                </div>
              )}

              {!loading && !error && bookmarks.map((paper, i) => (
                <article className="bm-result" key={paper.bookmarkId} style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="bm-result-main">
                    <a
                      href={paper.publicUrl || "#"}
                      target={paper.publicUrl ? "_blank" : undefined}
                      rel={paper.publicUrl ? "noopener noreferrer" : undefined}
                      className="bm-result-title">
                      {paper.title || "Untitled paper"}
                    </a>

                    <div className="bm-result-meta">
                      {paper.authors?.length > 0 && <span>{paper.authors.join(", ")}</span>}
                      {paper.year && (
                        <>
                          {paper.authors?.length > 0 && <span className="bm-dot"> · </span>}
                          <span>{paper.year}</span>
                          <span className="bm-year-pill">{paper.year}</span>
                        </>
                      )}
                      {paper.course_or_program && (
                        <><span className="bm-dot"> · </span><span className="bm-prog-pill">{paper.course_or_program}</span></>
                      )}
                    </div>

                    {paper.abstract && (
                      <p className="bm-snippet">
                        {paper.abstract.length > 260 ? `${paper.abstract.slice(0, 260)}…` : paper.abstract}
                      </p>
                    )}

                    <div className="bm-actions">
                      {paper.publicUrl && (
                        <a href={paper.publicUrl} target="_blank" rel="noopener noreferrer" className="bm-action-link">
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
                        onClick={() => handleRemove(paper.bookmarkId, paper.paper_id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                        {removing === paper.paper_id ? "Removing…" : "Remove bookmark"}
                      </button>
                    </div>
                  </div>

                  {paper.publicUrl && (
                    <a href={paper.publicUrl} target="_blank" rel="noopener noreferrer" className="bm-pdf-tile">
                      <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
                        <rect x="1" y="1" width="26" height="32" rx="3" fill="#fff" stroke="#dadce0" strokeWidth="1.5"/>
                        <path d="M17 1v8h8" fill="none" stroke="#dadce0" strokeWidth="1.5" strokeLinejoin="round"/>
                        <rect x="4" y="17" width="20" height="10" rx="2" fill="#c62828"/>
                        <text x="14" y="25.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="'DM Sans',sans-serif" letterSpacing="0.5">PDF</text>
                        <line x1="6" y1="13" x2="22" y2="13" stroke="#e0e0e0" strokeWidth="1.2"/>
                        <line x1="6" y1="10" x2="14" y2="10" stroke="#e0e0e0" strokeWidth="1.2"/>
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