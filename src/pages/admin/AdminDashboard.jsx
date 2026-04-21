import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const BUCKET = "cite-tms-backend-bucket";
const EMPTY = { title: "", authors: "", year: "", course_or_program: "", abstract: "", secondary_email: "", access_type: "open" };

const PROGRAM_OPTIONS = [
  { value: "BSArch",  label: "Bachelor of Science in Architecture" },
  { value: "BSCpE",   label: "Bachelor of Science in Computer Engineering" },
  { value: "BSCS",    label: "Bachelor of Science in Computer Science" },
  { value: "BSEE",    label: "Bachelor of Science in Electrical Engineering" },
  { value: "BSECE",   label: "Bachelor of Science in Electronics Engineering" },
  { value: "BSEMC",   label: "Bachelor of Science in Entertainment and Multimedia Computing" },
  { value: "BSIE",    label: "Bachelor of Science in Industrial Engineering" },
  { value: "BSIT",    label: "Bachelor of Science in Information Technology" },
];

const getStorageUrl = (path) => path ? supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl ?? null : null;
const safeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");
const splitAuthors = (authors) => {
  const list = Array.isArray(authors) ? authors.map((a) => a?.trim()).filter(Boolean) : [];
  return { primary_author: list[0] || "", co_authors: list.slice(1).join(", ") };
};

