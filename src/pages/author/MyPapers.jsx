import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
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

function EditModal({ paper, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title:             paper.title || "",
    authors:           Array.isArray(paper.authors) ? paper.authors.join(", ") : "",
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
    setBusy(true);
    try {
      const payload = {
        title:             form.title.trim(),
        authors:           form.authors.split(",").map((a) => a.trim()).filter(Boolean),
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
            <label className="mp-label">Authors <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>(comma-separated)</span></label>
            <input className="mp-input" name="authors" value={form.authors} onChange={set} disabled={busy} />
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
            <label className="mp-label">Access Type</label>
            <select className="mp-input" name="access_type" value={form.access_type} onChange={set} disabled={busy}>
              {ACCESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>)}
            </select>
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
  const [papers, setPapers]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .mp-page { min-height: 100vh; background: #fafafa; font-family: 'DM Sans', system-ui, sans-serif; }

        .mp-header { background: #fff; border-bottom: 1px solid #efefef; padding: 20px 40px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .mp-header-left { display: flex; align-items: center; gap: 14px; }
        .mp-back-link { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #9b0000; text-decoration: none; transition: color 0.15s; }
        .mp-back-link:hover { color: #7f1d1d; }
        .mp-header-title { font-family: 'Schibsted Grotesk', serif; font-size: 20px; color: #111827; }
        .mp-upload-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 9px; border: none; background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; text-decoration: none; box-shadow: 0 4px 14px rgba(155,0,0,0.25); transition: opacity 0.15s; }
        .mp-upload-btn:hover { opacity: 0.9; }

        .mp-body { max-width: 900px; margin: 0 auto; padding: 32px 40px 80px; }

        .mp-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 14px; padding: 20px 24px; margin-bottom: 14px; animation: mpFadeUp 0.22s ease both; transition: box-shadow 0.18s; }
        .mp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        @keyframes mpFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .mp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
        .mp-card-title { font-family: 'Schibsted Grotesk', serif; font-size: 17px; color: #111827; line-height: 1.4; }
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
        .mp-skel-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 14px; padding: 20px 24px; margin-bottom: 14px; }

        .mp-empty { background: #fff; border: 1px solid #f0f0f0; border-radius: 14px; padding: 72px 20px; text-align: center; }
        .mp-empty-title { font-family: 'Schibsted Grotesk', serif; font-size: 22px; color: #111827; margin-bottom: 10px; }
        .mp-empty-sub { font-size: 14px; color: #6b7280; margin-bottom: 24px; }
        .mp-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; color: #b91c1c; font-size: 13px; margin-bottom: 20px; }

        /* Modal */
        .mp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .mp-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
        .mp-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; position: sticky; top: 0; background: #fff; }
        .mp-modal-title { font-family: 'Schibsted Grotesk', serif; font-size: 20px; color: #202124; }
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
        .mp-error { font-size: 12.5px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; }
        .mp-success { font-size: 13px; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; }
        .mp-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
        .mp-cancel-btn { background: #f1f3f4; border: none; border-radius: 8px; padding: 9px 20px; font-size: 13.5px; font-weight: 500; font-family: inherit; color: #374151; cursor: pointer; }
        .mp-submit-btn { background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; border: none; border-radius: 8px; padding: 9px 22px; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 3px 10px rgba(155,0,0,0.25); }
        .mp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 768px) {
          .mp-header { padding: 16px 20px; }
          .mp-body { padding: 20px 16px 60px; }
        }
      `}</style>

      <div className="mp-page">
        <div className="mp-header">
          <div className="mp-header-left">
            <Link to="/author/dashboard" className="mp-back-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Dashboard
            </Link>
            <h1 className="mp-header-title">My Papers</h1>
          </div>
          <Link to="/student/upload" className="mp-upload-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload New Paper
          </Link>
        </div>

        <div className="mp-body">
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
                  {/* Access type badge */}
                  <span className="mp-access-badge" style={{ background: at.bg, color: at.color, borderColor: at.color + "40" }}>
                    {at.label}
                  </span>

                  {/* Publication status badge — key fix for Issue 1 */}
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