import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "./LoginPage";
import { supabase } from "../../services/supabase";

const BUCKET = "cite-tms-backend-bucket";

// ── Request Access Modal ───────────────────────────────────
function RequestModal({ paper, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const tooShort = reason.trim().length > 0 && reason.trim().length < 20;
  const empty = touched && !reason.trim();

  return (
    <div className="pp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pp-modal-header">
          <div>
            <h2 className="pp-modal-title">Request Access</h2>
            <p className="pp-modal-sub">Requesting access to: <em>{paper.title}</em></p>
          </div>
          <button className="pp-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="pp-modal-body">
          <label className="pp-modal-label" htmlFor="pp-reason">
            Why do you need access to this paper?
            <span className="pp-modal-required"> *</span>
          </label>
          <textarea
            id="pp-reason"
            className={`pp-modal-textarea${(tooShort || empty) ? " pp-modal-textarea--err" : ""}`}
            rows={4}
            placeholder="Briefly describe your academic purpose, research context, or how this paper relates to your studies…"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setTouched(true); }}
            autoFocus
          />
          <div className="pp-modal-footer-row">
            {(tooShort || empty) ? (
              <span className="pp-modal-err-msg">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {empty ? "Please provide a reason." : "Minimum 20 characters required."}
              </span>
            ) : <span />}
            <span className={`pp-modal-char${reason.length < 20 && reason.length > 0 ? " pp-modal-char--warn" : ""}`}>
              {reason.length}/20 min
            </span>
          </div>
        </div>

        <div className="pp-modal-actions">
          <button className="pp-modal-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="pp-modal-btn-submit"
            disabled={submitting || reason.trim().length < 20}
            onClick={() => { setTouched(true); if (reason.trim().length >= 20) onSubmit(reason.trim()); }}
          >
            {submitting
              ? <><span className="pp-spinner" /> Sending…</>
              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Request</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function PaperPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [paper, setPaper]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showLogin, setShowLogin]   = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [showPdf, setShowPdf]       = useState(false);

  // ── Fetch paper ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        const { data, error: err } = await supabase
          .from("papers")
          .select("id, title, authors, year, course_or_program, abstract, file_path, access_type, uploaded_by")
          .eq("id", id)
          .single();
        if (err) throw err;
        if (!data) throw new Error("Paper not found.");

        let publicUrl = null;
        if (data.file_path) {
          const { data: u } = supabase.storage.from(BUCKET).getPublicUrl(data.file_path);
          publicUrl = u?.publicUrl ?? null;
        }
        setPaper({ ...data, publicUrl });
      } catch (e) {
        setError(e.message || "Failed to load paper.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Check existing access request (skip if user owns the paper) ───────────
  useEffect(() => {
    if (!user || !id || !paper) return;

    // Owner never needs to request access to their own paper
    if (paper.uploaded_by === user.id) return;

    const check = async () => {
      const { data } = await supabase
        .from("access_requests")
        .select("status")
        .eq("requester_id", user.id)
        .eq("paper_id", id)
        .maybeSingle();
      if (data) setRequestStatus(data.status);
    };
    check();
  }, [user, id, paper]);

  const handleRequestSubmit = async (reason) => {
    if (!user) { setShowModal(false); setShowLogin(true); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("access_requests")
        .insert({ requester_id: user.id, paper_id: id, message: reason, status: "pending" });
      if (error) throw error;
      setRequestStatus("pending");
      setShowModal(false);
    } catch (e) {
      console.error("Request error:", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isOpen = paper?.access_type === "open";

  // ── Owner check — author/admin viewing their own paper ────────────────────
  const isOwner = user && paper && (
    paper.uploaded_by === user.id ||
    profile?.role === 'admin'
  );

  // ── Set who is allowed to see the PDF viewer ─────────────────────────────
  const canViewPdf =
    isOwner ||                                    // - Owner / admin: always
    isOpen ||                                     // - Open access paper: always (whether logged in or not)
    (!isOpen && requestStatus === "approved");    // - Restricted paper: only if access request was approved

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .pp-page { min-height: 100vh; background: #fafafa; font-family: 'DM Sans', system-ui, sans-serif; }

        .pp-breadcrumb { padding: 14px 40px; display: flex; align-items: center; gap: 6px; font-size: 13px; color: #9ca3af; border-bottom: 1px solid #f3f4f6; background: #fff; }
        .pp-breadcrumb-link { background: none; border: none; padding: 0; cursor: pointer; color: #9b0000; font-size: 13px; font-family: inherit; font-weight: 500; transition: color 0.15s; display: flex; align-items: center; gap: 5px; }
        .pp-breadcrumb-link:hover { color: #7f1d1d; }
        .pp-bc-sep { color: #d1d5db; }

        .pp-layout { max-width: 860px; margin: 0 auto; padding: 40px 40px 100px; display: grid; grid-template-columns: 1fr 260px; gap: 40px; align-items: start; }
        .pp-main {}

        .pp-pills { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .pp-year-pill { background: #fef2f2; color: #9b0000; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid #fecaca; }
        .pp-prog-pill { background: #f3f4f6; color: #374151; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
        .pp-access-pill-open { background: #f0fdf4; color: #15803d; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid #bbf7d0; display: inline-flex; align-items: center; gap: 4px; }
        .pp-access-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; }
        .pp-access-pill-restricted { background: #fef2f2; color: #9b0000; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid #fecaca; display: inline-flex; align-items: center; gap: 4px; }

        .pp-title { font-family: 'DM Serif Display', serif; font-size: 30px; font-weight: 400; color: #0f1117; line-height: 1.35; margin-bottom: 16px; letter-spacing: -0.3px; }
        .pp-authors { font-size: 14px; color: #6b7280; margin-bottom: 6px; line-height: 1.6; }
        .pp-authors strong { color: #374151; font-weight: 600; }
        .pp-divider { height: 1px; background: #f3f4f6; margin: 28px 0; }
        .pp-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #9ca3af; margin-bottom: 12px; }
        .pp-abstract { font-size: 15px; color: #374151; line-height: 1.8; }

        .pp-sidebar-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); position: sticky; top: 20px; }
        .pp-sidebar-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 16px; }

        .pp-btn-download { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #166534, #16a34a); color: #fff; font-size: 14px; font-weight: 600; font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer; text-decoration: none; transition: opacity 0.15s, transform 0.1s; box-shadow: 0 4px 14px rgba(22,101,52,0.3); margin-bottom: 10px; }
        .pp-btn-download:hover { opacity: 0.92; transform: translateY(-1px); }

        /* Owner badge — shown instead of request buttons */
        .pp-owner-badge { display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px 18px; border-radius: 10px; border: 1.5px solid #bbf7d0; background: #f0fdf4; color: #166534; font-size: 13.5px; font-weight: 600; font-family: 'DM Sans', system-ui, sans-serif; margin-bottom: 10px; }

        .pp-btn-request { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; font-size: 14px; font-weight: 600; font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer; transition: opacity 0.15s, transform 0.1s; box-shadow: 0 4px 14px rgba(155,0,0,0.28); margin-bottom: 10px; }
        .pp-btn-request:hover { opacity: 0.92; transform: translateY(-1px); }

        .pp-btn-pending { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 18px; border-radius: 10px; border: 1.5px solid #fde68a; background: #fffbeb; color: #92400e; font-size: 14px; font-weight: 600; font-family: 'DM Sans', system-ui, sans-serif; cursor: not-allowed; margin-bottom: 10px; opacity: 0.9; }

        .pp-btn-approved { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #166534, #16a34a); color: #fff; font-size: 14px; font-weight: 600; font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer; text-decoration: none; transition: opacity 0.15s, transform 0.1s; box-shadow: 0 4px 14px rgba(22,101,52,0.3); margin-bottom: 10px; }
        .pp-btn-approved:hover { opacity: 0.92; transform: translateY(-1px); }

        .pp-signin-nudge { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 18px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 14px; font-weight: 600; font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer; transition: border-color 0.15s, color 0.15s; margin-bottom: 10px; }
        .pp-signin-nudge:hover { border-color: #9b0000; color: #9b0000; }

        .pp-access-note { font-size: 11.5px; color: #9ca3af; text-align: center; line-height: 1.55; margin-top: 4px; }

        .pp-meta-list { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .pp-meta-row { display: flex; flex-direction: column; gap: 2px; }
        .pp-meta-key { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #d1d5db; }
        .pp-meta-val { font-size: 13px; color: #374151; font-weight: 500; }

        .pp-skel-page { max-width: 860px; margin: 0 auto; padding: 40px; }
        .pp-skel { border-radius: 8px; background: linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%); background-size: 900px 100%; animation: ppShimmer 1.4s infinite linear; }
        @keyframes ppShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }

        .pp-error-card { max-width: 500px; margin: 60px auto; background: #fff; border: 1px solid #fecaca; border-radius: 16px; padding: 40px; text-align: center; }
        .pp-error-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: #111827; margin-bottom: 10px; }
        .pp-error-sub { font-size: 14px; color: #9ca3af; margin-bottom: 24px; line-height: 1.6; }
        .pp-error-back { display: inline-flex; align-items: center; gap: 6px; padding: 10px 22px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
        .pp-error-back:hover { border-color: #9b0000; color: #9b0000; }

        .pp-modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .pp-modal { width: 100%; max-width: 480px; background: #fff; border-radius: 18px; box-shadow: 0 24px 64px rgba(0,0,0,0.2); overflow: hidden; animation: ppModalIn 0.2s cubic-bezier(0.34,1.4,0.64,1); }
        @keyframes ppModalIn { from{opacity:0;transform:translateY(12px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .pp-modal-header { padding: 22px 22px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .pp-modal-title { font-family: 'DM Serif Display', serif; font-size: 20px; font-weight: 400; color: #111827; margin-bottom: 4px; }
        .pp-modal-sub { font-size: 12px; color: #9ca3af; line-height: 1.5; }
        .pp-modal-sub em { font-style: italic; color: #6b7280; }
        .pp-modal-close { width: 30px; height: 30px; border-radius: 50%; background: #f3f4f6; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
        .pp-modal-close:hover { background: #fef2f2; color: #9b0000; }
        .pp-modal-body { padding: 18px 22px; }
        .pp-modal-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .pp-modal-required { color: #9b0000; }
        .pp-modal-textarea { width: 100%; padding: 11px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', system-ui, sans-serif; color: #111827; resize: vertical; min-height: 110px; outline: none; transition: border-color 0.18s, box-shadow 0.18s; line-height: 1.6; box-sizing: border-box; }
        .pp-modal-textarea::placeholder { color: #9ca3af; }
        .pp-modal-textarea:focus { border-color: #9b0000; box-shadow: 0 0 0 3px rgba(155,0,0,0.08); }
        .pp-modal-textarea--err { border-color: #f87171; background: #fffafa; }
        .pp-modal-footer-row { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; min-height: 18px; }
        .pp-modal-err-msg { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #dc2626; font-weight: 500; }
        .pp-modal-char { font-size: 11.5px; color: #d1d5db; margin-left: auto; }
        .pp-modal-char--warn { color: #f59e0b; }
        .pp-modal-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 22px 20px; border-top: 1px solid #f3f4f6; }
        .pp-modal-btn-cancel { padding: 9px 18px; border-radius: 9px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
        .pp-modal-btn-cancel:hover { background: #f9fafb; }
        .pp-modal-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
        .pp-modal-btn-submit { display: flex; align-items: center; gap: 7px; padding: 9px 20px; border-radius: 9px; border: none; background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 3px 10px rgba(155,0,0,0.25); transition: opacity 0.15s, transform 0.1s; }
        .pp-modal-btn-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .pp-modal-btn-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
        .pp-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: ppSpin 0.75s linear infinite; flex-shrink: 0; }
        @keyframes ppSpin { to { transform: rotate(360deg); } }

        /* ── PDF viewer styles ───────────────────────────── */
        .pp-btn-view-pdf { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 20px; border-radius: 10px; border: 1.5px solid #9b0000; background: #fff; color: #9b0000; font-size: 14px; font-weight: 600; font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer; transition: background 0.15s, color 0.15s; margin-top: 8px; width: 100%; }
        .pp-btn-view-pdf:hover { background: #fef2f2; }

        .pp-pdf-wrapper { margin-top: 12px; border: 1.5px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .pp-pdf-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 12.5px; color: #374151; font-weight: 500; gap: 12px; }
        .pp-pdf-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .pp-pdf-tool-btn { background: #fff; border: 1px solid #e5e7eb; border-radius: 7px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: #374151; cursor: pointer; font-family: inherit; white-space: nowrap; transition: border-color 0.15s, color 0.15s; text-decoration: none; display: inline-flex; align-items: center; }
        .pp-pdf-tool-btn:hover { border-color: #9b0000; color: #9b0000; }
        .pp-pdf-iframe { width: 100%; height: 780px; border: none; display: block; }

        @media (max-width: 768px) {
          .pp-layout { grid-template-columns: 1fr; padding: 24px 20px 60px; gap: 28px; }
          .pp-sidebar-card { position: static; }
          .pp-breadcrumb { padding: 12px 20px; }
          .pp-title { font-size: 24px; }
          .pp-pdf-iframe { height: 480px; }
          .pp-pdf-toolbar { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
      `}</style>

      <div className="pp-page" style={{ filter: showLogin ? 'blur(3px)' : 'none', transition: 'filter 0.3s ease', pointerEvents: showLogin ? 'none' : 'auto' }}>
        <Navbar onLoginClick={() => setShowLogin(true)} />

        <div className="pp-breadcrumb">
          <button className="pp-breadcrumb-link" onClick={() => navigate('/papers')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Papers
          </button>
          <span className="pp-bc-sep">/</span>
          <span>{loading ? "Loading…" : (paper?.title?.slice(0, 48) + (paper?.title?.length > 48 ? "…" : "") || "Paper")}</span>
        </div>

        {loading && (
          <div className="pp-skel-page">
            <div className="pp-layout">
              <div>
                <div className="pp-skel" style={{ height: 16, width: 120, marginBottom: 20, borderRadius: 20 }} />
                <div className="pp-skel" style={{ height: 36, width: "80%", marginBottom: 12 }} />
                <div className="pp-skel" style={{ height: 36, width: "60%", marginBottom: 20 }} />
                <div className="pp-skel" style={{ height: 14, width: "40%", marginBottom: 32 }} />
                <div className="pp-skel" style={{ height: 14, width: "95%", marginBottom: 8 }} />
                <div className="pp-skel" style={{ height: 14, width: "88%", marginBottom: 8 }} />
                <div className="pp-skel" style={{ height: 14, width: "70%" }} />
              </div>
              <div className="pp-skel" style={{ height: 240, borderRadius: 16 }} />
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="pp-error-card">
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div className="pp-error-title">Paper not found</div>
            <p className="pp-error-sub">{error}</p>
            <button className="pp-error-back" onClick={() => navigate('/papers')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Back to Papers
            </button>
          </div>
        )}

        {!loading && !error && paper && (
          <div className="pp-layout">

            {/* ── LEFT COLUMN: paper info + PDF viewer ── */}
            <div className="pp-main">
              <div className="pp-pills">
                {paper.year && <span className="pp-year-pill">{paper.year}</span>}
                {paper.course_or_program && <span className="pp-prog-pill">{paper.course_or_program}</span>}
                {isOpen
                  ? <span className="pp-access-pill-open"><span className="pp-access-dot" /> Open Access</span>
                  : <span className="pp-access-pill-restricted">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Restricted
                    </span>}
              </div>

              <h1 className="pp-title">{paper.title}</h1>

              {paper.authors?.length > 0 && (
                <p className="pp-authors">
                  <strong>Authors:</strong> {paper.authors.join(", ")}
                </p>
              )}

              <div className="pp-divider" />
              <div className="pp-section-label">Abstract</div>
              <p className="pp-abstract">{paper.abstract || "No abstract available for this paper."}</p>

              {/* ── PDF Viewer ──────────────────────────── */}
              {canViewPdf && paper.publicUrl && (
                <>
                  <div className="pp-divider" />
                  <div className="pp-section-label">Research Paper</div>

                  {!showPdf ? (
                    /* Button shown before the user opens the viewer */
                    <button className="pp-btn-view-pdf" onClick={() => setShowPdf(true)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View Full Paper
                    </button>
                  ) : (
                    /* PDF iframe + small toolbar once the user clicks View */
                    <div className="pp-pdf-wrapper">
                      <div className="pp-pdf-toolbar">
                        <span className="pp-pdf-label">📄 {paper.title}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <a
                            href={paper.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pp-pdf-tool-btn"
                          >
                            Open in new tab ↗
                          </a>
                          <button className="pp-pdf-tool-btn" onClick={() => setShowPdf(false)}>
                            ✕ Close
                          </button>
                        </div>
                      </div>
                      {/* The actual PDF rendered inside the page */}
                      <iframe
                        src={`${paper.publicUrl}#toolbar=1&navpanes=0`}
                        className="pp-pdf-iframe"
                        title={paper.title}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── RIGHT COLUMN: sidebar card ── */}
            <div className="pp-sidebar-card">
              <div className="pp-sidebar-label">Full Paper</div>

              {/* ── Owner: always show download, never show request ── */}
              {isOwner && paper.publicUrl && (
                <>
                  <a href={paper.publicUrl} target="_blank" rel="noopener noreferrer" className="pp-btn-download">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Full Paper
                  </a>
                  <div className="pp-owner-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Your paper
                  </div>
                  <p className="pp-access-note">You uploaded this paper.</p>
                </>
              )}

              {isOwner && !paper.publicUrl && (
                <>
                  <div className="pp-owner-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Your paper
                  </div>
                  <p className="pp-access-note">No PDF uploaded yet.</p>
                </>
              )}

              {/* ── Non-owner: open access ── */}
              {!isOwner && isOpen && paper.publicUrl && (
                <>
                  <a href={paper.publicUrl} target="_blank" rel="noopener noreferrer" className="pp-btn-download"
                    onClick={!user ? (e) => { e.preventDefault(); setShowLogin(true); } : undefined}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Full Paper
                  </a>
                  <p className="pp-access-note">Free to access · No request needed</p>
                </>
              )}

              {/* ── Non-owner: restricted, not logged in ── */}
              {!isOwner && !isOpen && !user && (
                <>
                  <button className="pp-signin-nudge" onClick={() => setShowLogin(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Sign in to Request Access
                  </button>
                  <p className="pp-access-note">Sign in with your DLSL account to request access to this paper.</p>
                </>
              )}

              {/* ── Non-owner: restricted, logged in, no request yet ── */}
              {!isOwner && !isOpen && user && !requestStatus && (
                <>
                  <button className="pp-btn-request" onClick={() => setShowModal(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Request Access
                  </button>
                  <p className="pp-access-note">Submit a short reason to request access to the full paper.</p>
                </>
              )}

              {/* ── Non-owner: pending ── */}
              {!isOwner && !isOpen && user && requestStatus === "pending" && (
                <>
                  <div className="pp-btn-pending">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Request Pending
                  </div>
                  <p className="pp-access-note">Your request has been submitted and is awaiting review.</p>
                </>
              )}

              {/* ── Non-owner: approved ── */}
              {!isOwner && !isOpen && user && requestStatus === "approved" && paper.publicUrl && (
                <>
                  <a href={paper.publicUrl} target="_blank" rel="noopener noreferrer" className="pp-btn-approved">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Full Paper
                  </a>
                  <p className="pp-access-note" style={{ color: '#15803d' }}>Your access request was approved.</p>
                </>
              )}

              {/* ── Non-owner: rejected ── */}
              {!isOwner && !isOpen && user && requestStatus === "rejected" && (
                <>
                  <button className="pp-btn-request" onClick={() => { setRequestStatus(null); setShowModal(true); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Request Again
                  </button>
                  <p className="pp-access-note" style={{ color: '#b91c1c' }}>Your previous request was not approved.</p>
                </>
              )}

              <div className="pp-meta-list">
                {paper.year && <div className="pp-meta-row"><span className="pp-meta-key">Year</span><span className="pp-meta-val">{paper.year}</span></div>}
                {paper.course_or_program && <div className="pp-meta-row"><span className="pp-meta-key">Program</span><span className="pp-meta-val">{paper.course_or_program}</span></div>}
                {paper.authors?.length > 0 && <div className="pp-meta-row"><span className="pp-meta-key">Author{paper.authors.length > 1 ? "s" : ""}</span><span className="pp-meta-val">{paper.authors.join(", ")}</span></div>}
                <div className="pp-meta-row"><span className="pp-meta-key">Access</span><span className="pp-meta-val">{isOpen ? "Open Access" : "Restricted"}</span></div>
              </div>
            </div>

          </div>
        )}
      </div>

      {showModal && paper && (
        <RequestModal paper={paper} onClose={() => setShowModal(false)} onSubmit={handleRequestSubmit} submitting={submitting} />
      )}
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}
