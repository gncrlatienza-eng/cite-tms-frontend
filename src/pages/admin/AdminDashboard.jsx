import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";

const PAPERS_BUCKET = "cite-tms-backend-bucket";

if (!window.__citeTmsCacheBust) window.__citeTmsCacheBust = () => {};

const EMPTY_FORM = {
  title: "",
  authors: "",
  year: "",
  course_or_program: "",
  abstract: "",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ── Add modal ──
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addPdf, setAddPdf] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const addFileRef = useRef(null);

  // ── Edit modal ──
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editPdf, setEditPdf] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);
  const [replaceFile, setReplaceFile] = useState(false);
  const editFileRef = useRef(null);

  // ── Delete ──
  const [deletingId, setDeletingId] = useState(null);

  // ── Upload progress ──
  const [uploadProgress, setUploadProgress] = useState(0);

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
        const { data: urlData } = supabase.storage.from(PAPERS_BUCKET).getPublicUrl(paper.file_path);
        return { ...paper, publicUrl: urlData?.publicUrl ?? null };
      }) ?? [];
      setPapers(withUrls);
    } catch (e) {
      setError(e.message || "Failed to load papers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPapers(); }, []);

  const handleLogout = async () => { await logout(); navigate("/admin/login"); };

  const filtered = papers.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.authors?.join(", ").toLowerCase().includes(q) ||
      p.course_or_program?.toLowerCase().includes(q)
    );
  });

  // ─────────────────────────────────────────
  // ADD
  // ─────────────────────────────────────────
  const openAdd = () => {
    setAddForm(EMPTY_FORM); setAddPdf(null);
    setAddError(""); setAddSuccess(false);
    setUploadProgress(0); setShowAdd(true);
  };
  const closeAdd = () => { if (addSubmitting) return; setShowAdd(false); };

  const handleAdd = async () => {
    setAddError("");
    if (!addForm.title.trim()) { setAddError("Title is required."); return; }
    if (!addForm.authors.trim()) { setAddError("At least one author is required."); return; }
    if (!addForm.year || isNaN(Number(addForm.year))) { setAddError("A valid year is required."); return; }
    setAddSubmitting(true);
    setUploadProgress(0);
    try {
      let file_path = null;
      if (addPdf) {
        setUploadProgress(15);
        const safeName = addPdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `papers/${Date.now()}_${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from(PAPERS_BUCKET)
          .upload(filePath, addPdf, { contentType: "application/pdf", upsert: false });
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
        file_path = filePath;
        setUploadProgress(75);
      }
      const authorsArray = addForm.authors.split(",").map((a) => a.trim()).filter(Boolean);
      const { error: insertErr } = await supabase.from("papers").insert([{
        title: addForm.title.trim(),
        authors: authorsArray,
        year: Number(addForm.year),
        course_or_program: addForm.course_or_program.trim() || null,
        abstract: addForm.abstract.trim() || null,
        file_path,
      }]);
      if (insertErr) throw new Error(insertErr.message);
      setUploadProgress(100);
      setAddSuccess(true);
      await fetchPapers();
      setTimeout(() => setShowAdd(false), 1200);
    } catch (e) {
      setAddError(e.message || "Something went wrong.");
    } finally {
      setAddSubmitting(false);
    }
  };

  // ─────────────────────────────────────────
  // EDIT
  // ─────────────────────────────────────────
  const openEdit = (paper) => {
    setEditTarget(paper);
    setEditForm({
      title: paper.title || "",
      authors: Array.isArray(paper.authors) ? paper.authors.join(", ") : (paper.authors || ""),
      year: paper.year?.toString() || "",
      course_or_program: paper.course_or_program || "",
      abstract: paper.abstract || "",
    });
    setEditPdf(null);
    setReplaceFile(false);
    setEditError(""); setEditSuccess(false);
    setUploadProgress(0); setShowEdit(true);
  };
  const closeEdit = () => { if (editSubmitting) return; setShowEdit(false); };

  const handleEdit = async () => {
    setEditError("");
    if (!editForm.title.trim()) { setEditError("Title is required."); return; }
    if (!editForm.authors.trim()) { setEditError("At least one author is required."); return; }
    if (!editForm.year || isNaN(Number(editForm.year))) { setEditError("A valid year is required."); return; }
    setEditSubmitting(true);
    setUploadProgress(0);
    try {
      let file_path = editTarget.file_path;
      if (replaceFile && editPdf) {
        setUploadProgress(15);
        if (editTarget.file_path) {
          await supabase.storage.from(PAPERS_BUCKET).remove([editTarget.file_path]);
        }
        const safeName = editPdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const newPath = `papers/${Date.now()}_${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from(PAPERS_BUCKET)
          .upload(newPath, editPdf, { contentType: "application/pdf", upsert: false });
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
        file_path = newPath;
        setUploadProgress(75);
      }
      const authorsArray = editForm.authors.split(",").map((a) => a.trim()).filter(Boolean);
      const { error: updateErr } = await supabase.from("papers").update({
        title: editForm.title.trim(),
        authors: authorsArray,
        year: Number(editForm.year),
        course_or_program: editForm.course_or_program.trim() || null,
        abstract: editForm.abstract.trim() || null,
        file_path,
      }).eq("id", editTarget.id);
      if (updateErr) throw new Error(updateErr.message);
      setUploadProgress(100);
      setEditSuccess(true);
      await fetchPapers();
      setTimeout(() => setShowEdit(false), 1200);
    } catch (e) {
      setEditError(e.message || "Something went wrong.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────
  const handleDelete = async (paper) => {
    if (!window.confirm(`Delete "${paper.title}"? This cannot be undone.`)) return;
    setDeletingId(paper.id);
    try {
      if (paper.file_path) await supabase.storage.from(PAPERS_BUCKET).remove([paper.file_path]);
      const { error: delErr } = await supabase.from("papers").delete().eq("id", paper.id);
      if (delErr) throw delErr;
      setPapers((prev) => prev.filter((p) => p.id !== paper.id));
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ─────────────────────────────────────────
  // Shared modal form renderer
  // ─────────────────────────────────────────
  const renderModalBody = ({
    form, onChange, pdfFile, setPdfFile, fileRef,
    submitting, formError, formSuccess,
    isEdit = false, replaceFile, setReplaceFile, editTarget,
    onSubmit, onClose,
  }) => (
    <div className="ad-modal-body">
      <div className="ad-field">
        <label className="ad-label">Title <span className="ad-required">*</span></label>
        <input className="ad-input" name="title"
          placeholder="e.g. IoT-Based Smart Monitoring System"
          value={form.title} onChange={onChange} disabled={submitting}
          autoComplete="off" autoCorrect="off" spellCheck="false" />
      </div>

      <div className="ad-field">
        <label className="ad-label">
          Authors <span className="ad-required">*</span>
          <span className="ad-label-hint"> (comma-separated)</span>
        </label>
        <input className="ad-input" name="authors"
          placeholder="e.g. Juan Dela Cruz, Maria Santos"
          value={form.authors} onChange={onChange} disabled={submitting}
          autoComplete="off" autoCorrect="off" spellCheck="false" />
      </div>

      <div className="ad-row">
        <div className="ad-field">
          <label className="ad-label">Year <span className="ad-required">*</span></label>
          <input className="ad-input" name="year" type="number"
            placeholder="e.g. 2024" min="1990" max="2099"
            value={form.year} onChange={onChange} disabled={submitting} autoComplete="off" />
        </div>
        <div className="ad-field">
          <label className="ad-label">Program / Course</label>
          <input className="ad-input" name="course_or_program"
            placeholder="e.g. BSCS, BSIT"
            value={form.course_or_program} onChange={onChange} disabled={submitting} autoComplete="off" />
        </div>
      </div>

      <div className="ad-field">
        <label className="ad-label">Abstract</label>
        <textarea className="ad-textarea" name="abstract"
          placeholder="Paste the paper abstract here…"
          value={form.abstract} onChange={onChange} disabled={submitting} />
      </div>

      {/* PDF section */}
      <div className="ad-field">
        <label className="ad-label">PDF File</label>

        {isEdit && editTarget?.file_path && !replaceFile && (
          <div className="ad-existing-file">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>Current PDF on file</span>
            <button className="ad-replace-btn" onClick={() => setReplaceFile(true)} disabled={submitting}>
              Replace file
            </button>
          </div>
        )}

        {isEdit && !editTarget?.file_path && !replaceFile && (
          <button className="ad-replace-btn" style={{marginBottom:4,alignSelf:"flex-start"}}
            onClick={() => setReplaceFile(true)} disabled={submitting}>
            + Upload a PDF
          </button>
        )}

        {(!isEdit || replaceFile) && (
          <div className="ad-drop-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("drag-over");
              const file = e.dataTransfer.files?.[0];
              if (file?.type === "application/pdf") setPdfFile(file);
            }}>
            <input ref={fileRef} type="file" accept="application/pdf"
              style={{ display:"none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }}
              disabled={submitting} />
            {pdfFile ? (
              <div className="ad-drop-zone-file">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {pdfFile.name}
                {isEdit && (
                  <button className="ad-replace-btn" style={{marginLeft:8}}
                    onClick={(e) => { e.stopPropagation(); setReplaceFile(false); setPdfFile(null); }}
                    disabled={submitting}>Cancel</button>
                )}
              </div>
            ) : (
              <div className="ad-drop-zone-text">
                <strong>Click to upload</strong> or drag & drop a PDF<br />
                <span style={{fontSize:"11.5px",color:"#9aa0a6"}}>
                  Optional — uploads may take a moment on free tier
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {submitting && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="ad-progress-wrap">
          <div className="ad-progress-bar" style={{width:`${uploadProgress}%`}} />
          <span className="ad-progress-label">Uploading… {uploadProgress}%</span>
        </div>
      )}

      {formError && <div className="ad-form-error">⚠ {formError}</div>}
      {formSuccess && (
        <div className="ad-form-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {isEdit ? "Paper updated successfully!" : "Paper added successfully!"}
        </div>
      )}

      <div className="ad-modal-footer">
        <button className="ad-cancel-btn" onClick={onClose} disabled={submitting}>Cancel</button>
        <button className="ad-submit-btn" onClick={onSubmit} disabled={submitting || formSuccess}>
          {submitting
            ? <><div className="ad-spinner" />{isEdit ? "Saving…" : "Adding…"}</>
            : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {isEdit ? "Save Changes" : "Save Paper"}
              </>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .ad-page { min-height:100vh; background:#f8f9fa; font-family:'DM Sans',system-ui,sans-serif; }

        .ad-header {
          background:#fff; border-bottom:1px solid #e8eaed;
          padding:0 32px; height:58px;
          display:flex; align-items:center; justify-content:space-between;
          position:sticky; top:0; z-index:10;
        }
        .ad-header-left { display:flex; align-items:center; gap:12px; }
        .ad-header-icon {
          width:32px; height:32px;
          background:linear-gradient(135deg,#006400,#1a8a1a);
          border-radius:7px; display:flex; align-items:center; justify-content:center;
        }
        .ad-header-title { font-size:15px; font-weight:600; color:#202124; }
        .ad-header-badge {
          font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase;
          background:#e8f5e9; color:#2e7d32; border-radius:20px; padding:2px 8px;
        }
        .ad-header-right { display:flex; align-items:center; gap:16px; }
        .ad-user-email { font-size:13px; color:#70757a; }
        .ad-logout-btn {
          font-size:13px; font-weight:500; color:#b91c1c; background:#fef2f2;
          border:1px solid #fecaca; border-radius:6px; padding:6px 14px;
          cursor:pointer; font-family:inherit; transition:background 0.15s;
        }
        .ad-logout-btn:hover { background:#fee2e2; }

        .ad-body { padding:32px; max-width:1100px; margin:0 auto; }

        .ad-status {
          display:flex; align-items:center; gap:10px;
          background:#fff; border:1px solid #e8eaed;
          border-radius:10px; padding:14px 18px; margin-bottom:24px;
        }
        .ad-status-dot {
          width:8px; height:8px; border-radius:50%; background:#16a34a; flex-shrink:0;
          box-shadow:0 0 0 3px rgba(22,163,74,0.2);
        }
        .ad-status-text { font-size:13px; color:#374151; }
        .ad-status-text strong { color:#111827; }

        .ad-controls {
          display:flex; align-items:center; justify-content:space-between;
          gap:16px; margin-bottom:20px; flex-wrap:wrap;
        }
        .ad-section-title { font-family:'DM Serif Display',serif; font-size:22px; color:#202124; }
        .ad-controls-right { display:flex; align-items:center; gap:10px; }

        .ad-add-btn {
          display:inline-flex; align-items:center; gap:7px;
          background:linear-gradient(135deg,#006400,#1a8a1a); color:#fff;
          border:none; border-radius:8px; padding:9px 18px;
          font-size:13.5px; font-weight:600; font-family:inherit; cursor:pointer;
          transition:opacity 0.15s, box-shadow 0.15s;
          box-shadow:0 2px 6px rgba(0,100,0,0.25); white-space:nowrap;
        }
        .ad-add-btn:hover { opacity:.9; box-shadow:0 4px 12px rgba(0,100,0,0.3); }

        .ad-search-wrap {
          display:flex; align-items:center; gap:8px;
          background:#fff; border:1px solid #dadce0;
          border-radius:8px; padding:8px 14px; min-width:260px;
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        .ad-search-wrap:focus-within { border-color:#006400; box-shadow:0 0 0 3px rgba(0,100,0,0.08); }
        .ad-search-input {
          border:none; outline:none; font-size:13.5px; font-family:inherit;
          color:#202124; background:transparent; flex:1;
        }
        .ad-search-input::placeholder { color:#9aa0a6; }

        .ad-table-wrap { background:#fff; border:1px solid #e8eaed; border-radius:12px; overflow:hidden; }
        .ad-table { width:100%; border-collapse:collapse; font-size:13.5px; }
        .ad-table thead { background:#f8f9fa; border-bottom:1px solid #e8eaed; }
        .ad-table th {
          padding:12px 16px; text-align:left;
          font-size:11px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.07em; color:#80868b;
        }
        .ad-table td {
          padding:14px 16px; border-bottom:1px solid #f1f3f4;
          vertical-align:top; color:#3c4043;
        }
        .ad-table tr:last-child td { border-bottom:none; }
        .ad-table tr:hover td { background:#fafafa; }
        .ad-title-cell { font-weight:600; color:#202124; max-width:260px; line-height:1.4; }
        .ad-authors-cell { color:#5f6368; max-width:160px; line-height:1.4; }
        .ad-pill { display:inline-block; font-size:10.5px; font-weight:600; padding:2px 8px; border-radius:10px; }
        .ad-pill-year { background:#e8f5e9; color:#2e7d32; }
        .ad-pill-prog { background:#e8f0fe; color:#1a73e8; }
        .ad-pill-nourl { background:#f3f4f6; color:#9ca3af; }

        .ad-pdf-link {
          display:inline-flex; align-items:center; gap:5px;
          font-size:12.5px; font-weight:500; color:#1a73e8;
          text-decoration:none; transition:color 0.15s;
        }
        .ad-pdf-link:hover { color:#1557b0; text-decoration:underline; }

        .ad-row-actions { display:flex; align-items:center; gap:4px; }
        .ad-icon-btn {
          background:none; border:none; cursor:pointer;
          color:#c4c9d0; padding:5px; border-radius:5px;
          transition:color 0.15s, background 0.15s; line-height:1;
        }
        .ad-icon-btn:hover { color:#374151; background:#f1f3f4; }
        .ad-icon-btn.del:hover { color:#b91c1c; background:#fef2f2; }
        .ad-icon-btn:disabled { opacity:.4; cursor:not-allowed; }

        .ad-skel-row td { padding:16px; }
        .ad-skel {
          border-radius:4px; height:14px;
          background:linear-gradient(90deg,#efefef 25%,#e6e6e6 50%,#efefef 75%);
          background-size:900px 100%; animation:adShimmer 1.4s infinite linear;
        }
        @keyframes adShimmer { 0%{background-position:-900px 0} 100%{background-position:900px 0} }
        .ad-empty { padding:56px; text-align:center; color:#9aa0a6; font-size:14px; }
        .ad-error-box {
          background:#fef2f2; border:1px solid #fecaca;
          border-radius:10px; padding:14px 18px; color:#b91c1c;
          font-size:13px; margin-bottom:20px;
        }

        /* ── Modal ── */
        .ad-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.45);
          backdrop-filter:blur(2px); z-index:100;
          display:flex; align-items:center; justify-content:center;
          padding:20px; animation:adFadeIn 0.18s ease;
        }
        @keyframes adFadeIn { from{opacity:0} to{opacity:1} }
        .ad-modal {
          background:#fff; border-radius:16px;
          width:100%; max-width:560px; max-height:90vh; overflow-y:auto;
          box-shadow:0 20px 60px rgba(0,0,0,0.18);
          animation:adSlideUp 0.22s ease;
        }
        @keyframes adSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

        .ad-modal-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:20px 24px 0; position:sticky; top:0; background:#fff; z-index:1;
        }
        .ad-modal-title { font-family:'DM Serif Display',serif; font-size:20px; color:#202124; }
        .ad-modal-close {
          background:none; border:none; cursor:pointer; color:#9aa0a6;
          padding:4px; border-radius:6px; line-height:1;
          transition:color 0.15s, background 0.15s;
        }
        .ad-modal-close:hover { color:#202124; background:#f1f3f4; }

        .ad-modal-body { padding:20px 24px 24px; display:flex; flex-direction:column; gap:16px; }

        .ad-field { display:flex; flex-direction:column; gap:5px; }
        .ad-label { font-size:12px; font-weight:600; color:#374151; letter-spacing:0.03em; }
        .ad-required { color:#b91c1c; margin-left:2px; }
        .ad-label-hint { color:#9aa0a6; font-weight:400; }

        .ad-input, .ad-textarea {
          border:1px solid #dadce0; border-radius:8px; padding:9px 12px;
          font-size:13.5px; font-family:inherit; color:#202124; outline:none;
          background:#fff; width:100%; transition:border-color 0.15s, box-shadow 0.15s;
        }
        .ad-input:focus, .ad-textarea:focus { border-color:#006400; box-shadow:0 0 0 3px rgba(0,100,0,0.08); }
        .ad-textarea { resize:vertical; min-height:90px; line-height:1.55; }
        .ad-input::placeholder, .ad-textarea::placeholder { color:#b0b7c3; }
        .ad-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

        .ad-existing-file {
          display:inline-flex; align-items:center; gap:8px;
          font-size:12.5px; font-weight:600; color:#2e7d32;
          background:#e8f5e9; border-radius:8px; padding:8px 12px;
        }
        .ad-replace-btn {
          background:none; border:1px solid #dadce0; border-radius:6px;
          padding:3px 10px; font-size:12px; color:#5f6368;
          cursor:pointer; font-family:inherit;
          transition:border-color 0.15s, color 0.15s;
        }
        .ad-replace-btn:hover { border-color:#006400; color:#006400; }
        .ad-replace-btn:disabled { opacity:.5; cursor:not-allowed; }

        .ad-drop-zone {
          border:2px dashed #dadce0; border-radius:10px;
          padding:20px 16px; text-align:center; cursor:pointer;
          background:#fafafa; transition:border-color 0.15s, background 0.15s;
        }
        .ad-drop-zone:hover, .ad-drop-zone.drag-over { border-color:#006400; background:#f0faf0; }
        .ad-drop-zone-text { font-size:13px; color:#5f6368; line-height:1.5; }
        .ad-drop-zone-text strong { color:#006400; }
        .ad-drop-zone-file {
          display:inline-flex; align-items:center; gap:6px;
          font-size:12.5px; font-weight:600; color:#2e7d32;
          background:#e8f5e9; border-radius:6px; padding:4px 10px; margin-top:6px;
        }

        .ad-progress-wrap {
          background:#e8eaed; border-radius:8px; overflow:hidden;
          position:relative; height:28px;
        }
        .ad-progress-bar {
          position:absolute; left:0; top:0; bottom:0;
          background:linear-gradient(90deg,#006400,#1a8a1a);
          border-radius:8px; transition:width 0.4s ease;
        }
        .ad-progress-label {
          position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:600; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.3);
        }

        .ad-form-error {
          font-size:12.5px; color:#b91c1c;
          background:#fef2f2; border:1px solid #fecaca;
          border-radius:8px; padding:10px 14px;
        }
        .ad-form-success {
          font-size:13px; font-weight:600; color:#15803d;
          background:#f0fdf4; border:1px solid #bbf7d0;
          border-radius:8px; padding:10px 14px;
          display:flex; align-items:center; gap:8px;
        }

        .ad-modal-footer {
          display:flex; align-items:center; justify-content:flex-end;
          gap:10px; padding-top:4px;
        }
        .ad-cancel-btn {
          background:#f1f3f4; border:none; border-radius:8px;
          padding:9px 20px; font-size:13.5px; font-weight:500;
          font-family:inherit; color:#374151; cursor:pointer; transition:background 0.15s;
        }
        .ad-cancel-btn:hover { background:#e8eaed; }
        .ad-cancel-btn:disabled { opacity:.5; cursor:not-allowed; }
        .ad-submit-btn {
          display:inline-flex; align-items:center; gap:7px;
          background:linear-gradient(135deg,#006400,#1a8a1a); color:#fff;
          border:none; border-radius:8px; padding:9px 22px;
          font-size:13.5px; font-weight:600; font-family:inherit; cursor:pointer;
          transition:opacity 0.15s; box-shadow:0 2px 6px rgba(0,100,0,0.25);
        }
        .ad-submit-btn:hover { opacity:.9; }
        .ad-submit-btn:disabled { opacity:.6; cursor:not-allowed; }

        .ad-spinner {
          width:14px; height:14px;
          border:2px solid rgba(255,255,255,0.4); border-top-color:#fff;
          border-radius:50%; animation:adSpin 0.7s linear infinite; flex-shrink:0;
        }
        @keyframes adSpin { to{transform:rotate(360deg)} }

        @media (max-width:768px) {
          .ad-body { padding:20px 16px; }
          .ad-header { padding:0 16px; }
          .ad-user-email { display:none; }
          .ad-table th:nth-child(3), .ad-table td:nth-child(3),
          .ad-table th:nth-child(5), .ad-table td:nth-child(5) { display:none; }
          .ad-row { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="ad-page">
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
            <button className="ad-logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </header>

        <div className="ad-body">
          <div className="ad-status">
            <div className="ad-status-dot" />
            <div className="ad-status-text">
              Backend test — fetching from <strong>papers</strong> table ·{" "}
              {loading ? "Loading…" : error ? "Error connecting" :
                <><strong>{papers.length}</strong> papers found in Supabase</>}
            </div>
          </div>

          {error && <div className="ad-error-box">{error}</div>}

          <div className="ad-controls">
            <div className="ad-section-title">All Papers</div>
            <div className="ad-controls-right">
              <div className="ad-search-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input className="ad-search-input" type="text"
                  placeholder="Search title, author, program…"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button className="ad-add-btn" onClick={openAdd}>
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
                <tr>
                  <th>#</th><th>Title</th><th>Authors</th>
                  <th>Year</th><th>Program</th><th>PDF</th><th></th>
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
                    <td />
                  </tr>
                ))}

                {!loading && !error && filtered.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className="ad-empty">
                      {papers.length === 0 ? "No papers found in the database." : "No papers match your search."}
                    </div>
                  </td></tr>
                )}

                {!loading && !error && filtered.map((paper, i) => (
                  <tr key={paper.id}>
                    <td style={{color:"#9aa0a6",fontSize:12}}>{i + 1}</td>
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
                        ? <a className="ad-pdf-link" href={paper.publicUrl} target="_blank" rel="noopener noreferrer">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>View
                          </a>
                        : <span className="ad-pill ad-pill-nourl">No file</span>}
                    </td>
                    <td>
                      <div className="ad-row-actions">
                        <button className="ad-icon-btn" title="Edit paper" onClick={() => openEdit(paper)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="ad-icon-btn del" title="Delete paper"
                          disabled={deletingId === paper.id}
                          onClick={() => handleDelete(paper)}>
                          {deletingId === paper.id
                            ? <div className="ad-spinner" style={{borderColor:"rgba(0,0,0,0.15)",borderTopColor:"#b91c1c",width:12,height:12}} />
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                              </svg>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── ADD MODAL ── */}
      {showAdd && (
        <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAdd(); }}>
          <div className="ad-modal">
            <div className="ad-modal-header">
              <div className="ad-modal-title">Add New Paper</div>
              <button className="ad-modal-close" onClick={closeAdd} disabled={addSubmitting}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {renderModalBody({
              form: addForm,
              onChange: (e) => setAddForm((f) => ({ ...f, [e.target.name]: e.target.value })),
              pdfFile: addPdf, setPdfFile: setAddPdf, fileRef: addFileRef,
              submitting: addSubmitting, formError: addError, formSuccess: addSuccess,
              isEdit: false,
              onSubmit: handleAdd, onClose: closeAdd,
            })}
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEdit && (
        <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div className="ad-modal">
            <div className="ad-modal-header">
              <div className="ad-modal-title">Edit Paper</div>
              <button className="ad-modal-close" onClick={closeEdit} disabled={editSubmitting}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {renderModalBody({
              form: editForm,
              onChange: (e) => setEditForm((f) => ({ ...f, [e.target.name]: e.target.value })),
              pdfFile: editPdf, setPdfFile: setEditPdf, fileRef: editFileRef,
              submitting: editSubmitting, formError: editError, formSuccess: editSuccess,
              isEdit: true, replaceFile, setReplaceFile, editTarget,
              onSubmit: handleEdit, onClose: closeEdit,
            })}
          </div>
        </div>
      )}
    </>
  );
}