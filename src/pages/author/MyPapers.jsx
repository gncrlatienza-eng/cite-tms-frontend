import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";
import api from "../../services/api";
import { Check, AlertTriangle } from "lucide-react";

const BUCKET = "cite-tms-backend-bucket";
const safeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const ACCESS_OPTIONS = [
  { value: "open",          label: "Open",          desc: "Anyone can view",       color: "#15803d", bg: "#f0fdf4" },
  { value: "students_only", label: "Students Only", desc: "DLSL accounts only",    color: "#1d4ed8", bg: "#eff6ff" },
  { value: "restricted",    label: "Restricted",    desc: "Must request access",   color: "#9b0000", bg: "#fef2f2" },
];

const PROGRAM_OPTIONS = [
  { value: "BSArch", label: "Bachelor of Science in Architecture" },
  { value: "BSCpE", label: "Bachelor of Science in Computer Engineering" },
  { value: "BSCS", label: "Bachelor of Science in Computer Science" },
  { value: "BSEE", label: "Bachelor of Science in Electrical Engineering" },
  { value: "BSECE", label: "Bachelor of Science in Electronics Engineering" },
  { value: "BSEMC", label: "Bachelor of Science in Entertainment and Multimedia Computing" },
  { value: "BSIE", label: "Bachelor of Science in Industrial Engineering" },
  { value: "BSIT", label: "Bachelor of Science in Information Technology" },
];

