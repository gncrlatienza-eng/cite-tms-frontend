import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const BUCKET = "cite-tms-backend-bucket";
const EMPTY = { title: "", authors: "", year: "", course_or_program: "", abstract: "", access_type: "open" };

const getStorageUrl = (path) => path
  ? supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl ?? null
  : null;

const safeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

// Access display labels — matches user-facing language
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

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const FileIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);
const Spinner = ({ size = 14, color = "rgba(255,255,255,0.4)", top = "#fff" }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, border: `2px solid ${color}`, borderTopColor: top, animation: "adSpin 0.7s linear infinite" }} />
);

// ── Drop zone ─────────────────────────────────────────────────
function DropZone({ file, setFile, disabled, isEdit, onCancel }) {
  const ref = useRef(null);
  return (
    <div className="ad-drop-zone"
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
      onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
      onDrop={(e) => {
        e.preventDefault(); e.currentTarget.classList.remove("drag-over");
        const f = e.dataTransfer.files?.[0];
        if (f?.type === "application/pdf") setFile(f);
      }}>
      <input ref={ref} type="file" accept="application/pdf" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} disabled={disabled} />
      {file ? (
        <div className="ad-drop-zone-file">
          <FileIcon /> {file.name}
          {isEdit && (
            <button className="ad-replace-btn" style={{ marginLeft: 8 }}
              onClick={(e) => { e.stopPropagation(); onCancel(); }} disabled={disabled}>Cancel</button>
          )}
        </div>
      ) : (
        <div className="ad-drop-zone-text">
          <strong>Click to upload</strong> or drag & drop a PDF<br />
          <span style={{ fontSize: "11.5px", color: "#9aa0a6" }}>Optional</span>
        </div>
      )}
    </div>
  );
}

