import { Link } from "react-router-dom";

// ── Icons ──────────────────────────────────────────────────────────────────
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
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Access badge config ────────────────────────────────────────────────────
const ACCESS_META = {
  open:                { label: "Public",            Icon: IconGlobe, bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  students_only_guest: { label: "DLSL Students Only", Icon: IconUser,  bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  students_only_auth:  { label: "Accessible",         Icon: IconCheck, bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  restricted:          { label: "Restricted",         Icon: IconLock,  bg: "#fef2f2", color: "#9b0000", border: "#fecaca" },
};

// ── Component ──────────────────────────────────────────────────────────────
export default function PaperCard({ paper, user, isSaved, isBusy, onBookmarkClick, onLoginRequest, index = 0 }) {
  const access = paper.access_type === "students_only"
    ? (user ? ACCESS_META.students_only_auth : ACCESS_META.students_only_guest)
    : ACCESS_META[paper.access_type] || ACCESS_META.open;

  const showLock = !user && (paper.access_type === "restricted" || paper.access_type === "students_only");

  return (
    <>
      <style>{`
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

        .sp-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
        .paper-title {
          font-size: 17px;
          font-family: 'Schibsted Grotesk', serif;
          color: #111827;
          text-decoration: none;
          line-height: 1.35;
          display: block;
          transition: color 0.2s ease-in-out;
          cursor: pointer;
        }
        .paper-title:hover { color: #6b7280; }
        .paper-title:visited { color: #9b0000; }
        .paper-title:visited:hover { color: #7f1d1d; }

        .sp-bm-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 8px;
          border: 1.5px solid #f0f0f0; background: transparent; color: #9ca3af;
          cursor: pointer; flex-shrink: 0; margin-top: -2px;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .sp-bm-btn:hover { color: #9b0000; background: #fef2f2; border-color: #fecaca; }
        .sp-bm-btn.saved { color: #9b0000; background: #fef2f2; border-color: #fecaca; }
        .sp-bm-btn:disabled { opacity: 0.4; cursor: default; }

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

        .sp-abstract {
          font-size: 13.5px; color: #6b7280; line-height: 1.65; margin: 0 0 16px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        .sp-card-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sp-btn-lock {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: 7px; border: 1.5px solid #e5e7eb;
          background: transparent; color: #9ca3af; font-size: 12.5px; font-weight: 500;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .sp-btn-lock:hover { border-color: #9b0000; color: #9b0000; }
      `}</style>

      <article
        className="paper-card"
        style={{ animation: "fadeUp 0.2s ease both", animationDelay: `${index * 0.03}s` }}
      >
        {/* Title + bookmark */}
        <div className="sp-card-header">
          <Link to={`/papers/${paper.id}`} className="paper-title">
            {paper.title || "Untitled paper"}
          </Link>
          <button
            className={`sp-bm-btn${isSaved ? " saved" : ""}`}
            disabled={isBusy}
            onClick={(e) => onBookmarkClick(e, paper.id)}
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

        {/* Footer */}
        <div className="sp-card-footer">
          {showLock && (
            <button className="sp-btn-lock" onClick={onLoginRequest}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Sign-in Required
            </button>
          )}
        </div>
      </article>
    </>
  );
}
