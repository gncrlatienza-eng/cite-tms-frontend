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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

        .au-page { min-height: 100vh; background: #f0f2f5; font-family: 'Schibsted Grotesk', system-ui, sans-serif; }

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
        .au-header-left { display: flex; align-items: center; gap: 10px; cursor: pointer; }
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
          border-radius: 40px; padding: 4px 12px 4px 4px;
          cursor: pointer; transition: all 0.15s; position: relative;
        }
        .au-avatar-btn:hover { border-color: #d1d5db; background: #f3f4f6; }
        .au-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 2px solid #e8eaed; flex-shrink: 0; }
        .au-avatar-fallback {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .au-user-name { font-size: 13px; font-weight: 600; color: #374151; }
        .au-chevron { color: #9ca3af; transition: transform 0.2s; }
        .au-chevron.open { transform: rotate(180deg); }

        .au-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; min-width: 220px; z-index: 999;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden;
          animation: auDropIn 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes auDropIn { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .au-dropdown-header { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; }
        .au-dropdown-name { font-size: 13.5px; font-weight: 600; color: #111827; }
        .au-dropdown-email { font-size: 11.5px; color: #9ca3af; margin-top: 2px; }
        .au-dropdown-role { display: inline-block; margin-top: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 2px 9px; border-radius: 20px; background: #fef2f2; color: #9b0000; }
        .au-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; font-size: 13px; color: #374151;
          cursor: pointer; border: none; background: none;
          width: 100%; text-align: left; font-family: inherit; font-weight: 400;
          transition: background 0.12s;
        }
        .au-dropdown-item:hover { background: #f9fafb; }
        .au-dropdown-item.danger { color: #dc2626; }
        .au-dropdown-item.danger:hover { background: #fff5f5; }
        .au-dropdown-divider { height: 1px; background: #f3f4f6; }

        /* ── Body ── */
        .au-body { padding: 32px; max-width: 1120px; margin: 0 auto; }

        /* ── Welcome banner ── */
        .au-welcome {
          background: linear-gradient(135deg, #9b0000 0%, #6b0000 60%, #4a0000 100%);
          border-radius: 20px;
          padding: 32px 36px;
          margin-bottom: 28px;
          display: flex; align-items: center; justify-content: space-between;
          color: #fff;
          position: relative; overflow: hidden;
          box-shadow: 0 8px 32px rgba(155,0,0,0.28);
        }
        .au-welcome::before {
          content: ''; position: absolute; top: -60px; right: -60px;
          width: 260px; height: 260px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .au-welcome::after {
          content: ''; position: absolute; bottom: -80px; right: 160px;
          width: 200px; height: 200px; border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }
        .au-welcome-dot {
          position: absolute; top: 20px; left: 50%;
          width: 120px; height: 120px; border-radius: 50%;
          background: rgba(255,255,255,0.03);
        }
        .au-welcome-tag {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600;
          letter-spacing: 0.05em; color: rgba(255,255,255,0.85); margin-bottom: 10px;
        }
        .au-welcome-greeting { font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
        .au-welcome-name { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.6px; margin-bottom: 8px; line-height: 1.1; }
        .au-welcome-date { font-size: 12px; color: rgba(255,255,255,0.45); display: flex; align-items: center; gap: 5px; }
        .au-welcome-right { display: flex; gap: 10px; z-index: 1; flex-shrink: 0; }
        .au-welcome-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
          color: #fff; border-radius: 10px;
          padding: 10px 18px; font-size: 13px; font-weight: 600;
          font-family: inherit; cursor: pointer; text-decoration: none;
          transition: all 0.15s;
          backdrop-filter: blur(8px);
        }
        .au-welcome-btn:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.35); }
        .au-welcome-btn.solid {
          background: #fff; color: #9b0000; border-color: transparent;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .au-welcome-btn.solid:hover { background: #fef2f2; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.18); }

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
          background: #fff; border: 1px solid #e8eaed; border-radius: 16px;
          padding: 22px 24px; display: flex; align-items: flex-start; gap: 16px;
          transition: box-shadow 0.2s, transform 0.2s;
          position: relative; overflow: hidden;
        }
        .au-stat-card::before {
          content: ''; position: absolute; top: 0; left: 0;
          width: 3px; height: 100%; border-radius: 16px 0 0 16px;
        }
        .au-stat-card.red-accent::before  { background: linear-gradient(180deg, #9b0000, #c0392b); }
        .au-stat-card.amber-accent::before { background: linear-gradient(180deg, #f59e0b, #d97706); }
        .au-stat-card.green-accent::before { background: linear-gradient(180deg, #16a34a, #15803d); }
        .au-stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .au-stat-icon {
          width: 46px; height: 46px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .au-stat-icon.red   { background: #fef2f2; color: #9b0000; }
        .au-stat-icon.amber { background: #fffbeb; color: #b45309; }
        .au-stat-icon.green { background: #f0fdf4; color: #166534; }
        .au-stat-body { flex: 1; }
        .au-stat-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .au-stat-num { font-size: 36px; font-weight: 700; color: #111827; line-height: 1; margin-bottom: 5px; letter-spacing: -1.5px; }
        .au-stat-sub { font-size: 12px; color: #b0b7c3; }

        /* ── Quick actions ── */
        .au-quick-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 28px; }
        .au-quick-card {
          background: #fff; border: 1px solid #e8eaed; border-radius: 16px;
          padding: 20px 22px; text-decoration: none;
          display: flex; align-items: center; gap: 16px;
          transition: all 0.2s; cursor: pointer;
        }
        .au-quick-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.09); transform: translateY(-2px); border-color: #c8cdd5; }
        .au-quick-icon { width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .au-quick-icon.red    { background: #fef2f2; color: #9b0000; }
        .au-quick-icon.blue   { background: #eff6ff; color: #1d4ed8; }
        .au-quick-icon.green  { background: #f0fdf4; color: #166534; }
        .au-quick-icon.purple { background: #faf5ff; color: #7c3aed; }
        .au-quick-content { flex: 1; }
        .au-quick-title { font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 3px; }
        .au-quick-desc  { font-size: 12.5px; color: #9ca3af; }
        .au-quick-arrow { color: #d1d5db; flex-shrink: 0; transition: transform 0.2s, color 0.2s; }
        .au-quick-card:hover .au-quick-arrow { color: #9b0000; transform: translateX(4px); }

        /* ── Section header ── */
        .au-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .au-section-title { font-size: 17px; font-weight: 700; color: #111827; letter-spacing: -0.3px; }
        .au-section-sub { font-size: 12.5px; color: #9ca3af; margin-top: 2px; }
        .au-view-all {
          font-size: 12.5px; font-weight: 600; color: #9b0000;
          text-decoration: none; display: flex; align-items: center; gap: 4px;
          transition: gap 0.15s; background: #fef2f2; padding: 5px 12px; border-radius: 8px;
        }
        .au-view-all:hover { gap: 7px; background: #fee2e2; }

        /* ── Table ── */
        .au-table-wrap { background: #fff; border: 1px solid #e8eaed; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
        .au-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .au-table thead { background: #f8f9fb; border-bottom: 1px solid #eaecf0; }
        .au-table th { padding: 12px 20px; text-align: left; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #adb5bd; }
        .au-table td { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; color: #374151; }
        .au-table tr:last-child td { border-bottom: none; }
        .au-table tbody tr { transition: background 0.12s; }
        .au-table tbody tr:hover td { background: #fafbfc; }

        .au-status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
        .au-approve-btn { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 600; font-family: inherit; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 5px; }
        .au-approve-btn:hover { background: #dcfce7; border-color: #86efac; }
        .au-approve-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .au-reject-btn  { background: #fef2f2; border: 1.5px solid #fecaca; color: #9b0000; font-size: 12px; font-weight: 600; font-family: inherit; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .au-reject-btn:hover { background: #fee2e2; border-color: #fca5a5; }
        .au-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Empty state ── */
        .au-empty { padding: 28px 24px; text-align: center; }
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
          <Link to="/" className="au-header-left" style={{ textDecoration: "none" }}>
            <div className="au-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span className="au-header-title">CITE-TMS</span>
          </Link>
          <div className="au-header-right">
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <div className="au-avatar-btn" onClick={() => setDropdownOpen((o) => !o)}>
                {avatar
                  ? <img className="au-avatar" src={avatar} alt={displayName} referrerPolicy="no-referrer" />
                  : <div className="au-avatar-fallback">{initials}</div>}
                <span className="au-user-name">{firstName}</span>
              </div>
              {dropdownOpen && (
                <div className="au-dropdown">
                  <div className="au-dropdown-header">
                    <div className="au-dropdown-name">{displayName}</div>
                    <div className="au-dropdown-email">{user?.email}</div>
                    <span className="au-dropdown-role">Author</span>
                  </div>
                  <div className="au-dropdown-divider" />
                  <button className="au-dropdown-item danger" onClick={async () => { setDropdownOpen(false); await logout(); navigate("/"); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="au-body">
          {/* ── Welcome banner ── */}
          <div className="au-welcome">
            <div className="au-welcome-dot" />
            <div style={{ zIndex: 1 }}>
              <div className="au-welcome-tag">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
                Author Portal
              </div>
              <div className="au-welcome-greeting">{greeting},</div>
              <div className="au-welcome-name">{displayName}</div>
              <div className="au-welcome-date">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {dateStr}
              </div>
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
                <div className="au-stat-card red-accent">
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
                <div className="au-stat-card amber-accent">
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
                <div className="au-stat-card green-accent">
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
                <div>
                  <div className="au-section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    Pending Requests
                    {recentRequests.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "#fef2f2", color: "#9b0000", border: "1px solid #fecaca", borderRadius: 20, padding: "2px 9px" }}>
                        {recentRequests.length}
                      </span>
                    )}
                  </div>
                  <div className="au-section-sub">Student requests awaiting your approval</div>
                </div>
                {requests.filter((r) => r.status === "pending").length > 5 && (
                  <Link to="/author/requests" className="au-view-all">
                    View all
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
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
