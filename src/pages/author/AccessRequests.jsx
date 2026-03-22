import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const STATUS_META = {
  pending:  { label: "Pending",  bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b" },
  approved: { label: "Approved", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", dot: "#16a34a" },
  rejected: { label: "Rejected", bg: "#fef2f2", color: "#9b0000", border: "#fecaca", dot: "#dc2626" },
};

export default function AccessRequests() {
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [filter, setFilter]         = useState("all"); // "all" | "pending" | "approved" | "rejected"
  const [actionBusy, setActionBusy] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        const res = await api.get("/api/author/requests");
        setRequests(res.data ?? []);
      } catch (e) {
        setError(e?.response?.data?.detail || e.message || "Failed to load requests.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAction = async (requestId, newStatus) => {
    setActionBusy(requestId);
    try {
      await api.patch(`/api/author/requests/${requestId}`, { status: newStatus });
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: newStatus } : r));
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setActionBusy(null);
    }
  };

  const displayed = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .ar-page { min-height: 100vh; background: #fafafa; font-family: 'DM Sans', system-ui, sans-serif; }

        .ar-header { background: #fff; border-bottom: 1px solid #efefef; padding: 20px 40px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ar-header-left { display: flex; align-items: center; gap: 14px; }
        .ar-back-link { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #9b0000; text-decoration: none; transition: color 0.15s; }
        .ar-back-link:hover { color: #7f1d1d; }
        .ar-header-title { font-family: 'DM Serif Display', serif; font-size: 20px; color: #111827; }
        .ar-header-stats { display: flex; gap: 10px; }
        .ar-stat-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid; }

        .ar-body { max-width: 900px; margin: 0 auto; padding: 32px 40px 80px; }

        /* Filter tabs */
        .ar-filters { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
        .ar-filter-btn { padding: 7px 16px; border-radius: 20px; border: 1.5px solid #e5e7eb; background: #fff; font-size: 13px; font-weight: 500; font-family: inherit; color: #6b7280; cursor: pointer; transition: all 0.15s; }
        .ar-filter-btn:hover { border-color: #9b0000; color: #9b0000; }
        .ar-filter-btn.active { background: #9b0000; border-color: #9b0000; color: #fff; font-weight: 600; }

        .ar-table-wrap { background: #fff; border: 1px solid #f0f0f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
        .ar-table { width: 100%; border-collapse: collapse; }
        .ar-th { padding: 12px 18px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; background: #fafafa; border-bottom: 1px solid #f3f4f6; text-align: left; white-space: nowrap; }
        .ar-tr { border-bottom: 1px solid #f9f9f9; transition: background 0.12s; animation: arFadeUp 0.2s ease both; }
        .ar-tr:last-child { border-bottom: none; }
        .ar-tr:hover { background: #fafafa; }
        @keyframes arFadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .ar-td { padding: 16px 18px; font-size: 13.5px; color: #374151; vertical-align: middle; }
        .ar-paper-title { font-size: 13.5px; font-weight: 500; color: #111827; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
        .ar-requester { font-size: 12.5px; color: #374151; font-weight: 500; }
        .ar-requester-email { font-size: 11.5px; color: #9ca3af; }
        .ar-message { font-size: 12.5px; color: #6b7280; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ar-status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
        .ar-actions { display: flex; gap: 6px; }
        .ar-approve-btn { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 600; font-family: inherit; padding: 5px 12px; border-radius: 7px; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
        .ar-approve-btn:hover { background: #dcfce7; }
        .ar-approve-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ar-reject-btn { background: #fef2f2; border: 1.5px solid #fecaca; color: #9b0000; font-size: 12px; font-weight: 600; font-family: inherit; padding: 5px 12px; border-radius: 7px; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
        .ar-reject-btn:hover { background: #fee2e2; }
        .ar-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ar-skel { border-radius: 6px; background: linear-gradient(90deg,#f5f5f5 25%,#ececec 50%,#f5f5f5 75%); background-size: 900px 100%; animation: arShimmer 1.4s infinite linear; }
        @keyframes arShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }

        .ar-empty { padding: 60px; text-align: center; color: #9ca3af; font-size: 14px; }
        .ar-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; color: #b91c1c; font-size: 13px; margin-bottom: 20px; }

        @media (max-width: 768px) {
          .ar-header { padding: 16px 20px; }
          .ar-body { padding: 20px 16px 60px; }
          .ar-th:nth-child(3), .ar-td:nth-child(3) { display: none; }
          .ar-th:nth-child(4), .ar-td:nth-child(4) { display: none; }
        }
      `}</style>

      <div className="ar-page">
        <div className="ar-header">
          <div className="ar-header-left">
            <Link to="/author/dashboard" className="ar-back-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Dashboard
            </Link>
            <h1 className="ar-header-title">Access Requests</h1>
          </div>
          {!loading && requests.length > 0 && (
            <div className="ar-header-stats">
              {pendingCount > 0 && (
                <span className="ar-stat-chip" style={{ background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                  {pendingCount} Pending
                </span>
              )}
              <span className="ar-stat-chip" style={{ background: "#f3f4f6", color: "#374151", borderColor: "#e5e7eb" }}>
                {requests.length} Total
              </span>
            </div>
          )}
        </div>

        <div className="ar-body">
          {error && <div className="ar-error">{error}</div>}

          <div className="ar-filters">
            {["all", "pending", "approved", "rejected"].map((f) => (
              <button key={f} className={`ar-filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && pendingCount > 0 && ` (${pendingCount})`}
              </button>
            ))}
          </div>

          <div className="ar-table-wrap">
            <table className="ar-table">
              <thead>
                <tr>
                  <th className="ar-th">Paper</th>
                  <th className="ar-th">Requester</th>
                  <th className="ar-th">Message</th>
                  <th className="ar-th">Date</th>
                  <th className="ar-th">Status</th>
                  <th className="ar-th" />
                </tr>
              </thead>
              <tbody>
                {loading && [1,2,3].map((i) => (
                  <tr key={i}>
                    {[1,2,3,4,5,6].map((j) => (
                      <td key={j} className="ar-td"><div className="ar-skel" style={{ height: 14, width: j === 6 ? 120 : "80%" }} /></td>
                    ))}
                  </tr>
                ))}
                {!loading && displayed.length === 0 && (
                  <tr><td colSpan={6}><div className="ar-empty">
                    {filter === "all" ? "No requests yet." : `No ${filter} requests.`}
                  </div></td></tr>
                )}
                {!loading && displayed.map((req, i) => {
                  const s = STATUS_META[req.status] || STATUS_META.pending;
                  const busy = actionBusy === req.id;
                  return (
                    <tr key={req.id} className="ar-tr" style={{ animationDelay: `${i * 0.04}s` }}>
                      <td className="ar-td">
                        <div className="ar-paper-title">{req.paper_title || "Untitled"}</div>
                        {req.paper_course_or_program && (
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{req.paper_course_or_program}</div>
                        )}
                      </td>
                      <td className="ar-td">
                        <div className="ar-requester">{req.requester_name || "—"}</div>
                        <div className="ar-requester-email">{req.requester_email || "—"}</div>
                      </td>
                      <td className="ar-td">
                        <div className="ar-message" title={req.message}>{req.message || "—"}</div>
                      </td>
                      <td className="ar-td" style={{ fontSize: 12.5, color: "#9ca3af", whiteSpace: "nowrap" }}>
                        {new Date(req.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="ar-td">
                        <span className="ar-status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                          {s.label}
                        </span>
                      </td>
                      <td className="ar-td">
                        {req.status === "pending" && (
                          <div className="ar-actions">
                            <button className="ar-approve-btn" disabled={busy} onClick={() => handleAction(req.id, "approved")}>
                              {busy ? "…" : "Approve"}
                            </button>
                            <button className="ar-reject-btn" disabled={busy} onClick={() => handleAction(req.id, "rejected")}>
                              {busy ? "…" : "Reject"}
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
        </div>
      </div>
    </>
  );
}