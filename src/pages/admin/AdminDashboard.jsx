import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";

const PAPERS_BUCKET = "cite-tms-backend-bucket";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPapers = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error: err } = await supabase
          .from("papers")
          .select("id, title, authors, year, course_or_program, abstract, file_path, created_at")
          .order("created_at", { ascending: false });

        if (err) throw err;

        const withUrls = data?.map((paper) => {
          if (!paper.file_path) return { ...paper, publicUrl: null };
          const { data: urlData } = supabase.storage
            .from(PAPERS_BUCKET)
            .getPublicUrl(paper.file_path);
          return { ...paper, publicUrl: urlData?.publicUrl ?? null };
        }) ?? [];

        setPapers(withUrls);
      } catch (e) {
        setError(e.message || "Failed to load papers.");
      } finally {
        setLoading(false);
      }
    };
    fetchPapers();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const filtered = papers.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.authors?.join(", ").toLowerCase().includes(q) ||
      p.course_or_program?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ad-page {
          min-height: 100vh;
          background: #f8f9fa;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Header ── */
        .ad-header {
          background: #fff;
          border-bottom: 1px solid #e8eaed;
          padding: 0 32px;
          height: 58px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 10;
        }
        .ad-header-left {
          display: flex; align-items: center; gap: 12px;
        }
        .ad-header-icon {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #006400, #1a8a1a);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
        }
        .ad-header-title {
          font-size: 15px; font-weight: 600; color: #202124;
        }
        .ad-header-badge {
          font-size: 10px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase;
          background: #e8f5e9; color: #2e7d32;
          border-radius: 20px; padding: 2px 8px;
        }
        .ad-header-right {
          display: flex; align-items: center; gap: 16px;
        }
        .ad-user-email {
          font-size: 13px; color: #70757a;
        }
        .ad-logout-btn {
          font-size: 13px; font-weight: 500;
          color: #b91c1c; background: #fef2f2;
          border: 1px solid #fecaca; border-radius: 6px;
          padding: 6px 14px; cursor: pointer; font-family: inherit;
          transition: background 0.15s;
        }
        .ad-logout-btn:hover { background: #fee2e2; }

        /* ── Content ── */
        .ad-body { padding: 32px; max-width: 1100px; margin: 0 auto; }

        /* Status banner */
        .ad-status {
          display: flex; align-items: center; gap: 10px;
          background: #fff; border: 1px solid #e8eaed;
          border-radius: 10px; padding: 14px 18px;
          margin-bottom: 24px;
        }
        .ad-status-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #16a34a; flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.2);
        }
        .ad-status-text { font-size: 13px; color: #374151; }
        .ad-status-text strong { color: #111827; }

        /* Controls */
        .ad-controls {
          display: flex; align-items: center;
          justify-content: space-between;
          gap: 16px; margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .ad-section-title {
          font-family: 'DM Serif Display', serif;
          font-size: 22px; color: #202124;
        }
        .ad-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #dadce0;
          border-radius: 8px; padding: 8px 14px;
          min-width: 260px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ad-search-wrap:focus-within {
          border-color: #006400;
          box-shadow: 0 0 0 3px rgba(0,100,0,0.08);
        }
        .ad-search-input {
          border: none; outline: none;
          font-size: 13.5px; font-family: inherit;
          color: #202124; background: transparent; flex: 1;
        }
        .ad-search-input::placeholder { color: #9aa0a6; }

        /* Table */
        .ad-table-wrap {
          background: #fff; border: 1px solid #e8eaed;
          border-radius: 12px; overflow: hidden;
        }
        .ad-table {
          width: 100%; border-collapse: collapse;
          font-size: 13.5px;
        }
        .ad-table thead {
          background: #f8f9fa;
          border-bottom: 1px solid #e8eaed;
        }
        .ad-table th {
          padding: 12px 16px; text-align: left;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: #80868b;
        }
        .ad-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f3f4;
          vertical-align: top;
          color: #3c4043;
        }
        .ad-table tr:last-child td { border-bottom: none; }
        .ad-table tr:hover td { background: #fafafa; }

        .ad-title-cell {
          font-weight: 600; color: #202124;
          max-width: 280px;
          line-height: 1.4;
        }
        .ad-authors-cell {
          color: #5f6368; max-width: 180px;
          line-height: 1.4;
        }
        .ad-pill {
          display: inline-block;
          font-size: 10.5px; font-weight: 600;
          padding: 2px 8px; border-radius: 10px;
        }
        .ad-pill-year { background: #e8f5e9; color: #2e7d32; }
        .ad-pill-prog { background: #e8f0fe; color: #1a73e8; }
        .ad-pill-nourl { background: #f3f4f6; color: #9ca3af; }

        .ad-pdf-link {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12.5px; font-weight: 500; color: #1a73e8;
          text-decoration: none;
          transition: color 0.15s;
        }
        .ad-pdf-link:hover { color: #1557b0; text-decoration: underline; }

        /* Skeleton */
        .ad-skel-row td { padding: 16px; }
        .ad-skel {
          border-radius: 4px; height: 14px;
          background: linear-gradient(90deg, #efefef 25%, #e6e6e6 50%, #efefef 75%);
          background-size: 900px 100%;
          animation: adShimmer 1.4s infinite linear;
        }
        @keyframes adShimmer {
          0%   { background-position: -900px 0; }
          100% { background-position:  900px 0; }
        }

        /* Empty / Error */
        .ad-empty {
          padding: 56px; text-align: center; color: #9aa0a6; font-size: 14px;
        }
        .ad-error-box {
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 10px; padding: 14px 18px;
          color: #b91c1c; font-size: 13px; margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .ad-body { padding: 20px 16px; }
          .ad-header { padding: 0 16px; }
          .ad-user-email { display: none; }
          .ad-table th:nth-child(3),
          .ad-table td:nth-child(3),
          .ad-table th:nth-child(5),
          .ad-table td:nth-child(5) { display: none; }
        }
      `}</style>

      <div className="ad-page">
        {/* Header */}
        <header className="ad-header">
          <div className="ad-header-left">
            <div className="ad-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <span className="ad-header-title">CITE-TMS</span>
            <span className="ad-header-badge">Admin</span>
          </div>
          <div className="ad-header-right">
            <span className="ad-user-email">{user?.email}</span>
            <button className="ad-logout-btn" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="ad-body">

          {/* Status */}
          <div className="ad-status">
            <div className="ad-status-dot" />
            <div className="ad-status-text">
              Backend test — fetching from <strong>papers</strong> table ·{" "}
              {loading
                ? "Loading…"
                : error
                ? "Error connecting"
                : <><strong>{papers.length}</strong> papers found in Supabase</>
              }
            </div>
          </div>

          {error && <div className="ad-error-box">{error}</div>}

          {/* Controls */}
          <div className="ad-controls">
            <div className="ad-section-title">All Papers</div>
            <div className="ad-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="ad-search-input"
                type="text"
                placeholder="Search title, author, program…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Authors</th>
                  <th>Year</th>
                  <th>Program</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {loading && [1,2,3,4,5].map((i) => (
                  <tr className="ad-skel-row" key={i}>
                    <td><div className="ad-skel" style={{width:20}} /></td>
                    <td><div className="ad-skel" style={{width:"80%"}} /></td>
                    <td><div className="ad-skel" style={{width:"60%"}} /></td>
                    <td><div className="ad-skel" style={{width:36}} /></td>
                    <td><div className="ad-skel" style={{width:"70%"}} /></td>
                    <td><div className="ad-skel" style={{width:48}} /></td>
                  </tr>
                ))}

                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="ad-empty">
                        {papers.length === 0
                          ? "No papers found in the database."
                          : "No papers match your search."}
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !error && filtered.map((paper, i) => (
                  <tr key={paper.id}>
                    <td style={{color:"#9aa0a6", fontSize:12}}>{i + 1}</td>
                    <td className="ad-title-cell">{paper.title || "Untitled"}</td>
                    <td className="ad-authors-cell">
                      {paper.authors?.length > 0
                        ? paper.authors.join(", ")
                        : <span style={{color:"#c4c9d0"}}>—</span>}
                    </td>
                    <td>
                      {paper.year
                        ? <span className="ad-pill ad-pill-year">{paper.year}</span>
                        : <span style={{color:"#c4c9d0"}}>—</span>}
                    </td>
                    <td>
                      {paper.course_or_program
                        ? <span className="ad-pill ad-pill-prog">{paper.course_or_program}</span>
                        : <span style={{color:"#c4c9d0"}}>—</span>}
                    </td>
                    <td>
                      {paper.publicUrl
                        ? (
                          <a
                            className="ad-pdf-link"
                            href={paper.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            View
                          </a>
                        )
                        : <span className="ad-pill ad-pill-nourl">No file</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
}