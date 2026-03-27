import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "./LoginPage";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";

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
  { key: "all",  label: "All Programs" },
  { key: "BSIT", label: "BSIT"         },
  { key: "BSCS", label: "BSCS"         },
  { key: "BSIS", label: "BSIS"         },
];

// Access type display config
const ACCESS_META = {
  open:          { label: "Public",             icon: "🌐", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  students_only: { label: "Sign-in Required",   icon: "🎓", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  restricted:    { label: "Request Required",   icon: "🔒", bg: "#fef2f2", color: "#9b0000", border: "#fecaca" },
};

export default function PapersPage() {
  const { user } = useAuth();

  const [papers, setPapers]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showLogin, setShowLogin]   = useState(false);
  const [query, setQuery]           = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  });
  const [timeFilter, setTimeFilter] = useState("any");
  const [sortBy, setSortBy]         = useState("relevance");
  const [fromYear, setFromYear]     = useState("");
  const [toYear, setToYear]         = useState("");
  const [program, setProgram]       = useState("all");

  const [bookmarked, setBookmarked]   = useState(new Set());
  const [bookmarkIds, setBookmarkIds] = useState({});
  const [bmLoading, setBmLoading]     = useState(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        if (papersCache.data) { setPapers(papersCache.data); return; }

        // ── KEY FIX: only fetch published papers ──────────────────
        const { data, error: err } = await supabase
          .from("papers")
          .select("id, title, authors, year, course_or_program, abstract, file_path, access_type, status")
          .eq("status", "published")          // ← only published
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
      ? (Number(b.year) || 0) - (Number(a.year) || 0) : 0
    );

  const hasActiveFilter = timeFilter !== "any" || sortBy !== "relevance" || program !== "all";

  // Determine what PDF button to show per paper + user state
  const getPdfAction = (paper) => {
    if (!paper.publicUrl) return null;

    if (paper.access_type === "open") {
      return user
        ? { type: "pdf", href: paper.publicUrl }
        : { type: "lock", label: "Sign in to view PDF" };
    }
    if (paper.access_type === "students_only") {
      return user
        ? { type: "pdf", href: paper.publicUrl }
        : { type: "lock", label: "Sign in to view PDF" };
    }
    if (paper.access_type === "restricted") {
      return user
        ? { type: "request", label: "Request Access" }
        : { type: "lock", label: "Sign in to request" };
    }
    return null;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .sp-page { min-height:100vh; padding-top:57px; background:#f4f4f5; font-family:'DM Sans',system-ui,sans-serif; }

        .sp-hero { background:transparent; padding:40px 40px 36px; text-align:center; }
        .sp-hero-inner { max-width:1120px; margin:0 auto; display:flex; flex-direction:column; align-items:center; }
        .sp-hero-heading { display:flex; align-items:baseline; gap:12px; margin-bottom:20px; }
        .sp-hero-title { font-family:'DM Serif Display',serif; font-size:28px; font-weight:400; color:#0f1117; letter-spacing:-0.4px; line-height:1; }

        .sp-search-wrap { display:flex; align-items:center; width:100%; max-width:680px; background:#fff; border:1.5px solid #e5e7eb; border-radius:12px; padding:0 10px 0 16px; gap:10px; box-shadow:0 1px 4px rgba(0,0,0,0.05),0 4px 16px rgba(0,0,0,0.04); transition:border-color 0.2s,box-shadow 0.2s; }
        .sp-search-wrap:focus-within { border-color:#9b0000; box-shadow:0 1px 4px rgba(0,0,0,0.05),0 4px 16px rgba(155,0,0,0.08),0 0 0 3px rgba(155,0,0,0.06); }
        .sp-search-icon { color:#9ca3af; display:flex; flex-shrink:0; pointer-events:none; transition:color 0.2s; }
        .sp-search-wrap:focus-within .sp-search-icon { color:#9b0000; }
        .sp-search-input { flex:1; border:none; outline:none; font-size:14.5px; font-family:'DM Sans',sans-serif; color:#111827; background:transparent; padding:13px 0; min-width:0; }
        .sp-search-input::placeholder { color:#b0b7c3; }
        .sp-search-clear { background:none; border:none; cursor:pointer; color:#9ca3af; display:flex; align-items:center; padding:5px; border-radius:50%; transition:color 0.15s,background 0.15s; flex-shrink:0; }
        .sp-search-clear:hover { color:#374151; background:#f3f4f6; }
        .sp-search-btn { background:#9b0000; color:#fff; border:none; border-radius:8px; padding:8px 20px; font-size:13.5px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; flex-shrink:0; transition:background 0.15s; white-space:nowrap; }
        .sp-search-btn:hover { background:#7f1d1d; }

        .sp-layout { max-width:1120px; margin:0 auto; padding:28px 40px 80px; display:grid; grid-template-columns:220px 1fr; gap:24px; align-items:start; }

        .sp-sidebar { position:sticky; top:24px; background:#fff; border:1px solid #ebebeb; border-radius:14px; overflow:hidden; }
        .sp-sidebar-header { padding:14px 18px 12px; border-bottom:1px solid #f3f4f6; display:flex; align-items:center; justify-content:space-between; }
        .sp-sidebar-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#374151; }
        .sp-sidebar-reset { font-size:11.5px; font-weight:600; color:#9b0000; background:none; border:none; cursor:pointer; padding:0; font-family:inherit; transition:color 0.15s; opacity:0; pointer-events:none; }
        .sp-sidebar-reset.visible { opacity:1; pointer-events:auto; }
        .sp-sidebar-reset:hover { color:#7f1d1d; }
        .sp-sidebar-body { padding:12px 10px; }
        .sp-sb-group { margin-bottom:4px; }
        .sp-sb-label { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.9px; color:#9ca3af; padding:8px 8px 4px; display:block; }
        .sp-sb-btn { display:flex; align-items:center; width:100%; text-align:left; padding:7px 8px; border-radius:7px; border:none; background:none; font-size:13px; font-family:'DM Sans',sans-serif; color:#6b7280; cursor:pointer; transition:background 0.1s,color 0.1s; }
        .sp-sb-btn:hover { background:#f9fafb; color:#111827; }
        .sp-sb-btn.active { background:#fef2f2; color:#9b0000; font-weight:600; }
        .sp-sb-divider { height:1px; background:#f3f4f6; margin:8px 0; }
        .sp-custom-range { display:flex; align-items:center; gap:6px; padding:6px 8px 4px; }
        .sp-custom-range input { width:58px; padding:5px 7px; border:1.5px solid #e5e7eb; border-radius:7px; font-size:12px; font-family:'DM Sans',sans-serif; color:#111827; background:#fff; outline:none; transition:border-color 0.15s; -moz-appearance:textfield; }
        .sp-custom-range input::-webkit-outer-spin-button,.sp-custom-range input::-webkit-inner-spin-button { -webkit-appearance:none; }
        .sp-custom-range input:focus { border-color:#9b0000; }
        .sp-range-sep { font-size:12px; color:#9ca3af; }

        .sp-card { background:#fff; border:1px solid #ebebeb; border-radius:14px; padding:22px 24px 18px; margin-bottom:10px; transition:box-shadow 0.18s,border-color 0.18s; animation:spFadeUp 0.2s ease both; position:relative; overflow:hidden; }
        .sp-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:#9b0000; transform:scaleY(0); transition:transform 0.18s ease; border-radius:0 2px 2px 0; }
        .sp-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.08); border-color:#ddd; }
        .sp-card:hover::before { transform:scaleY(1); }
        @keyframes spFadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }

        .sp-results-meta { font-size:13px; color:#70757a; margin-bottom:14px; }
        .sp-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:8px; }
        .sp-card-title { font-size:17px; font-family:'DM Serif Display',serif; color:#1a0dab; text-decoration:none; line-height:1.35; display:block; transition:color 0.15s; }
        .sp-card-title:hover { color:#9b0000; }

        .sp-bm-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; background:none; border:1.5px solid #f0f0f0; cursor:pointer; color:#9ca3af; flex-shrink:0; transition:color 0.15s,background 0.15s,border-color 0.15s; margin-top:-2px; }
        .sp-bm-btn:hover { color:#9b0000; background:#fef2f2; border-color:#fecaca; }
        .sp-bm-btn.saved { color:#9b0000; background:#fef2f2; border-color:#fecaca; }
        .sp-bm-btn:disabled { opacity:0.4; cursor:default; }

        .sp-card-meta { display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
        .sp-authors { font-size:12.5px; color:#6b7280; font-weight:400; }
        .sp-dot { color:#d1d5db; }
        .sp-year-pill { display:inline-flex; align-items:center; background:#fef2f2; color:#9b0000; font-size:11px; font-weight:700; padding:2px 9px; border-radius:20px; border:1px solid #fecaca; }
        .sp-prog-pill { display:inline-flex; align-items:center; background:#f3f4f6; color:#4b5563; font-size:11px; font-weight:600; padding:2px 9px; border-radius:20px; }

        /* Access badge on card */
        .sp-access-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:2px 9px; border-radius:20px; border:1px solid; white-space:nowrap; }

        .sp-snippet { font-size:13.5px; color:#6b7280; line-height:1.65; margin-bottom:16px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

        .sp-card-footer { display:flex; align-items:center; gap:8px; padding-top:14px; border-top:1px solid #f9f9f9; flex-wrap:wrap; }

        .sp-btn-preview { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:7px; border:1.5px solid #e5e7eb; background:#fff; color:#374151; font-size:12.5px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; text-decoration:none; transition:border-color 0.15s,color 0.15s,background 0.15s; }
        .sp-btn-preview:hover { border-color:#9b0000; color:#9b0000; background:#fef2f2; }
        .sp-btn-pdf { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:7px; border:1.5px solid #9b0000; background:#9b0000; color:#fff; font-size:12.5px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; text-decoration:none; transition:background 0.15s,border-color 0.15s; }
        .sp-btn-pdf:hover { background:#7f1d1d; border-color:#7f1d1d; }
        .sp-btn-lock { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:7px; border:1.5px solid #e5e7eb; background:none; color:#9ca3af; font-size:12.5px; font-weight:500; font-family:'DM Sans',sans-serif; cursor:pointer; transition:border-color 0.15s,color 0.15s; }
        .sp-btn-lock:hover { border-color:#9b0000; color:#9b0000; }
        .sp-btn-request { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:7px; border:1.5px solid #fde68a; background:#fffbeb; color:#92400e; font-size:12.5px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; text-decoration:none; transition:border-color 0.15s,background 0.15s; }
        .sp-btn-request:hover { border-color:#f59e0b; background:#fef3c7; }

        .sp-skel-card { background:#fff; border:1px solid #ebebeb; border-radius:14px; padding:22px 24px; margin-bottom:10px; }
        .sp-skel { border-radius:6px; background:linear-gradient(90deg,#f5f5f5 25%,#ececec 50%,#f5f5f5 75%); background-size:900px 100%; animation:spShimmer 1.4s infinite linear; }
        @keyframes spShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .sp-skel-t { height:20px; width:60%; margin-bottom:12px; }
        .sp-skel-m { height:12px; width:36%; margin-bottom:12px; }
        .sp-skel-l1 { height:12px; width:94%; margin-bottom:7px; }
        .sp-skel-l2 { height:12px; width:72%; }

        .sp-empty { background:#fff; border:1px solid #ebebeb; border-radius:14px; display:flex; flex-direction:column; align-items:center; text-align:center; padding:80px 20px; }
        .sp-empty-icon { width:56px; height:56px; border-radius:14px; background:#fef2f2; border:1px solid #fecaca; display:flex; align-items:center; justify-content:center; margin-bottom:18px; color:#fca5a5; }
        .sp-empty-title { font-family:'DM Serif Display',serif; font-size:20px; color:#111827; margin-bottom:8px; }
        .sp-empty-sub { font-size:13.5px; color:#9ca3af; max-width:360px; line-height:1.65; }
        .sp-empty-clear { margin-top:20px; display:inline-flex; align-items:center; gap:6px; padding:8px 18px; border-radius:8px; border:1.5px solid #e5e7eb; background:#fff; color:#374151; font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; transition:border-color 0.15s,color 0.15s; }
        .sp-empty-clear:hover { border-color:#9b0000; color:#9b0000; }

        .sp-error { padding:14px 18px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; color:#b91c1c; font-size:13px; margin-bottom:16px; }

        @media (max-width:900px) {
          .sp-layout { grid-template-columns:1fr; padding:16px 16px 60px; }
          .sp-sidebar { display:none; }
          .sp-hero { padding:28px 20px 24px; }
        }
      `}</style>

      <div
        className="sp-page"
        style={{ filter: showLogin ? "blur(3px)" : "none", transition: "filter 0.3s ease", pointerEvents: showLogin ? "none" : "auto" }}
      >
        <Navbar onLoginClick={() => setShowLogin(true)} />

        {/* Hero */}
        <div className="sp-hero">
          <div className="sp-hero-inner">
            <div className="sp-hero-heading">
              <h1 className="sp-hero-title">Research Papers</h1>
            </div>
            <div className="sp-search-wrap">
              <span className="sp-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                className="sp-search-input" type="text"
                placeholder="Search by title, author, topic, or program…"
                value={query} onChange={(e) => setQuery(e.target.value)}
                autoComplete="off" autoFocus
              />
              {query && (
                <button className="sp-search-clear" type="button" onClick={() => setQuery("")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              <button className="sp-search-btn" type="button">Search</button>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="sp-layout">
          {/* Sidebar */}
          <aside className="sp-sidebar">
            <div className="sp-sidebar-header">
              <span className="sp-sidebar-title">Filters</span>
              <button
                className={`sp-sidebar-reset${hasActiveFilter ? " visible" : ""}`}
                onClick={() => { setTimeFilter("any"); setSortBy("relevance"); setFromYear(""); setToYear(""); setProgram("all"); }}
              >
                Reset
              </button>
            </div>
            <div className="sp-sidebar-body">
              <div className="sp-sb-group">
                <span className="sp-sb-label">Time period</span>
                {TIME_FILTERS.map(({ key, label }) => (
                  <button key={key} type="button" className={`sp-sb-btn${timeFilter === key ? " active" : ""}`} onClick={() => setTimeFilter(key)}>
                    {label}
                  </button>
                ))}
                {timeFilter === "custom" && (
                  <div className="sp-custom-range">
                    <input type="number" placeholder="From" value={fromYear} onChange={(e) => setFromYear(e.target.value)} />
                    <span className="sp-range-sep">–</span>
                    <input type="number" placeholder="To" value={toYear} onChange={(e) => setToYear(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="sp-sb-divider" />
              <div className="sp-sb-group">
                <span className="sp-sb-label">Sort by</span>
                {SORT_OPTIONS.map(({ key, label }) => (
                  <button key={key} type="button" className={`sp-sb-btn${sortBy === key ? " active" : ""}`} onClick={() => setSortBy(key)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="sp-sb-divider" />
              <div className="sp-sb-group">
                <span className="sp-sb-label">Program</span>
                {PROGRAM_FILTERS.map(({ key, label }) => (
                  <button key={key} type="button" className={`sp-sb-btn${program === key ? " active" : ""}`} onClick={() => setProgram(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Results */}
          <main>
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
                <div className="sp-empty-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div className="sp-empty-title">{papers.length === 0 ? "No papers yet" : "No results found"}</div>
                <p className="sp-empty-sub">
                  {papers.length === 0
                    ? "Papers will appear here once they've been published."
                    : `No papers match "${query}". Try a different keyword or adjust your filters.`}
                </p>
                {query && <button className="sp-empty-clear" onClick={() => setQuery("")}>Clear search</button>}
              </div>
            )}

            {!loading && !error && displayed.map((paper, i) => {
              const isSaved   = bookmarked.has(paper.id);
              const isBusy    = bmLoading.has(paper.id);
              const access    = ACCESS_META[paper.access_type] || ACCESS_META.open;
              const pdfAction = getPdfAction(paper);

              return (
                <article className="sp-card" key={paper.id} style={{ animationDelay: `${i * 0.03}s` }}>
                  {/* Title + bookmark */}
                  <div className="sp-card-top">
                    <Link to={`/papers/${paper.id}`} className="sp-card-title">
                      {paper.title || "Untitled paper"}
                    </Link>
                    <button
                      className={`sp-bm-btn${isSaved ? " saved" : ""}`}
                      disabled={isBusy}
                      onClick={(e) => toggleBookmark(e, paper.id)}
                      title={isSaved ? "Remove bookmark" : "Save to bookmarks"}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24"
                        fill={isSaved ? "currentColor" : "none"}
                        stroke="currentColor" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Meta row */}
                  <div className="sp-card-meta">
                    {paper.authors?.length > 0 && (
                      <span className="sp-authors">{paper.authors.join(", ")}</span>
                    )}
                    {paper.year && (
                      <><span className="sp-dot">·</span><span className="sp-year-pill">{paper.year}</span></>
                    )}
                    {paper.course_or_program && (
                      <><span className="sp-dot">·</span><span className="sp-prog-pill">{paper.course_or_program}</span></>
                    )}
                    {/* ── Access badge ── */}
                    <span className="sp-dot">·</span>
                    <span
                      className="sp-access-badge"
                      style={{ background: access.bg, color: access.color, borderColor: access.border }}
                    >
                      {access.icon} {access.label}
                    </span>
                  </div>

                  {paper.abstract && <p className="sp-snippet">{paper.abstract}</p>}

                  {/* Footer actions */}
                  <div className="sp-card-footer">
                    <Link to={`/papers/${paper.id}`} className="sp-btn-preview">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View Paper
                    </Link>

                    {pdfAction?.type === "pdf" && (
                      <a href={pdfAction.href} target="_blank" rel="noopener noreferrer" className="sp-btn-pdf">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        PDF
                      </a>
                    )}

                    {pdfAction?.type === "request" && (
                      <Link to={`/papers/${paper.id}`} className="sp-btn-request">
                        🔒 Request Access
                      </Link>
                    )}

                    {pdfAction?.type === "lock" && (
                      <button className="sp-btn-lock" onClick={() => setShowLogin(true)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        {pdfAction.label}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </main>
        </div>
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}