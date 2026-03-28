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
  { key: "all",   label: "All Programs" },
  { key: "BSIT",  label: "BSIT"         },
  { key: "BSCS",  label: "BSCS"         },
  { key: "BSEE",  label: "BSEE"         },
  { key: "BSIE",  label: "BSIE"         },
  { key: "BSCpE", label: "BSCpE"        },
  { key: "BSECE", label: "BSECE"        },
];

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

export default function PapersPage() {
  const { user } = useAuth();

  const [papers, setPapers]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showLogin, setShowLogin]     = useState(false);
  const [query, setQuery]             = useState(() => {
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

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        if (papersCache.data) { setPapers(papersCache.data); return; }
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

  const getPdfAction = (paper) => {
    if (!paper.publicUrl) return null;
    if (paper.access_type === "open") {
      return user ? { type: "pdf", href: paper.publicUrl } : { type: "lock", label: "Sign in to view PDF" };
    }
    if (paper.access_type === "students_only") {
      return user ? { type: "pdf", href: paper.publicUrl } : { type: "lock", label: "Sign in to view PDF" };
    }
    if (paper.access_type === "restricted") {
      return user ? { type: "request", label: "Request Access" } : { type: "lock", label: "Sign in to request" };
    }
    return null;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ── Page ── */
        .papers-page {
          height: 100vh;
          padding-top: 57px;
          background: #f4f4f5;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── Hero ── */
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
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          font-weight: 400;
          color: #0f1117;
          letter-spacing: -0.4px;
          line-height: 1;
          margin: 0;
        }

        /* ── Search bar ── */
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

        /* ── Layout ── */
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

        /* ── Sidebar column ── */
        .papers-sidebar-col {
          display: block;
          padding-bottom: 28px;
        }
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

        /* ── Sidebar filter sections ── */
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

        /* ── Custom year inputs ── */
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

        /* ── Divider ── */
        .sp-divider { height: 1px; background: #f3f4f6; margin: 8px 0; }

        /* ── Program accordion ── */
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

        /* ── Main results ── */
        .papers-main {
          overflow-y: auto;
          overflow-x: hidden;
          padding-bottom: 80px;
          scrollbar-width: none;
        }
        .papers-main::-webkit-scrollbar { display: none; }

        /* ── Skeleton ── */
        @keyframes shimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .skel { border-radius: 6px; background: linear-gradient(90deg,#f5f5f5 25%,#ececec 50%,#f5f5f5 75%); background-size: 900px 100%; animation: shimmer 1.4s infinite linear; }
        .sp-skel-card { background: #fff; border: 1px solid #ebebeb; border-radius: 14px; padding: 22px 24px; margin-bottom: 10px; }
        .sp-skel-h { height: 20px; width: 60%; margin-bottom: 12px; }
        .sp-skel-m { height: 12px; width: 36%; margin-bottom: 12px; }
        .sp-skel-l { height: 12px; width: 94%; margin-bottom: 7px; }
        .sp-skel-s { height: 12px; width: 72%; }

        /* ── Error ── */
        .sp-error {
          padding: 14px 18px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #b91c1c;
          font-size: 13px;
          margin-bottom: 16px;
        }

        /* ── Empty state ── */
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
          font-family: 'DM Serif Display', serif;
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

        /* ── Paper card ── */
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

        /* ── Card title row ── */
        .sp-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
        .paper-title {
          font-size: 17px;
          font-family: 'DM Serif Display', serif;
          color: #111827;
          text-decoration: none;
          line-height: 1.35;
          display: block;
          transition: color 0.15s;
        }
        .paper-title:hover { color: #9b0000; }
        .paper-title:visited { color: #9b0000; }

        /* ── Bookmark button ── */
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

        /* ── Meta row ── */
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

        /* ── Abstract ── */
        .sp-abstract {
          font-size: 13.5px; color: #6b7280; line-height: 1.65; margin: 0 0 16px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        /* ── Card footer ── */
        .sp-card-footer { display: flex; align-items: center; gap: 8px; padding-top: 14px; border-top: 1px solid #f9f9f9; flex-wrap: wrap; }
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
        .sp-btn-lock {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: 7px; border: 1.5px solid #e5e7eb;
          background: transparent; color: #9ca3af; font-size: 12.5px; font-weight: 500;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .sp-btn-lock:hover { border-color: #9b0000; color: #9b0000; }

        /* ── Mobile ── */
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
                value={query} onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button className="sp-clear-btn" type="button" onClick={() => setQuery("")}>
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
        <div className="papers-layout">

          {/* Sidebar */}
          <aside className="papers-sidebar-col">
            <div className="sp-sidebar">

              {/* Sidebar header */}
              <div className="sp-sidebar-header">
                <span className="sp-filters-label">Filters</span>
                <button
                  className="sp-reset-btn"
                  style={{ opacity: hasActiveFilter ? 1 : 0, pointerEvents: hasActiveFilter ? "auto" : "none" }}
                  onClick={() => { setTimeFilter("any"); setSortBy("relevance"); setFromYear(""); setToYear(""); setProgram("all"); }}
                >Reset</button>
              </div>

              {/* Sidebar body */}
              <div className="sp-sidebar-body">

                {/* Time Period */}
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

                {/* Sort By */}
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

                {/* Program accordion */}
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

            {loading && [1,2,3,4].map((i) => (
              <div key={i} className="sp-skel-card">
                <div className="skel sp-skel-h" />
                <div className="skel sp-skel-m" />
                <div className="skel sp-skel-l" />
                <div className="skel sp-skel-s" />
              </div>
            ))}

            {!loading && error && (
              <div className="sp-error">{error}</div>
            )}

            {!loading && !error && displayed.length === 0 && (
              <div className="sp-empty">
                <div className="sp-empty-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div className="sp-empty-title">
                  {papers.length === 0 ? "No papers yet" : "No results found"}
                </div>
                <p className="sp-empty-desc">
                  {papers.length === 0
                    ? "Papers will appear here once they've been published."
                    : `No papers match "${query}". Try a different keyword or adjust your filters.`}
                </p>
                {query && (
                  <button className="sp-clear-search-btn" onClick={() => setQuery("")}>Clear search</button>
                )}
              </div>
            )}

            {!loading && !error && displayed.map((paper, i) => {
              const isSaved   = bookmarked.has(paper.id);
              const isBusy    = bmLoading.has(paper.id);
              const access    = ACCESS_META[paper.access_type] || ACCESS_META.open;
              const pdfAction = getPdfAction(paper);

              return (
                <article
                  key={paper.id}
                  className="paper-card"
                  style={{ animation: "fadeUp 0.2s ease both", animationDelay: `${i * 0.03}s` }}
                >
                  {/* Title + bookmark */}
                  <div className="sp-card-header">
                    <Link to={`/papers/${paper.id}`} className="paper-title">
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
                    <Link to={`/papers/${paper.id}`} className="sp-btn-view">
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
                        <IconLock /> Request Access
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
