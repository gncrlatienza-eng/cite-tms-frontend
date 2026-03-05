import { useEffect, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "./LoginPage";
import { supabase } from "../../services/supabase";

const PAPERS_BUCKET = "cite-tms-backend-bucket";
const papersCache = { data: null };

export default function PapersPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [activeTimeFilter, setActiveTimeFilter] = useState("any");
  const [sortBy, setSortBy] = useState("relevance");
  const [customFromYear, setCustomFromYear] = useState("");
  const [customToYear, setCustomToYear] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (papersCache.data) {
          setPapers(papersCache.data);
          setLoading(false);
          return;
        }
        const { data, error: err } = await supabase
          .from("papers")
          .select("id, title, authors, year, course_or_program, abstract, file_path")
          .order("created_at", { ascending: false });

        if (err) throw err;

        const withUrls =
          data?.map((paper) => {
            if (!paper.file_path) return { ...paper, publicUrl: null };
            const { data: urlData } = supabase.storage
              .from(PAPERS_BUCKET)
              .getPublicUrl(paper.file_path);
            return { ...paper, publicUrl: urlData?.publicUrl ?? null };
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

  const handleSearch = () => {
    setSearchQuery(inputValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const processedPapers = (() => {
    let result = [...papers];
    result = result.filter((paper) => {
      const year = typeof paper.year === "number" ? paper.year : Number(paper.year);
      if (!year) return activeTimeFilter === "any";
      if (activeTimeFilter === "since2026") return year >= 2026;
      if (activeTimeFilter === "since2025") return year >= 2025;
      if (activeTimeFilter === "since2022") return year >= 2022;
      if (activeTimeFilter === "custom") {
        const from = customFromYear ? Number(customFromYear) : undefined;
        const to = customToYear ? Number(customToYear) : undefined;
        if (from && to) return year >= from && year <= to;
        if (from) return year >= from;
        if (to) return year <= to;
        return true;
      }
      return true;
    });
    if (sortBy === "date") {
      result.sort((a, b) => {
        const ay = typeof a.year === "number" ? a.year : Number(a.year) || 0;
        const by2 = typeof b.year === "number" ? b.year : Number(b.year) || 0;
        return by2 - ay;
      });
    }
    return result;
  })();

  const filteredPapers = processedPapers.filter((paper) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      paper.title?.toLowerCase().includes(q) ||
      paper.authors?.join(", ").toLowerCase().includes(q) ||
      paper.abstract?.toLowerCase().includes(q) ||
      paper.course_or_program?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sp-page {
          min-height: 100vh;
          background: #f8f9fa;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Hero ── */
        .sp-hero {
          background: #fff;
          border-bottom: 1px solid #e8eaed;
          padding: 20px 0 0;
          width: 100%;
        }
        .sp-hero-inner {
          width: 100%;
          padding: 0 40px;
        }

        .sp-logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .sp-logo-mark {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
        }
        .sp-logo-mark svg { display: block; }
        .sp-logo-text {
          font-family: 'DM Serif Display', serif;
          font-size: 21px;
          color: #202124;
          letter-spacing: -0.2px;
        }
        .sp-logo-text span { color: #1a73e8; }

        .sp-search-row {
          display: flex;
          align-items: center;
          margin-bottom: 18px;
          max-width: 680px;
        }
        .sp-search-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 12px;
          background: #f1f3f4;
          padding: 10px 16px;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .sp-search-wrap:focus-within {
          background: #e8eaed;
          box-shadow: 0 0 0 2px #1a73e833;
        }
        .sp-search-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          color: #9aa0a6;
          pointer-events: none;
        }
        .sp-search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          color: #202124;
          background: transparent;
          min-width: 0;
        }
        .sp-search-input::placeholder { color: #9aa0a6; }
        .sp-search-clear {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          background: none;
          border: none;
          cursor: pointer;
          color: #9aa0a6;
          padding: 0;
          transition: color 0.15s;
        }
        .sp-search-clear:hover { color: #5f6368; }

        .sp-tabs { display: flex; }
        .sp-tab {
          padding: 10px 18px;
          font-size: 13px; font-weight: 500;
          color: #5f6368;
          border: none; background: none; cursor: pointer;
          border-bottom: 3px solid transparent;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
        }
        .sp-tab.active { color: #1a73e8; border-bottom-color: #1a73e8; }
        .sp-tab:hover { color: #202124; }

        /* ── Body ── */
        .sp-body {
          width: 100%;
          padding: 24px 40px 60px;
          display: grid;
          grid-template-columns: 180px 1fr;
          gap: 40px;
        }

        /* ── Sidebar ── */
        .sp-sidebar { padding-top: 2px; }
        .sp-sb-section { margin-bottom: 20px; }
        .sp-sb-label {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: #80868b;
          margin-bottom: 6px; padding-left: 10px;
        }
        .sp-sb-btn {
          display: block; width: 100%; text-align: left;
          padding: 6px 10px; border-radius: 20px;
          border: none; background: none;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          color: #3c4043; cursor: pointer;
          transition: background 0.12s, color 0.12s;
        }
        .sp-sb-btn:hover { background: #f1f3f4; }
        .sp-sb-btn.active { background: #e8f0fe; color: #1a73e8; font-weight: 600; }

        .sp-divider { border: none; border-top: 1px solid #e8eaed; margin: 14px 0; }

        .sp-custom-range {
          display: flex; align-items: center; gap: 6px;
          margin-top: 8px; padding: 0 10px;
        }
        .sp-custom-range input {
          width: 54px; padding: 4px 6px;
          border: 1px solid #dadce0; border-radius: 6px;
          font-size: 12px; font-family: 'DM Sans', sans-serif;
          color: #202124; outline: none;
        }
        .sp-custom-range input:focus { border-color: #1a73e8; }

        .sp-check-row {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 10px; font-size: 13px; color: #3c4043;
          cursor: pointer; border-radius: 20px;
          transition: background 0.12s;
        }
        .sp-check-row:hover { background: #f1f3f4; }
        .sp-check-row input[type="checkbox"] {
          accent-color: #1a73e8; width: 14px; height: 14px; cursor: pointer;
        }

        /* ── Results ── */
        .sp-results-meta {
          font-size: 13px; color: #70757a; margin-bottom: 14px;
        }
        .sp-results-meta strong { color: #202124; }

        .sp-result {
          display: flex; gap: 20px;
          padding: 16px 0;
          border-bottom: 1px solid #e8eaed;
          animation: spFadeUp 0.25s ease both;
        }
        @keyframes spFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .sp-result-main { flex: 1; min-width: 0; }

        .sp-result-title {
          font-size: 17px;
          font-family: 'DM Serif Display', serif;
          color: #1a0dab;
          text-decoration: none;
          line-height: 1.35;
          display: block;
          margin-bottom: 3px;
          transition: color 0.15s;
        }
        .sp-result-title:hover { color: #1557b0; text-decoration: underline; }

        .sp-result-meta {
          font-size: 12.5px; color: #006621;
          margin-bottom: 6px;
          display: flex; align-items: center; flex-wrap: wrap; gap: 3px;
        }
        .sp-dot { color: #bbb; }
        .sp-year-pill {
          background: #e8f5e9; color: #2e7d32;
          font-size: 10.5px; font-weight: 700;
          padding: 1px 7px; border-radius: 10px; margin-left: 3px;
        }
        .sp-prog-pill {
          background: #e8f0fe; color: #1a73e8;
          font-size: 10.5px; font-weight: 600;
          padding: 1px 7px; border-radius: 10px; margin-left: 3px;
        }

        .sp-snippet {
          font-size: 13.5px; color: #3c4043;
          line-height: 1.58; margin-bottom: 9px;
        }

        .sp-actions {
          display: flex; align-items: center;
          gap: 14px; flex-wrap: wrap;
        }
        .sp-action-link {
          font-size: 12.5px; color: #1a73e8;
          text-decoration: none; font-weight: 500;
          display: flex; align-items: center; gap: 4px;
          transition: color 0.15s;
        }
        .sp-action-link:hover { color: #1557b0; text-decoration: underline; }
        .sp-action-muted { font-size: 12.5px; color: #9aa0a6; }

        /* PDF tile — no emoji */
        .sp-pdf-tile {
          flex-shrink: 0;
          display: inline-flex; flex-direction: column;
          align-items: center; justify-content: center;
          width: 72px; padding: 10px 6px 8px;
          border: 1px solid #dadce0; border-radius: 8px;
          background: #fff; text-decoration: none;
          transition: box-shadow 0.15s, border-color 0.15s;
          gap: 4px;
        }
        .sp-pdf-tile:hover {
          box-shadow: 0 2px 8px rgba(32,33,36,.15);
          border-color: #1a73e8;
        }
        .sp-pdf-icon {
          width: 28px; height: 34px;
          display: flex; flex-direction: column;
          position: relative;
        }
        .sp-pdf-icon svg { display: block; }
        .sp-pdf-label {
          font-size: 10px; font-weight: 800;
          color: #c62828; letter-spacing: 0.05em;
          line-height: 1;
        }
        .sp-pdf-src {
          font-size: 9px; color: #70757a;
          max-width: 66px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }

        /* Skeleton */
        .sp-skel-card { padding: 16px 0; border-bottom: 1px solid #e8eaed; }
        .sp-skel {
          border-radius: 4px;
          background: linear-gradient(90deg, #efefef 25%, #e6e6e6 50%, #efefef 75%);
          background-size: 900px 100%;
          animation: spShimmer 1.4s infinite linear;
        }
        @keyframes spShimmer {
          0%   { background-position: -900px 0; }
          100% { background-position:  900px 0; }
        }
        .sp-skel-t  { height: 20px; width: 58%; margin-bottom: 9px; }
        .sp-skel-m  { height: 13px; width: 32%; margin-bottom: 9px; }
        .sp-skel-l1 { height: 13px; width: 92%; margin-bottom: 5px; }
        .sp-skel-l2 { height: 13px; width: 68%; }

        /* Empty */
        .sp-empty { padding: 56px 0; text-align: center; }
        .sp-empty-icon {
          width: 48px; height: 48px; margin: 0 auto 14px;
          opacity: 0.25;
        }
        .sp-empty-text { font-size: 14px; color: #70757a; }

        /* Error */
        .sp-error {
          padding: 14px 16px; background: #fef2f2;
          border-radius: 8px; color: #b91c1c;
          font-size: 13px; border: 1px solid #fecaca;
        }

        @media (max-width: 768px) {
          .sp-body { grid-template-columns: 1fr; padding: 16px 20px; }
          .sp-sidebar { display: none; }
          .sp-hero-inner { padding: 0 20px; }
        }
      `}</style>

      <div className="sp-page">
        <Navbar onLoginClick={() => setShowLogin(true)} />

        {/* ── Hero ── */}
        <div className="sp-hero">
          <div className="sp-hero-inner">
            <div className="sp-logo-row">
              <div className="sp-logo-mark">
                {/* Book / scholar icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <div className="sp-logo-text">CITE <span>Thesis Management System</span></div>
            </div>

            <div className="sp-search-row">
              <div className="sp-search-wrap">
                {/* Magnifier icon inside the bar */}
                <span className="sp-search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
                <input
                  className="sp-search-input"
                  type="text"
                  placeholder="Search papers, authors, topics…"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                {/* Clear button — only shows when there's text */}
                {inputValue && (
                  <button
                    className="sp-search-clear"
                    type="button"
                    onClick={() => { setInputValue(""); setSearchQuery(""); }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
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
              {[
                { key: "any",       label: "Any time"      },
                { key: "since2026", label: "Since 2026"    },
                { key: "since2025", label: "Since 2025"    },
                { key: "since2022", label: "Since 2022"    },
                { key: "custom",    label: "Custom range…" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`sp-sb-btn${activeTimeFilter === key ? " active" : ""}`}
                  onClick={() => setActiveTimeFilter(key)}
                >
                  {label}
                </button>
              ))}
              {activeTimeFilter === "custom" && (
                <div className="sp-custom-range">
                  <input
                    type="number"
                    placeholder="From"
                    value={customFromYear}
                    onChange={(e) => setCustomFromYear(e.target.value)}
                  />
                  <span style={{ fontSize: "12px", color: "#9aa0a6" }}>–</span>
                  <input
                    type="number"
                    placeholder="To"
                    value={customToYear}
                    onChange={(e) => setCustomToYear(e.target.value)}
                  />
                </div>
              )}
            </div>

            <hr className="sp-divider" />

            <div className="sp-sb-section">
              <div className="sp-sb-label">Sort by</div>
              {[
                { key: "relevance", label: "Relevance" },
                { key: "date",      label: "Date"       },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`sp-sb-btn${sortBy === key ? " active" : ""}`}
                  onClick={() => setSortBy(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <hr className="sp-divider" />

            <div className="sp-sb-section">
              <div className="sp-sb-label">Show</div>
              <label className="sp-check-row">
                <input type="checkbox" defaultChecked /> Include theses
              </label>
              <label className="sp-check-row">
                <input type="checkbox" defaultChecked /> Include conference papers
              </label>
            </div>
          </aside>

          {/* Results */}
          <main>
            {!loading && !error && (
              <div className="sp-results-meta">
                About <strong>{filteredPapers.length.toLocaleString()}</strong>{" "}
                result{filteredPapers.length !== 1 ? "s" : ""}
                {searchQuery.trim() && (
                  <> for <em>"{searchQuery}"</em></>
                )}
              </div>
            )}

            {/* Skeleton */}
            {loading && [1, 2, 3, 4].map((i) => (
              <div className="sp-skel-card" key={i}>
                <div className="sp-skel sp-skel-t" />
                <div className="sp-skel sp-skel-m" />
                <div className="sp-skel sp-skel-l1" />
                <div className="sp-skel sp-skel-l2" />
              </div>
            ))}

            {!loading && error && (
              <div className="sp-error">{error}</div>
            )}

            {!loading && !error && filteredPapers.length === 0 && (
              <div className="sp-empty">
                <svg className="sp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <div className="sp-empty-text">
                  {papers.length === 0
                    ? "No papers have been uploaded yet."
                    : "No papers match your search."}
                </div>
              </div>
            )}

            {!loading && !error && filteredPapers.map((paper, i) => (
              <article
                className="sp-result"
                key={paper.id}
                style={{ animationDelay: `${i * 0.035}s` }}
              >
                <div className="sp-result-main">
                  <a
                    href={paper.publicUrl || "#"}
                    target={paper.publicUrl ? "_blank" : undefined}
                    rel={paper.publicUrl ? "noopener noreferrer" : undefined}
                    className="sp-result-title"
                  >
                    {paper.title || "Untitled paper"}
                  </a>

                  <div className="sp-result-meta">
                    {paper.authors?.length > 0 && (
                      <span>{paper.authors.join(", ")}</span>
                    )}
                    {paper.year && (
                      <>
                        {paper.authors?.length > 0 && <span className="sp-dot"> · </span>}
                        <span>{paper.year}</span>
                        <span className="sp-year-pill">{paper.year}</span>
                      </>
                    )}
                    {paper.course_or_program && (
                      <>
                        <span className="sp-dot"> · </span>
                        <span className="sp-prog-pill">{paper.course_or_program}</span>
                      </>
                    )}
                  </div>

                  {paper.abstract && (
                    <p className="sp-snippet">
                      {paper.abstract.length > 280
                        ? `${paper.abstract.slice(0, 280)}…`
                        : paper.abstract}
                    </p>
                  )}

                  <div className="sp-actions">
                    {paper.publicUrl && (
                      <a
                        href={paper.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sp-action-link"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        View PDF
                      </a>
                    )}
                    <span className="sp-action-muted">Cited by — coming soon</span>
                    <span className="sp-action-muted">Related articles</span>
                  </div>
                </div>

                {/* PDF tile — SVG icon, no emoji */}
                {paper.publicUrl && (
                  <a
                    href={paper.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sp-pdf-tile"
                  >
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