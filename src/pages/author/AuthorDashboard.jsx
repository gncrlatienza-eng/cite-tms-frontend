import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function AuthorDashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [papers, setPapers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [decidingId, setDecidingId] = useState(null);

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

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const recentRequests = requests.filter((r) => r.status === "pending").slice(0, 5);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Author";
  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

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

  const Spinner = ({ size = 14, color = "rgba(255,255,255,0.4)", top = "#fff" }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        border: `2px solid ${color}`,
        borderTopColor: top,
        animation: "auSpin 0.7s linear infinite",
      }}
    />
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .au-page { min-height: 100vh; background: #f8f9fa; font-family: 'DM Sans', system-ui, sans-serif; }

        .au-header {
          background: #fff; border-bottom: 1px solid #e8eaed;
          padding: 0 32px; height: 58px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 10;
        }
        .au-header-left { display: flex; align-items: center; gap: 12px; }
        .au-header-icon { width: 32px; height: 32px; border-radius: 7px; background: linear-gradient(135deg, #9b0000, #c0392b); display: flex; align-items: center; justify-content: center; }
        .au-header-title { font-size: 15px; font-weight: 600; color: #202124; }
        .au-header-badge { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: #fef2f2; color: #9b0000; border-radius: 20px; padding: 2px 8px; }
        .au-header-right { display: flex; align-items: center; gap: 14px; }
        .au-user-chip { display: flex; align-items: center; gap: 9px; }
        .au-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #e8eaed; flex-shrink: 0; }
        .au-avatar-fallback { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #9b0000, #c0392b); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; border: 2px solid #e8eaed; }
        .au-user-info { display: flex; flex-direction: column; line-height: 1.25; }
        .au-user-name { font-size: 13px; font-weight: 600; color: #202124; }
        .au-user-role { font-size: 10.5px; color: #9b0000; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
        .au-logout-btn { font-size: 13px; font-weight: 500; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .au-logout-btn:hover { background: #fee2e2; }

        .au-body { padding: 32px; max-width: 1100px; margin: 0 auto; }

        .au-tabs { display: flex; gap: 4px; margin-bottom: 24px; background: #fff; border: 1px solid #e8eaed; border-radius: 10px; padding: 4px; width: fit-content; }
        .au-tab-btn { padding: 8px 20px; border-radius: 7px; border: none; background: none; font-size: 13.5px; font-weight: 500; font-family: inherit; color: #5f6368; cursor: pointer; transition: background 0.15s, color 0.15s; display: flex; align-items: center; gap: 7px; white-space: nowrap; }
        .au-tab-btn.active { background: #9b0000; color: #fff; font-weight: 600; }
        .au-tab-btn:hover:not(.active) { background: #f1f3f4; color: #202124; }
        .au-tab-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
        .au-tab-btn.active .au-tab-badge { background: rgba(255,255,255,0.3); color: #fff; }
        .au-tab-btn:not(.active) .au-tab-badge { background: #fef2f2; color: #9b0000; }

        .au-controls { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .au-section-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: #202124; }
        .au-controls-right { display: flex; align-items: center; gap: 10px; }
        .au-action-btn { display: inline-flex; align-items: center; gap: 7px; background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 2px 6px rgba(155,0,0,0.25); white-space: nowrap; transition: opacity 0.15s; text-decoration: none; }
        .au-action-btn:hover { opacity: 0.9; }
        .au-action-btn.secondary { background: #f1f3f4; color: #374151; box-shadow: none; border: 1px solid #dadce0; }
        .au-action-btn.secondary:hover { background: #e8eaed; }

        /* Stats cards */
        .au-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .au-stat-card { background: #fff; border: 1px solid #e8eaed; border-radius: 12px; padding: 22px 24px; transition: box-shadow 0.18s; }
        .au-stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .au-stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #80868b; margin-bottom: 10px; }
        .au-stat-num { font-family: 'DM Serif Display', serif; font-size: 36px; color: #202124; line-height: 1; margin-bottom: 6px; }
        .au-stat-sub { font-size: 12.5px; color: #9aa0a6; }

        /* Quick actions */
        .au-quick-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px; }
        .au-quick-card { background: #fff; border: 1px solid #e8eaed; border-radius: 12px; padding: 18px 20px; text-decoration: none; display: flex; align-items: center; gap: 14px; transition: all 0.15s; }
        .au-quick-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .au-quick-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .au-quick-icon.red { background: linear-gradient(135deg, #fef2f2, #fee2e2); color: #9b0000; }
        .au-quick-icon.blue { background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #1d4ed8; }
        .au-quick-icon.green { background: linear-gradient(135deg, #f0fdf4, #dcfce7); color: #15803d; }
        .au-quick-icon.purple { background: linear-gradient(135deg, #faf5ff, #f3e8ff); color: #7c3aed; }
        .au-quick-content { flex: 1; }
        .au-quick-title { font-size: 14px; font-weight: 600; color: #202124; margin-bottom: 2px; }
        .au-quick-desc { font-size: 12px; color: #9aa0a6; }

        /* Table */
        .au-table-wrap { background: #fff; border: 1px solid #e8eaed; border-radius: 12px; overflow: hidden; }
        .au-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .au-table thead { background: #f8f9fa; border-bottom: 1px solid #e8eaed; }
        .au-table th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #80868b; }
        .au-table td { padding: 14px 16px; border-bottom: 1px solid #f1f3f4; vertical-align: top; color: #3c4043; }
        .au-table tr:last-child td { border-bottom: none; }
        .au-table tr:hover td { background: #fafafa; }

        .au-status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
        .au-approve-btn { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 600; font-family: inherit; padding: 5px 12px; border-radius: 7px; cursor: pointer; transition: background 0.15s; }
        .au-approve-btn:hover { background: #dcfce7; }
        .au-approve-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .au-reject-btn { background: #fef2f2; border: 1.5px solid #fecaca; color: #9b0000; font-size: 12px; font-weight: 600; font-family: inherit; padding: 5px 12px; border-radius: 7px; cursor: pointer; transition: background 0.15s; }
        .au-reject-btn:hover { background: #fee2e2; }
        .au-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .au-empty { padding: 56px; text-align: center; color: #9aa0a6; font-size: 14px; }

        .au-skel { border-radius: 4px; height: 14px; background: linear-gradient(90deg, #efefef 25%, #e6e6e6 50%, #efefef 75%); background-size: 900px 100%; animation: auShimmer 1.4s infinite linear; }
        @keyframes auShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .au-skel-row td { padding: 16px; }
        @keyframes auSpin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .au-body { padding: 20px 16px; }
          .au-header { padding: 0 16px; }
          .au-user-info { display: none; }
          .au-stats { grid-template-columns: 1fr; }
          .au-quick-actions { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="au-page">
        <header className="au-header">
          <div className="au-header-left">
            <div className="au-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span className="au-header-title">CITE-TMS</span>
            <span className="au-header-badge">Author</span>
          </div>
          <div className="au-header-right">
            <div className="au-user-chip">
              {avatar ? (
                <img className="au-avatar" src={avatar} alt={displayName} referrerPolicy="no-referrer" />
              ) : (
                <div className="au-avatar-fallback">{displayName[0]?.toUpperCase()}</div>
              )}
              <div className="au-user-info">
                <span className="au-user-name">{displayName}</span>
                <span className="au-user-role">Author</span>
              </div>
            </div>
            <button
              className="au-logout-btn"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="au-body">
          {/* Tabs */}
          <div className="au-tabs">
            <button className={`au-tab-btn${activeTab === "overview" ? " active" : ""}`} onClick={() => setActiveTab("overview")}>
              Overview
            </button>
            <button className={`au-tab-btn${activeTab === "requests" ? " active" : ""}`} onClick={() => setActiveTab("requests")}>
              Access Requests
              {pendingCount > 0 && <span className="au-tab-badge">{pendingCount}</span>}
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Stats */}
              <div className="au-stats">
                <div className="au-stat-card">
                  <div className="au-stat-label">Total Papers</div>
                  {loading ? (
                    <div className="au-skel" style={{ height: 40, width: 60, marginBottom: 8 }} />
                  ) : (
                    <div className="au-stat-num">{papers.length}</div>
                  )}
                  <div className="au-stat-sub">Published by you</div>
                </div>
                <div className="au-stat-card">
                  <div className="au-stat-label">Pending Requests</div>
                  {loading ? (
                    <div className="au-skel" style={{ height: 40, width: 40, marginBottom: 8 }} />
                  ) : (
                    <div className="au-stat-num" style={{ color: pendingCount > 0 ? "#9b0000" : "#202124" }}>
                      {pendingCount}
                    </div>
                  )}
                  <div className="au-stat-sub">Awaiting your review</div>
                </div>
                <div className="au-stat-card">
                  <div className="au-stat-label">Approved Access</div>
                  {loading ? (
                    <div className="au-skel" style={{ height: 40, width: 40, marginBottom: 8 }} />
                  ) : (
                    <div className="au-stat-num" style={{ color: "#15803d" }}>
                      {approvedCount}
                    </div>
                  )}
                  <div className="au-stat-sub">Students with access</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="au-quick-actions">
                <Link to="/author/papers" className="au-quick-card">
                  <div className="au-quick-icon red">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className="au-quick-content">
                    <div className="au-quick-title">My Papers</div>
                    <div className="au-quick-desc">View and manage your publications</div>
                  </div>
                </Link>

                <Link to="/student/upload" className="au-quick-card">
                  <div className="au-quick-icon blue">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="au-quick-content">
                    <div className="au-quick-title">Upload Paper</div>
                    <div className="au-quick-desc">Submit a new research paper</div>
                  </div>
                </Link>

                <Link to="/author/requests" className="au-quick-card">
                  <div className="au-quick-icon green">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="au-quick-content">
                    <div className="au-quick-title">Access Requests</div>
                    <div className="au-quick-desc">Review student access requests</div>
                  </div>
                </Link>

                <Link to="/papers" className="au-quick-card">
                  <div className="au-quick-icon purple">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <div className="au-quick-content">
                    <div className="au-quick-title">Browse Papers</div>
                    <div className="au-quick-desc">Explore all research papers</div>
                  </div>
                </Link>
              </div>

              {/* Recent Pending Requests */}
              <div className="au-controls">
                <div className="au-section-title">Pending Requests</div>
                {requests.filter((r) => r.status === "pending").length > 5 && (
                  <Link to="/author/requests" className="au-action-btn secondary">
                    View All
                  </Link>
                )}
              </div>
              <div className="au-table-wrap">
                <table className="au-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Paper</th>
                      <th>Message</th>
                      <th>Date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {loading &&
                      [1, 2, 3].map((i) => (
                        <tr className="au-skel-row" key={i}>
                          {["50%", "60%", "40%", "30%"].map((w, j) => (
                            <td key={j}>
                              <div className="au-skel" style={{ width: w }} />
                            </td>
                          ))}
                          <td />
                        </tr>
                      ))}
                    {!loading && recentRequests.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="au-empty">No pending requests — you're all caught up! 🎉</div>
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      recentRequests.map((req) => {
                        const busy = decidingId === req.id;
                        return (
                          <tr key={req.id}>
                            <td>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{req.requester_name || "—"}</div>
                              <div style={{ fontSize: 11.5, color: "#9aa0a6" }}>{req.requester_email || "—"}</div>
                            </td>
                            <td style={{ maxWidth: 200, fontWeight: 500 }}>{req.paper_title || "Untitled paper"}</td>
                            <td style={{ maxWidth: 200, fontSize: 12.5, color: "#5f6368" }}>
                              {req.message ? req.message.slice(0, 60) + (req.message.length > 60 ? "…" : "") : "—"}
                            </td>
                            <td style={{ fontSize: 12.5, color: "#9aa0a6", whiteSpace: "nowrap" }}>
                              {new Date(req.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  className="au-approve-btn"
                                  disabled={busy}
                                  onClick={() => handleRequestAction(req.id, "approved")}
                                >
                                  {busy ? <Spinner size={12} color="rgba(0,100,0,0.3)" top="#166534" /> : "Approve"}
                                </button>
                                <button
                                  className="au-reject-btn"
                                  disabled={busy}
                                  onClick={() => handleRequestAction(req.id, "rejected")}
                                >
                                  Reject
                                </button>
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

          {/* Access Requests Tab */}
          {activeTab === "requests" && (
            <>
              <div className="au-controls">
                <div className="au-section-title">All Access Requests</div>
              </div>
              <div className="au-table-wrap">
                <table className="au-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Paper</th>
                      <th>Message</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="au-empty">No access requests yet.</div>
                        </td>
                      </tr>
                    )}
                    {requests.map((req) => {
                      const STATUS = {
                        pending: { bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b" },
                        approved: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", dot: "#16a34a" },
                        rejected: { bg: "#fef2f2", color: "#9b0000", border: "#fecaca", dot: "#dc2626" },
                      };
                      const s = STATUS[req.status] || STATUS.pending;
                      const busy = decidingId === req.id;

                      return (
                        <tr key={req.id}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{req.requester_name || "—"}</div>
                            <div style={{ fontSize: 11.5, color: "#9aa0a6" }}>{req.requester_email || "—"}</div>
                          </td>
                          <td style={{ maxWidth: 200, fontWeight: 500 }}>{req.paper_title || "—"}</td>
                          <td style={{ maxWidth: 200, fontSize: 12.5, color: "#5f6368" }}>
                            {req.message ? req.message.slice(0, 80) + (req.message.length > 80 ? "…" : "") : "—"}
                          </td>
                          <td>
                            <span
                              className="au-status-pill"
                              style={{ background: s.bg, color: s.color, borderColor: s.border }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: s.dot,
                                  flexShrink: 0,
                                }}
                              />
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </td>
                          <td style={{ fontSize: 12.5, color: "#9aa0a6", whiteSpace: "nowrap" }}>
                            {new Date(req.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td>
                            {req.status === "pending" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  className="au-approve-btn"
                                  disabled={busy}
                                  onClick={() => handleRequestAction(req.id, "approved")}
                                >
                                  {busy ? <Spinner size={12} color="rgba(0,100,0,0.3)" top="#166534" /> : "Approve"}
                                </button>
                                <button
                                  className="au-reject-btn"
                                  disabled={busy}
                                  onClick={() => handleRequestAction(req.id, "rejected")}
                                >
                                  Reject
                                </button>
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