const ACCESS_LABELS = {
  open:          { label: "Public",           bg: "#f0fdf4", color: "#15803d" },
  students_only: { label: "Sign-in Required", bg: "#eff6ff", color: "#1d4ed8" },
  restricted:    { label: "Request Required", bg: "#fef2f2", color: "#9b0000" },
};
const STATUS_LABELS = {
  published: { label: "Published", bg: "#f0fdf4", color: "#15803d" },
  pending:   { label: "Pending",   bg: "#fffbeb", color: "#92400e" },
  rejected:  { label: "Rejected",  bg: "#fef2f2", color: "#9b0000" },
};
const REQ_STATUS = {
  pending:  { bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b" },
  approved: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", dot: "#16a34a" },
  rejected: { bg: "#fef2f2", color: "#9b0000", border: "#fecaca", dot: "#dc2626" },
};

const VALID_TABS = ["papers", "requests", "upgrades", "upload-requests", "whitelist"];

const S = {
  root:         { display: "flex", minHeight: "100vh", background: "#f4f6f8", fontFamily: "'DM Sans', system-ui, sans-serif" },
  sidebar:      { width: 240, minWidth: 240, maxWidth: 240, background: "#fff", borderRight: "1px solid #e8eaed", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, flexShrink: 0, boxSizing: "border-box" },
  brand:        { display: "flex", alignItems: "center", gap: 10, padding: "20px 20px 16px", borderBottom: "1px solid #f1f3f4", cursor: "pointer" },
  brandIcon:    { width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#006400,#1a8a1a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,100,0,0.3)", flexShrink: 0 },
  nav:          { flex: 1, padding: "12px 10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, boxSizing: "border-box" },
  navBtn:       { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", background: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 500, color: "#5f6368", cursor: "pointer", width: "100%", textAlign: "left", boxSizing: "border-box" },
  navBtnActive: { background: "#f0fdf4", color: "#166634", fontWeight: 600 },
  navBadge:     { fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "#fef2f2", color: "#9b0000", minWidth: 18, textAlign: "center" },
  navBadgeActive: { background: "#dcfce7", color: "#166534" },
  footer:       { borderTop: "1px solid #f1f3f4", padding: "12px 10px", boxSizing: "border-box" },
  userWrap:     { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer", position: "relative", boxSizing: "border-box" },
  avatarFb:     { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#006400,#1a8a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 },
  avatarImg:    { width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid #e8eaed", flexShrink: 0 },
  dropdown:     { position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, zIndex: 999, boxShadow: "0 -8px 30px rgba(0,0,0,0.1)", overflow: "hidden" },
  main:         { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", boxSizing: "border-box" },
  topbar:       { background: "#fff", borderBottom: "1px solid #e8eaed", padding: "0 28px", height: 56, display: "flex", alignItems: "center", flexShrink: 0, boxSizing: "border-box" },
  body:         { flex: 1, padding: 28, overflowY: "auto", boxSizing: "border-box" },
};

const CloseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CheckIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const FileIcon = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const CertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
const Spinner = ({ size = 14, color = "rgba(255,255,255,0.4)", top = "#fff" }) => <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, border: `2px solid ${color}`, borderTopColor: top, animation: "adSpin 0.7s linear infinite" }} />;

const NAV_ICONS = {
  papers:           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  requests:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  upgrades:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  "upload-requests":<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  whitelist:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
};

function DropZone({ file, setFile, disabled, isEdit, onCancel }) {
  const ref = useRef(null);
  return (
    <div className="ad-drop-zone" onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
      onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag-over"); const f = e.dataTransfer.files?.[0]; if (f?.type === "application/pdf") setFile(f); }}>
      <input ref={ref} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} disabled={disabled} />
      {file
        ? <div className="ad-drop-zone-file"><FileIcon /> {file.name}{isEdit && <button className="ad-replace-btn" style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); onCancel(); }} disabled={disabled}>Cancel</button>}</div>
        : <div className="ad-drop-zone-text"><strong>Click to upload</strong> or drag & drop a PDF<br /><span style={{ fontSize: "11.5px", color: "#9aa0a6" }}>Optional</span></div>}
    </div>
  );
}

function PaperModal({ title, isEdit = false, editTarget, onClose, onSuccess }) {
  const [form, setForm] = useState(isEdit && editTarget
    ? { title: editTarget.title || "", ...splitAuthors(editTarget.authors), year: editTarget.year?.toString() || "", course_or_program: editTarget.course_or_program || "", abstract: editTarget.abstract || "", secondary_email: editTarget.secondary_email || "", access_type: editTarget.access_type || "open" }
    : { ...EMPTY, primary_author: "", co_authors: "" });
  const [pdf, setPdf] = useState(null);
  const [replaceFile, setReplaceFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [progress, setProgress] = useState(0);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const uploadPdf = async (file) => { setProgress(15); const path = `papers/${Date.now()}_${safeFileName(file.name)}`; const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false }); if (error) throw new Error(`Upload failed: ${error.message}`); setProgress(75); return path; };
  const handleSubmit = async () => {
    setErr(""); if (!form.title.trim()) return setErr("Title is required."); if (!form.primary_author.trim()) return setErr("Primary author is required."); if (!form.year || isNaN(Number(form.year))) return setErr("A valid year is required.");
    setBusy(true); setProgress(0);
    try {
      const authors = [form.primary_author.trim(), ...form.co_authors.split(",").map((a) => a.trim()).filter(Boolean)];
      const payload = { title: form.title.trim(), authors, year: Number(form.year), course_or_program: form.course_or_program.trim() || null, abstract: form.abstract.trim() || null, secondary_email: form.secondary_email.trim() || null, access_type: form.access_type };
      if (isEdit) { let file_path = editTarget.file_path; if (replaceFile && pdf) { if (editTarget.file_path) await supabase.storage.from(BUCKET).remove([editTarget.file_path]); file_path = await uploadPdf(pdf); } await api.put(`/api/admin/papers/${editTarget.id}`, { ...payload, file_path }); }
      else { const file_path = pdf ? await uploadPdf(pdf) : null; await api.post("/api/admin/papers", { ...payload, file_path, status: "published" }); }
      setProgress(100); setOk(true); await onSuccess(); setTimeout(onClose, 1200);
    } catch (e) { setErr(e?.response?.data?.detail || e.message || "Something went wrong."); } finally { setBusy(false); }
  };
  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="ad-modal">
        <div className="ad-modal-header"><div className="ad-modal-title">{title}</div><button className="ad-modal-close" onClick={onClose} disabled={busy}><CloseIcon /></button></div>
        <div className="ad-modal-body">
          <div className="ad-field"><label className="ad-label">Title <span className="ad-required">*</span></label><input className="ad-input" name="title" value={form.title} onChange={set} disabled={busy} placeholder="e.g. IoT-Based Smart Monitoring System" autoComplete="off" /></div>
          <div className="ad-field"><label className="ad-label">Primary Author <span className="ad-required">*</span></label><input className="ad-input" name="primary_author" value={form.primary_author} onChange={set} disabled={busy} placeholder="e.g. Juan Dela Cruz" autoComplete="off" /></div>
          <div className="ad-field"><label className="ad-label">Co-Authors <span className="ad-label-hint">(optional, comma-separated)</span></label><input className="ad-input" name="co_authors" value={form.co_authors} onChange={set} disabled={busy} placeholder="e.g. Maria Santos, Juan Reyes" autoComplete="off" /></div>
          <div className="ad-row"><div className="ad-field"><label className="ad-label">Year <span className="ad-required">*</span></label><input className="ad-input" name="year" type="number" value={form.year} onChange={set} disabled={busy} placeholder="e.g. 2024" min="1990" max="2099" /></div><div className="ad-field"><label className="ad-label">Program / Course</label><select className="ad-input" name="course_or_program" value={form.course_or_program} onChange={set} disabled={busy}><option value="">Select a program...</option>{PROGRAM_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div></div>
          <div className="ad-field"><label className="ad-label">Abstract</label><textarea className="ad-textarea" name="abstract" value={form.abstract} onChange={set} disabled={busy} placeholder="Paste the paper abstract here…" /></div>
          <div className="ad-field"><label className="ad-label">Secondary Email</label><input className="ad-input" type="email" name="secondary_email" value={form.secondary_email} onChange={set} disabled={busy} placeholder="Backup contact email (optional)" autoComplete="off" /></div>
          <div className="ad-field"><label className="ad-label">Access Type</label><select className="ad-input" name="access_type" value={form.access_type} onChange={set} disabled={busy}><option value="open">Public — anyone can view</option><option value="students_only">Sign-in Required — DLSL accounts only</option><option value="restricted">Request Required — must request access</option></select></div>
          <div className="ad-field"><label className="ad-label">PDF File</label>
            {isEdit && editTarget?.file_path && !replaceFile ? <div className="ad-existing-file"><FileIcon /> <span>Current PDF on file</span><button className="ad-replace-btn" onClick={() => setReplaceFile(true)} disabled={busy}>Replace file</button></div>
            : isEdit && !editTarget?.file_path && !replaceFile ? <button className="ad-replace-btn" style={{ alignSelf: "flex-start" }} onClick={() => setReplaceFile(true)} disabled={busy}>+ Upload a PDF</button>
            : <DropZone file={pdf} setFile={setPdf} disabled={busy} isEdit={isEdit} onCancel={() => { setReplaceFile(false); setPdf(null); }} />}
          </div>
          {busy && progress > 0 && progress < 100 && <div className="ad-progress-wrap"><div className="ad-progress-bar" style={{ width: `${progress}%` }} /><span className="ad-progress-label">Uploading… {progress}%</span></div>}
          {err && <div className="ad-form-error">⚠ {err}</div>}
          {ok && <div className="ad-form-success"><CheckIcon size={16} /> {isEdit ? "Paper updated!" : "Paper added!"}</div>}
          <div className="ad-modal-footer"><button className="ad-cancel-btn" onClick={onClose} disabled={busy}>Cancel</button><button className="ad-submit-btn" onClick={handleSubmit} disabled={busy || ok}>{busy ? <><Spinner /> {isEdit ? "Saving…" : "Adding…"}</> : <><CheckIcon /> {isEdit ? "Save Changes" : "Save Paper"}</>}</button></div>
        </div>
      </div>
    </div>
  );
}

function CertLink({ path, label }) {
  if (!path) return <span style={{ fontSize: 12, color: "#c4c9d0" }}>Not uploaded</span>;
  return <a href={getStorageUrl(path)} target="_blank" rel="noopener noreferrer" className="ad-pdf-link"><FileIcon size={11} /> {label}</a>;
}
function DetailField({ label, children }) {
  return <div className="ad-detail-field"><div className="ad-detail-label">{label}</div><div className="ad-detail-value">{children}</div></div>;
}
function PaperDetail({ paper, onBack, onEdit, onDelete, deletingId }) {
  const at = ACCESS_LABELS[paper.access_type] || ACCESS_LABELS.open;
  const st = STATUS_LABELS[paper.status] || STATUS_LABELS.pending;
  const hasCerts = paper.grammarian_cert_path || paper.turnitin_cert_path || paper.statistician_cert_path;
  return (
    <div className="ad-detail-wrap">
      <div className="ad-detail-topbar"><button className="ad-back-btn" onClick={onBack}><BackIcon /> Back to Papers</button><div style={{ display: "flex", gap: 6 }}><button className="ad-icon-btn" onClick={() => onEdit(paper)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button className="ad-icon-btn del" disabled={deletingId === paper.id} onClick={() => onDelete(paper)}>{deletingId === paper.id ? <Spinner size={12} color="rgba(0,0,0,.15)" top="#b91c1c" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>}</button></div></div>
      <div className="ad-detail-card">
        <div className="ad-detail-header"><h2 className="ad-detail-title">{paper.title || "Untitled"}</h2><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}><span style={{ background: at.bg, color: at.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{at.label}</span><span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{st.label}</span>{paper.research_type && <span style={{ background: "#f3f4f6", color: "#374151", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>{paper.research_type.replace("_", " ")}</span>}</div></div>
        <div className="ad-detail-grid"><DetailField label="Authors">{paper.authors?.length > 0 ? paper.authors.join(", ") : <span style={{ color: "#c4c9d0" }}>—</span>}</DetailField><DetailField label="Year">{paper.year ? <span className="ad-pill ad-pill-year">{paper.year}</span> : <span style={{ color: "#c4c9d0" }}>—</span>}</DetailField><DetailField label="Program">{paper.course_or_program ? <span className="ad-pill ad-pill-prog">{paper.course_or_program}</span> : <span style={{ color: "#c4c9d0" }}>—</span>}</DetailField><DetailField label="Secondary Email">{paper.secondary_email || <span style={{ color: "#c4c9d0" }}>—</span>}</DetailField><DetailField label="Submitted">{paper.created_at ? new Date(paper.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</DetailField><DetailField label="PDF File">{paper.file_path ? <a className="ad-pdf-link" href={getStorageUrl(paper.file_path)} target="_blank" rel="noopener noreferrer"><FileIcon size={11} /> View PDF</a> : <span style={{ color: "#c4c9d0" }}>No file uploaded</span>}</DetailField></div>
        {paper.abstract && <div className="ad-detail-abstract"><div className="ad-detail-label" style={{ marginBottom: 8 }}>Abstract</div><p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7 }}>{paper.abstract}</p></div>}
        <div className="ad-cert-section"><div className="ad-cert-section-title"><CertIcon /> Supporting Certificates</div>{hasCerts ? <div className="ad-cert-grid"><div className="ad-cert-item"><div className="ad-cert-item-label">Certificate of Grammarian</div><CertLink path={paper.grammarian_cert_path} label="View Certificate" /></div><div className="ad-cert-item"><div className="ad-cert-item-label">Turnitin / Plagiarism Report</div><CertLink path={paper.turnitin_cert_path} label="View Report" /></div><div className="ad-cert-item"><div className="ad-cert-item-label">Certificate of Statistician</div><CertLink path={paper.statistician_cert_path} label="View Certificate" /></div></div> : <div style={{ fontSize: 13, color: "#9aa0a6", padding: "12px 0" }}>No certificates uploaded for this paper.</div>}</div>
      </div>
    </div>
  );
}
function RequestDetail({ req, onBack, onAction }) {
  const s = REQ_STATUS[req.status] || REQ_STATUS.pending;
  return (
    <div className="ad-detail-wrap">
      <div className="ad-detail-topbar"><button className="ad-back-btn" onClick={onBack}><BackIcon /> Back to Access Requests</button></div>
      <div className="ad-detail-card">
        <div className="ad-detail-header"><h2 className="ad-detail-title">{req.paper_title || "Access Request"}</h2><div style={{ marginTop: 10 }}><span className="ad-status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span></div></div>
        <div className="ad-detail-grid"><DetailField label="Requester Name">{req.requester_name || "—"}</DetailField><DetailField label="Requester Email">{req.requester_email || "—"}</DetailField><DetailField label="Date Submitted">{req.created_at ? new Date(req.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</DetailField></div>
        {req.message && <div className="ad-detail-abstract"><div className="ad-detail-label" style={{ marginBottom: 8 }}>Message from Requester</div><p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7 }}>{req.message}</p></div>}
        {req.status === "pending" && <div style={{ display: "flex", gap: 10, padding: "20px 28px 24px" }}><button className="ad-approve-btn" onClick={() => onAction(req.id, "approved")}>✓ Approve Access</button><button className="ad-reject-btn" onClick={() => onAction(req.id, "rejected")}>Reject</button></div>}
      </div>
    </div>
  );
}
function UpgradeDetail({ req, onBack, onDecide, decidingId }) {
  const s = REQ_STATUS[req.status] || REQ_STATUS.pending; const busy = decidingId === req.id; const paper = req.paper || {};
  return (
    <div className="ad-detail-wrap">
      <div className="ad-detail-topbar"><button className="ad-back-btn" onClick={onBack}><BackIcon /> Back to Author Upgrades</button></div>
      <div className="ad-detail-card">
        <div className="ad-detail-header"><h2 className="ad-detail-title">Author Upgrade Request</h2><div style={{ marginTop: 10 }}><span className="ad-status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span></div></div>
        <div className="ad-cert-section"><div className="ad-cert-section-title" style={{ marginBottom: 12 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Student Information</div><div className="ad-detail-grid"><DetailField label="Full Name">{req.user?.full_name || "—"}</DetailField><DetailField label="Email">{req.user?.email || "—"}</DetailField><DetailField label="Date Requested">{req.created_at ? new Date(req.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</DetailField></div></div>
        <div className="ad-cert-section"><div className="ad-cert-section-title" style={{ marginBottom: 12 }}><FileIcon size={14} /> Submitted Paper</div><div className="ad-detail-grid"><DetailField label="Title">{paper.title || "—"}</DetailField><DetailField label="Authors">{paper.authors?.join(", ") || "—"}</DetailField><DetailField label="Year">{paper.year ? <span className="ad-pill ad-pill-year">{paper.year}</span> : "—"}</DetailField><DetailField label="Program">{paper.course_or_program ? <span className="ad-pill ad-pill-prog">{paper.course_or_program}</span> : "—"}</DetailField><DetailField label="PDF">{paper.file_path ? <a className="ad-pdf-link" href={getStorageUrl(paper.file_path)} target="_blank" rel="noopener noreferrer"><FileIcon size={11} /> View PDF</a> : <span style={{ color: "#c4c9d0" }}>No file</span>}</DetailField></div>{paper.abstract && <div style={{ marginTop: 16 }}><div className="ad-detail-label" style={{ marginBottom: 6 }}>Abstract</div><p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{paper.abstract}</p></div>}</div>
        <div className="ad-cert-section"><div className="ad-cert-section-title"><CertIcon /> Certificates to Verify</div><div className="ad-cert-grid"><div className="ad-cert-item"><div className="ad-cert-item-label">Certificate of Grammarian</div><CertLink path={paper.grammarian_cert_path} label="View Certificate" /></div><div className="ad-cert-item"><div className="ad-cert-item-label">Turnitin / Plagiarism Report</div><CertLink path={paper.turnitin_cert_path} label="View Report" /></div><div className="ad-cert-item"><div className="ad-cert-item-label">Certificate of Statistician</div><CertLink path={paper.statistician_cert_path} label="View Certificate" /></div></div></div>
        {req.status === "pending" && <div style={{ display: "flex", gap: 10, margin: "0 28px 24px", paddingTop: 20, borderTop: "1px solid #f1f3f4" }}><button className="ad-approve-btn" disabled={busy} onClick={() => onDecide(req.id, "approve")}>{busy ? <Spinner size={12} color="rgba(0,100,0,0.3)" top="#166534" /> : "✓ Approve & Grant Author"}</button><button className="ad-reject-btn" disabled={busy} onClick={() => onDecide(req.id, "reject")}>Reject</button></div>}
      </div>
    </div>
  );
}
function UploadRequestDetail({ req, onBack, onDecide, decidingId }) {
  const s = REQ_STATUS[req.status] || REQ_STATUS.pending; const busy = decidingId === req.id; const paper = req.papers && typeof req.papers === "object" ? req.papers : {};
  return (
    <div className="ad-detail-wrap">
      <div className="ad-detail-topbar"><button className="ad-back-btn" onClick={onBack}><BackIcon /> Back to Upload Requests</button></div>
      <div className="ad-detail-card">
        <div className="ad-detail-header"><h2 className="ad-detail-title">{paper.title || "Upload Paper Request"}</h2><div style={{ marginTop: 10 }}><span className="ad-status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span></div></div>
        <div className="ad-cert-section"><div className="ad-cert-section-title" style={{ marginBottom: 12 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Author Information</div><div className="ad-detail-grid"><DetailField label="Full Name">{req.user?.full_name || "—"}</DetailField><DetailField label="Email">{req.user?.email || "—"}</DetailField><DetailField label="Date Submitted">{req.created_at ? new Date(req.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</DetailField></div></div>
        <div className="ad-cert-section"><div className="ad-cert-section-title" style={{ marginBottom: 12 }}><FileIcon size={14} /> Paper Details</div><div className="ad-detail-grid"><DetailField label="Authors">{paper.authors?.join(", ") || "—"}</DetailField><DetailField label="Year">{paper.year ? <span className="ad-pill ad-pill-year">{paper.year}</span> : "—"}</DetailField><DetailField label="Program">{paper.course_or_program ? <span className="ad-pill ad-pill-prog">{paper.course_or_program}</span> : "—"}</DetailField><DetailField label="PDF">{paper.file_path ? <a className="ad-pdf-link" href={getStorageUrl(paper.file_path)} target="_blank" rel="noopener noreferrer"><FileIcon size={11} /> View PDF</a> : <span style={{ color: "#c4c9d0" }}>No file</span>}</DetailField></div>{paper.abstract && <div style={{ marginTop: 16 }}><div className="ad-detail-label" style={{ marginBottom: 6 }}>Abstract</div><p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{paper.abstract}</p></div>}</div>
        <div className="ad-cert-section"><div className="ad-cert-section-title"><CertIcon /> Certificates</div><div className="ad-cert-grid"><div className="ad-cert-item"><div className="ad-cert-item-label">Certificate of Grammarian</div><CertLink path={paper.grammarian_cert_path} label="View Certificate" /></div><div className="ad-cert-item"><div className="ad-cert-item-label">Turnitin / Plagiarism Report</div><CertLink path={paper.turnitin_cert_path} label="View Report" /></div><div className="ad-cert-item"><div className="ad-cert-item-label">Certificate of Statistician</div><CertLink path={paper.statistician_cert_path} label="View Certificate" /></div></div></div>
        {req.status === "pending" && <div style={{ display: "flex", gap: 10, margin: "0 28px 24px", paddingTop: 20, borderTop: "1px solid #f1f3f4" }}><button className="ad-approve-btn" disabled={busy} onClick={() => onDecide(req.id, "approve")}>{busy ? <Spinner size={12} color="rgba(0,100,0,0.3)" top="#166534" /> : "✓ Approve & Publish"}</button><button className="ad-reject-btn" disabled={busy} onClick={() => onDecide(req.id, "reject")}>Reject</button></div>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const meta = user?.user_metadata ?? {};
  const avatar = meta.avatar_url || meta.picture || null;
  const displayName = meta.full_name || meta.name || user?.email || "Admin";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // ── Restore active tab from sessionStorage ──────────────────
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem("admin_active_tab");
    return saved && VALID_TABS.includes(saved) ? saved : "papers";
  });

  const [papers, setPapers]                           = useState([]);
  const [requests, setRequests]                       = useState([]);
  const [upgradeRequests, setUpgradeRequests]         = useState([]);
  const [uploadPaperRequests, setUploadPaperRequests] = useState([]);
  const [whitelist, setWhitelist]                     = useState([]);
  const [loading, setLoading]                         = useState(true);
  const [error, setError]                             = useState("");
  const [search, setSearch]                           = useState("");
  const [showAdd, setShowAdd]                         = useState(false);
  const [editTarget, setEditTarget]                   = useState(null);
  const [deletingId, setDeletingId]                   = useState(null);
  const [newEmail, setNewEmail]                       = useState("");
  const [addingEmail, setAddingEmail]                 = useState(false);
  const [emailErr, setEmailErr]                       = useState("");
  const [decidingId, setDecidingId]                   = useState(null);
  const [selectedPaper, setSelectedPaper]             = useState(null);
  const [selectedRequest, setSelectedRequest]         = useState(null);
  const [selectedUpgrade, setSelectedUpgrade]         = useState(null);
  const [selectedUpload, setSelectedUpload]           = useState(null);

  useEffect(() => {
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Save tab to sessionStorage whenever it changes ──────────
  const switchTab = (tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("admin_active_tab", tab);
    setSelectedPaper(null); setSelectedRequest(null); setSelectedUpgrade(null); setSelectedUpload(null);
  };

  const fetchPapers = async () => { setLoading(true); setError(""); try { const res = await api.get("/api/admin/papers"); setPapers(res.data.results ?? []); } catch (e) { setError(e?.response?.data?.detail || e.message || "Failed to load papers."); } finally { setLoading(false); } };
  const fetchRequests = async () => { try { const res = await api.get("/api/admin/requests"); setRequests(res.data ?? []); } catch (e) { console.error(e.message); } };
  const fetchUpgradeRequests = async () => { try { const res = await api.get("/api/admin/upgrade-requests"); setUpgradeRequests(res.data ?? []); } catch (e) { console.error(e.message); } };
  const fetchWhitelist = async () => { try { const res = await api.get("/api/admin/whitelist"); setWhitelist(res.data ?? []); } catch (e) { console.error(e.message); } };
  const fetchUploadPaperRequests = async () => { try { const res = await api.get("/api/admin/upload-requests"); setUploadPaperRequests(res.data ?? []); } catch (e) { console.error(e.message); } };
  useEffect(() => { fetchPapers(); fetchRequests(); fetchUpgradeRequests(); fetchUploadPaperRequests(); fetchWhitelist(); }, []);

  const handleDelete = async (paper) => { if (!window.confirm(`Delete "${paper.title}"?`)) return; setDeletingId(paper.id); try { await api.delete(`/api/admin/papers/${paper.id}`); setPapers((p) => p.filter((x) => x.id !== paper.id)); setSelectedPaper(null); } catch (e) { alert("Delete failed: " + (e?.response?.data?.detail || e.message)); } finally { setDeletingId(null); } };
  const handleRequestAction = async (id, status) => { try { await api.patch(`/api/admin/requests/${id}`, { status }); setRequests((p) => p.map((r) => r.id === id ? { ...r, status } : r)); if (selectedRequest?.id === id) setSelectedRequest((r) => ({ ...r, status })); } catch (e) { alert("Failed: " + (e?.response?.data?.detail || e.message)); } };
  const handleUpgradeDecision = async (id, action) => { setDecidingId(id); try { await api.post(`/api/admin/upgrade-requests/${id}/decide`, { action }); if (action === "approve") { const req = upgradeRequests.find((r) => r.id === id); if (req?.paper?.secondary_email) { try { await api.post("/api/admin/whitelist", { email: req.paper.secondary_email }); } catch {} } } await Promise.all([fetchUpgradeRequests(), fetchPapers(), fetchWhitelist()]); setSelectedUpgrade(null); } catch (e) { alert("Failed: " + (e?.response?.data?.detail || e.message)); } finally { setDecidingId(null); } };
  const handleUploadRequestDecision = async (id, action) => { setDecidingId(id); try { await api.post(`/api/admin/upload-requests/${id}/decide`, { action }); await fetchUploadPaperRequests(); await fetchPapers(); setSelectedUpload(null); } catch (e) { alert("Failed: " + (e?.response?.data?.detail || e.message)); } finally { setDecidingId(null); } };
  const handleAddEmail = async () => { setEmailErr(""); if (!newEmail.trim()) return setEmailErr("Email is required."); if (!newEmail.includes("@")) return setEmailErr("Enter a valid email."); setAddingEmail(true); try { const res = await api.post("/api/admin/whitelist", { email: newEmail.trim() }); setWhitelist((p) => [res.data, ...p]); setNewEmail(""); } catch (e) { setEmailErr(e?.response?.data?.detail || e.message || "Failed to add email."); } finally { setAddingEmail(false); } };
  const handleRemoveEmail = async (id) => { try { await api.delete(`/api/admin/whitelist/${id}`); setWhitelist((p) => p.filter((w) => w.id !== id)); } catch (e) { alert("Failed: " + (e?.response?.data?.detail || e.message)); } };

  const filtered = papers.filter((p) => { if (!search.trim()) return true; const q = search.toLowerCase(); return p.title?.toLowerCase().includes(q) || p.authors?.join(", ").toLowerCase().includes(q) || p.course_or_program?.toLowerCase().includes(q); });
  const pendingRequestCount     = requests.filter((r) => r.status === "pending").length;
  const pendingUpgradeCount     = upgradeRequests.filter((r) => r.status === "pending").length;
  const pendingUploadPaperCount = uploadPaperRequests.filter((r) => r.status === "pending").length;

  const NAV_ITEMS = [
    { id: "papers",           label: "Papers",                badge: papers.length },
    { id: "requests",         label: "Access Requests",       badge: pendingRequestCount },
    { id: "upgrades",         label: "Author Upgrades",       badge: pendingUpgradeCount },
    { id: "upload-requests",  label: "Upload Paper Requests", badge: pendingUploadPaperCount },
    { id: "whitelist",        label: "Whitelist",             badge: whitelist.length },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes adSpin    { to{transform:rotate(360deg)} }
        @keyframes adShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        @keyframes adFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes adSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .ad-table-wrap{background:#fff;border:1px solid #e8eaed;border-radius:12px;overflow:hidden}
        .ad-table{width:100%;border-collapse:collapse;font-size:13.5px}
        .ad-table thead{background:#f8f9fa;border-bottom:1px solid #e8eaed}
        .ad-table th{padding:11px 16px;text-align:left;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#80868b}
        .ad-table td{padding:13px 16px;border-bottom:1px solid #f1f3f4;vertical-align:top;color:#3c4043}
        .ad-table tr:last-child td{border-bottom:none}
        .ad-table tbody tr.clickable:hover td{background:#f0faf0;cursor:pointer}
        .ad-title-cell{font-weight:600;color:#202124;max-width:260px;line-height:1.4}
        .ad-authors-cell{color:#5f6368;max-width:160px;line-height:1.4}
        .ad-pill{display:inline-block;font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:10px}
        .ad-pill-year{background:#e8f5e9;color:#2e7d32}
        .ad-pill-prog{background:#e8f0fe;color:#1a73e8}
        .ad-pill-nourl{background:#f3f4f6;color:#9ca3af}
        .ad-pdf-link{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;color:#1a73e8;text-decoration:none}
        .ad-pdf-link:hover{color:#1557b0;text-decoration:underline}
        .ad-icon-btn{background:none;border:none;cursor:pointer;color:#c4c9d0;padding:5px;border-radius:5px;line-height:1}
        .ad-icon-btn:hover{color:#374151;background:#f1f3f4}
        .ad-icon-btn.del:hover{color:#b91c1c;background:#fef2f2}
        .ad-icon-btn:disabled{opacity:.4;cursor:not-allowed}
        .ad-status-pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid;white-space:nowrap}
        .ad-approve-btn{background:#f0fdf4;border:1.5px solid #bbf7d0;color:#166534;font-size:12px;font-weight:600;font-family:inherit;padding:6px 14px;border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
        .ad-approve-btn:hover{background:#dcfce7}
        .ad-approve-btn:disabled{opacity:.5;cursor:not-allowed}
        .ad-reject-btn{background:#fef2f2;border:1.5px solid #fecaca;color:#9b0000;font-size:12px;font-weight:600;font-family:inherit;padding:6px 14px;border-radius:7px;cursor:pointer}
        .ad-reject-btn:hover{background:#fee2e2}
        .ad-reject-btn:disabled{opacity:.5;cursor:not-allowed}
        .ad-back-btn{display:inline-flex;align-items:center;gap:8px;background:none;border:1px solid #e8eaed;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;color:#374151;cursor:pointer;font-family:inherit}
        .ad-back-btn:hover{background:#f1f3f4;border-color:#d1d5db}
        .ad-detail-wrap{animation:adFadeIn .18s ease}
        .ad-detail-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .ad-detail-card{background:#fff;border:1px solid #e8eaed;border-radius:14px;overflow:hidden}
        .ad-detail-header{padding:24px 28px 20px;border-bottom:1px solid #f1f3f4}
        .ad-detail-title{font-size:20px;font-weight:700;color:#111827;line-height:1.4}
        .ad-detail-grid{display:grid;grid-template-columns:1fr 1fr;padding:0 28px}
        .ad-detail-field{padding:14px 0;border-bottom:1px solid #f8f9fa}
        .ad-detail-field:nth-last-child(-n+2){border-bottom:none}
        .ad-detail-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9aa0a6;margin-bottom:5px}
        .ad-detail-value{font-size:13.5px;color:#202124;font-weight:500}
        .ad-detail-abstract{padding:20px 28px;border-top:1px solid #f1f3f4}
        .ad-cert-section{padding:20px 28px;border-top:1px solid #f1f3f4}
        .ad-cert-section-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#374151;margin-bottom:16px}
        .ad-cert-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .ad-cert-item{background:#f8f9fa;border:1px solid #e8eaed;border-radius:10px;padding:14px 16px}
        .ad-cert-item-label{font-size:11.5px;font-weight:600;color:#5f6368;margin-bottom:8px}
        .ad-req-card{background:#fff;border:1px solid #e8eaed;border-radius:10px;padding:16px 20px;margin-bottom:8px;display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;cursor:pointer;transition:border-color .15s,box-shadow .15s}
        .ad-req-card:hover{border-color:#006400;box-shadow:0 2px 12px rgba(0,100,0,.08)}
        .ad-req-info{flex:1;min-width:200px}
        .ad-req-name{font-size:14px;font-weight:600;color:#202124;margin-bottom:2px}
        .ad-req-email{font-size:12px;color:#9aa0a6;margin-bottom:6px}
        .ad-req-paper{font-size:13px;color:#374151;font-style:italic}
        .ad-error-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;color:#b91c1c;font-size:13px;margin-bottom:20px}
        .ad-empty{padding:56px;text-align:center;color:#9aa0a6;font-size:14px}
        .ad-skel-row td{padding:16px}
        .ad-skel{border-radius:4px;height:14px;background:linear-gradient(90deg,#efefef 25%,#e6e6e6 50%,#efefef 75%);background-size:900px 100%;animation:adShimmer 1.4s infinite linear}
        .ad-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;animation:adFadeIn .18s ease}
        .ad-modal{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.18);animation:adSlideUp .22s ease}
        .ad-modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 0;position:sticky;top:0;background:#fff;z-index:1}
        .ad-modal-title{font-size:20px;font-weight:700;color:#202124}
        .ad-modal-close{background:none;border:none;cursor:pointer;color:#9aa0a6;padding:4px;border-radius:6px;line-height:1}
        .ad-modal-close:hover{color:#202124;background:#f1f3f4}
        .ad-modal-body{padding:20px 24px 24px;display:flex;flex-direction:column;gap:16px}
        .ad-field{display:flex;flex-direction:column;gap:5px}
        .ad-label{font-size:12px;font-weight:600;color:#374151;letter-spacing:.03em}
        .ad-required{color:#b91c1c;margin-left:2px}
        .ad-label-hint{color:#9aa0a6;font-weight:400}
        .ad-input,.ad-textarea{border:1px solid #dadce0;border-radius:8px;padding:9px 12px;font-size:13.5px;font-family:inherit;color:#202124;outline:none;background:#fff;width:100%;box-sizing:border-box}
        .ad-input:focus,.ad-textarea:focus{border-color:#006400;box-shadow:0 0 0 3px rgba(0,100,0,.08)}
        .ad-textarea{resize:vertical;min-height:90px;line-height:1.55}
        .ad-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ad-existing-file{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:#2e7d32;background:#e8f5e9;border-radius:8px;padding:8px 12px}
        .ad-replace-btn{background:none;border:1px solid #dadce0;border-radius:6px;padding:3px 10px;font-size:12px;color:#5f6368;cursor:pointer;font-family:inherit}
        .ad-replace-btn:hover{border-color:#006400;color:#006400}
        .ad-drop-zone{border:2px dashed #dadce0;border-radius:10px;padding:20px 16px;text-align:center;cursor:pointer;background:#fafafa}
        .ad-drop-zone:hover,.ad-drop-zone.drag-over{border-color:#006400;background:#f0faf0}
        .ad-drop-zone-text{font-size:13px;color:#5f6368;line-height:1.5}
        .ad-drop-zone-text strong{color:#006400}
        .ad-drop-zone-file{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:#2e7d32;background:#e8f5e9;border-radius:6px;padding:4px 10px;margin-top:6px}
        .ad-progress-wrap{background:#e8eaed;border-radius:8px;overflow:hidden;position:relative;height:28px}
        .ad-progress-bar{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#006400,#1a8a1a);border-radius:8px;transition:width .4s ease}
        .ad-progress-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff}
        .ad-form-error{font-size:12.5px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px}
        .ad-form-success{font-size:13px;font-weight:600;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px}
        .ad-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding-top:4px}
        .ad-cancel-btn{background:#f1f3f4;border:none;border-radius:8px;padding:9px 20px;font-size:13.5px;font-weight:500;font-family:inherit;color:#374151;cursor:pointer}
        .ad-cancel-btn:hover{background:#e8eaed}
        .ad-cancel-btn:disabled{opacity:.5;cursor:not-allowed}
        .ad-submit-btn{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#006400,#1a8a1a);color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer;box-shadow:0 2px 6px rgba(0,100,0,.25)}
        .ad-submit-btn:hover{opacity:.9}
        .ad-submit-btn:disabled{opacity:.6;cursor:not-allowed}
        .ad-whitelist-wrap{background:#fff;border:1px solid #e8eaed;border-radius:12px;overflow:hidden}
        .ad-whitelist-add{display:flex;gap:10px;padding:16px;border-bottom:1px solid #f1f3f4;align-items:flex-start;flex-wrap:wrap}
        .ad-whitelist-input{flex:1;min-width:220px;border:1px solid #dadce0;border-radius:8px;padding:9px 12px;font-size:13.5px;font-family:inherit;color:#202124;outline:none}
        .ad-whitelist-input:focus{border-color:#006400}
        .ad-whitelist-add-btn{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#006400,#1a8a1a);color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap}
        .ad-whitelist-add-btn:hover{opacity:.9}
        .ad-whitelist-add-btn:disabled{opacity:.6;cursor:not-allowed}
        .ad-whitelist-err{font-size:12.5px;color:#b91c1c;padding:0 16px 12px}
      `}</style>

      <div style={S.root}>
        {/* SIDEBAR */}
        <div style={S.sidebar}>
          <div style={S.brand} onClick={() => navigate("/")}>
            <div style={S.brandIcon}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", letterSpacing: "-0.2px", display: "block" }}>CITE-TMS</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#9aa0a6", display: "block", marginTop: 1 }}>Admin Panel</span>
            </div>
          </div>

          <div style={S.nav}>
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => switchTab(item.id)} style={{ ...S.navBtn, ...(active ? S.navBtnActive : {}) }}>
                  <span style={{ width: 16, height: 16, flexShrink: 0, opacity: active ? 1 : 0.6, display: "flex", alignItems: "center" }}>{NAV_ICONS[item.id]}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && <span style={{ ...S.navBadge, ...(active ? S.navBadgeActive : {}) }}>{item.badge}</span>}
                </button>
              );
            })}
          </div>

          <div style={S.footer}>
            <div style={S.userWrap} ref={dropdownRef} onClick={() => setDropdownOpen((o) => !o)}>
              {avatar ? <img style={S.avatarImg} src={avatar} alt={displayName} referrerPolicy="no-referrer" /> : <div style={S.avatarFb}>{initials}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#202124", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
                <div style={{ fontSize: 10.5, color: "#9aa0a6" }}>Administrator</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              {dropdownOpen && (
                <div style={S.dropdown} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{user?.email}</div>
                    <span style={{ display: "inline-block", marginTop: 5, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, background: "#f0fdf4", color: "#166534" }}>Admin</span>
                  </div>
                  <div style={{ height: 1, background: "#f3f4f6" }} />
                  <button style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", fontSize: 13, color: "#dc2626", cursor: "pointer", border: "none", background: "none", width: "100%", textAlign: "left", fontFamily: "inherit" }}
                    onClick={async () => { setDropdownOpen(false); await logout(); navigate("/"); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div style={S.main}>
          <div style={S.topbar}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{NAV_ITEMS.find((n) => n.id === activeTab)?.label}</div>
          </div>
          <div style={S.body}>
            {error && <div className="ad-error-box">{error}</div>}

            {activeTab === "papers" && (selectedPaper
              ? <PaperDetail paper={selectedPaper} onBack={() => setSelectedPaper(null)} onEdit={(p) => { setSelectedPaper(null); setEditTarget(p); }} onDelete={handleDelete} deletingId={deletingId} />
              : <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#202124" }}>All Papers</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #dadce0", borderRadius: 8, padding: "8px 14px", minWidth: 240 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input style={{ border: "none", outline: "none", fontSize: 13.5, fontFamily: "inherit", color: "#202124", background: "transparent", flex: 1 }} type="text" placeholder="Search title, author, program…" value={search} onChange={(e) => setSearch(e.target.value)} />
                      </div>
                      <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,#006400,#1a8a1a)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,100,0,.25)", whiteSpace: "nowrap" }} onClick={() => setShowAdd(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Paper
                      </button>
                    </div>
                  </div>
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead><tr><th>#</th><th>Title</th><th>Authors</th><th>Year</th><th>Program</th><th>Access</th><th>Status</th><th>PDF</th><th /></tr></thead>
                      <tbody>
                        {loading && [1,2,3,4,5].map((i) => (<tr className="ad-skel-row" key={i}>{[20,"80%","60%",36,"70%",80,80,48].map((w,j)=>(<td key={j}><div className="ad-skel" style={{width:w}}/></td>))}<td/></tr>))}
                        {!loading && filtered.length === 0 && <tr><td colSpan={9}><div className="ad-empty">{papers.length === 0 ? "No papers found." : "No papers match your search."}</div></td></tr>}
                        {!loading && filtered.map((paper, i) => { const at = ACCESS_LABELS[paper.access_type] || ACCESS_LABELS.open; const st = STATUS_LABELS[paper.status] || STATUS_LABELS.pending; return (
                          <tr key={paper.id} className="clickable" onClick={() => setSelectedPaper(paper)}>
                            <td style={{ color: "#9aa0a6", fontSize: 12 }}>{i+1}</td>
                            <td className="ad-title-cell">{paper.title || "Untitled"}</td>
                            <td className="ad-authors-cell">{paper.authors?.length > 0 ? paper.authors.join(", ") : <span style={{color:"#c4c9d0"}}>—</span>}</td>
                            <td>{paper.year ? <span className="ad-pill ad-pill-year">{paper.year}</span> : <span style={{color:"#c4c9d0"}}>—</span>}</td>
                            <td>{paper.course_or_program ? <span className="ad-pill ad-pill-prog">{paper.course_or_program}</span> : <span style={{color:"#c4c9d0"}}>—</span>}</td>
                            <td><span style={{background:at.bg,color:at.color,fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:10}}>{at.label}</span></td>
                            <td><span style={{background:st.bg,color:st.color,fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:10}}>{st.label}</span></td>
                            <td onClick={(e)=>e.stopPropagation()}>{paper.file_path?<a className="ad-pdf-link" href={getStorageUrl(paper.file_path)} target="_blank" rel="noopener noreferrer"><FileIcon size={11}/> View</a>:<span className="ad-pill ad-pill-nourl">No file</span>}</td>
                            <td onClick={(e)=>e.stopPropagation()}><div style={{display:"flex",alignItems:"center",gap:4}}>
                              <button className="ad-icon-btn" onClick={()=>setEditTarget(paper)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                              <button className="ad-icon-btn del" disabled={deletingId===paper.id} onClick={()=>handleDelete(paper)}>{deletingId===paper.id?<Spinner size={12} color="rgba(0,0,0,.15)" top="#b91c1c"/>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>}</button>
                            </div></td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                </>
            )}

            {activeTab === "requests" && (selectedRequest
              ? <RequestDetail req={selectedRequest} onBack={()=>setSelectedRequest(null)} onAction={handleRequestAction}/>
              : <><div style={{fontSize:20,fontWeight:700,color:"#202124",marginBottom:20}}>Access Requests</div>
                  <div className="ad-table-wrap"><table className="ad-table">
                    <thead><tr><th>Requester</th><th>Paper</th><th>Message</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {requests.length===0&&<tr><td colSpan={5}><div className="ad-empty">No access requests yet.</div></td></tr>}
                      {requests.map((req)=>{const s=REQ_STATUS[req.status]||REQ_STATUS.pending;return(
                        <tr key={req.id} className="clickable" onClick={()=>setSelectedRequest(req)}>
                          <td><div style={{fontWeight:500,fontSize:13}}>{req.requester_name||"—"}</div><div style={{fontSize:11.5,color:"#9aa0a6"}}>{req.requester_email||"—"}</div></td>
                          <td className="ad-title-cell" style={{maxWidth:200}}>{req.paper_title||"—"}</td>
                          <td style={{maxWidth:200,fontSize:12.5,color:"#5f6368"}}>{req.message?req.message.slice(0,80)+(req.message.length>80?"…":""):"—"}</td>
                          <td><span className="ad-status-pill" style={{background:s.bg,color:s.color,borderColor:s.border}}><span style={{width:6,height:6,borderRadius:"50%",background:s.dot,flexShrink:0}}/>{req.status.charAt(0).toUpperCase()+req.status.slice(1)}</span></td>
                          <td style={{fontSize:12.5,color:"#9aa0a6",whiteSpace:"nowrap"}}>{new Date(req.created_at).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}</td>
                        </tr>
                      );})}
                    </tbody>
                  </table></div></>
            )}

            {activeTab === "upgrades" && (selectedUpgrade
              ? <UpgradeDetail req={selectedUpgrade} onBack={()=>setSelectedUpgrade(null)} onDecide={handleUpgradeDecision} decidingId={decidingId}/>
              : <><div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"#202124"}}>Author Upgrade Requests</div><div style={{fontSize:13,color:"#9aa0a6",marginTop:4}}>Students requesting to upgrade their account to Author status</div></div>
                  {upgradeRequests.length===0?<div className="ad-table-wrap"><div className="ad-empty">No upgrade requests yet.</div></div>:upgradeRequests.map((req)=>{const s=REQ_STATUS[req.status]||REQ_STATUS.pending;return(
                    <div key={req.id} className="ad-req-card" onClick={()=>setSelectedUpgrade(req)}>
                      <div className="ad-req-info"><div className="ad-req-name">{req.user?.full_name||"Unknown user"}</div><div className="ad-req-email">{req.user?.email||"—"}</div><div className="ad-req-paper">📄 {req.paper?.title||"Untitled paper"}</div>{req.paper?.abstract&&<div style={{fontSize:12,color:"#9aa0a6",marginTop:4,lineHeight:1.5}}>{req.paper.abstract.slice(0,120)}{req.paper.abstract.length>120?"…":""}</div>}</div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}><span className="ad-status-pill" style={{background:s.bg,color:s.color,borderColor:s.border}}><span style={{width:6,height:6,borderRadius:"50%",background:s.dot,flexShrink:0}}/>{req.status.charAt(0).toUpperCase()+req.status.slice(1)}</span><div style={{fontSize:11.5,color:"#9aa0a6"}}>{new Date(req.created_at).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}</div><div style={{fontSize:11.5,color:"#1a73e8",fontWeight:600}}>Click to review →</div></div>
                    </div>
                  );})}</>
            )}

            {activeTab === "upload-requests" && (selectedUpload
              ? <UploadRequestDetail req={selectedUpload} onBack={()=>setSelectedUpload(null)} onDecide={handleUploadRequestDecision} decidingId={decidingId}/>
              : <><div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"#202124"}}>Upload Paper Requests</div><div style={{fontSize:13,color:"#9aa0a6",marginTop:4}}>Papers submitted by Authors pending review and publication</div></div>
                  {uploadPaperRequests.length===0?<div className="ad-table-wrap"><div className="ad-empty">No upload paper requests yet.</div></div>:uploadPaperRequests.map((req)=>{const s=REQ_STATUS[req.status]||REQ_STATUS.pending;const paper=req.papers&&typeof req.papers==="object"?req.papers:{};return(
                    <div key={req.id} className="ad-req-card" onClick={()=>setSelectedUpload(req)}>
                      <div className="ad-req-info"><div className="ad-req-name">{req.user?.full_name||"Unknown author"}</div><div className="ad-req-email">{req.user?.email||"—"}</div><div className="ad-req-paper">📄 {paper.title||"Untitled paper"}</div>{paper.abstract&&<div style={{fontSize:12,color:"#9aa0a6",marginTop:4,lineHeight:1.5}}>{paper.abstract.slice(0,120)}{paper.abstract.length>120?"…":""}</div>}</div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}><span className="ad-status-pill" style={{background:s.bg,color:s.color,borderColor:s.border}}><span style={{width:6,height:6,borderRadius:"50%",background:s.dot,flexShrink:0}}/>{req.status.charAt(0).toUpperCase()+req.status.slice(1)}</span><div style={{fontSize:11.5,color:"#9aa0a6"}}>{new Date(req.created_at).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}</div><div style={{fontSize:11.5,color:"#1a73e8",fontWeight:600}}>Click to review →</div></div>
                    </div>
                  );})}</>
            )}

            {activeTab === "whitelist" && <>
              <div style={{fontSize:20,fontWeight:700,color:"#202124",marginBottom:20}}>Author Whitelist</div>
              <div className="ad-whitelist-wrap">
                <div className="ad-whitelist-add">
                  <input className="ad-whitelist-input" type="email" placeholder="Enter email address to grant author access…" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleAddEmail()}/>
                  <button className="ad-whitelist-add-btn" onClick={handleAddEmail} disabled={addingEmail}>{addingEmail?<><Spinner size={13}/> Adding…</>:<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Email</>}</button>
                </div>
                {emailErr&&<div className="ad-whitelist-err">{emailErr}</div>}
                <table className="ad-table"><thead><tr><th>Email</th><th>Added</th><th/></tr></thead>
                  <tbody>
                    {whitelist.length===0&&<tr><td colSpan={3}><div className="ad-empty">No emails in the whitelist yet.</div></td></tr>}
                    {whitelist.map((entry)=>(<tr key={entry.id}><td style={{fontWeight:500}}>{entry.email}</td><td style={{fontSize:12.5,color:"#9aa0a6"}}>{entry.created_at?new Date(entry.created_at).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}):"—"}</td><td><button className="ad-icon-btn del" onClick={()=>handleRemoveEmail(entry.id)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg></button></td></tr>))}
                  </tbody>
                </table>
              </div>
            </>}
          </div>
        </div>
      </div>

      {showAdd && <PaperModal title="Add New Paper" onClose={()=>setShowAdd(false)} onSuccess={fetchPapers}/>}
      {editTarget && <PaperModal title="Edit Paper" isEdit editTarget={editTarget} onClose={()=>setEditTarget(null)} onSuccess={fetchPapers}/>}
    </>
  );
}