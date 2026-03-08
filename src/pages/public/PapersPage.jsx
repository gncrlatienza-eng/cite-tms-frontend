import { useEffect, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "./LoginPage";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";

const BUCKET = "cite-tms-backend-bucket";
export const papersCache = { data: null }; // exported so AdminDashboard can bust it

const TIME_FILTERS = [
  { key: "any",       label: "Any time"      },
  { key: "since2026", label: "Since 2026"    },
  { key: "since2025", label: "Since 2025"    },
  { key: "since2022", label: "Since 2022"    },
  { key: "custom",    label: "Custom range…" },
];

const SORT_OPTIONS = [
  { key: "relevance", label: "Relevance" },
  { key: "date",      label: "Date"       },
];

export default function PapersPage() {
  const { user } = useAuth();
  const [papers, setPapers]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [showLogin, setShowLogin]         = useState(false);
  const [query, setQuery]                 = useState("");
  const [timeFilter, setTimeFilter]       = useState("any");
  const [sortBy, setSortBy]               = useState("relevance");
  const [fromYear, setFromYear]           = useState("");
  const [toYear, setToYear]               = useState("");

  // ── fetch ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        if (papersCache.data) { setPapers(papersCache.data); return; }
        const { data, error: err } = await supabase
          .from("papers")
          .select("id, title, authors, year, course_or_program, abstract, file_path")
          .order("created_at", { ascending: false });
        if (err) throw err;
        const withUrls = data?.map((p) => {
          if (!p.file_path) return { ...p, publicUrl: null };
          const { data: u } = supabase.storage.from(BUCKET).getPublicUrl(p.file_path);
          return { ...p, publicUrl: u?.publicUrl ?? null };
        }) ?? [];
        papersCache.data = withUrls;
        setPapers(withUrls);
      } catch (e) {
        setError(e.message || "Failed to load papers.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── filter + sort ───────────────────────────────────────────
  const displayed = papers
    .filter((p) => {
      const yr = Number(p.year);
      if (!yr) return timeFilter === "any";
      if (timeFilter === "since2026") return yr >= 2026;
      if (timeFilter === "since2025") return yr >= 2025;
      if (timeFilter === "since2022") return yr >= 2022;
      if (timeFilter === "custom") {
        const from = fromYear ? Number(fromYear) : null;
        const to   = toYear   ? Number(toYear)   : null;
        return (!from || yr >= from) && (!to || yr <= to);
      }
      return true;
    })
    .filter((p) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.authors?.join(", ").toLowerCase().includes(q) ||
        p.abstract?.toLowerCase().includes(q) ||
        p.course_or_program?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => sortBy === "date"
      ? (Number(b.year) || 0) - (Number(a.year) || 0)
      : 0
    );

  const handlePdfClick = (e) => { if (!user) { e.preventDefault(); setShowLogin(true); } };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .sp-page { min-height:100vh; background:#f8f9fa; font-family:'DM Sans',system-ui,sans-serif; }

        /* ── Hero ── */
        .sp-hero { background:#fff; border-bottom:1px solid #e8eaed; padding:18px 0 0; }
        .sp-hero-inner { padding:0 40px; }

        /* title + search on same row */
        .sp-top-row {
          display:flex; align-items:center; gap:20px;
          margin-bottom:16px; flex-wrap:wrap;
        }
        .sp-logo-wrap { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .sp-logo-mark {
          width:32px; height:32px;
          background:linear-gradient(135deg,#1a73e8,#0d47a1);
          border-radius:7px; display:flex; align-items:center; justify-content:center;
        }
        .sp-logo-text {
          font-family:'DM Serif Display',serif; font-size:18px;
          color:#202124; letter-spacing:-0.2px; white-space:nowrap;
        }
        .sp-logo-text span { color:#1a73e8; }

        .sp-search-wrap {
          flex:1; min-width:220px; max-width:580px;
          display:flex; align-items:center; gap:8px;
          border-radius:24px; background:#f1f3f4;
          padding:9px 16px;
          transition:background 0.2s, box-shadow 0.2s;
        }
        .sp-search-wrap:focus-within { background:#e8eaed; box-shadow:0 0 0 2px #1a73e833; }
        .sp-search-icon { flex-shrink:0; color:#9aa0a6; display:flex; pointer-events:none; }
        .sp-search-input {
          flex:1; border:none; outline:none; font-size:14px;
          font-family:'DM Sans',sans-serif; color:#202124;
          background:transparent; min-width:0;
        }
        .sp-search-input::placeholder { color:#9aa0a6; }
        .sp-search-clear {
          flex-shrink:0; background:none; border:none; cursor:pointer;
          color:#9aa0a6; padding:0; display:flex; transition:color 0.15s;
        }
        .sp-search-clear:hover { color:#5f6368; }

        .sp-tabs { display:flex; }
        .sp-tab {
          padding:9px 18px; font-size:13px; font-weight:500; color:#5f6368;
          border:none; background:none; cursor:pointer;
          border-bottom:3px solid transparent;
          font-family:'DM Sans',sans-serif; transition:color 0.15s;
        }
        .sp-tab.active { color:#1a73e8; border-bottom-color:#1a73e8; }
        .sp-tab:hover { color:#202124; }

        /* ── Body ── */
        .sp-body { padding:24px 40px 60px; display:grid; grid-template-columns:180px 1fr; gap:40px; }

        /* ── Sidebar ── */
        .sp-sidebar { padding-top:2px; }
        .sp-sb-section { margin-bottom:20px; }
        .sp-sb-label {
          font-size:11px; font-weight:600; text-transform:uppercase;
          letter-spacing:0.08em; color:#80868b; margin-bottom:6px; padding-left:10px;
        }
        .sp-sb-btn {
          display:block; width:100%; text-align:left;
          padding:6px 10px; border-radius:20px; border:none; background:none;
          font-size:13px; font-family:'DM Sans',sans-serif; color:#3c4043;
          cursor:pointer; transition:background 0.12s, color 0.12s;
        }
        .sp-sb-btn:hover { background:#f1f3f4; }
        .sp-sb-btn.active { background:#e8f0fe; color:#1a73e8; font-weight:600; }

        .sp-divider { border:none; border-top:1px solid #e8eaed; margin:14px 0; }

        /* ── Custom range fix ── */
        .sp-custom-range {
          display:flex; align-items:center; gap:6px;
          margin-top:8px; padding:0 10px;
        }
        .sp-custom-range input {
          width:54px; padding:4px 6px;
          border:1px solid #dadce0; border-radius:6px;
          font-size:12px; font-family:'DM Sans',sans-serif;
          color:#202124; background:#fff; outline:none;
          -moz-appearance:textfield;
        }
        .sp-custom-range input::-webkit-outer-spin-button,
        .sp-custom-range input::-webkit-inner-spin-button { -webkit-appearance:none; }
        .sp-custom-range input:focus { border-color:#1a73e8; }
        .sp-range-sep { font-size:12px; color:#9aa0a6; }

        .sp-check-row {
          display:flex; align-items:center; gap:8px;
          padding:5px 10px; font-size:13px; color:#3c4043;
          cursor:pointer; border-radius:20px; transition:background 0.12s;
        }
        .sp-check-row:hover { background:#f1f3f4; }
        .sp-check-row input[type="checkbox"] { accent-color:#1a73e8; width:14px; height:14px; cursor:pointer; }

        /* ── Results ── */
        .sp-results-meta { font-size:13px; color:#70757a; margin-bottom:14px; }
        .sp-results-meta strong { color:#202124; }

        .sp-result {
          display:flex; gap:20px; padding:16px 0;
          border-bottom:1px solid #e8eaed;
          animation:spFadeUp 0.25s ease both;
        }
        @keyframes spFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .sp-result-main { flex:1; min-width:0; }

        .sp-result-title {
          font-size:17px; font-family:'DM Serif Display',serif; color:#1a0dab;
          text-decoration:none; line-height:1.35; display:block; margin-bottom:3px;
          transition:color 0.15s;
        }
        .sp-result-title:hover { color:#1557b0; text-decoration:underline; }

        .sp-result-meta {
          font-size:12.5px; color:#006621; margin-bottom:6px;
          display:flex; align-items:center; flex-wrap:wrap; gap:3px;
        }
        .sp-dot { color:#bbb; }
        .sp-year-pill {
          background:#e8f5e9; color:#2e7d32; font-size:10.5px; font-weight:700;
          padding:1px 7px; border-radius:10px; margin-left:3px;
        }
        .sp-prog-pill {
          background:#e8f0fe; color:#1a73e8; font-size:10.5px; font-weight:600;
          padding:1px 7px; border-radius:10px; margin-left:3px;
        }

        .sp-snippet { font-size:13.5px; color:#3c4043; line-height:1.58; margin-bottom:9px; }

        .sp-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
        .sp-action-link {
          font-size:12.5px; color:#1a73e8; text-decoration:none; font-weight:500;
          display:flex; align-items:center; gap:4px; transition:color 0.15s;
        }
        .sp-action-link:hover { color:#1557b0; text-decoration:underline; }
        .sp-action-muted { font-size:12.5px; color:#9aa0a6; }

        .sp-pdf-tile {
          flex-shrink:0; display:inline-flex; flex-direction:column;
          align-items:center; justify-content:center;
          width:72px; padding:10px 6px 8px; gap:4px;
          border:1px solid #dadce0; border-radius:8px;
          background:#fff; text-decoration:none;
          transition:box-shadow 0.15s, border-color 0.15s;
        }
        .sp-pdf-tile:hover { box-shadow:0 2px 8px rgba(32,33,36,.15); border-color:#1a73e8; }
        .sp-pdf-src { font-size:9px; color:#70757a; max-width:66px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* skeleton */
        .sp-skel-card { padding:16px 0; border-bottom:1px solid #e8eaed; }
        .sp-skel {
          border-radius:4px;
          background:linear-gradient(90deg,#efefef 25%,#e6e6e6 50%,#efefef 75%);
          background-size:900px 100%; animation:spShimmer 1.4s infinite linear;
        }
        @keyframes spShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .sp-skel-t  { height:20px; width:58%; margin-bottom:9px; }
        .sp-skel-m  { height:13px; width:32%; margin-bottom:9px; }
        .sp-skel-l1 { height:13px; width:92%; margin-bottom:5px; }
        .sp-skel-l2 { height:13px; width:68%; }

        .sp-empty { padding:56px 0; text-align:center; }
        .sp-empty-icon { width:48px; height:48px; margin:0 auto 14px; opacity:0.25; }
        .sp-empty-text { font-size:14px; color:#70757a; }
        .sp-error {
          padding:14px 16px; background:#fef2f2; border-radius:8px;
          color:#b91c1c; font-size:13px; border:1px solid #fecaca;
        }

        @media (max-width:768px) {
          .sp-body { grid-template-columns:1fr; padding:16px 20px; }
          .sp-sidebar { display:none; }
          .sp-hero-inner { padding:0 20px; }
          .sp-top-row { gap:12px; }
        }
      `}</style>

      <div className="sp-page">
        <Navbar onLoginClick={() => setShowLogin(true)} />

        {/* ── Hero ── */}
        <div className="sp-hero">
          <div className="sp-hero-inner">

            {/* Logo + Search on same row */}
            <div className="sp-top-row">
              <div className="sp-logo-wrap">
                <div className="sp-logo-mark">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <div className="sp-logo-text">CITE <span>TMS</span></div>
              </div>

              <div className="sp-search-wrap">
                <span className="sp-search-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
                <input className="sp-search-input" type="text"
                  placeholder="Search papers, authors, topics…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setQuery(e.target.value)}
                  autoComplete="off" />
                {query && (
                  <button className="sp-search-clear" type="button" onClick={() => setQuery("")}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="sp-tabs">
              <button className="sp-tab active" type="button">Articles</button>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="sp-body">

          {/* Sidebar */}
          <aside className="sp-sidebar">
            <div className="sp-sb-section">
              <div className="sp-sb-label">Time period</div>
              {TIME_FILTERS.map(({ key, label }) => (
                <button key={key} type="button"
                  className={`sp-sb-btn${timeFilter === key ? " active" : ""}`}
                  onClick={() => setTimeFilter(key)}>
                  {label}
                </button>
              ))}
              {timeFilter === "custom" && (
                <div className="sp-custom-range">
                  <input type="number" placeholder="From" value={fromYear}
                    onChange={(e) => setFromYear(e.target.value)} />
                  <span className="sp-range-sep">–</span>
                  <input type="number" placeholder="To" value={toYear}
                    onChange={(e) => setToYear(e.target.value)} />
                </div>
              )}
            </div>

            <hr className="sp-divider" />

            <div className="sp-sb-section">
              <div className="sp-sb-label">Sort by</div>
              {SORT_OPTIONS.map(({ key, label }) => (
                <button key={key} type="button"
                  className={`sp-sb-btn${sortBy === key ? " active" : ""}`}
                  onClick={() => setSortBy(key)}>
                  {label}
                </button>
              ))}
            </div>

            <hr className="sp-divider" />

            <div className="sp-sb-section">
              <div className="sp-sb-label">Show</div>
              <label className="sp-check-row"><input type="checkbox" defaultChecked /> Include theses</label>
              <label className="sp-check-row"><input type="checkbox" defaultChecked /> Include conference papers</label>
            </div>
          </aside>

          {/* Results */}
          <main>
            {!loading && !error && (
              <div className="sp-results-meta">
                About <strong>{displayed.length.toLocaleString()}</strong>{" "}
                result{displayed.length !== 1 ? "s" : ""}
                {query.trim() && <> for <em>"{query}"</em></>}
              </div>
            )}

            {loading && [1,2,3,4].map((i) => (
              <div className="sp-skel-card" key={i}>
                <div className="sp-skel sp-skel-t" />
                <div className="sp-skel sp-skel-m" />
                <div className="sp-skel sp-skel-l1" />
                <div className="sp-skel sp-skel-l2" />
              </div>
            ))}

            {!loading && error && <div className="sp-error">{error}</div>}

            {!loading && !error && displayed.length === 0 && (
              <div className="sp-empty">
                <svg className="sp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <div className="sp-empty-text">
                  {papers.length === 0 ? "No papers have been uploaded yet." : "No papers match your search."}
                </div>
              </div>
            )}

            {!loading && !error && displayed.map((paper, i) => (
              <article className="sp-result" key={paper.id} style={{ animationDelay: `${i * 0.035}s` }}>
                <div className="sp-result-main">
                  <a href={paper.publicUrl || "#"}
                    target={paper.publicUrl && user ? "_blank" : undefined}
                    rel={paper.publicUrl && user ? "noopener noreferrer" : undefined}
                    className="sp-result-title"
                    onClick={(e) => paper.publicUrl && handlePdfClick(e)}>
                    {paper.title || "Untitled paper"}
                  </a>

                  <div className="sp-result-meta">
                    {paper.authors?.length > 0 && <span>{paper.authors.join(", ")}</span>}
                    {paper.year && (
                      <>
                        {paper.authors?.length > 0 && <span className="sp-dot"> · </span>}
                        <span>{paper.year}</span>
                        <span className="sp-year-pill">{paper.year}</span>
                      </>
                    )}
                    {paper.course_or_program && (
                      <><span className="sp-dot"> · </span><span className="sp-prog-pill">{paper.course_or_program}</span></>
                    )}
                  </div>

                  {paper.abstract && (
                    <p className="sp-snippet">
                      {paper.abstract.length > 280 ? `${paper.abstract.slice(0, 280)}…` : paper.abstract}
                    </p>
                  )}

                  <div className="sp-actions">
                    {paper.publicUrl && (
                      <a href={paper.publicUrl}
                        target={user ? "_blank" : undefined}
                        rel={user ? "noopener noreferrer" : undefined}
                        className="sp-action-link" onClick={handlePdfClick}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {user ? "View PDF" : "🔒 Sign in to view"}
                      </a>
                    )}
                    <span className="sp-action-muted">Cited by — coming soon</span>
                    <span className="sp-action-muted">Related articles</span>
                  </div>
                </div>

                {paper.publicUrl && (
                  <a href={paper.publicUrl}
                    target={user ? "_blank" : undefined}
                    rel={user ? "noopener noreferrer" : undefined}
                    className="sp-pdf-tile" onClick={handlePdfClick}>
                    <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
                      <rect x="1" y="1" width="26" height="32" rx="3" fill="#fff" stroke="#dadce0" strokeWidth="1.5"/>
                      <path d="M17 1v8h8" fill="none" stroke="#dadce0" strokeWidth="1.5" strokeLinejoin="round"/>
                      <rect x="4" y="17" width="20" height="10" rx="2" fill="#c62828"/>
                      <text x="14" y="25.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="'DM Sans',sans-serif" letterSpacing="0.5">PDF</text>
                      <line x1="6" y1="13" x2="22" y2="13" stroke="#e0e0e0" strokeWidth="1.2"/>
                      <line x1="6" y1="10" x2="14" y2="10" stroke="#e0e0e0" strokeWidth="1.2"/>
                    </svg>
                    <span className="sp-pdf-src">dlsl.edu.ph</span>
                  </a>
                )}
              </article>
            ))}
          </main>
        </div>
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}