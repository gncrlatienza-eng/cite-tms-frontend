import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "./LoginPage";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import PaperCard from "../../components/papers/PaperCard";
import api from "../../services/api";

const BUCKET = "cite-tms-backend-bucket";
export const papersCache = { data: null };

const TIME_FILTERS = [
  { key: "any",       label: "Any time"     },
  { key: "since2026", label: "Since 2026"   },
  { key: "since2025", label: "Since 2025"   },
  { key: "since2022", label: "Since 2022"   },
  { key: "custom",    label: "Custom range" },
];

const SORT_OPTIONS = [
  { key: "relevance", label: "Relevance"    },
  { key: "date",      label: "Newest first" },
];

const PROGRAM_FILTERS = [
  { key: "all",    label: "All Programs" },
  { key: "BSArch", label: "BSArch"       },
  { key: "BSCpE",  label: "BSCpE"        },
  { key: "BSCS",   label: "BSCS"         },
  { key: "BSEE",   label: "BSEE"         },
  { key: "BSECE",  label: "BSECE"        },
  { key: "BSEMC",  label: "BSEMC"        },
  { key: "BSIE",   label: "BSIE"         },
  { key: "BSIT",   label: "BSIT"         },
];

export default function PapersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // allPapers = full Supabase list (used for non-search browsing + URL merging)
  // papers    = currently displayed list (NLP results OR allPapers)
  const [allPapers, setAllPapers]       = useState([]);
  const [papers, setPapers]             = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [loading, setLoading]           = useState(true);
  const [searching, setSearching]       = useState(false);
  const [error, setError]               = useState("");
  const [showLogin, setShowLogin]       = useState(false);

  // Read ?q= from URL
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  });

  const [timeFilter, setTimeFilter]   = useState("any");
  const [sortBy, setSortBy]           = useState("relevance");
  const [fromYear, setFromYear]       = useState("");
  const [toYear, setToYear]           = useState("");
  const [program, setProgram]         = useState("all");
  const [programOpen, setProgramOpen] = useState(true);

  const [bookmarked, setBookmarked]   = useState(new Set());
  const [bookmarkIds, setBookmarkIds] = useState({});
  const [bmLoading, setBmLoading]     = useState(new Set());

  // ── 1. Load all papers from Supabase on mount ────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        if (papersCache.data) {
          setAllPapers(papersCache.data);
          setPapers(papersCache.data);
          return;
        }
        const { data, error: err } = await supabase
          .from("papers")
          .select("id, title, authors, year, course_or_program, abstract, file_path, access_type, status")
          .eq("status", "published")
          .order("created_at", { ascending: false });
        if (err) throw err;
        const withUrls = data?.map((p) => {
          if (!p.file_path) return { ...p, publicUrl: null };
          const { data: u } = supabase.storage.from(BUCKET).getPublicUrl(p.file_path);
          return { ...p, publicUrl: u?.publicUrl ?? null };
        }) ?? [];
        papersCache.data = withUrls;
        setAllPapers(withUrls);
        setPapers(withUrls);
      } catch (e) {
        setError(e.message || "Failed to load papers.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── 2. Load bookmarks ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setBookmarked(new Set()); setBookmarkIds({}); return; }
    const load = async () => {
      const { data } = await supabase
        .from("bookmarks").select("id, paper_id").eq("user_id", user.id);
      if (!data) return;
      setBookmarked(new Set(data.map((b) => b.paper_id)));
      setBookmarkIds(Object.fromEntries(data.map((b) => [b.paper_id, b.id])));
    };
    load();
  }, [user]);

  // ── 3. NLP search function ───────────────────────────────────────────────
  const doSearch = useCallback(async (q, papersList) => {
    const trimmed = q.trim();

    // No query → show all papers, clear search mode
    if (!trimmed) {
      setIsSearchMode(false);
      setPapers(papersList || allPapers);
      // Clear ?q= from URL
      navigate("/papers", { replace: true });
      return;
    }

    // Update URL to reflect current query
    navigate(`/papers?q=${encodeURIComponent(trimmed)}`, { replace: true });

    setSearching(true);
    setError("");
    setIsSearchMode(true);

    try {
      const { data } = await api.get(`/api/search?q=${encodeURIComponent(trimmed)}`);

      // NLP results contain id + relevance_score but may lack publicUrl.
      // Merge with the Supabase-loaded papers (which have publicUrl) by id.
      const source = papersList || allPapers;
      const resultsWithUrls = (data.results || []).map((r) => {
        const cached = source.find((p) => p.id === r.id);
        return cached
          ? { ...cached, relevance_score: r.relevance_score }
          : r;
      });

      setPapers(resultsWithUrls);
    } catch (e) {
      setError("Search failed. Please try again.");
      setIsSearchMode(false);
      setPapers(papersList || allPapers);
    } finally {
      setSearching(false);
    }
  }, [allPapers, navigate]);

  // ── 4. Auto-run search when Supabase data is ready + URL has ?q= ─────────
  //    (Handles direct navigation to /papers?q=computer+science)
  useEffect(() => {
    if (allPapers.length === 0) return; // wait for Supabase data first
    const params = new URLSearchParams(location.search);
    const urlQuery = params.get("q") || "";
    if (urlQuery) {
      setQuery(urlQuery);
      doSearch(urlQuery, allPapers);
    }
    // Only run once when allPapers first loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPapers]);

  // ── 5. Bookmarks ─────────────────────────────────────────────────────────
  const toggleBookmark = useCallback(async (e, paperId) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { setShowLogin(true); return; }
    if (bmLoading.has(paperId)) return;
    setBmLoading((prev) => new Set(prev).add(paperId));
    const isMarked = bookmarked.has(paperId);
    try {
      if (isMarked) {
        const bmId = bookmarkIds[paperId];
        const { error } = await supabase.from("bookmarks").delete().eq("id", bmId);
        if (error) throw error;
        setBookmarked((prev) => { const s = new Set(prev); s.delete(paperId); return s; });
        setBookmarkIds((prev) => { const m = { ...prev }; delete m[paperId]; return m; });
      } else {
        const { data, error } = await supabase
          .from("bookmarks").insert({ user_id: user.id, paper_id: paperId })
          .select("id").single();
        if (error) throw error;
        setBookmarked((prev) => new Set(prev).add(paperId));
        setBookmarkIds((prev) => ({ ...prev, [paperId]: data.id }));
      }
    } catch (e) {
      console.error("Bookmark error:", e.message);
    } finally {
      setBmLoading((prev) => { const s = new Set(prev); s.delete(paperId); return s; });
    }
  }, [user, bookmarked, bookmarkIds, bmLoading]);

  // ── 6. Filtering + sorting (applied on top of NLP results or allPapers) ──
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
      if (program === "all") return true;
      return p.course_or_program?.toUpperCase().includes(program);
    })
    .filter((p) => {
      // When in NLP search mode the backend already ranked results — skip
      // the local text filter so we don't throw away low-keyword NLP matches.
      if (isSearchMode || !query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.authors?.join(", ").toLowerCase().includes(q) ||
        p.abstract?.toLowerCase().includes(q) ||
        p.course_or_program?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      sortBy === "date"
        ? (Number(b.year) || 0) - (Number(a.year) || 0)
        : 0
    );

  const hasActiveFilter =
    timeFilter !== "any" || sortBy !== "relevance" || program !== "all";

  const handleClearSearch = () => {
    setQuery("");
    setIsSearchMode(false);
    setPapers(allPapers);
    navigate("/papers", { replace: true });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .papers-page {
          height: 100vh;
          padding-top: 57px;
          background: #f4f4f5;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .papers-hero {
          flex-shrink: 0;
          background: #f4f4f5;
          padding: 40px 40px 36px;
          text-align: center;
        }
        .papers-hero-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sp-title-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 20px;
        }
        .sp-heading {
          font-family: 'Schibsted Grotesk', serif;
          font-size: 28px;
          font-weight: 400;
          color: #0f1117;
          letter-spacing: -0.4px;
          line-height: 1;
          margin: 0;
        }
        .sp-search {
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 680px;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 9999px;
          padding: 0 10px 0 16px;
          gap: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sp-search:focus-within {
          border-color: #9b0000;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(155,0,0,0.08), 0 0 0 3px rgba(155,0,0,0.06);
        }
        .sp-search-icon {
          color: #9ca3af;
          display: flex;
          flex-shrink: 0;
          pointer-events: none;
          transition: color 0.2s;
        }
        .sp-search:focus-within .sp-search-icon { color: #9b0000; }
        .sp-search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14.5px;
          font-family: 'DM Sans', sans-serif;
          color: #111827;
          background: transparent;
          padding: 13px 0;
          min-width: 0;
        }
        .sp-search-input::placeholder { color: #b0b7c3; }
        .sp-clear-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          align-items: center;
          padding: 5px;
          border-radius: 9999px;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .sp-clear-btn:hover { color: #374151; background: #f3f4f6; }
        .sp-search-btn {
          background: #9b0000;
          color: #fff;
          border: none;
          border-radius: 9999px;
          padding: 8px 20px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .sp-search-btn:hover { background: #7f1d1d; }
        .sp-search-btn:disabled { background: #c4b5b5; cursor: not-allowed; }
        .papers-layout {
          flex: 1;
          min-height: 0;
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 5px 40px 0;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 24px;
          overflow: hidden;
        }
        .papers-sidebar-col { display: block; padding-bottom: 28px; }
        .sp-sidebar {
          width: 220px;
          max-height: calc(100vh - 280px);
          background: #fff;
          border: 1px solid #ebebeb;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
        }
        .sp-sidebar-header {
          flex-shrink: 0;
          background: #fff;
          border-radius: 14px 14px 0 0;
          padding: 14px 18px 12px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sp-filters-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #374151;
        }
        .sp-reset-btn {
          font-size: 11.5px;
          font-weight: 600;
          color: #9b0000;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
        }
        .sp-reset-btn:hover { color: #7f1d1d; }
        .sp-sidebar-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 12px 10px;
          scrollbar-width: none;
        }
        .sp-sidebar-body::-webkit-scrollbar { display: none; }
        .sp-section { margin-bottom: 4px; }
        .sp-section-label {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.9px;
          color: #9ca3af;
          padding: 8px 8px 4px;
        }
        .sp-filter-btn {
          display: flex;
          align-items: center;
          width: 100%;
          text-align: left;
          padding: 7px 8px;
          border-radius: 7px;
          border: none;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: background 0.1s, color 0.1s;
          background: transparent;
          color: #6b7280;
        }
        .sp-filter-btn:hover { background: #f9fafb; color: #111827; }
        .sp-filter-btn.active { background: #fef2f2; color: #9b0000; font-weight: 600; }
        .sp-year-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px 4px;
        }
        .yr-input {
          width: 58px;
          padding: 5px 7px;
          border: 1.5px solid #e5e7eb;
          border-radius: 7px;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          color: #111827;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
          -moz-appearance: textfield;
        }
        .yr-input:focus { border-color: #9b0000; }
        .yr-input::-webkit-outer-spin-button,
        .yr-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .sp-year-sep { font-size: 12px; color: #9ca3af; }
        .sp-divider { height: 1px; background: #f3f4f6; margin: 8px 0; }
        .sp-acc-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 8px 4px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.9px;
          color: #9ca3af;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
        }
        .sp-acc-btn:hover { color: #6b7280; }
        .sp-acc-chevron { transition: transform 0.2s; flex-shrink: 0; }
        .acc-body { overflow: hidden; transition: max-height 0.25s ease, opacity 0.2s ease; max-height: 0; opacity: 0; }
        .acc-body.open { max-height: 400px; opacity: 1; }
        .papers-main {
          overflow-y: auto;
          overflow-x: hidden;
          padding-bottom: 80px;
          scrollbar-width: none;
        }
        .papers-main::-webkit-scrollbar { display: none; }
        .sp-results-meta {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sp-results-meta strong { color: #111827; }
        .sp-clear-search-link {
          font-size: 12px;
          color: #9b0000;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          text-decoration: underline;
        }
        @keyframes shimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .skel { border-radius: 6px; background: linear-gradient(90deg,#f5f5f5 25%,#ececec 50%,#f5f5f5 75%); background-size: 900px 100%; animation: shimmer 1.4s infinite linear; }
        .sp-skel-card { background: #fff; border: 1px solid #ebebeb; border-radius: 14px; padding: 22px 24px; margin-bottom: 10px; }
        .sp-skel-h { height: 20px; width: 60%; margin-bottom: 12px; }
        .sp-skel-m { height: 12px; width: 36%; margin-bottom: 12px; }
        .sp-skel-l { height: 12px; width: 94%; margin-bottom: 7px; }
        .sp-skel-s { height: 12px; width: 72%; }
        .sp-error {
          padding: 14px 18px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #b91c1c;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .sp-empty {
          background: #fff;
          border: 1px solid #ebebeb;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 80px 20px;
        }
        .sp-empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          color: #fca5a5;
        }
        .sp-empty-title {
          font-family: 'Schibsted Grotesk', serif;
          font-size: 20px;
          color: #111827;
          margin: 0 0 8px;
        }
        .sp-empty-desc {
          font-size: 13.5px;
          color: #9ca3af;
          max-width: 360px;
          line-height: 1.65;
          margin: 0;
        }
        .sp-clear-search-btn {
          margin-top: 20px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 8px;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          color: #374151;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .sp-clear-search-btn:hover { border-color: #9b0000; color: #9b0000; }
        @media (max-width: 900px) {
          .papers-page { height: auto !important; overflow: visible !important; }
          .papers-layout { grid-template-columns: 1fr !important; padding: 16px 16px 0 !important; overflow: visible !important; }
          .papers-layout > .papers-main { overflow-y: visible !important; padding: 0 0 60px !important; }
          .papers-sidebar-col { display: none !important; }
          .papers-hero { padding: 28px 20px 24px !important; }
        }
      `}</style>

      <div
        className="papers-page"
        style={showLogin ? { filter: "blur(3px)", transition: "filter 0.3s ease", pointerEvents: "none" } : {}}
      >
        <Navbar onLoginClick={() => setShowLogin(true)} />

        {/* Hero */}
        <div className="papers-hero">
          <div className="papers-hero-inner">
            <div className="sp-title-row">
              <h1 className="sp-heading">Research Papers</h1>
            </div>
            <div className="sp-search">
              <span className="sp-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                className="sp-search-input"
                type="text"
                placeholder="Search by title, author, topic, or program…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doSearch(query); }}
                autoComplete="off"
              />
              {query && (
                <button className="sp-clear-btn" type="button" onClick={handleClearSearch}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              <button
                className="sp-search-btn"
                type="button"
                disabled={searching}
                onClick={() => doSearch(query)}
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="papers-layout">

          {/* Sidebar */}
          <aside className="papers-sidebar-col">
            <div className="sp-sidebar">
              <div className="sp-sidebar-header">
                <span className="sp-filters-label">Filters</span>
                <button
                  className="sp-reset-btn"
                  style={{ opacity: hasActiveFilter ? 1 : 0, pointerEvents: hasActiveFilter ? "auto" : "none" }}
                  onClick={() => { setTimeFilter("any"); setSortBy("relevance"); setFromYear(""); setToYear(""); setProgram("all"); }}
                >Reset</button>
              </div>
              <div className="sp-sidebar-body">
                <div className="sp-section">
                  <span className="sp-section-label">Time period</span>
                  {TIME_FILTERS.map(({ key, label }) => (
                    <button
                      key={key} type="button"
                      className={`sp-filter-btn${timeFilter === key ? " active" : ""}`}
                      onClick={() => setTimeFilter(key)}
                    >{label}</button>
                  ))}
                  {timeFilter === "custom" && (
                    <div className="sp-year-row">
                      <input type="number" placeholder="From" value={fromYear} onChange={(e) => setFromYear(e.target.value)} className="yr-input" />
                      <span className="sp-year-sep">–</span>
                      <input type="number" placeholder="To" value={toYear} onChange={(e) => setToYear(e.target.value)} className="yr-input" />
                    </div>
                  )}
                </div>
                <div className="sp-divider" />
                <div className="sp-section">
                  <span className="sp-section-label">Sort by</span>
                  {SORT_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key} type="button"
                      className={`sp-filter-btn${sortBy === key ? " active" : ""}`}
                      onClick={() => setSortBy(key)}
                    >{label}</button>
                  ))}
                </div>
                <div className="sp-divider" />
                <div className="sp-section">
                  <button type="button" className="sp-acc-btn" onClick={() => setProgramOpen((o) => !o)}>
                    Program
                    <svg
                      className="sp-acc-chevron"
                      style={{ transform: programOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  <div className={`acc-body${programOpen ? " open" : ""}`}>
                    {PROGRAM_FILTERS.map(({ key, label }) => (
                      <button
                        key={key} type="button"
                        className={`sp-filter-btn${program === key ? " active" : ""}`}
                        onClick={() => setProgram(key)}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <main className="papers-main">

            {/* Results metadata bar */}
            {!loading && !searching && isSearchMode && !error && (
              <div className="sp-results-meta">
                <span>
                  <strong>{displayed.length}</strong> result{displayed.length !== 1 ? "s" : ""} for "<strong>{query}</strong>"
                </span>
                <button className="sp-clear-search-link" onClick={handleClearSearch}>
                  Clear search
                </button>
              </div>
            )}

            {/* Skeletons — show during initial load OR during NLP search */}
            {(loading || searching) && [1,2,3,4].map((i) => (
              <div key={i} className="sp-skel-card">
                <div className="skel sp-skel-h" />
                <div className="skel sp-skel-m" />
                <div className="skel sp-skel-l" />
                <div className="skel sp-skel-s" />
              </div>
            ))}

            {!loading && !searching && error && (
              <div className="sp-error">{error}</div>
            )}

            {!loading && !searching && !error && displayed.length === 0 && (
              <div className="sp-empty">
                <div className="sp-empty-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div className="sp-empty-title">
                  {allPapers.length === 0 ? "No papers yet" : "No results found"}
                </div>
                <p className="sp-empty-desc">
                  {allPapers.length === 0
                    ? "Papers will appear here once they've been published."
                    : `No papers match "${query}". Try a different keyword or adjust your filters.`}
                </p>
                {query && (
                  <button className="sp-clear-search-btn" onClick={handleClearSearch}>
                    Clear search
                  </button>
                )}
              </div>
            )}

            {!loading && !searching && !error && displayed.map((paper, i) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                user={user}
                isSaved={bookmarked.has(paper.id)}
                isBusy={bmLoading.has(paper.id)}
                onBookmarkClick={(e, id) => toggleBookmark(e, id)}
                onLoginRequest={() => setShowLogin(true)}
                index={i}
              />
            ))}
          </main>
        </div>
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}