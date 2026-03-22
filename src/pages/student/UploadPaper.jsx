import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";
import api from "../../services/api";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "../public/LoginPage";

const BUCKET = "cite-tms-backend-bucket";
const safeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const ACCESS_OPTIONS = [
  { value: "open",          label: "Open Access",   desc: "Anyone can view and download your paper",     icon: "🌐" },
  { value: "students_only", label: "Students Only", desc: "Only logged-in DLSL students can view",       icon: "🎓" },
  { value: "restricted",    label: "Restricted",    desc: "Students must request your approval to view", icon: "🔒" },
];

export default function UploadPaper() {
  const { user, isAuthor } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    authors: "",
    year: new Date().getFullYear().toString(),
    course_or_program: "",
    abstract: "",
    access_type: "open",
  });
  const [pdf, setPdf]             = useState(null);
  const [busy, setBusy]           = useState(false);
  const [progress, setProgress]   = useState(0);
  const [err, setErr]             = useState("");
  const [success, setSuccess]     = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // ── Gate: not logged in ────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <div style={{ filter: showLogin ? "blur(3px)" : "none", transition: "filter 0.3s", pointerEvents: showLogin ? "none" : "auto" }}>
          <Navbar onLoginClick={() => setShowLogin(true)} />
          <div style={{ minHeight: "calc(100vh - 57px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ maxWidth: 420, textAlign: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#111827", marginBottom: 10 }}>Sign in to upload</h2>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
                You need to sign in with your DLSL account to upload a paper.
              </p>
              <button
                onClick={() => setShowLogin(true)}
                style={{ background: "linear-gradient(135deg, #9b0000, #c0392b)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 26px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
              >
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
        {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
      </>
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.title.trim())                     return setErr("Title is required.");
    if (!form.authors.trim())                   return setErr("At least one author is required.");
    if (!form.year || isNaN(Number(form.year))) return setErr("A valid year is required.");

    // ── Guard: ensure Supabase session is alive before submitting ────────────
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setErr("Your session expired. Please sign in again.");
      setShowLogin(true);
      return;
    }

    setBusy(true); setProgress(10);

    try {
      let file_path = null;

      if (pdf) {
        setProgress(25);
        const path = `papers/${Date.now()}_${safeFileName(pdf.name)}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, pdf, { contentType: "application/pdf", upsert: false });
        if (error) throw new Error(`PDF upload failed: ${error.message}`);
        file_path = path;
        setProgress(65);
      }

      const payload = {
        title:             form.title.trim(),
        authors:           form.authors.split(",").map((a) => a.trim()).filter(Boolean),
        year:              Number(form.year),
        course_or_program: form.course_or_program.trim() || null,
        abstract:          form.abstract.trim() || null,
        access_type:       form.access_type,
        file_path,
      };

      // Authors → /api/author/papers (existing author uploading new paper)
      // Students → /api/student/papers (applying to become author)
      // Both require admin approval before publishing
      const endpoint = isAuthor ? "/api/author/papers" : "/api/student/papers";
      await api.post(endpoint, payload);

      setProgress(100);
      setSuccess(true);

    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .up-page { min-height: 100vh; background: #fafafa; font-family: 'DM Sans', system-ui, sans-serif; }
        .up-body { max-width: 660px; margin: 0 auto; padding: 40px 40px 80px; }
        .up-intro { margin-bottom: 32px; }
        .up-intro-title { font-family: 'DM Serif Display', serif; font-size: 26px; color: #111827; margin-bottom: 8px; }
        .up-intro-sub { font-size: 14px; color: #6b7280; line-height: 1.65; }

        .up-notice { border-radius: 12px; padding: 14px 18px; margin-bottom: 28px; display: flex; align-items: flex-start; gap: 12px; }
        .up-notice.amber { background: #fffbeb; border: 1px solid #fde68a; }
        .up-notice.blue  { background: #eff6ff; border: 1px solid #bfdbfe; }
        .up-notice-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .up-notice-text { font-size: 13px; line-height: 1.6; }
        .up-notice.amber .up-notice-text { color: #78350f; }
        .up-notice.blue  .up-notice-text { color: #1e40af; }
        .up-notice-text strong { font-weight: 600; }

        .up-form { display: flex; flex-direction: column; gap: 20px; }
        .up-field { display: flex; flex-direction: column; gap: 6px; }
        .up-label { font-size: 13px; font-weight: 600; color: #374151; }
        .up-label-hint { font-size: 11.5px; color: #9ca3af; font-weight: 400; margin-left: 4px; }
        .up-input { border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 11px 14px; font-size: 14px; font-family: inherit; color: #111827; outline: none; background: #fff; width: 100%; transition: border-color 0.18s, box-shadow 0.18s; }
        .up-input:focus { border-color: #9b0000; box-shadow: 0 0 0 3px rgba(155,0,0,0.08); }
        .up-textarea { border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 11px 14px; font-size: 14px; font-family: inherit; color: #111827; outline: none; background: #fff; width: 100%; min-height: 120px; resize: vertical; line-height: 1.6; transition: border-color 0.18s; }
        .up-textarea:focus { border-color: #9b0000; box-shadow: 0 0 0 3px rgba(155,0,0,0.08); }
        .up-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .up-access-grid { display: flex; flex-direction: column; gap: 8px; }
        .up-access-card { display: flex; align-items: center; gap: 14px; padding: 13px 16px; border: 1.5px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: border-color 0.15s, background 0.15s; background: #fff; }
        .up-access-card:hover { border-color: #9b0000; background: #fffafa; }
        .up-access-card.selected { border-color: #9b0000; background: #fef2f2; }
        .up-access-icon { font-size: 20px; flex-shrink: 0; }
        .up-access-label { font-size: 13.5px; font-weight: 600; color: #111827; margin-bottom: 2px; }
        .up-access-desc { font-size: 12px; color: #6b7280; }
        .up-access-radio { margin-left: auto; flex-shrink: 0; }

        .up-pdf-drop { border: 2px dashed #e5e7eb; border-radius: 10px; padding: 24px; text-align: center; cursor: pointer; background: #fafafa; transition: border-color 0.15s, background 0.15s; }
        .up-pdf-drop:hover, .up-pdf-drop.drag-over { border-color: #9b0000; background: #fef9f9; }
        .up-pdf-selected { display: flex; align-items: center; gap: 10px; background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px; padding: 12px 16px; }
        .up-pdf-name { font-size: 13px; font-weight: 600; color: #9b0000; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .up-pdf-clear { background: none; border: none; cursor: pointer; color: #fca5a5; font-size: 18px; line-height: 1; padding: 0; transition: color 0.15s; }
        .up-pdf-clear:hover { color: #dc2626; }

        .up-progress-wrap { background: #f3f4f6; border-radius: 8px; overflow: hidden; height: 6px; margin-top: 4px; }
        .up-progress-bar { height: 100%; background: linear-gradient(90deg, #9b0000, #c0392b); border-radius: 8px; transition: width 0.4s ease; }

        .up-submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 10px; border: none; background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 4px 14px rgba(155,0,0,0.28); transition: opacity 0.15s, transform 0.1s; }
        .up-submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .up-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .up-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px; color: #b91c1c; font-size: 13px; }

        .up-success { background: #fff; border: 1px solid #f0f0f0; border-radius: 16px; padding: 40px 32px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .up-success-icon { font-size: 48px; margin-bottom: 16px; }
        .up-success-title { font-family: 'DM Serif Display', serif; font-size: 24px; color: #111827; margin-bottom: 10px; }
        .up-success-sub { font-size: 14px; color: #6b7280; line-height: 1.7; margin-bottom: 28px; max-width: 380px; margin-left: auto; margin-right: auto; }
        .up-success-steps { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; text-align: left; margin-bottom: 24px; }
        .up-success-steps-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #92400e; margin-bottom: 10px; }
        .up-success-step { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #78350f; margin-bottom: 8px; line-height: 1.5; }
        .up-success-step:last-child { margin-bottom: 0; }
        .up-success-step-num { width: 18px; height: 18px; border-radius: 50%; background: #f59e0b; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .up-success-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; margin-bottom: 10px; }
        .up-success-btn-ghost { width: 100%; padding: 11px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; color: #374151; font-size: 14px; font-weight: 500; font-family: inherit; cursor: pointer; }

        @keyframes upSpin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .up-body { padding: 24px 20px 60px; }
          .up-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="up-page">
        <Navbar onLoginClick={() => {}} />

        <div style={{ background: "#fff", borderBottom: "1px solid #efefef", padding: "16px 40px", display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to={isAuthor ? "/author/dashboard" : "/papers"}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#9b0000", textDecoration: "none" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            {isAuthor ? "Dashboard" : "Back"}
          </Link>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#111827" }}>Upload Paper</span>
        </div>

        <div className="up-body">
          {success ? (
            <div className="up-success">
              <div className="up-success-icon">📬</div>
              <div className="up-success-title">
                {isAuthor ? "Paper submitted for review!" : "Application submitted!"}
              </div>
              <p className="up-success-sub">
                {isAuthor
                  ? "Your paper is pending admin approval. It will go live once approved."
                  : "Your paper has been received. Once an admin approves it, you'll be granted Author access."}
              </p>

              <div className="up-success-steps">
                <div className="up-success-steps-title">What happens next</div>
                {isAuthor ? (
                  <>
                    <div className="up-success-step"><div className="up-success-step-num">1</div>Admin reviews your submitted paper.</div>
                    <div className="up-success-step"><div className="up-success-step-num">2</div>Once approved, your paper is published and visible to users.</div>
                    <div className="up-success-step"><div className="up-success-step-num">3</div>Manage it anytime from your Author Dashboard.</div>
                  </>
                ) : (
                  <>
                    <div className="up-success-step"><div className="up-success-step-num">1</div>Admin reviews your submitted paper.</div>
                    <div className="up-success-step"><div className="up-success-step-num">2</div>Once approved, your account is upgraded to <strong>Author</strong>.</div>
                    <div className="up-success-step"><div className="up-success-step-num">3</div>Sign out and log back in as <strong>Author</strong> to access your dashboard.</div>
                  </>
                )}
              </div>

              <button className="up-success-btn" onClick={() => navigate(isAuthor ? "/author/dashboard" : "/requests")}>
                {isAuthor ? "Back to Dashboard" : "Check Request Status"}
              </button>
              <button className="up-success-btn-ghost" onClick={() => navigate("/")}>
                Back to Home
              </button>
            </div>

          ) : (
            <>
              <div className="up-intro">
                <h2 className="up-intro-title">
                  {isAuthor ? "Upload a new paper" : "Apply to become an Author"}
                </h2>
                <p className="up-intro-sub">
                  {isAuthor
                    ? "Submit your paper for admin review. It will be published once approved."
                    : "Upload your thesis or research paper. Once an admin approves it, you'll gain Author access."}
                </p>
              </div>

              {isAuthor ? (
                <div className="up-notice blue">
                  <span className="up-notice-icon">ℹ️</span>
                  <p className="up-notice-text">
                    <strong>Admin approval required.</strong> Your paper will stay in <strong>pending review</strong> until an admin approves it — it won't be visible to users until then.
                  </p>
                </div>
              ) : (
                <div className="up-notice amber">
                  <span className="up-notice-icon">⏳</span>
                  <p className="up-notice-text">
                    <strong>Pending approval.</strong> An admin will review your paper before granting you <strong>Author access</strong>. This is not immediate.
                  </p>
                </div>
              )}

              <form className="up-form" onSubmit={handleSubmit}>
                <div className="up-field">
                  <label className="up-label">Title <span style={{ color: "#9b0000" }}>*</span></label>
                  <input className="up-input" name="title" value={form.title} onChange={set}
                    placeholder="Full title of your research paper" disabled={busy} autoComplete="off" />
                </div>

                <div className="up-field">
                  <label className="up-label">Authors <span style={{ color: "#9b0000" }}>*</span><span className="up-label-hint">(comma-separated)</span></label>
                  <input className="up-input" name="authors" value={form.authors} onChange={set}
                    placeholder="e.g. Juan Dela Cruz, Maria Santos" disabled={busy} autoComplete="off" />
                </div>

                <div className="up-row">
                  <div className="up-field">
                    <label className="up-label">Year <span style={{ color: "#9b0000" }}>*</span></label>
                    <input className="up-input" name="year" type="number" value={form.year}
                      onChange={set} min="1990" max="2099" disabled={busy} />
                  </div>
                  <div className="up-field">
                    <label className="up-label">Program / Course</label>
                    <input className="up-input" name="course_or_program" value={form.course_or_program}
                      onChange={set} placeholder="e.g. BSCS, BSIT" disabled={busy} autoComplete="off" />
                  </div>
                </div>

                <div className="up-field">
                  <label className="up-label">Abstract</label>
                  <textarea className="up-textarea" name="abstract" value={form.abstract}
                    onChange={set} placeholder="Paste your paper's abstract here…" disabled={busy} />
                </div>

                <div className="up-field">
                  <label className="up-label">Access Type</label>
                  <div className="up-access-grid">
                    {ACCESS_OPTIONS.map((opt) => (
                      <label key={opt.value} className={`up-access-card${form.access_type === opt.value ? " selected" : ""}`}>
                        <span className="up-access-icon">{opt.icon}</span>
                        <div>
                          <div className="up-access-label">{opt.label}</div>
                          <div className="up-access-desc">{opt.desc}</div>
                        </div>
                        <input type="radio" name="access_type" value={opt.value}
                          checked={form.access_type === opt.value} onChange={set}
                          className="up-access-radio" disabled={busy} />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="up-field">
                  <label className="up-label">PDF File <span className="up-label-hint">(optional)</span></label>
                  {pdf ? (
                    <div className="up-pdf-selected">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b0000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span className="up-pdf-name">{pdf.name}</span>
                      <button type="button" className="up-pdf-clear" onClick={() => setPdf(null)} disabled={busy}>×</button>
                    </div>
                  ) : (
                    <div className="up-pdf-drop"
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                      onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                      onDrop={(e) => {
                        e.preventDefault(); e.currentTarget.classList.remove("drag-over");
                        const f = e.dataTransfer.files?.[0];
                        if (f?.type === "application/pdf") setPdf(f);
                      }}>
                      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdf(f); }} />
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
                      <div style={{ fontSize: 13.5, color: "#374151", fontWeight: 500 }}>
                        <span style={{ color: "#9b0000", fontWeight: 600 }}>Click to upload</span> or drag & drop
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>PDF files only</div>
                    </div>
                  )}
                </div>

                {busy && progress > 0 && (
                  <div>
                    <div className="up-progress-wrap">
                      <div className="up-progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, textAlign: "center" }}>
                      {progress < 65 ? "Uploading PDF…" : "Saving paper…"}
                    </div>
                  </div>
                )}

                {err && <div className="up-error">⚠ {err}</div>}

                <button type="submit" className="up-submit-btn" disabled={busy}>
                  {busy ? (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "upSpin 0.75s linear infinite" }} />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Submit Paper
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}