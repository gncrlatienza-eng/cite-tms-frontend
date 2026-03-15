import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "./LoginPage";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import { papersCache } from "./PapersPage";

const BUCKET = "cite-tms-backend-bucket";

export default function ResearchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [paper, setPaper]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [bmId, setBmId]       = useState(null);
  const [bmBusy, setBmBusy]   = useState(false);

  // ── Fetch paper ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        const cached = papersCache.data?.find((p) => p.id === id);
        if (cached) { setPaper(cached); setLoading(false); return; }

        const { data, error: err } = await supabase
          .from("papers")
          .select("id, title, authors, year, course_or_program, abstract, file_path, created_at")
          .eq("id", id)
          .single();

        if (err) throw err;
        if (!data) throw new Error("Paper not found.");

        let publicUrl = null;
        if (data.file_path) {
          const { data: u } = supabase.storage.from(BUCKET).getPublicUrl(data.file_path);
          publicUrl = u?.publicUrl ?? null;
        }

        setPaper({ ...data, publicUrl });
      } catch (e) {
        setError(e.message || "Failed to load paper.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Fetch bookmark status ──────────────────────────────────
  useEffect(() => {
    if (!user || !id) { setIsSaved(false); setBmId(null); return; }
    const load = async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("paper_id", id)
        .maybeSingle();
      if (data) { setIsSaved(true); setBmId(data.id); }
    };
    load();
  }, [user, id]);

  // ── Toggle bookmark ────────────────────────────────────────
  const toggleBookmark = useCallback(async () => {
    if (!user) { setShowLogin(true); return; }
    if (bmBusy) return;
    setBmBusy(true);
    try {
      if (isSaved) {
        const { error } = await supabase.from("bookmarks").delete().eq("id", bmId);
        if (error) throw error;
        setIsSaved(false); setBmId(null);
      } else {
        const { data, error } = await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, paper_id: id })
          .select("id")
          .single();
        if (error) throw error;
        setIsSaved(true); setBmId(data.id);
      }
    } catch (e) {
      console.error("Bookmark error:", e.message);
    } finally {
      setBmBusy(false);
    }
  }, [user, isSaved, bmId, bmBusy, id]);

  const handlePdfClick = (e) => { if (!user) { e.preventDefault(); setShowLogin(true); } };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .rd-page {
          min-height: 100vh;
          background: #f8f9fa;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .rd-breadcrumb {
          padding: 14px 40px;
          font-size: 13px;
          color: #70757a;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid #e8eaed;
          background: #fff;
        }
        .rd-breadcrumb a { color: #1a73e8; text-decoration: none; font-weight: 500; }
        .rd-breadcrumb a:hover { text-decoration: underline; }
        .rd-breadcrumb-sep { color: #dadce0; }

        .rd-body {
          max-width: 860px;
          margin: 0 auto;
          padding: 36px 40px 80px;
        }

        .rd-card {
          background: #fff;
          border: 1px solid #e8eaed;
          border-radius: 12px;
          padding: 36px 40px;
          animation: rdFadeUp 0.3s ease both;
        }
        @keyframes rdFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .rd-program-pill {
          display: inline-block;
          background: #e8f0fe;
          color: #1a73e8;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 12px;
          margin-bottom: 14px;
          letter-spacing: 0.03em;
        }

        .rd-title {
          font-family: 'DM Serif Display', serif;
          font-size: 26px;
          color: #202124;
          line-height: 1.35;
          margin-bottom: 14px;
        }

        .rd-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 0;
          font-size: 13px;
          color: #5f6368;
          margin-bottom: 24px;
        }
        .rd-meta-sep { margin: 0 8px; color: #dadce0; }
        .rd-year-pill {
          background: #e8f5e9;
          color: #2e7d32;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .rd-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #f1f3f4;
        }

        .rd-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 20px;
          background: #1a73e8;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .rd-btn-primary:hover { background: #1557b0; box-shadow: 0 2px 8px rgba(26,115,232,.25); }

        .rd-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 18px;
          background: #fff;
          color: #3c4043;
          border: 1.5px solid #dadce0;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .rd-btn-outline:hover { border-color: #1a73e8; color: #1a73e8; }
        .rd-btn-outline.saved { color: #1a73e8; border-color: #1a73e8; background: #e8f0fe; }
        .rd-btn-outline.saved:hover { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
        .rd-btn-outline:disabled { opacity: 0.5; cursor: default; }

        .rd-section { margin-bottom: 28px; }
        .rd-section-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #80868b;
          margin-bottom: 10px;
        }
        .rd-abstract {
          font-size: 14.5px;
          color: #3c4043;
          line-height: 1.72;
        }

        .rd-author-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .rd-author-chip {
          background: #f1f3f4;
          color: #3c4043;
          font-size: 13px;
          font-weight: 500;
          padding: 5px 13px;
          border-radius: 20px;
        }

        .rd-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .rd-meta-item-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #9aa0a6;
          margin-bottom: 4px;
        }
        .rd-meta-item-value {
          font-size: 13.5px;
          color: #202124;
          font-weight: 500;
        }

        .rd-pdf-strip {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #f8f9fa;
          border: 1px solid #e8eaed;
          border-radius: 8px;
          padding: 14px 18px;
          margin-top: 28px;
        }
        .rd-pdf-icon { flex-shrink: 0; }
        .rd-pdf-info { flex: 1; min-width: 0; }
        .rd-pdf-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #202124;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        .rd-pdf-sub { font-size: 12px; color: #70757a; }

        .rd-skel {
          border-radius: 6px;
          background: linear-gradient(90deg, #efefef 25%, #e6e6e6 50%, #efefef 75%);
          background-size: 900px 100%;
          animation: rdShimmer 1.4s infinite linear;
        }
        @keyframes rdShimmer {
          0%   { background-position: -900px 0; }
          100% { background-position:  900px 0; }
        }

        .rd-error-wrap { text-align: center; padding: 80px 40px; }
        .rd-error-icon { margin: 0 auto 16px; opacity: 0.3; }
        .rd-error-title { font-size: 18px; font-weight: 600; color: #202124; margin-bottom: 6px; }
        .rd-error-sub { font-size: 14px; color: #70757a; margin-bottom: 24px; }
        .rd-back-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13.5px; font-weight: 600; color: #1a73e8;
          text-decoration: none;
        }
        .rd-back-link:hover { text-decoration: underline; }

        @media (max-width: 640px) {
          .rd-body { padding: 20px 16px 60px; }
          .rd-card { padding: 24px 20px; }
          .rd-title { font-size: 21px; }
          .rd-breadcrumb { padding: 12px 16px; }
        }
      `}</style>

      <div className="rd-page">
        <Navbar onLoginClick={() => setShowLogin(true)} />

        <nav className="rd-breadcrumb" aria-label="Breadcrumb">
          <Link to="/papers">Papers</Link>
          <span className="rd-breadcrumb-sep">›</span>
          <span>
            {loading ? "Loading…" : (paper?.title?.slice(0, 60) ?? "Not found")}
            {paper?.title?.length > 60 ? "…" : ""}
          </span>
        </nav>

        <div className="rd-body">

          {loading && (
            <div className="rd-card">
              <div className="rd-skel" style={{ height: 14, width: "22%", marginBottom: 16 }} />
              <div className="rd-skel" style={{ height: 30, width: "80%", marginBottom: 10 }} />
              <div className="rd-skel" style={{ height: 30, width: "55%", marginBottom: 20 }} />
              <div className="rd-skel" style={{ height: 14, width: "40%", marginBottom: 32 }} />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rd-skel" style={{ height: 14, width: `${85 - i * 8}%`, marginBottom: 8 }} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rd-error-wrap">
              <svg className="rd-error-icon" width="52" height="52" viewBox="0 0 24 24"
                fill="none" stroke="#9aa0a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <div className="rd-error-title">Paper not found</div>
              <div className="rd-error-sub">{error}</div>
              <Link to="/papers" className="rd-back-link">← Back to Papers</Link>
            </div>
          )}

          {!loading && paper && (
            <div className="rd-card">

              {paper.course_or_program && (
                <div className="rd-program-pill">{paper.course_or_program}</div>
              )}

              <h1 className="rd-title">{paper.title || "Untitled Paper"}</h1>

              <div className="rd-meta">
                {paper.authors?.length > 0 && (
                  <span>{paper.authors.join(", ")}</span>
                )}
                {paper.year && (
                  <>
                    {paper.authors?.length > 0 && <span className="rd-meta-sep">·</span>}
                    <span className="rd-year-pill">{paper.year}</span>
                  </>
                )}
              </div>

              <div className="rd-actions">
                {paper.publicUrl ? (
                  <a
                    href={paper.publicUrl}
                    target={user ? "_blank" : undefined}
                    rel={user ? "noopener noreferrer" : undefined}
                    className="rd-btn-primary"
                    onClick={handlePdfClick}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {user ? "View Full PDF" : "🔒 Sign in to View PDF"}
                  </a>
                ) : (
                  <button className="rd-btn-primary" disabled style={{ opacity: 0.5, cursor: "default" }}>
                    PDF Unavailable
                  </button>
                )}

                <button
                  className={`rd-btn-outline${isSaved ? " saved" : ""}`}
                  disabled={bmBusy}
                  onClick={toggleBookmark}
                  title={isSaved ? "Remove bookmark" : "Save to bookmarks"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24"
                    fill={isSaved ? "currentColor" : "none"}
                    stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                  {bmBusy ? "Saving…" : isSaved ? "Saved" : "Save"}
                </button>

                <button className="rd-btn-outline" onClick={() => navigate(-1)}>
                  ← Back
                </button>
              </div>

              {paper.abstract && (
                <div className="rd-section">
                  <div className="rd-section-label">Abstract</div>
                  <p className="rd-abstract">{paper.abstract}</p>
                </div>
              )}

              {paper.authors?.length > 0 && (
                <div className="rd-section">
                  <div className="rd-section-label">Authors</div>
                  <div className="rd-author-list">
                    {paper.authors.map((a, i) => (
                      <span key={i} className="rd-author-chip">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rd-section">
                <div className="rd-section-label">Details</div>
                <div className="rd-meta-grid">
                  {paper.year && (
                    <div className="rd-meta-item">
                      <div className="rd-meta-item-label">Year</div>
                      <div className="rd-meta-item-value">{paper.year}</div>
                    </div>
                  )}
                  {paper.course_or_program && (
                    <div className="rd-meta-item">
                      <div className="rd-meta-item-label">Program</div>
                      <div className="rd-meta-item-value">{paper.course_or_program}</div>
                    </div>
                  )}
                  {paper.created_at && (
                    <div className="rd-meta-item">
                      <div className="rd-meta-item-label">Added</div>
                      <div className="rd-meta-item-value">
                        {new Date(paper.created_at).toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric"
                        })}
                      </div>
                    </div>
                  )}
                  <div className="rd-meta-item">
                    <div className="rd-meta-item-label">Type</div>
                    <div className="rd-meta-item-value">Research Paper</div>
                  </div>
                </div>
              </div>

              {paper.publicUrl && (
                <div className="rd-pdf-strip">
                  <div className="rd-pdf-icon">
                    <svg width="32" height="40" viewBox="0 0 28 34" fill="none">
                      <rect x="1" y="1" width="26" height="32" rx="3" fill="#fff" stroke="#dadce0" strokeWidth="1.5"/>
                      <path d="M17 1v8h8" fill="none" stroke="#dadce0" strokeWidth="1.5" strokeLinejoin="round"/>
                      <rect x="4" y="17" width="20" height="10" rx="2" fill="#c62828"/>
                      <text x="14" y="25.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="800"
                        fontFamily="'DM Sans',sans-serif" letterSpacing="0.5">PDF</text>
                      <line x1="6" y1="13" x2="22" y2="13" stroke="#e0e0e0" strokeWidth="1.2"/>
                      <line x1="6" y1="10" x2="14" y2="10" stroke="#e0e0e0" strokeWidth="1.2"/>
                    </svg>
                  </div>
                  <div className="rd-pdf-info">
                    <div className="rd-pdf-name">{paper.title || "Research Paper"}.pdf</div>
                    <div className="rd-pdf-sub">dlsl.edu.ph · Full text available</div>
                  </div>
                  <a
                    href={paper.publicUrl}
                    target={user ? "_blank" : undefined}
                    rel={user ? "noopener noreferrer" : undefined}
                    className="rd-btn-primary"
                    style={{ flexShrink: 0 }}
                    onClick={handlePdfClick}
                  >
                    Open
                  </a>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}