import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function AuthorDashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [papers, setPapers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [uploadRequests, setUploadRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const tabRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, height: 0 });
  const [decidingId, setDecidingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, rRes, uRes] = await Promise.all([
          api.get("/api/author/papers"),
          api.get("/api/author/requests"),
          api.get("/api/author/upload-requests"),
        ]);
        setPapers(pRes.data.results ?? []);
        setRequests(rRes.data ?? []);
        setUploadRequests(uRes.data ?? []);
      } catch (e) {
        console.error("Failed to load author dashboard:", e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) setPillStyle({ left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
  }, [activeTab]);

  const pendingCount   = requests.filter((r) => r.status === "pending").length;
  const approvedCount  = requests.filter((r) => r.status === "approved").length;
  const recentRequests = requests.filter((r) => r.status === "pending").slice(0, 5);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Author";
  const firstName   = displayName.split(" ")[0];
  const avatar      = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const initials    = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const now  = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr  = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const handleRequestAction = async (requestId, newStatus) => {
    setDecidingId(requestId);
    try {
      await api.patch(`/api/author/requests/${requestId}`, { status: newStatus });
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r)));
    } catch (e) {
      alert("Failed: " + e.message);
    } finally {
      setDecidingId(null);
    }
  };

  const Spinner = ({ size = 14, color = "rgba(0,0,0,0.15)", top = "#166534" }) => (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, border: `2px solid ${color}`, borderTopColor: top, animation: "auSpin 0.7s linear infinite" }} />
  );

  const STATUS_MAP = {
    pending:  { bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b", label: "Pending"  },
    approved: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", dot: "#16a34a", label: "Approved" },
    rejected: { bg: "#fef2f2", color: "#9b0000", border: "#fecaca", dot: "#dc2626", label: "Rejected" },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .au-page { min-height: 100vh; background: #f4f6f8; font-family: 'Schibsted Grotesk', system-ui, sans-serif; }

        /* ── Header ── */
        .au-header {
          background: #fff;
          border-bottom: 1px solid #e8eaed;
          padding: 0 32px;
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 10;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .au-header-left { display: flex; align-items: center; gap: 10px; }
        .au-header-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(155,0,0,0.3);
        }
        .au-header-title { font-size: 15px; font-weight: 700; color: #111827; letter-spacing: -0.2px; }
        .au-header-right { display: flex; align-items: center; gap: 12px; }
        .au-avatar-btn {
          display: flex; align-items: center; gap: 9px;
          background: #f9fafb; border: 1px solid #e5e7eb;
          border-radius: 40px; padding: 4px 14px 4px 4px;
          cursor: default;
        }
        .au-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 2px solid #e8eaed; flex-shrink: 0; }
        .au-avatar-fallback {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .au-user-name { font-size: 13px; font-weight: 600; color: #374151; }
        .au-logout-btn {
          font-size: 13px; font-weight: 500; color: #6b7280;
          background: none; border: 1px solid #e5e7eb;
          border-radius: 8px; padding: 7px 16px;
          cursor: pointer; font-family: inherit;
          transition: all 0.15s;
        }
        .au-logout-btn:hover { border-color: #fecaca; color: #9b0000; background: #fef2f2; }

        /* ── Body ── */
        .au-body { padding: 32px; max-width: 1120px; margin: 0 auto; }

        /* ── Welcome banner ── */
        .au-welcome {
          background: linear-gradient(120deg, #9b0000 0%, #7a0000 100%);
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 28px;
          display: flex; align-items: center; justify-content: space-between;
          color: #fff;
          position: relative; overflow: hidden;
        }
        .au-welcome::before {
          content: ''; position: absolute; top: -40px; right: -40px;
          width: 200px; height: 200px; border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .au-welcome::after {
          content: ''; position: absolute; bottom: -60px; right: 120px;
          width: 160px; height: 160px; border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }
        .au-welcome-greeting { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.65); margin-bottom: 4px; }
        .au-welcome-name { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.5px; margin-bottom: 6px; }
        .au-welcome-date { font-size: 12.5px; color: rgba(255,255,255,0.5); }
        .au-welcome-right { display: flex; gap: 12px; z-index: 1; flex-shrink: 0; }
        .au-welcome-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff; border-radius: 10px;
          padding: 10px 20px; font-size: 13px; font-weight: 600;
          font-family: inherit; cursor: pointer; text-decoration: none;
          transition: background 0.15s;
          backdrop-filter: blur(4px);
        }
        .au-welcome-btn:hover { background: rgba(255,255,255,0.22); }
        .au-welcome-btn.solid {
          background: #fff; color: #9b0000; border-color: transparent;
        }
        .au-welcome-btn.solid:hover { background: #fef2f2; }

        /* ── Tabs ── */
        .au-tabs {
          position: relative; display: flex; gap: 2px;
          margin-bottom: 24px;
          background: #fff;
          border: 1px solid #e8eaed;
          border-radius: 12px; padding: 4px;
          width: fit-content;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .au-tab-pill {
          position: absolute; top: 4px; border-radius: 9px;
          background: #9b0000;
          transition: left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1);
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(155,0,0,0.25);
        }
        .au-tab-btn {
          position: relative; z-index: 1;
          padding: 9px 22px; border-radius: 9px; border: none;
          background: none; font-size: 13.5px; font-weight: 500;
          font-family: inherit; color: #6b7280; cursor: pointer;
          transition: color 0.2s;
          display: flex; align-items: center; gap: 7px; white-space: nowrap;
        }
        .au-tab-btn.active { color: #fff; font-weight: 600; }
        .au-tab-btn:hover:not(.active) { color: #111827; }
        .au-tab-badge { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 20px; }
        .au-tab-btn.active .au-tab-badge { background: rgba(255,255,255,0.25); color: #fff; }
        .au-tab-btn:not(.active) .au-tab-badge { background: #fef2f2; color: #9b0000; }

        /* ── Stats ── */
        .au-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .au-stat-card {
          background: #fff; border: 1px solid #e8eaed; border-radius: 14px;
          padding: 22px 24px; display: flex; align-items: flex-start; gap: 16px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .au-stat-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); transform: translateY(-1px); }
        .au-stat-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .au-stat-icon.red   { background: #fef2f2; color: #9b0000; }
        .au-stat-icon.amber { background: #fffbeb; color: #92400e; }
        .au-stat-icon.green { background: #f0fdf4; color: #166534; }
        .au-stat-body { flex: 1; }
        .au-stat-label { font-size: 11.5px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .au-stat-num { font-size: 34px; font-weight: 700; color: #111827; line-height: 1; margin-bottom: 4px; letter-spacing: -1px; }
        .au-stat-sub { font-size: 12px; color: #9ca3af; }

        /* ── Quick actions ── */
        .au-quick-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 28px; }
        .au-quick-card {
          background: #fff; border: 1px solid #e8eaed; border-radius: 14px;
          padding: 18px 20px; text-decoration: none;
          display: flex; align-items: center; gap: 14px;
          transition: all 0.18s; cursor: pointer;
        }
        .au-quick-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); transform: translateY(-1px); border-color: #d1d5db; }
        .au-quick-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .au-quick-icon.red    { background: #fef2f2; color: #9b0000; }
        .au-quick-icon.blue   { background: #eff6ff; color: #1d4ed8; }
        .au-quick-icon.green  { background: #f0fdf4; color: #166534; }
        .au-quick-icon.purple { background: #faf5ff; color: #7c3aed; }
        .au-quick-content { flex: 1; }
        .au-quick-title { font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 2px; }
        .au-quick-desc  { font-size: 12px; color: #9ca3af; }
        .au-quick-arrow { color: #d1d5db; flex-shrink: 0; transition: transform 0.15s, color 0.15s; }
        .au-quick-card:hover .au-quick-arrow { color: #9b0000; transform: translateX(3px); }

        /* ── Section header ── */
        .au-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .au-section-title { font-size: 17px; font-weight: 700; color: #111827; letter-spacing: -0.2px; }
        .au-view-all {
          font-size: 12.5px; font-weight: 600; color: #9b0000;
          text-decoration: none; display: flex; align-items: center; gap: 4px;
          transition: gap 0.15s;
        }
        .au-view-all:hover { gap: 7px; }

        /* ── Table ── */
        .au-table-wrap { background: #fff; border: 1px solid #e8eaed; border-radius: 14px; overflow: hidden; }
        .au-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .au-table thead { background: #f9fafb; border-bottom: 1px solid #e8eaed; }
        .au-table th { padding: 11px 18px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9ca3af; }
        .au-table td { padding: 15px 18px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; color: #374151; }
        .au-table tr:last-child td { border-bottom: none; }
        .au-table tbody tr { transition: background 0.12s; }
        .au-table tbody tr:hover td { background: #fafafa; }

        .au-status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
        .au-approve-btn { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 600; font-family: inherit; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 5px; }
        .au-approve-btn:hover { background: #dcfce7; border-color: #86efac; }
        .au-approve-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .au-reject-btn  { background: #fef2f2; border: 1.5px solid #fecaca; color: #9b0000; font-size: 12px; font-weight: 600; font-family: inherit; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .au-reject-btn:hover { background: #fee2e2; border-color: #fca5a5; }
        .au-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Empty state ── */
        .au-empty { padding: 52px 24px; text-align: center; }
        .au-empty-icon { width: 52px; height: 52px; border-radius: 14px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #9ca3af; }
        .au-empty-title { font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .au-empty-sub { font-size: 13px; color: #9ca3af; }

        /* ── Skeleton ── */
        .au-skel { border-radius: 6px; height: 14px; background: linear-gradient(90deg, #f3f4f6 25%, #e9eaeb 50%, #f3f4f6 75%); background-size: 900px 100%; animation: auShimmer 1.4s infinite linear; }
        @keyframes auShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .au-skel-row td { padding: 16px 18px; }
        @keyframes auSpin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .au-body { padding: 20px 16px; }
          .au-header { padding: 0 16px; }
          .au-welcome { padding: 22px 20px; }
          .au-welcome-right { display: none; }
          .au-stats { grid-template-columns: 1fr; }
          .au-quick-actions { grid-template-columns: 1fr; }
          .au-user-name { display: none; }
        }
      `}</style>

      <div className="au-page">
        {/* ── Header ── */}
        <header className="au-header">
          <div className="au-header-left">
            <div className="au-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span className="au-header-title">CITE-TMS</span>
          </div>
          <div className="au-header-right">
            <div className="au-avatar-btn">
              {avatar
                ? <img className="au-avatar" src={avatar} alt={displayName} referrerPolicy="no-referrer" />
                : <div className="au-avatar-fallback">{initials}</div>}
              <span className="au-user-name">{firstName}</span>
            </div>
            <button className="au-logout-btn" onClick={async () => { await logout(); navigate("/"); }}>
              Sign out
            </button>
          </div>
        </header>

        <div className="au-body">
          {/* ── Welcome banner ── */}
          <div className="au-welcome">
            <div style={{ zIndex: 1 }}>
              <div className="au-welcome-greeting">{greeting},</div>
              <div className="au-welcome-name">{displayName}</div>
              <div className="au-welcome-date">{dateStr}</div>
            </div>
            <div className="au-welcome-right">
              <Link to="/student/upload" className="au-welcome-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Paper
              </Link>
              <Link to="/author/papers" className="au-welcome-btn solid">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                My Papers
              </Link>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="au-tabs">
            <div className="au-tab-pill" style={{ left: pillStyle.left, width: pillStyle.width, height: pillStyle.height }} />
            <button ref={(el) => (tabRefs.current["overview"] = el)} className={`au-tab-btn${activeTab === "overview" ? " active" : ""}`} onClick={() => setActiveTab("overview")}>
              Overview
            </button>
            <button ref={(el) => (tabRefs.current["uploads"] = el)} className={`au-tab-btn${activeTab === "uploads" ? " active" : ""}`} onClick={() => setActiveTab("uploads")}>
              Upload Requests
              {uploadRequests.filter((u) => u.status === "pending").length > 0 && <span className="au-tab-badge">{uploadRequests.filter((u) => u.status === "pending").length}</span>}
            </button>
            <button ref={(el) => (tabRefs.current["requests"] = el)} className={`au-tab-btn${activeTab === "requests" ? " active" : ""}`} onClick={() => setActiveTab("requests")}>
              Access Requests
              {pendingCount > 0 && <span className="au-tab-badge">{pendingCount}</span>}
            </button>
          </div>

          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (
            <>
              {/* Stats */}
              <div className="au-stats">
                <div className="au-stat-card">
                  <div className="au-stat-icon red">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </div>
                  <div className="au-stat-body">
                    <div className="au-stat-label">Total Papers</div>
                    {loading ? <div className="au-skel" style={{ height: 34, width: 56, marginBottom: 6 }} /> : <div className="au-stat-num">{papers.length}</div>}
                    <div className="au-stat-sub">Published by you</div>
                  </div>
                </div>
                <div className="au-stat-card">
                  <div className="au-stat-icon amber">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div className="au-stat-body">
                    <div className="au-stat-label">Pending Requests</div>
                    {loading ? <div className="au-skel" style={{ height: 34, width: 40, marginBottom: 6 }} /> : (
                      <div className="au-stat-num" style={{ color: pendingCount > 0 ? "#9b0000" : "#111827" }}>{pendingCount}</div>
                    )}
                    <div className="au-stat-sub">Awaiting your review</div>
                  </div>
                </div>
                <div className="au-stat-card">
                  <div className="au-stat-icon green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="au-stat-body">
                    <div className="au-stat-label">Approved Access</div>
                    {loading ? <div className="au-skel" style={{ height: 34, width: 40, marginBottom: 6 }} /> : (
                      <div className="au-stat-num" style={{ color: "#166534" }}>{approvedCount}</div>
                    )}
                    <div className="au-stat-sub">Students with access</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="au-quick-actions">
                {[
                  { to: "/author/requests", icon: "green", title: "Access Requests", desc: "Review student access requests", svg: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></> },
                  { to: "/papers", icon: "purple", title: "Browse Papers", desc: "Explore all research papers", svg: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></> },
                ].map(({ to, icon, title, desc, svg }) => (
                  <Link key={to} to={to} className="au-quick-card">
                    <div className={`au-quick-icon ${icon}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{svg}</svg>
                    </div>
                    <div className="au-quick-content">
                      <div className="au-quick-title">{title}</div>
                      <div className="au-quick-desc">{desc}</div>
                    </div>
                    <svg className="au-quick-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                ))}
              </div>

              {/* Pending Requests table */}
              <div className="au-section-header">
                <div className="au-section-title">Pending Requests</div>
                {requests.filter((r) => r.status === "pending").length > 5 && (
                  <Link to="/author/requests" className="au-view-all">
                    View all
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </Link>
                )}
              </div>
              <div className="au-table-wrap">
                <table className="au-table">
                  <thead>
                    <tr><th>Requester</th><th>Paper</th><th>Message</th><th>Date</th><th /></tr>
                  </thead>
                  <tbody>
                    {loading && [1,2,3].map((i) => (
                      <tr className="au-skel-row" key={i}>
                        {["50%","60%","40%","30%"].map((w,j) => <td key={j}><div className="au-skel" style={{ width: w }} /></td>)}
                        <td />
                      </tr>
                    ))}
                    {!loading && recentRequests.length === 0 && (
                      <tr><td colSpan={5}>
                        <div className="au-empty">
                          <div className="au-empty-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <div className="au-empty-title">All caught up!</div>
                          <div className="au-empty-sub">No pending requests at the moment.</div>
                        </div>
                      </td></tr>
                    )}
                    {!loading && recentRequests.map((req) => {
                      const busy = decidingId === req.id;
                      return (
                        <tr key={req.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{req.requester_name || "—"}</div>
                            <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>{req.requester_email || "—"}</div>
                          </td>
                          <td style={{ maxWidth: 200, fontWeight: 500, color: "#374151" }}>{req.paper_title || "Untitled"}</td>
                          <td style={{ maxWidth: 200, fontSize: 12.5, color: "#6b7280" }}>
                            {req.message ? req.message.slice(0, 60) + (req.message.length > 60 ? "…" : "") : "—"}
                          </td>
                          <td style={{ fontSize: 12.5, color: "#9ca3af", whiteSpace: "nowrap" }}>
                            {new Date(req.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="au-approve-btn" disabled={busy} onClick={() => handleRequestAction(req.id, "approved")}>
                                {busy ? <Spinner /> : "✓ Approve"}
                              </button>
                              <button className="au-reject-btn" disabled={busy} onClick={() => handleRequestAction(req.id, "rejected")}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Upload Requests Tab ── */}
          {activeTab === "uploads" && (
            <>
              <div className="au-section-header">
                <div className="au-section-title">Paper Upload Requests</div>
              </div>
              <div className="au-table-wrap">
                <table className="au-table">
                  <thead>
                    <tr><th>Paper Title</th><th>Status</th><th>Submitted</th><th>Last Updated</th></tr>
                  </thead>
                  <tbody>
                    {loading && [1,2,3].map((i) => (
                      <tr className="au-skel-row" key={i}>
                        {["60%","30%","30%","30%"].map((w,j) => <td key={j}><div className="au-skel" style={{ width: w }} /></td>)}
                      </tr>
                    ))}
                    {!loading && uploadRequests.length === 0 && (
                      <tr><td colSpan={4}>
                        <div className="au-empty">
                          <div className="au-empty-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          </div>
                          <div className="au-empty-title">No upload requests yet</div>
                          <div className="au-empty-sub">Upload your first paper to get started.</div>
                        </div>
                      </td></tr>
                    )}
                    {!loading && uploadRequests.map((uploadReq) => {
                      const paperData = uploadReq.papers && typeof uploadReq.papers === "object" ? uploadReq.papers : {};
                      const s = STATUS_MAP[uploadReq.status] || STATUS_MAP.pending;
                      return (
                        <tr key={uploadReq.id}>
                          <td style={{ fontWeight: 600, color: "#111827", maxWidth: 300 }}>{paperData?.title || "Untitled"}</td>
                          <td>
                            <span className="au-status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                              {s.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12.5, color: "#9ca3af", whiteSpace: "nowrap" }}>
                            {new Date(uploadReq.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td style={{ fontSize: 12.5, color: "#9ca3af", whiteSpace: "nowrap" }}>
                            {uploadReq.updated_at ? new Date(uploadReq.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Access Requests Tab ── */}
          {activeTab === "requests" && (
            <>
              <div className="au-section-header">
                <div className="au-section-title">All Access Requests</div>
              </div>
              <div className="au-table-wrap">
                <table className="au-table">
                  <thead>
                    <tr><th>Requester</th><th>Paper</th><th>Message</th><th>Status</th><th>Date</th><th /></tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 && (
                      <tr><td colSpan={6}>
                        <div className="au-empty">
                          <div className="au-empty-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                          <div className="au-empty-title">No access requests yet</div>
                          <div className="au-empty-sub">Requests from students will appear here.</div>
                        </div>
                      </td></tr>
                    )}
                    {requests.map((req) => {
                      const s    = STATUS_MAP[req.status] || STATUS_MAP.pending;
                      const busy = decidingId === req.id;
                      return (
                        <tr key={req.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{req.requester_name || "—"}</div>
                            <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>{req.requester_email || "—"}</div>
                          </td>
                          <td style={{ maxWidth: 200, fontWeight: 500 }}>{req.paper_title || "—"}</td>
                          <td style={{ maxWidth: 200, fontSize: 12.5, color: "#6b7280" }}>
                            {req.message ? req.message.slice(0, 80) + (req.message.length > 80 ? "…" : "") : "—"}
                          </td>
                          <td>
                            <span className="au-status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                              {s.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12.5, color: "#9ca3af", whiteSpace: "nowrap" }}>
                            {new Date(req.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td>
                            {req.status === "pending" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="au-approve-btn" disabled={busy} onClick={() => handleRequestAction(req.id, "approved")}>
                                  {busy ? <Spinner /> : "✓ Approve"}
                                </button>
                                <button className="au-reject-btn" disabled={busy} onClick={() => handleRequestAction(req.id, "rejected")}>Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