// Status badge config — shown on each paper card
const STATUS_STYLES = {
  published:      { label: "Published",      color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  pending_review: { label: "Pending Review", color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  rejected:       { label: "Rejected",       color: "#9b0000", bg: "#fef2f2", border: "#fecaca" },
};

const splitAuthors = (authors) => {
  const list = Array.isArray(authors) ? authors.map((author) => author?.trim()).filter(Boolean) : [];
  return {
    primary_author: list[0] || "",
    co_authors: list.slice(1).join(", "),
  };
};

function EditModal({ paper, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title:             paper.title || "",
    ...splitAuthors(paper.authors),
    year:              paper.year?.toString() || "",
    course_or_program: paper.course_or_program || "",
    abstract:          paper.abstract || "",
    secondary_email:   paper.secondary_email || "",
    access_type:       paper.access_type || "open",
  });
  const [pdf, setPdf]               = useState(null);
  const [replaceFile, setReplaceFile] = useState(false);
  const [busy, setBusy]             = useState(false);
  const [err, setErr]               = useState("");
  const [ok, setOk]                 = useState(false);
  const fileRef                     = useRef(null);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setErr("");
    if (!form.title.trim()) return setErr("Title is required.");
    if (!form.primary_author.trim()) return setErr("Primary author is required.");
    setBusy(true);
    try {
      const payload = {
        title:             form.title.trim(),
        authors:           [
          form.primary_author.trim(),
          ...form.co_authors.split(",").map((a) => a.trim()).filter(Boolean),
        ],
        year:              Number(form.year),
        course_or_program: form.course_or_program.trim() || null,
        abstract:          form.abstract.trim() || null,
        secondary_email:   form.secondary_email.trim() || null,
        access_type:       form.access_type,
      };

      if (replaceFile && pdf) {
        if (paper.file_path) await supabase.storage.from(BUCKET).remove([paper.file_path]);
        const path = `papers/${Date.now()}_${safeFileName(pdf.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf" });
        if (error) throw new Error(error.message);
        payload.file_path = path;
      }

      await api.patch(`/api/author/papers/${paper.id}`, payload);
      setOk(true);
      await onSuccess();
      setTimeout(onClose, 1200);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mp-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="mp-modal">
        <div className="mp-modal-header">
          <div className="mp-modal-title">Edit Paper</div>
          <button className="mp-modal-close" onClick={onClose} disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="mp-modal-body">
          <div className="mp-field">
            <label className="mp-label">Title <span style={{ color: "#9b0000" }}>*</span></label>
            <input className="mp-input" name="title" value={form.title} onChange={set} disabled={busy} />
          </div>
          <div className="mp-field">
            <label className="mp-label">Primary Author <span style={{ color: "#9b0000" }}>*</span></label>
            <input className="mp-input" name="primary_author" value={form.primary_author} onChange={set} disabled={busy} />
          </div>
          <div className="mp-field">
            <label className="mp-label">Co-Authors <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>(optional, comma-separated)</span></label>
            <input className="mp-input" name="co_authors" value={form.co_authors} onChange={set} disabled={busy} />
          </div>
          <div className="mp-row">
            <div className="mp-field">
              <label className="mp-label">Year</label>
              <input className="mp-input" name="year" type="number" value={form.year} onChange={set} disabled={busy} />
            </div>
            <div className="mp-field">
              <label className="mp-label">Program / Course</label>
              <select className="mp-input" name="course_or_program" value={form.course_or_program} onChange={set} disabled={busy}>
                <option value="">Select a program...</option>
                {PROGRAM_OPTIONS.map((prog) => (
                  <option key={prog.value} value={prog.value}>{prog.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mp-field">
            <label className="mp-label">Abstract</label>
            <textarea className="mp-textarea" name="abstract" value={form.abstract} onChange={set} disabled={busy} />
          </div>
          <div className="mp-field">
            <label className="mp-label">Secondary Email</label>
            <input className="mp-input" type="email" name="secondary_email" value={form.secondary_email} onChange={set} disabled={busy} placeholder="Backup contact email" />
          </div>
          <div className="mp-field">
            <label className="mp-label">Access Type</label>
            <select className="mp-input" name="access_type" value={form.access_type} onChange={set} disabled={busy}>
              {ACCESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>)}
            </select>
          </div>
          <div className="mp-field">
            <label className="mp-label">PDF File</label>
            {!replaceFile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: paper.file_path ? "#15803d" : "#9ca3af" }}>
                  {paper.file_path ? <><Check size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />PDF on file</> : "No PDF uploaded"}
                </span>
                <button className="mp-replace-btn" onClick={() => setReplaceFile(true)} disabled={busy}>
                  {paper.file_path ? "Replace" : "Upload PDF"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }}
                  onChange={(e) => setPdf(e.target.files?.[0] || null)} />
                <button className="mp-replace-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
                  {pdf ? pdf.name : "Choose PDF…"}
                </button>
                <button className="mp-replace-btn" onClick={() => { setReplaceFile(false); setPdf(null); }} disabled={busy}>Cancel</button>
              </div>
            )}
          </div>
          {err && <div className="mp-error" style={{ display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} />{err}</div>}
          {ok  && <div className="mp-success" style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={13} />Paper updated successfully!</div>}
          <div className="mp-modal-footer">
            <button className="mp-cancel-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="mp-submit-btn" onClick={handleSubmit} disabled={busy || ok}>
              {busy ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyPapers() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [papers, setPapers]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchPapers = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/api/author/papers");
      setPapers(res.data.results ?? []);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Failed to load papers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPapers(); }, []);

  const handleDelete = async (paper) => {
    if (!window.confirm(`Delete "${paper.title}"? This cannot be undone.`)) return;
    setDeletingId(paper.id);
    try {
      await api.delete(`/api/author/papers/${paper.id}`);
      setPapers((prev) => prev.filter((p) => p.id !== paper.id));
    } catch (e) {
      alert("Delete failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setDeletingId(null);
    }
  };

  // User info for header
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Author";
  const firstName   = displayName.split(" ")[0];
  const avatar      = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const initials    = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        .mp-page { min-height: 100vh; background: #f0f2f5; font-family: 'Schibsted Grotesk', system-ui, sans-serif; }

        /* ── Header (matching AuthorDashboard) ── */
        .mp-header {
          background: #fff;
          border-bottom: 1px solid #e8eaed;
          padding: 0 32px;
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 10;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .mp-header-left { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .mp-header-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(155,0,0,0.3);
        }
        .mp-header-title { font-size: 15px; font-weight: 700; color: #111827; letter-spacing: -0.2px; }
        .mp-header-right { display: flex; align-items: center; gap: 12px; }
        .mp-avatar-btn {
          display: flex; align-items: center; gap: 9px;
          background: #f9fafb; border: 1px solid #e5e7eb;
          border-radius: 40px; padding: 4px 12px 4px 4px;
          cursor: pointer; transition: all 0.15s; position: relative;
        }
        .mp-avatar-btn:hover { border-color: #d1d5db; background: #f3f4f6; }
        .mp-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 2px solid #e8eaed; flex-shrink: 0; }
        .mp-avatar-fallback {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #9b0000, #c0392b);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .mp-user-name { font-size: 13px; font-weight: 600; color: #374151; }

        .mp-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; min-width: 220px; z-index: 999;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden;
          animation: mpDropIn 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes mpDropIn { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .mp-dropdown-header { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; }
        .mp-dropdown-name { font-size: 13.5px; font-weight: 600; color: #111827; }
        .mp-dropdown-email { font-size: 11.5px; color: #9ca3af; margin-top: 2px; }
        .mp-dropdown-role { display: inline-block; margin-top: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 2px 9px; border-radius: 20px; background: #fef2f2; color: #9b0000; }
        .mp-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; font-size: 13px; color: #374151;
          cursor: pointer; border: none; background: none;
          width: 100%; text-align: left; font-family: inherit; font-weight: 400;
          transition: background 0.12s;
        }
        .mp-dropdown-item:hover { background: #f9fafb; }
        .mp-dropdown-item.danger { color: #dc2626; }
        .mp-dropdown-item.danger:hover { background: #fff5f5; }
        .mp-dropdown-divider { height: 1px; background: #f3f4f6; }

        /* ── Body ── */
        .mp-body { max-width: 1120px; margin: 0 auto; padding: 32px 40px 80px; }

        .mp-page-header { margin-bottom: 28px; }
        .mp-page-title { font-size: 28px; font-weight: 700; color: #111827; letter-spacing: -0.6px; margin-bottom: 6px; }
        .mp-page-subtitle { font-size: 14px; color: #6b7280; }

        .mp-upload-btn { 
          display: inline-flex; align-items: center; gap: 7px; 
          padding: 10px 20px; border-radius: 10px; border: none; 
          background: linear-gradient(135deg, #9b0000, #c0392b); 
          color: #fff; font-size: 13.5px; font-weight: 600; 
          font-family: inherit; cursor: pointer; text-decoration: none; 
          box-shadow: 0 4px 14px rgba(155,0,0,0.25); 
          transition: opacity 0.15s; 
        }
        .mp-upload-btn:hover { opacity: 0.9; }

        /* ── Cards ── */
        .mp-card { background: #fff; border: 1px solid #e8eaed; border-radius: 16px; padding: 20px 24px; margin-bottom: 14px; animation: mpFadeUp 0.22s ease both; transition: box-shadow 0.18s; }
        .mp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        @keyframes mpFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .mp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
        .mp-card-title { font-size: 17px; font-weight: 600; color: #111827; line-height: 1.4; }
        .mp-card-actions { display: flex; gap: 6px; flex-shrink: 0; }

        .mp-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .mp-authors { font-size: 12.5px; color: #6b7280; }
        .mp-dot { color: #d1d5db; }
        .mp-year-pill { background: #fef2f2; color: #9b0000; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid #fecaca; }
        .mp-prog-pill { background: #f3f4f6; color: #374151; font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }

        .mp-snippet { font-size: 13px; color: #6b7280; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12px; }

        .mp-card-footer { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .mp-access-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; border: 1px solid; }
        .mp-status-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid; }
        .mp-pdf-link { font-size: 12.5px; color: #9b0000; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .mp-pdf-link:hover { text-decoration: underline; }

        .mp-edit-btn { background: none; border: 1.5px solid #e5e7eb; color: #374151; font-size: 12px; font-weight: 600; font-family: inherit; padding: 5px 12px; border-radius: 7px; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
        .mp-edit-btn:hover { border-color: #9b0000; color: #9b0000; }
        .mp-del-btn { background: none; border: 1.5px solid #fecaca; color: #9b0000; font-size: 12px; font-weight: 600; font-family: inherit; padding: 5px 12px; border-radius: 7px; cursor: pointer; transition: background 0.15s; }
        .mp-del-btn:hover { background: #fef2f2; }
        .mp-del-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .mp-skel { border-radius: 6px; background: linear-gradient(90deg,#f5f5f5 25%,#ececec 50%,#f5f5f5 75%); background-size: 900px 100%; animation: mpShimmer 1.4s infinite linear; }
        @keyframes mpShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .mp-skel-card { background: #fff; border: 1px solid #e8eaed; border-radius: 16px; padding: 20px 24px; margin-bottom: 14px; }

        .mp-empty { background: #fff; border: 1px solid #e8eaed; border-radius: 16px; padding: 72px 20px; text-align: center; }
        .mp-empty-icon { width: 52px; height: 52px; border-radius: 14px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #9ca3af; }
        .mp-empty-title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 10px; }
        .mp-empty-sub { font-size: 14px; color: #6b7280; margin-bottom: 24px; }
        .mp-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; color: #b91c1c; font-size: 13px; margin-bottom: 20px; }

        /* Modal */
        .mp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .mp-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
        .mp-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; position: sticky; top: 0; background: #fff; }
        .mp-modal-title { font-size: 20px; font-weight: 700; color: #111827; }
        .mp-modal-close { background: none; border: none; cursor: pointer; color: #9aa0a6; padding: 4px; border-radius: 6px; }
        .mp-modal-close:hover { color: #202124; background: #f1f3f4; }
        .mp-modal-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
        .mp-field { display: flex; flex-direction: column; gap: 5px; }
        .mp-label { font-size: 12px; font-weight: 600; color: #374151; }
        .mp-input { border: 1px solid #dadce0; border-radius: 8px; padding: 9px 12px; font-size: 13.5px; font-family: inherit; color: #202124; outline: none; width: 100%; transition: border-color 0.15s; }
        .mp-input:focus { border-color: #9b0000; box-shadow: 0 0 0 3px rgba(155,0,0,0.08); }
        .mp-textarea { border: 1px solid #dadce0; border-radius: 8px; padding: 9px 12px; font-size: 13.5px; font-family: inherit; color: #202124; outline: none; width: 100%; min-height: 90px; resize: vertical; transition: border-color 0.15s; }
        .mp-textarea:focus { border-color: #9b0000; }
        .mp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mp-replace-btn { background: none; border: 1px solid #dadce0; border-radius: 6px; padding: 5px 12px; font-size: 12px; color: #5f6368; cursor: pointer; font-family: inherit; transition: border-color 0.15s, color 0.15s; white-space: nowrap; }
        .mp-replace-btn:hover { border-color: #9b0000; color: #9b0000; }
        .mp-success { font-size: 13px; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; }
        .mp-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
        .mp-cancel-btn { background: #f1f3f4; border: none; border-radius: 8px; padding: 9px 20px; font-size: 13.5px; font-weight: 500; font-family: inherit; color: #374151; cursor: pointer; }
        .mp-submit-btn { background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; border: none; border-radius: 8px; padding: 9px 22px; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 3px 10px rgba(155,0,0,0.25); }
        .mp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 768px) {
          .mp-header { padding: 0 16px; }
          .mp-body { padding: 20px 16px 60px; }
          .mp-user-name { display: none; }
        }
      `}</style>

      <div className="mp-page">
        {/* ── Header (matching AuthorDashboard) ── */}
        <header className="mp-header">
          <Link to="/" className="mp-header-left" style={{ textDecoration: "none" }}>
            <div className="mp-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span className="mp-header-title">CITE-TMS</span>
          </Link>
          <div className="mp-header-right">
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <div className="mp-avatar-btn" onClick={() => setDropdownOpen((o) => !o)}>
                {avatar
                  ? <img className="mp-avatar" src={avatar} alt={displayName} referrerPolicy="no-referrer" />
                  : <div className="mp-avatar-fallback">{initials}</div>}
                <span className="mp-user-name">{firstName}</span>
              </div>
              {dropdownOpen && (
                <div className="mp-dropdown">
                  <div className="mp-dropdown-header">
                    <div className="mp-dropdown-name">{displayName}</div>
                    <div className="mp-dropdown-email">{user?.email}</div>
                    <span className="mp-dropdown-role">Author</span>
                  </div>
                  <div className="mp-dropdown-divider" />
                  <button className="mp-dropdown-item" onClick={() => { setDropdownOpen(false); navigate("/author/dashboard"); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    Dashboard
                  </button>
                  <button className="mp-dropdown-item danger" onClick={async () => { setDropdownOpen(false); await logout(); navigate("/"); }}>
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

        <div className="mp-body">
          {/* Page header */}
          <div className="mp-page-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h1 className="mp-page-title">My Papers</h1>
                <p className="mp-page-subtitle">Manage your published research papers</p>
              </div>
              <Link to="/student/upload" className="mp-upload-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload New Paper
              </Link>
            </div>
          </div>

          {error && <div className="mp-error">{error}</div>}

          {loading && [1,2,3].map((i) => (
            <div className="mp-skel-card" key={i}>
              <div className="mp-skel" style={{ height: 20, width: "55%", marginBottom: 10 }} />
              <div className="mp-skel" style={{ height: 13, width: "35%", marginBottom: 10 }} />
              <div className="mp-skel" style={{ height: 13, width: "90%", marginBottom: 6 }} />
              <div className="mp-skel" style={{ height: 13, width: "70%" }} />
            </div>
          ))}

          {!loading && papers.length === 0 && (
            <div className="mp-empty">
              <div className="mp-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <div className="mp-empty-title">No papers yet</div>
              <p className="mp-empty-sub">Upload your first paper to get started.</p>
              <Link to="/student/upload" className="mp-upload-btn">Upload Paper</Link>
            </div>
          )}

          {!loading && papers.map((paper, i) => {
            const at = ACCESS_OPTIONS.find((o) => o.value === paper.access_type) || ACCESS_OPTIONS[0];
            const st = STATUS_STYLES[paper.status] || STATUS_STYLES.pending_review;
            return (
              <article className="mp-card" key={paper.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="mp-card-top">
                  <h2 className="mp-card-title">{paper.title || "Untitled paper"}</h2>
                  <div className="mp-card-actions">
                    <button className="mp-edit-btn" onClick={() => setEditTarget(paper)}>Edit</button>
                    <button className="mp-del-btn" disabled={deletingId === paper.id} onClick={() => handleDelete(paper)}>
                      {deletingId === paper.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="mp-card-meta">
                  {paper.authors?.length > 0 && <span className="mp-authors">{paper.authors.join(", ")}</span>}
                  {paper.year && <><span className="mp-dot">·</span><span className="mp-year-pill">{paper.year}</span></>}
                  {paper.course_or_program && <><span className="mp-dot">·</span><span className="mp-prog-pill">{paper.course_or_program}</span></>}
                </div>

                {paper.abstract && <p className="mp-snippet">{paper.abstract}</p>}

                <div className="mp-card-footer">
                  <span className="mp-access-badge" style={{ background: at.bg, color: at.color, borderColor: at.color + "40" }}>
                    {at.label}
                  </span>

                  <span className="mp-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                    {st.label}
                  </span>

                  {paper.public_url && paper.status === "published" && (
                    <a href={paper.public_url} target="_blank" rel="noopener noreferrer" className="mp-pdf-link">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      View PDF
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {editTarget && (
        <EditModal paper={editTarget} onClose={() => setEditTarget(null)} onSuccess={fetchPapers} />
      )}
    </>
  );
}