// ── Paper Modal ───────────────────────────────────────────────
function PaperModal({ title, isEdit = false, editTarget, onClose, onSuccess }) {
  const [form, setForm] = useState(
    isEdit && editTarget ? {
      title: editTarget.title || "",
      authors: Array.isArray(editTarget.authors) ? editTarget.authors.join(", ") : "",
      year: editTarget.year?.toString() || "",
      course_or_program: editTarget.course_or_program || "",
      abstract: editTarget.abstract || "",
      access_type: editTarget.access_type || "open",
    } : EMPTY
  );
  const [pdf, setPdf] = useState(null);
  const [replaceFile, setReplaceFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [progress, setProgress] = useState(0);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const uploadPdf = async (file) => {
    setProgress(15);
    const path = `papers/${Date.now()}_${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET)
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    setProgress(75);
    return path;
  };

  const handleSubmit = async () => {
    setErr("");
    if (!form.title.trim()) return setErr("Title is required.");
    if (!form.authors.trim()) return setErr("At least one author is required.");
    if (!form.year || isNaN(Number(form.year))) return setErr("A valid year is required.");

    setBusy(true); setProgress(0);
    try {
      const authors = form.authors.split(",").map((a) => a.trim()).filter(Boolean);
      const payload = {
        title: form.title.trim(), authors,
        year: Number(form.year),
        course_or_program: form.course_or_program.trim() || null,
        abstract: form.abstract.trim() || null,
        access_type: form.access_type,
      };

      if (isEdit) {
        let file_path = editTarget.file_path;
        if (replaceFile && pdf) {
          if (editTarget.file_path) await supabase.storage.from(BUCKET).remove([editTarget.file_path]);
          file_path = await uploadPdf(pdf);
        }
        await api.put(`/api/admin/papers/${editTarget.id}`, { ...payload, file_path });
      } else {
        const file_path = pdf ? await uploadPdf(pdf) : null;
        // Admin-added papers go straight to published
        await api.post("/api/admin/papers", { ...payload, file_path, status: "published" });
      }

      setProgress(100); setOk(true);
      await onSuccess();
      setTimeout(onClose, 1200);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="ad-modal">
        <div className="ad-modal-header">
          <div className="ad-modal-title">{title}</div>
          <button className="ad-modal-close" onClick={onClose} disabled={busy}><CloseIcon /></button>
        </div>
        <div className="ad-modal-body">
          <div className="ad-field">
            <label className="ad-label">Title <span className="ad-required">*</span></label>
            <input className="ad-input" name="title" value={form.title} onChange={set} disabled={busy} placeholder="e.g. IoT-Based Smart Monitoring System" autoComplete="off" />
          </div>
          <div className="ad-field">
            <label className="ad-label">Authors <span className="ad-required">*</span><span className="ad-label-hint"> (comma-separated)</span></label>
            <input className="ad-input" name="authors" value={form.authors} onChange={set} disabled={busy} placeholder="e.g. Juan Dela Cruz, Maria Santos" autoComplete="off" />
          </div>
          <div className="ad-row">
            <div className="ad-field">
              <label className="ad-label">Year <span className="ad-required">*</span></label>
              <input className="ad-input" name="year" type="number" value={form.year} onChange={set} disabled={busy} placeholder="e.g. 2024" min="1990" max="2099" />
            </div>
            <div className="ad-field">
              <label className="ad-label">Program / Course</label>
              <input className="ad-input" name="course_or_program" value={form.course_or_program} onChange={set} disabled={busy} placeholder="e.g. BSCS, BSIT" />
            </div>
          </div>
          <div className="ad-field">
            <label className="ad-label">Access Type</label>
            <select className="ad-input" name="access_type" value={form.access_type} onChange={set} disabled={busy}>
              <option value="open">Public — anyone can view</option>
              <option value="students_only">Sign-in Required — DLSL accounts only</option>
              <option value="restricted">Request Required — must request access</option>
            </select>
          </div>
          <div className="ad-field">
            <label className="ad-label">Abstract</label>
            <textarea className="ad-textarea" name="abstract" value={form.abstract} onChange={set} disabled={busy} placeholder="Paste the paper abstract here…" />
          </div>
          <div className="ad-field">
            <label className="ad-label">PDF File</label>
            {isEdit && editTarget?.file_path && !replaceFile ? (
              <div className="ad-existing-file">
                <FileIcon /> <span>Current PDF on file</span>
                <button className="ad-replace-btn" onClick={() => setReplaceFile(true)} disabled={busy}>Replace file</button>
              </div>
            ) : isEdit && !editTarget?.file_path && !replaceFile ? (
              <button className="ad-replace-btn" style={{ alignSelf: "flex-start" }} onClick={() => setReplaceFile(true)} disabled={busy}>+ Upload a PDF</button>
            ) : (
              <DropZone file={pdf} setFile={setPdf} disabled={busy} isEdit={isEdit} onCancel={() => { setReplaceFile(false); setPdf(null); }} />
            )}
          </div>
          {busy && progress > 0 && progress < 100 && (
            <div className="ad-progress-wrap">
              <div className="ad-progress-bar" style={{ width: `${progress}%` }} />
              <span className="ad-progress-label">Uploading… {progress}%</span>
            </div>
          )}
          {err && <div className="ad-form-error">⚠ {err}</div>}
          {ok && <div className="ad-form-success"><CheckIcon size={16} /> {isEdit ? "Paper updated!" : "Paper added!"}</div>}
          <div className="ad-modal-footer">
            <button className="ad-cancel-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="ad-submit-btn" onClick={handleSubmit} disabled={busy || ok}>
              {busy ? <><Spinner /> {isEdit ? "Saving…" : "Adding…"}</> : <><CheckIcon /> {isEdit ? "Save Changes" : "Save Paper"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]     = useState("papers");
  const [papers, setPapers]           = useState([]);
  const [requests, setRequests]       = useState([]);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [whitelist, setWhitelist]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [showAdd, setShowAdd]         = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deletingId, setDeletingId]   = useState(null);
  const [newEmail, setNewEmail]       = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [emailErr, setEmailErr]       = useState("");
  const [decidingId, setDecidingId]   = useState(null);

  const meta = user?.user_metadata ?? {};
  const avatar = meta.avatar_url || meta.picture || null;
  const displayName = meta.full_name || meta.name || user?.email || "Admin";

  const fetchPapers = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/api/admin/papers");
      setPapers(res.data.results ?? []);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Failed to load papers.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get("/api/admin/requests");
      setRequests(res.data ?? []);
    } catch (e) { console.error("Failed to load requests:", e.message); }
  };

  const fetchUpgradeRequests = async () => {
    try {
      const res = await api.get("/api/admin/upgrade-requests");
      setUpgradeRequests(res.data ?? []);
    } catch (e) { console.error("Failed to load upgrade requests:", e.message); }
  };

  const fetchWhitelist = async () => {
    try {
      const res = await api.get("/api/admin/whitelist");
      setWhitelist(res.data ?? []);
    } catch (e) { console.error("Failed to load whitelist:", e.message); }
  };

  useEffect(() => {
    fetchPapers();
    fetchRequests();
    fetchUpgradeRequests();
    fetchWhitelist();
  }, []);

  const handleDelete = async (paper) => {
    if (!window.confirm(`Delete "${paper.title}"? This cannot be undone.`)) return;
    setDeletingId(paper.id);
    try {
      await api.delete(`/api/admin/papers/${paper.id}`);
      setPapers((prev) => prev.filter((p) => p.id !== paper.id));
    } catch (e) {
      alert("Delete failed: " + (e?.response?.data?.detail || e.message));
    } finally { setDeletingId(null); }
  };

  const handleRequestAction = async (requestId, newStatus) => {
    try {
      await api.patch(`/api/admin/requests/${requestId}`, { status: newStatus });
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: newStatus } : r));
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.detail || e.message));
    }
  };

  // ── Approve / reject upgrade request ─────────────────────────
  const handleUpgradeDecision = async (requestId, action) => {
    setDecidingId(requestId);
    try {
      await api.post(`/api/admin/upgrade-requests/${requestId}/decide`, { action });

      // On approval, add the paper's secondary_email to the whitelist
      if (action === "approve") {
        const req = upgradeRequests.find((r) => r.id === requestId);
        const secondaryEmail = req?.paper?.secondary_email;
        if (secondaryEmail) {
          try {
            const res = await api.post("/api/admin/whitelist", { email: secondaryEmail });
            setWhitelist((prev) => [res.data, ...prev]);
          } catch (e) {
            // Already whitelisted or other non-fatal error — log but don't block
            console.warn("Whitelist add skipped:", e?.response?.data?.detail || e.message);
          }
        }
      }

      await fetchUpgradeRequests();
      await fetchPapers();
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.detail || e.message));
    } finally { setDecidingId(null); }
  };

  const handleAddEmail = async () => {
    setEmailErr("");
    if (!newEmail.trim()) return setEmailErr("Email is required.");
    if (!newEmail.includes("@")) return setEmailErr("Enter a valid email.");
    setAddingEmail(true);
    try {
      const res = await api.post("/api/admin/whitelist", { email: newEmail.trim() });
      setWhitelist((prev) => [res.data, ...prev]);
      setNewEmail("");
    } catch (e) {
      setEmailErr(e?.response?.data?.detail || e.message || "Failed to add email.");
    } finally { setAddingEmail(false); }
  };

  const handleRemoveEmail = async (id) => {
    try {
      await api.delete(`/api/admin/whitelist/${id}`);
      setWhitelist((prev) => prev.filter((w) => w.id !== id));
    } catch (e) {
      alert("Failed to remove: " + (e?.response?.data?.detail || e.message));
    }
  };

  const filtered = papers.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.title?.toLowerCase().includes(q)
      || p.authors?.join(", ").toLowerCase().includes(q)
      || p.course_or_program?.toLowerCase().includes(q);
  });

  const pendingRequestCount  = requests.filter((r) => r.status === "pending").length;
  const pendingUpgradeCount  = upgradeRequests.filter((r) => r.status === "pending").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .ad-page { min-height:100vh; background:#f8f9fa; font-family:'DM Sans',system-ui,sans-serif; }

        .ad-header { background:#fff; border-bottom:1px solid #e8eaed; padding:0 32px; height:58px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .ad-header-left { display:flex; align-items:center; gap:12px; }
        .ad-header-icon { width:32px; height:32px; border-radius:7px; background:linear-gradient(135deg,#006400,#1a8a1a); display:flex; align-items:center; justify-content:center; }
        .ad-header-title { font-size:15px; font-weight:600; color:#202124; }
        .ad-header-badge { font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; background:#e8f5e9; color:#2e7d32; border-radius:20px; padding:2px 8px; }
        .ad-header-right { display:flex; align-items:center; gap:14px; }
        .ad-user-chip { display:flex; align-items:center; gap:9px; }
        .ad-avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; border:2px solid #e8eaed; flex-shrink:0; }
        .ad-avatar-fallback { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#006400,#1a8a1a); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; border:2px solid #e8eaed; }
        .ad-user-info { display:flex; flex-direction:column; line-height:1.25; }
        .ad-user-name { font-size:13px; font-weight:600; color:#202124; }
        .ad-user-role { font-size:10.5px; color:#2e7d32; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; }
        .ad-logout-btn { font-size:13px; font-weight:500; color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:6px 14px; cursor:pointer; font-family:inherit; transition:background 0.15s; }
        .ad-logout-btn:hover { background:#fee2e2; }

        .ad-body { padding:32px; max-width:1100px; margin:0 auto; }

        .ad-tabs { display:flex; gap:4px; margin-bottom:24px; background:#fff; border:1px solid #e8eaed; border-radius:10px; padding:4px; width:fit-content; }
        .ad-tab-btn { padding:8px 20px; border-radius:7px; border:none; background:none; font-size:13.5px; font-weight:500; font-family:inherit; color:#5f6368; cursor:pointer; transition:background 0.15s,color 0.15s; display:flex; align-items:center; gap:7px; white-space:nowrap; }
        .ad-tab-btn.active { background:#006400; color:#fff; font-weight:600; }
        .ad-tab-btn:hover:not(.active) { background:#f1f3f4; color:#202124; }
        .ad-tab-badge { font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; }
        .ad-tab-btn.active .ad-tab-badge { background:rgba(255,255,255,0.3); color:#fff; }
        .ad-tab-btn:not(.active) .ad-tab-badge { background:#fef2f2; color:#9b0000; }

        .ad-controls { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
        .ad-section-title { font-family:'DM Serif Display',serif; font-size:22px; color:#202124; }
        .ad-controls-right { display:flex; align-items:center; gap:10px; }
        .ad-add-btn { display:inline-flex; align-items:center; gap:7px; background:linear-gradient(135deg,#006400,#1a8a1a); color:#fff; border:none; border-radius:8px; padding:9px 18px; font-size:13.5px; font-weight:600; font-family:inherit; cursor:pointer; box-shadow:0 2px 6px rgba(0,100,0,0.25); white-space:nowrap; transition:opacity 0.15s; }
        .ad-add-btn:hover { opacity:.9; }
        .ad-search-wrap { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #dadce0; border-radius:8px; padding:8px 14px; min-width:260px; transition:border-color 0.15s,box-shadow 0.15s; }
        .ad-search-wrap:focus-within { border-color:#006400; box-shadow:0 0 0 3px rgba(0,100,0,0.08); }
        .ad-search-input { border:none; outline:none; font-size:13.5px; font-family:inherit; color:#202124; background:transparent; flex:1; }
        .ad-search-input::placeholder { color:#9aa0a6; }

        .ad-table-wrap { background:#fff; border:1px solid #e8eaed; border-radius:12px; overflow:hidden; }
        .ad-table { width:100%; border-collapse:collapse; font-size:13.5px; }
        .ad-table thead { background:#f8f9fa; border-bottom:1px solid #e8eaed; }
        .ad-table th { padding:12px 16px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#80868b; }
        .ad-table td { padding:14px 16px; border-bottom:1px solid #f1f3f4; vertical-align:top; color:#3c4043; }
        .ad-table tr:last-child td { border-bottom:none; }
        .ad-table tr:hover td { background:#fafafa; }
        .ad-title-cell { font-weight:600; color:#202124; max-width:260px; line-height:1.4; }
        .ad-authors-cell { color:#5f6368; max-width:160px; line-height:1.4; }
        .ad-pill { display:inline-block; font-size:10.5px; font-weight:600; padding:2px 8px; border-radius:10px; }
        .ad-pill-year { background:#e8f5e9; color:#2e7d32; }
        .ad-pill-prog { background:#e8f0fe; color:#1a73e8; }
        .ad-pill-nourl { background:#f3f4f6; color:#9ca3af; }
        .ad-pdf-link { display:inline-flex; align-items:center; gap:5px; font-size:12.5px; font-weight:500; color:#1a73e8; text-decoration:none; transition:color 0.15s; }
        .ad-pdf-link:hover { color:#1557b0; text-decoration:underline; }
        .ad-row-actions { display:flex; align-items:center; gap:4px; }
        .ad-icon-btn { background:none; border:none; cursor:pointer; color:#c4c9d0; padding:5px; border-radius:5px; transition:color 0.15s,background 0.15s; line-height:1; }
        .ad-icon-btn:hover { color:#374151; background:#f1f3f4; }
        .ad-icon-btn.del:hover { color:#b91c1c; background:#fef2f2; }
        .ad-icon-btn:disabled { opacity:.4; cursor:not-allowed; }

        .ad-status-pill { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; border:1px solid; white-space:nowrap; }
        .ad-approve-btn { background:#f0fdf4; border:1.5px solid #bbf7d0; color:#166534; font-size:12px; font-weight:600; font-family:inherit; padding:5px 12px; border-radius:7px; cursor:pointer; transition:background 0.15s; }
        .ad-approve-btn:hover { background:#dcfce7; }
        .ad-approve-btn:disabled { opacity:.5; cursor:not-allowed; }
        .ad-reject-btn { background:#fef2f2; border:1.5px solid #fecaca; color:#9b0000; font-size:12px; font-weight:600; font-family:inherit; padding:5px 12px; border-radius:7px; cursor:pointer; transition:background 0.15s; }
        .ad-reject-btn:hover { background:#fee2e2; }
        .ad-reject-btn:disabled { opacity:.5; cursor:not-allowed; }

        .ad-upgrade-card { background:#fff; border:1px solid #e8eaed; border-radius:10px; padding:16px 20px; margin-bottom:10px; display:flex; align-items:flex-start; gap:16px; flex-wrap:wrap; }
        .ad-upgrade-info { flex:1; min-width:200px; }
        .ad-upgrade-name { font-size:14px; font-weight:600; color:#202124; margin-bottom:2px; }
        .ad-upgrade-email { font-size:12px; color:#9aa0a6; margin-bottom:8px; }
        .ad-upgrade-paper { font-size:13px; color:#374151; font-style:italic; }
        .ad-upgrade-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; align-self:center; }

        .ad-whitelist-wrap { background:#fff; border:1px solid #e8eaed; border-radius:12px; overflow:hidden; }
        .ad-whitelist-add { display:flex; gap:10px; padding:16px; border-bottom:1px solid #f1f3f4; align-items:flex-start; flex-wrap:wrap; }
        .ad-whitelist-input { flex:1; min-width:220px; border:1px solid #dadce0; border-radius:8px; padding:9px 12px; font-size:13.5px; font-family:inherit; color:#202124; outline:none; transition:border-color 0.15s; }
        .ad-whitelist-input:focus { border-color:#006400; }
        .ad-whitelist-add-btn { display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg,#006400,#1a8a1a); color:#fff; border:none; border-radius:8px; padding:9px 18px; font-size:13.5px; font-weight:600; font-family:inherit; cursor:pointer; white-space:nowrap; transition:opacity 0.15s; }
        .ad-whitelist-add-btn:hover { opacity:.9; }
        .ad-whitelist-add-btn:disabled { opacity:.6; cursor:not-allowed; }
        .ad-whitelist-err { font-size:12.5px; color:#b91c1c; padding:0 16px 12px; }

        .ad-skel-row td { padding:16px; }
        .ad-skel { border-radius:4px; height:14px; background:linear-gradient(90deg,#efefef 25%,#e6e6e6 50%,#efefef 75%); background-size:900px 100%; animation:adShimmer 1.4s infinite linear; }
        @keyframes adShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .ad-empty { padding:56px; text-align:center; color:#9aa0a6; font-size:14px; }
        .ad-error-box { background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:14px 18px; color:#b91c1c; font-size:13px; margin-bottom:20px; }

        .ad-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); backdrop-filter:blur(2px); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; animation:adFadeIn 0.18s ease; }
        @keyframes adFadeIn { from{opacity:0} to{opacity:1} }
        .ad-modal { background:#fff; border-radius:16px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.18); animation:adSlideUp 0.22s ease; }
        @keyframes adSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .ad-modal-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 0; position:sticky; top:0; background:#fff; z-index:1; }
        .ad-modal-title { font-family:'DM Serif Display',serif; font-size:20px; color:#202124; }
        .ad-modal-close { background:none; border:none; cursor:pointer; color:#9aa0a6; padding:4px; border-radius:6px; line-height:1; transition:color 0.15s,background 0.15s; }
        .ad-modal-close:hover { color:#202124; background:#f1f3f4; }
        .ad-modal-body { padding:20px 24px 24px; display:flex; flex-direction:column; gap:16px; }
        .ad-field { display:flex; flex-direction:column; gap:5px; }
        .ad-label { font-size:12px; font-weight:600; color:#374151; letter-spacing:0.03em; }
        .ad-required { color:#b91c1c; margin-left:2px; }
        .ad-label-hint { color:#9aa0a6; font-weight:400; }
        .ad-input,.ad-textarea { border:1px solid #dadce0; border-radius:8px; padding:9px 12px; font-size:13.5px; font-family:inherit; color:#202124; outline:none; background:#fff; width:100%; transition:border-color 0.15s,box-shadow 0.15s; }
        .ad-input:focus,.ad-textarea:focus { border-color:#006400; box-shadow:0 0 0 3px rgba(0,100,0,0.08); }
        .ad-textarea { resize:vertical; min-height:90px; line-height:1.55; }
        .ad-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .ad-existing-file { display:inline-flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; color:#2e7d32; background:#e8f5e9; border-radius:8px; padding:8px 12px; }
        .ad-replace-btn { background:none; border:1px solid #dadce0; border-radius:6px; padding:3px 10px; font-size:12px; color:#5f6368; cursor:pointer; font-family:inherit; transition:border-color 0.15s,color 0.15s; }
        .ad-replace-btn:hover { border-color:#006400; color:#006400; }
        .ad-drop-zone { border:2px dashed #dadce0; border-radius:10px; padding:20px 16px; text-align:center; cursor:pointer; background:#fafafa; transition:border-color 0.15s,background 0.15s; }
        .ad-drop-zone:hover,.ad-drop-zone.drag-over { border-color:#006400; background:#f0faf0; }
        .ad-drop-zone-text { font-size:13px; color:#5f6368; line-height:1.5; }
        .ad-drop-zone-text strong { color:#006400; }
        .ad-drop-zone-file { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; color:#2e7d32; background:#e8f5e9; border-radius:6px; padding:4px 10px; margin-top:6px; }
        .ad-progress-wrap { background:#e8eaed; border-radius:8px; overflow:hidden; position:relative; height:28px; }
        .ad-progress-bar { position:absolute; left:0; top:0; bottom:0; background:linear-gradient(90deg,#006400,#1a8a1a); border-radius:8px; transition:width 0.4s ease; }
        .ad-progress-label { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.3); }
        .ad-form-error { font-size:12.5px; color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:10px 14px; }
        .ad-form-success { font-size:13px; font-weight:600; color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px; display:flex; align-items:center; gap:8px; }
        .ad-modal-footer { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding-top:4px; }
        .ad-cancel-btn { background:#f1f3f4; border:none; border-radius:8px; padding:9px 20px; font-size:13.5px; font-weight:500; font-family:inherit; color:#374151; cursor:pointer; transition:background 0.15s; }
        .ad-cancel-btn:hover { background:#e8eaed; }
        .ad-cancel-btn:disabled { opacity:.5; cursor:not-allowed; }
        .ad-submit-btn { display:inline-flex; align-items:center; gap:7px; background:linear-gradient(135deg,#006400,#1a8a1a); color:#fff; border:none; border-radius:8px; padding:9px 22px; font-size:13.5px; font-weight:600; font-family:inherit; cursor:pointer; transition:opacity 0.15s; box-shadow:0 2px 6px rgba(0,100,0,0.25); }
        .ad-submit-btn:hover { opacity:.9; }
        .ad-submit-btn:disabled { opacity:.6; cursor:not-allowed; }
        @keyframes adSpin { to { transform:rotate(360deg); } }

        @media (max-width:768px) {
          .ad-body { padding:20px 16px; }
          .ad-header { padding:0 16px; }
          .ad-user-info { display:none; }
          .ad-row { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="ad-page">
        <header className="ad-header">
          <div className="ad-header-left">
            <div className="ad-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <span className="ad-header-title">CITE-TMS</span>
            <span className="ad-header-badge">Admin</span>
          </div>
          <div className="ad-header-right">
            <div className="ad-user-chip">
              {avatar
                ? <img className="ad-avatar" src={avatar} alt={displayName} referrerPolicy="no-referrer" />
                : <div className="ad-avatar-fallback">{displayName[0]?.toUpperCase()}</div>}
              <div className="ad-user-info">
                <span className="ad-user-name">{displayName}</span>
                <span className="ad-user-role">Admin</span>
              </div>
            </div>
            <button className="ad-logout-btn" onClick={async () => { await logout(); navigate("/"); }}>Sign out</button>
          </div>
        </header>

        <div className="ad-body">
          {error && <div className="ad-error-box">{error}</div>}

          {/* ── Tabs ── */}
          <div className="ad-tabs">
            <button className={`ad-tab-btn${activeTab === "papers" ? " active" : ""}`} onClick={() => setActiveTab("papers")}>
              Papers <span className="ad-tab-badge">{papers.length}</span>
            </button>
            <button className={`ad-tab-btn${activeTab === "requests" ? " active" : ""}`} onClick={() => setActiveTab("requests")}>
              Access Requests
              {pendingRequestCount > 0 && <span className="ad-tab-badge">{pendingRequestCount}</span>}
            </button>
            <button className={`ad-tab-btn${activeTab === "upgrades" ? " active" : ""}`} onClick={() => setActiveTab("upgrades")}>
              Author Upgrades
              {pendingUpgradeCount > 0 && <span className="ad-tab-badge">{pendingUpgradeCount}</span>}
            </button>
            <button className={`ad-tab-btn${activeTab === "whitelist" ? " active" : ""}`} onClick={() => setActiveTab("whitelist")}>
              Whitelist <span className="ad-tab-badge">{whitelist.length}</span>
            </button>
          </div>

          {/* ── Papers Tab ── */}
          {activeTab === "papers" && (
            <>
              <div className="ad-controls">
                <div className="ad-section-title">All Papers</div>
                <div className="ad-controls-right">
                  <div className="ad-search-wrap">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input className="ad-search-input" type="text" placeholder="Search title, author, program…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <button className="ad-add-btn" onClick={() => setShowAdd(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add Paper
                  </button>
                </div>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr><th>#</th><th>Title</th><th>Authors</th><th>Year</th><th>Program</th><th>Access</th><th>Status</th><th>PDF</th><th /></tr>
                  </thead>
                  <tbody>
                    {loading && [1,2,3,4,5].map((i) => (
                      <tr className="ad-skel-row" key={i}>
                        {[20,"80%","60%",36,"70%",80,80,48].map((w, j) => (
                          <td key={j}><div className="ad-skel" style={{ width: w }} /></td>
                        ))}
                        <td />
                      </tr>
                    ))}
                    {!loading && filtered.length === 0 && (
                      <tr><td colSpan={9}><div className="ad-empty">{papers.length === 0 ? "No papers found." : "No papers match your search."}</div></td></tr>
                    )}
                    {!loading && filtered.map((paper, i) => {
                      const at  = ACCESS_LABELS[paper.access_type] || ACCESS_LABELS.open;
                      const st  = STATUS_LABELS[paper.status] || STATUS_LABELS.pending;
                      return (
                        <tr key={paper.id}>
                          <td style={{ color: "#9aa0a6", fontSize: 12 }}>{i + 1}</td>
                          <td className="ad-title-cell">{paper.title || "Untitled"}</td>
                          <td className="ad-authors-cell">{paper.authors?.length > 0 ? paper.authors.join(", ") : <span style={{ color: "#c4c9d0" }}>—</span>}</td>
                          <td>{paper.year ? <span className="ad-pill ad-pill-year">{paper.year}</span> : <span style={{ color: "#c4c9d0" }}>—</span>}</td>
                          <td>{paper.course_or_program ? <span className="ad-pill ad-pill-prog">{paper.course_or_program}</span> : <span style={{ color: "#c4c9d0" }}>—</span>}</td>
                          <td><span style={{ background: at.bg, color: at.color, fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 10 }}>{at.label}</span></td>
                          <td><span style={{ background: st.bg, color: st.color, fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 10 }}>{st.label}</span></td>
                          {/* ── FIXED: was paper.public_url, now uses getStorageUrl(paper.file_path) ── */}
                          <td>
                            {paper.file_path
                              ? <a className="ad-pdf-link" href={getStorageUrl(paper.file_path)} target="_blank" rel="noopener noreferrer"><FileIcon size={11} /> View</a>
                              : <span className="ad-pill ad-pill-nourl">No file</span>}
                          </td>
                          <td>
                            <div className="ad-row-actions">
                              <button className="ad-icon-btn" title="Edit" onClick={() => setEditTarget(paper)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button className="ad-icon-btn del" title="Delete" disabled={deletingId === paper.id} onClick={() => handleDelete(paper)}>
                                {deletingId === paper.id
                                  ? <Spinner size={12} color="rgba(0,0,0,0.15)" top="#b91c1c" />
                                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                                    </svg>}
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

          {/* ── Access Requests Tab ── */}
          {activeTab === "requests" && (
            <>
              <div className="ad-controls">
                <div className="ad-section-title">Access Requests</div>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr><th>Requester</th><th>Paper</th><th>Message</th><th>Status</th><th>Date</th><th /></tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 && (
                      <tr><td colSpan={6}><div className="ad-empty">No access requests yet.</div></td></tr>
                    )}
                    {requests.map((req) => {
                      const STATUS = {
                        pending:  { bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b" },
                        approved: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", dot: "#16a34a" },
                        rejected: { bg: "#fef2f2", color: "#9b0000", border: "#fecaca", dot: "#dc2626" },
                      };
                      const s = STATUS[req.status] || STATUS.pending;
                      return (
                        <tr key={req.id}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{req.requester_name || "—"}</div>
                            <div style={{ fontSize: 11.5, color: "#9aa0a6" }}>{req.requester_email || "—"}</div>
                          </td>
                          <td className="ad-title-cell" style={{ maxWidth: 200 }}>{req.paper_title || "—"}</td>
                          <td style={{ maxWidth: 200, fontSize: 12.5, color: "#5f6368" }}>{req.message ? req.message.slice(0, 80) + (req.message.length > 80 ? "…" : "") : "—"}</td>
                          <td>
                            <span className="ad-status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </td>
                          <td style={{ fontSize: 12.5, color: "#9aa0a6", whiteSpace: "nowrap" }}>
                            {new Date(req.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td>
                            {req.status === "pending" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="ad-approve-btn" onClick={() => handleRequestAction(req.id, "approved")}>Approve</button>
                                <button className="ad-reject-btn" onClick={() => handleRequestAction(req.id, "rejected")}>Reject</button>
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

          {/* ── Author Upgrades Tab ── */}
          {activeTab === "upgrades" && (
            <>
              <div className="ad-controls">
                <div className="ad-section-title">Author Upgrade Requests</div>
              </div>

              {upgradeRequests.length === 0 && (
                <div className="ad-table-wrap">
                  <div className="ad-empty">No upgrade requests yet.</div>
                </div>
              )}

              {upgradeRequests.map((req) => {
                const UPGRADE_STATUS = {
                  pending:  { bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b" },
                  approved: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", dot: "#16a34a" },
                  rejected: { bg: "#fef2f2", color: "#9b0000", border: "#fecaca", dot: "#dc2626" },
                };
                const s    = UPGRADE_STATUS[req.status] || UPGRADE_STATUS.pending;
                const busy = decidingId === req.id;

                return (
                  <div key={req.id} className="ad-upgrade-card">
                    <div className="ad-upgrade-info">
                      <div className="ad-upgrade-name">{req.user?.full_name || "Unknown user"}</div>
                      <div className="ad-upgrade-email">{req.user?.email || "—"}</div>
                      <div className="ad-upgrade-paper">
                        📄 {req.paper?.title || "Untitled paper"}
                      </div>
                      {req.paper?.abstract && (
                        <div style={{ fontSize: 12, color: "#9aa0a6", marginTop: 6, lineHeight: 1.5 }}>
                          {req.paper.abstract.slice(0, 160)}{req.paper.abstract.length > 160 ? "…" : ""}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                      <span className="ad-status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>

                      {req.paper?.file_path && (
                        <a
                          href={getStorageUrl(req.paper.file_path)}
                          target="_blank" rel="noopener noreferrer"
                          className="ad-pdf-link"
                        >
                          <FileIcon size={11} /> View PDF
                        </a>
                      )}

                      {req.status === "pending" && (
                        <div className="ad-upgrade-actions">
                          <button
                            className="ad-approve-btn"
                            disabled={busy}
                            onClick={() => handleUpgradeDecision(req.id, "approve")}
                          >
                            {busy ? <Spinner size={12} color="rgba(0,100,0,0.3)" top="#166534" /> : "✓ Approve"}
                          </button>
                          <button
                            className="ad-reject-btn"
                            disabled={busy}
                            onClick={() => handleUpgradeDecision(req.id, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      <div style={{ fontSize: 11.5, color: "#9aa0a6" }}>
                        {new Date(req.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── Whitelist Tab ── */}
          {activeTab === "whitelist" && (
            <>
              <div className="ad-controls">
                <div className="ad-section-title">Author Whitelist</div>
              </div>
              <div className="ad-whitelist-wrap">
                <div className="ad-whitelist-add">
                  <input
                    className="ad-whitelist-input"
                    type="email"
                    placeholder="Enter email address to grant author access…"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                  />
                  <button className="ad-whitelist-add-btn" onClick={handleAddEmail} disabled={addingEmail}>
                    {addingEmail ? <><Spinner size={13} /> Adding…</> : <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add Email
                    </>}
                  </button>
                </div>
                {emailErr && <div className="ad-whitelist-err">{emailErr}</div>}
                <table className="ad-table">
                  <thead>
                    <tr><th>Email</th><th>Added</th><th /></tr>
                  </thead>
                  <tbody>
                    {whitelist.length === 0 && (
                      <tr><td colSpan={3}><div className="ad-empty">No emails in the whitelist yet.</div></td></tr>
                    )}
                    {whitelist.map((entry) => (
                      <tr key={entry.id}>
                        <td style={{ fontWeight: 500 }}>{entry.email}</td>
                        <td style={{ fontSize: 12.5, color: "#9aa0a6" }}>
                          {entry.created_at ? new Date(entry.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                        </td>
                        <td>
                          <button className="ad-icon-btn del" onClick={() => handleRemoveEmail(entry.id)} title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showAdd && <PaperModal title="Add New Paper" onClose={() => setShowAdd(false)} onSuccess={fetchPapers} />}
      {editTarget && <PaperModal title="Edit Paper" isEdit editTarget={editTarget} onClose={() => setEditTarget(null)} onSuccess={fetchPapers} />}
    </>
  );
}