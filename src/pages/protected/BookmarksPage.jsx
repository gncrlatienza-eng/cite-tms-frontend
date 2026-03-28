import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "../public/LoginPage";
import { supabase } from "../../services/supabase";

const BUCKET = "cite-tms-backend-bucket";

const IconGlobe = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconUser = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconLock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const ACCESS_META = {
  open:          { label: "Public",           Icon: IconGlobe, bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  students_only: { label: "Sign-in Required", Icon: IconUser,  bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  restricted:    { label: "Request Required", Icon: IconLock,  bg: "#fef2f2", color: "#9b0000", border: "#fecaca" },
};

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
          .select("id, paper_id, papers(id, title, authors, year, course_or_program, abstract, file_path, access_type)")
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
          padding-top: 57px;
          background: #fafafa;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Body ── */
        .bm-body {
          max-width: 860px;
          margin: 0 auto;
          padding: 32px 40px 80px;
        }

        /* ── Paper card (matches PapersPage) ── */
        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .paper-card {
          background: #fff;
          border: 1px solid #ebebeb;
          border-radius: 14px;
          padding: 22px 24px 18px;
          margin-bottom: 10px;
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.18s, border-color 0.18s;
        }
        .paper-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-color: #ddd; }
        .paper-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:#9b0000; transform:scaleY(0); transition:transform 0.18s ease; border-radius:0 2px 2px 0; }
        .paper-card:hover::before { transform:scaleY(1); }

        .sp-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
        .paper-title {
          font-size: 17px;
          font-family: 'DM Serif Display', serif;
          color: #111827;
          text-decoration: none;
          line-height: 1.35;
          display: block;
          transition: color 0.2s ease-in-out;
          cursor: pointer;
        }
        .paper-title:hover { color: #6b7280; }
        .paper-title:visited { color: #9b0000; }
        .paper-title:visited:hover { color: #7f1d1d; }

        .sp-bm-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1.5px solid #f0f0f0;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          flex-shrink: 0;
          margin-top: -2px;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .sp-bm-btn:hover { color: #9b0000; background: #fef2f2; border-color: #fecaca; }
        .sp-bm-btn.saved { color: #9b0000; background: #fef2f2; border-color: #fecaca; }
        .sp-bm-btn:disabled { opacity: 0.4; cursor: default; }

        .sp-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .sp-author { font-size: 12.5px; color: #6b7280; font-weight: 400; }
        .sp-year-pill {
          display: inline-flex; align-items: center;
          background: #fef2f2; color: #9b0000; font-size: 11px; font-weight: 700;
          padding: 2px 9px; border-radius: 9999px; border: 1px solid #fecaca;
        }
        .sp-prog-pill {
          display: inline-flex; align-items: center;
          background: #f3f4f6; color: #4b5563; font-size: 11px; font-weight: 600;
          padding: 2px 9px; border-radius: 9999px;
        }
        .sp-access-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 600;
          padding: 2px 9px; border-radius: 9999px; border: 1px solid;
          white-space: nowrap;
        }

        .sp-abstract {
          font-size: 13.5px; color: #6b7280; line-height: 1.65; margin: 0 0 16px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        .sp-card-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sp-btn-view {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: 7px; border: 1.5px solid #e5e7eb;
          background: #fff; color: #374151; font-size: 12.5px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer; text-decoration: none;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .sp-btn-view:hover { border-color: #9b0000; color: #9b0000; background: #fef2f2; }
        .sp-btn-pdf {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: 7px; border: 1.5px solid #9b0000;
          background: #9b0000; color: #fff; font-size: 12.5px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .sp-btn-pdf:hover { background: #7f1d1d; border-color: #7f1d1d; }
        .sp-btn-request {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: 7px; border: 1.5px solid #fde68a;
          background: #fffbeb; color: #92400e; font-size: 12.5px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .sp-btn-request:hover { border-color: #f59e0b; background: #fef3c7; }

        /* ── Skeleton ── */
        .bm-skel-card {
          background: #fff;
          border: 1px solid #ebebeb;
          border-radius: 14px;
          padding: 22px 24px 18px;
          margin-bottom: 10px;
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
          .bm-body { padding: 20px 16px 60px; }
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
              {!loading && !error && bookmarks.map((paper, i) => {
                const access = ACCESS_META[paper.access_type] || ACCESS_META.open;
                const isRestricted = paper.access_type === "restricted";

                return (
                  <article
                    key={paper.bookmarkId}
                    className="paper-card"
                    style={{ animation: "fadeUp 0.2s ease both", animationDelay: `${i * 0.03}s` }}
                  >
                    {/* Title + bookmark */}
                    <div className="sp-card-header">
                      <Link to={`/papers/${paper.id}`} className="paper-title">
                        {paper.title || "Untitled paper"}
                      </Link>
                      <button
                        className="sp-bm-btn saved"
                        disabled={removing === paper.paper_id}
                        onClick={() => handleRemove(paper.bookmarkId, paper.paper_id)}
                        title="Remove bookmark"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor" strokeWidth="2.2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Meta row */}
                    <div className="sp-card-meta">
                      {paper.authors?.length > 0 && (
                        <span className="sp-author">{paper.authors.join(", ")}</span>
                      )}
                      {paper.year && (
                        <span className="sp-year-pill">{paper.year}</span>
                      )}
                      {paper.course_or_program && (
                        <span className="sp-prog-pill">{paper.course_or_program}</span>
                      )}
                      <span
                        className="sp-access-badge"
                        style={{ background: access.bg, color: access.color, borderColor: access.border }}
                      >
                        <access.Icon /> {access.label}
                      </span>
                    </div>

                    {paper.abstract && (
                      <p className="sp-abstract">{paper.abstract}</p>
                    )}

                    {/* Footer actions */}
                    <div className="sp-card-footer">
                      {!isRestricted && paper.publicUrl && (
                        <a href={paper.publicUrl} target="_blank" rel="noopener noreferrer" className="sp-btn-pdf">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          PDF
                        </a>
                      )}

                      {isRestricted && (
                        <Link to={`/papers/${paper.id}`} className="sp-btn-request">
                          <IconLock /> Request Access
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}
