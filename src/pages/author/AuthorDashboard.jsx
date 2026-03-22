import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import Navbar from "../../components/layout/Navbar";

export default function AuthorDashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [papers, setPapers]     = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, rRes] = await Promise.all([
          api.get("/api/author/papers"),
          api.get("/api/author/requests"),
        ]);
        setPapers(pRes.data.results ?? []);
        setRequests(rRes.data ?? []);
      } catch (e) {
        console.error("Failed to load author dashboard:", e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pendingCount  = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const recentRequests = requests.filter((r) => r.status === "pending").slice(0, 5);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Author";
  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .au-page { min-height: 100vh; background: #fafafa; font-family: 'DM Sans', system-ui, sans-serif; }

        .au-header {
          background: #fff; border-bottom: 1px solid #efefef;
          padding: 0 40px; height: 58px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 10;
        }
        .au-header-left { display: flex; align-items: center; gap: 12px; }
        .au-header-icon { width: 32px; height: 32px; border-radius: 7px; background: linear-gradient(135deg, #9b0000, #c0392b); display: flex; align-items: center; justify-content: center; }
        .au-header-title { font-size: 15px; font-weight: 600; color: #202124; }
        .au-header-badge { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: #fef2f2; color: #9b0000; border-radius: 20px; padding: 2px 8px; border: 1px solid #fecaca; }
        .au-header-right { display: flex; align-items: center; gap: 12px; }
        .au-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #e8eaed; }
        .au-avatar-fallback { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #9b0000, #c0392b); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; border: 2px solid #fecaca; }
        .au-user-name { font-size: 13px; font-weight: 600; color: #202124; }
        .au-logout-btn { font-size: 13px; font-weight: 500; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .au-logout-btn:hover { background: #fee2e2; }

        .au-body { max-width: 1000px; margin: 0 auto; padding: 36px 40px 80px; }

        .au-welcome { margin-bottom: 32px; }
        .au-welcome-title { font-family: 'DM Serif Display', serif; font-size: 28px; color: #111827; margin-bottom: 6px; }
        .au-welcome-sub { font-size: 14px; color: #6b7280; }

        /* Nav links */
        .au-nav { display: flex; gap: 10px; margin-bottom: 32px; flex-wrap: wrap; }
        .au-nav-link {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 9px;
          border: 1.5px solid #e5e7eb; background: #fff;
          color: #374151; font-size: 13.5px; font-weight: 600;
          font-family: inherit; text-decoration: none;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .au-nav-link:hover { border-color: #9b0000; color: #9b0000; background: #fef2f2; }
        .au-nav-link.primary { background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; border-color: transparent; box-shadow: 0 4px 14px rgba(155,0,0,0.25); }
        .au-nav-link.primary:hover { opacity: 0.9; color: #fff; }

        /* Stats */
        .au-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .au-stat-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 14px; padding: 22px 24px; transition: box-shadow 0.18s; }
        .au-stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .au-stat-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 10px; }
        .au-stat-num { font-family: 'DM Serif Display', serif; font-size: 36px; color: #111827; line-height: 1; margin-bottom: 6px; }
        .au-stat-sub { font-size: 12.5px; color: #9ca3af; }

        /* Recent requests */
        .au-section-title { font-family: 'DM Serif Display', serif; font-size: 20px; color: #111827; margin-bottom: 16px; }
        .au-requests-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 14px; overflow: hidden; }
        .au-req-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; border-bottom: 1px solid #f9f9f9; }
        .au-req-row:last-child { border-bottom: none; }
        .au-req-paper { font-size: 13.5px; font-weight: 500; color: #111827; }
        .au-req-from { font-size: 12px; color: #9ca3af; margin-top: 2px; }
        .au-req-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .au-approve-btn { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 600; font-family: inherit; padding: 5px 14px; border-radius: 7px; cursor: pointer; transition: background 0.15s; }
        .au-approve-btn:hover { background: #dcfce7; }
        .au-reject-btn { background: #fef2f2; border: 1.5px solid #fecaca; color: #9b0000; font-size: 12px; font-weight: 600; font-family: inherit; padding: 5px 14px; border-radius: 7px; cursor: pointer; transition: background 0.15s; }
        .au-reject-btn:hover { background: #fee2e2; }

        .au-empty { padding: 40px; text-align: center; color: #9ca3af; font-size: 13.5px; }
        .au-view-all { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; color: #9b0000; text-decoration: none; padding: 12px 20px; border-top: 1px solid #f9f9f9; width: 100%; justify-content: center; transition: background 0.15s; }
        .au-view-all:hover { background: #fef2f2; }

        .au-skel { border-radius: 6px; background: linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%); background-size: 900px 100%; animation: auShimmer 1.4s infinite linear; }
        @keyframes auShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }

        @media (max-width: 768px) {
          .au-body { padding: 24px 20px 60px; }
          .au-header { padding: 0 20px; }
          .au-stats { grid-template-columns: 1fr 1fr; }
          .au-user-name { display: none; }
        }
      `}</style>

      <div className="au-page">
        <header className="au-header">
          <div className="au-header-left">
            <div className="au-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <span className="au-header-title">CITE-TMS</span>
            <span className="au-header-badge">Author</span>
          </div>
          <div className="au-header-right">
            {avatar
              ? <img className="au-avatar" src={avatar} alt={displayName} referrerPolicy="no-referrer" />
              : <div className="au-avatar-fallback">{displayName[0]?.toUpperCase()}</div>}
            <span className="au-user-name">{displayName}</span>
            <button className="au-logout-btn" onClick={async () => { await logout(); navigate("/"); }}>Sign out</button>
          </div>
        </header>

        <div className="au-body">
          <div className="au-welcome">
            <h1 className="au-welcome-title">Welcome back, {displayName.split(" ")[0]} 👋</h1>
            <p className="au-welcome-sub">Manage your papers and review access requests from your dashboard.</p>
          </div>

          <div className="au-nav">
            <Link to="/author/papers" className="au-nav-link primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              My Papers
            </Link>
            <Link to="/author/requests" className="au-nav-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Access Requests
              {pendingCount > 0 && (
                <span style={{ background: "#fef2f2", color: "#9b0000", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, border: "1px solid #fecaca" }}>
                  {pendingCount}
                </span>
              )}
            </Link>
            <Link to="/student/upload" className="au-nav-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Paper
            </Link>
            <Link to="/papers" className="au-nav-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Browse Papers
            </Link>
          </div>

          {/* Stats */}
          <div className="au-stats">
            <div className="au-stat-card">
              <div className="au-stat-label">Total Papers</div>
              {loading
                ? <div className="au-skel" style={{ height: 40, width: 60, marginBottom: 8 }} />
                : <div className="au-stat-num">{papers.length}</div>}
              <div className="au-stat-sub">Published by you</div>
            </div>
            <div className="au-stat-card">
              <div className="au-stat-label">Pending Requests</div>
              {loading
                ? <div className="au-skel" style={{ height: 40, width: 40, marginBottom: 8 }} />
                : <div className="au-stat-num" style={{ color: pendingCount > 0 ? "#9b0000" : "#111827" }}>{pendingCount}</div>}
              <div className="au-stat-sub">Awaiting your review</div>
            </div>
            <div className="au-stat-card">
              <div className="au-stat-label">Approved Access</div>
              {loading
                ? <div className="au-skel" style={{ height: 40, width: 40, marginBottom: 8 }} />
                : <div className="au-stat-num" style={{ color: "#15803d" }}>{approvedCount}</div>}
              <div className="au-stat-sub">Students with access</div>
            </div>
          </div>

          {/* Recent pending requests */}
          <div className="au-section-title">Pending Requests</div>
          <div className="au-requests-card">
            {loading && [1,2,3].map((i) => (
              <div className="au-req-row" key={i}>
                <div style={{ flex: 1 }}>
                  <div className="au-skel" style={{ height: 14, width: "60%", marginBottom: 6 }} />
                  <div className="au-skel" style={{ height: 12, width: "35%" }} />
                </div>
                <div className="au-skel" style={{ height: 30, width: 140, borderRadius: 8 }} />
              </div>
            ))}
            {!loading && recentRequests.length === 0 && (
              <div className="au-empty">No pending requests — you're all caught up! 🎉</div>
            )}
            {!loading && recentRequests.map((req) => (
              <div className="au-req-row" key={req.id}>
                <div>
                  <div className="au-req-paper">{req.paper_title || "Untitled paper"}</div>
                  <div className="au-req-from">{req.requester_name || req.requester_email || "Unknown requester"}</div>
                </div>
                <div className="au-req-actions">
                  <button className="au-approve-btn" onClick={async () => {
                    try {
                      await api.patch(`/api/author/requests/${req.id}`, { status: "approved" });
                      setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "approved" } : r));
                    } catch (e) { alert("Failed: " + e.message); }
                  }}>Approve</button>
                  <button className="au-reject-btn" onClick={async () => {
                    try {
                      await api.patch(`/api/author/requests/${req.id}`, { status: "rejected" });
                      setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "rejected" } : r));
                    } catch (e) { alert("Failed: " + e.message); }
                  }}>Reject</button>
                </div>
              </div>
            ))}
            {!loading && requests.length > 5 && (
              <Link to="/author/requests" className="au-view-all">
                View all requests →
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}