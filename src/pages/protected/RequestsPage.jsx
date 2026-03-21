import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "../public/LoginPage";
import { supabase } from "../../services/supabase";

const STATUS_META = {
  pending:  { label: "Pending",  bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b" },
  approved: { label: "Approved", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", dot: "#16a34a" },
  rejected: { label: "Rejected", bg: "#fef2f2", color: "#9b0000", border: "#fecaca", dot: "#dc2626" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

function RequestsTable({ requests, onViewPaper }) {
  if (requests.length === 0) {
    return (
      <div className="rq-empty">
        <div className="rq-empty-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div className="rq-empty-title">No requests yet</div>
        <p className="rq-empty-sub">When you request access to a restricted paper, it will appear here with its current status.</p>
        <button className="rq-browse-btn" onClick={() => onViewPaper()}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Browse Papers
        </button>
      </div>
    );
  }

  return (
    <div className="rq-table-wrap">
      <table className="rq-table">
        <thead>
          <tr>
            <th className="rq-th">Paper</th>
            <th className="rq-th rq-th-status">Status</th>
            <th className="rq-th rq-th-date">Date Requested</th>
            <th className="rq-th rq-th-action" />
          </tr>
        </thead>
        <tbody>
          {requests.map((req, i) => (
            <tr
              key={req.id}
              className="rq-tr"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <td className="rq-td rq-td-title">
                <span className="rq-paper-title">
                  {req.papers?.title || "Untitled paper"}
                </span>
                {req.papers?.course_or_program && (
                  <span className="rq-paper-prog">{req.papers.course_or_program}</span>
                )}
              </td>
              <td className="rq-td rq-td-status">
                <StatusBadge status={req.status} />
              </td>
              <td className="rq-td rq-td-date">
                {new Date(req.created_at).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </td>
              <td className="rq-td rq-td-action">
                <button
                  className="rq-view-btn"
                  onClick={() => onViewPaper(req.paper_id)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true); setError("");
      try {
        const { data, error: err } = await supabase
          .from("paper_requests")
          .select("id, paper_id, reason, status, created_at, papers(title, course_or_program, year)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (err) throw err;
        setRequests(data ?? []);
      } catch (e) {
        setError(e.message || "Failed to load requests.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const pendingCount  = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .rq-page {
          min-height: 100vh;
          background: #fafafa;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Header ── */
        .rq-header {
          background: #fff;
          border-bottom: 1px solid #efefef;
          padding: 20px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .rq-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .rq-header-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(155,0,0,0.25);
        }

        .rq-header-text h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 20px;
          font-weight: 400;
          color: #111827;
          line-height: 1;
          margin-bottom: 3px;
        }

        .rq-header-text p {
          font-size: 12.5px;
          color: #9ca3af;
          margin: 0;
        }

        .rq-header-stats {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .rq-stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid;
          white-space: nowrap;
        }

        /* ── Body ── */
        .rq-body {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 40px 80px;
        }

        /* ── Table ── */
        .rq-table-wrap {
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }

        .rq-table {
          width: 100%;
          border-collapse: collapse;
        }

        .rq-th {
          padding: 12px 18px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #9ca3af;
          background: #fafafa;
          border-bottom: 1px solid #f3f4f6;
          text-align: left;
          white-space: nowrap;
        }
        .rq-th-status { width: 130px; }
        .rq-th-date   { width: 140px; }
        .rq-th-action { width: 70px; }

        .rq-tr {
          border-bottom: 1px solid #f9f9f9;
          animation: rqFadeUp 0.2s ease both;
          transition: background 0.12s;
        }
        .rq-tr:last-child { border-bottom: none; }
        .rq-tr:hover { background: #fafafa; }
        @keyframes rqFadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .rq-td {
          padding: 16px 18px;
          font-size: 13.5px;
          color: #374151;
          vertical-align: middle;
        }

        .rq-td-title { max-width: 0; }
        .rq-paper-title {
          display: block;
          font-size: 13.5px;
          font-weight: 500;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 380px;
          margin-bottom: 3px;
        }
        .rq-paper-prog {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 500;
        }

        .rq-td-status { white-space: nowrap; }
        .rq-td-date   { font-size: 12.5px; color: #9ca3af; white-space: nowrap; }

        .rq-view-btn {
          background: none;
          border: 1.5px solid #e5e7eb;
          color: #374151;
          font-size: 12px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          padding: 5px 14px;
          border-radius: 7px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .rq-view-btn:hover { border-color: #9b0000; color: #9b0000; }

        /* ── Skeleton ── */
        .rq-skel-row {
          background: #fff;
          border-bottom: 1px solid #f3f4f6;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .rq-skel {
          border-radius: 6px;
          background: linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%);
          background-size: 900px 100%;
          animation: rqShimmer 1.4s infinite linear;
        }
        @keyframes rqShimmer {
          0%   { background-position: -900px 0; }
          100% { background-position:  900px 0; }
        }

        /* ── Empty state ── */
        .rq-empty {
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 72px 20px;
        }

        .rq-empty-icon {
          width: 56px; height: 56px;
          border-radius: 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          color: #fca5a5;
        }

        .rq-empty-title {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          font-weight: 400;
          color: #111827;
          margin-bottom: 10px;
        }

        .rq-empty-sub {
          font-size: 13.5px;
          color: #6b7280;
          line-height: 1.65;
          max-width: 380px;
          margin-bottom: 28px;
        }

        .rq-browse-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          color: #fff;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(155,0,0,0.28);
          transition: opacity 0.15s, transform 0.1s;
        }
        .rq-browse-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .rq-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 14px 18px;
          color: #b91c1c;
          font-size: 13px;
          margin-bottom: 20px;
        }

        /* ── Sign-in gate ── */
        .rq-gate {
          min-height: calc(100vh - 57px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .rq-gate-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.07);
          padding: 48px 36px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .rq-gate-icon {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
          color: #9b0000;
        }

        .rq-gate-title {
          font-family: 'DM Serif Display', serif;
          font-size: 24px; font-weight: 400;
          color: #111827; margin-bottom: 10px;
        }

        .rq-gate-sub {
          font-size: 14px; color: #6b7280;
          line-height: 1.65; max-width: 300px;
          margin-bottom: 28px;
        }

        .rq-gate-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 26px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          color: #fff; font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(155,0,0,0.28);
          transition: opacity 0.15s, transform 0.1s;
        }
        .rq-gate-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        @media (max-width: 768px) {
          .rq-header { padding: 16px 20px; }
          .rq-body { padding: 20px 16px 60px; }
          .rq-th-date, .rq-td-date { display: none; }
          .rq-paper-title { max-width: 180px; }
        }
      `}</style>

      <div
        className="rq-page"
        style={{
          filter: showLogin ? 'blur(3px)' : 'none',
          transition: 'filter 0.3s ease',
          pointerEvents: showLogin ? 'none' : 'auto',
        }}
      >
        <Navbar onLoginClick={() => setShowLogin(true)} />

        {!user ? (
          <div className="rq-gate">
            <div className="rq-gate-card">
              <div className="rq-gate-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h1 className="rq-gate-title">Access Requests</h1>
              <p className="rq-gate-sub">Sign in to view the status of your paper access requests.</p>
              <button className="rq-gate-btn" onClick={() => setShowLogin(true)}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={16} height={16} alt="G" />
                Sign in with Google
              </button>
            </div>
          </div>

        ) : (
          <>
            {/* Header */}
            <div className="rq-header">
              <div className="rq-header-left">
                <div className="rq-header-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="rq-header-text">
                  <h1>Access Requests</h1>
                  <p>Track the status of your paper requests</p>
                </div>
              </div>

              {!loading && requests.length > 0 && (
                <div className="rq-header-stats">
                  {pendingCount > 0 && (
                    <span className="rq-stat-chip" style={{ background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                      {pendingCount} Pending
                    </span>
                  )}
                  {approvedCount > 0 && (
                    <span className="rq-stat-chip" style={{ background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
                      {approvedCount} Approved
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="rq-body">
              {error && <div className="rq-error">{error}</div>}

              {loading && (
                <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 14, overflow: "hidden" }}>
                  {[1, 2, 3].map((i) => (
                    <div className="rq-skel-row" key={i}>
                      <div className="rq-skel" style={{ flex: 1, height: 14 }} />
                      <div className="rq-skel" style={{ width: 80, height: 22, borderRadius: 20 }} />
                      <div className="rq-skel" style={{ width: 100, height: 14 }} />
                    </div>
                  ))}
                </div>
              )}

              {!loading && !error && (
                <RequestsTable
                  requests={requests}
                  onViewPaper={(paperId) => paperId ? navigate(`/papers/${paperId}`) : navigate("/papers")}
                />
              )}
            </div>
          </>
        )}
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}
