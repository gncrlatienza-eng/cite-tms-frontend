import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ScrollText, Clock } from "lucide-react";
import { TermsContent } from "../../components/TermsAndConditions";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";

export default function TermsPage() {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const isNewUser       = params.get("new") === "true";
  const redirectTo      = params.get("redirect") || "/";
  const { user, refreshProfile } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [checked, setChecked]   = useState(false);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");

  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setScrolled(true);
    }
  };

  const handleAccept = async () => {
    if (!checked || !user) return;
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase
        .from("users")
        .update({ has_accepted_terms: true })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      await refreshProfile();
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .tp-page { min-height: 100vh; background: #fafafa; font-family: 'DM Sans', system-ui, sans-serif; }

        .tp-header {
          background: #fff;
          border-bottom: 1px solid #efefef;
          padding: 16px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .tp-header-title { font-family: 'Schibsted Grotesk', serif; font-size: 18px; color: #111827; display: flex; align-items: center; gap: 10px; }
        .tp-back-link { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #9b0000; text-decoration: none; transition: color 0.15s; }
        .tp-back-link:hover { color: #7f1d1d; }

        .tp-body { max-width: 660px; margin: 0 auto; padding: 40px 40px 80px; }
        .tp-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
        .tp-card-header { padding: 22px 24px 16px; border-bottom: 1px solid #f3f4f6; }
        .tp-card-title { font-family: 'Schibsted Grotesk', serif; font-size: 21px; color: #111827; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
        .tp-card-sub { font-size: 13px; color: #6b7280; line-height: 1.5; }

        .tp-scroll-hint { margin: 12px 24px 0; padding: 9px 13px; border-radius: 8px; font-size: 12px; display: flex; align-items: center; gap: 7px; }
        .tp-scroll-hint.pending { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .tp-scroll-hint.done    { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }

        .tp-content { overflow-y: auto; padding: 20px 24px; max-height: 520px; }

        .up-terms-section { margin-bottom: 18px; }
        .up-terms-section:last-child { margin-bottom: 0; }
        .up-terms-section-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
        .up-terms-section-num { width: 20px; height: 20px; border-radius: 50%; background: #fef2f2; border: 1px solid #fecaca; color: #9b0000; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .up-terms-section-body { font-size: 13px; color: #4b5563; line-height: 1.7; padding-left: 28px; }
        .up-terms-divider { border: none; border-top: 1px solid #f3f4f6; margin: 18px 0; }

        .tp-footer { padding: 16px 24px 22px; border-top: 1px solid #f3f4f6; }
        .tp-check-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
        .tp-check-row input[type="checkbox"] { width: 15px; height: 15px; margin-top: 2px; accent-color: #9b0000; cursor: pointer; flex-shrink: 0; }
        .tp-check-row input[type="checkbox"]:disabled { cursor: not-allowed; }
        .tp-check-label { font-size: 13px; color: #374151; line-height: 1.55; }
        .tp-check-label .hint { font-size: 12px; color: #b45309; display: block; margin-top: 3px; }
        .tp-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .tp-btn-accept { padding: 10px 24px; border-radius: 9px; border: none; background: linear-gradient(135deg, #9b0000, #c0392b); color: #fff; font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 3px 10px rgba(155,0,0,0.25); transition: opacity 0.15s; }
        .tp-btn-accept:disabled { opacity: 0.5; cursor: not-allowed; }
        .tp-btn-accept:not(:disabled):hover { opacity: 0.9; }
        .tp-err { font-size: 12.5px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
        .tp-readonly-note { font-size: 13px; color: #6b7280; text-align: center; padding: 16px 0 4px; }

        @media (max-width: 640px) {
          .tp-header { padding: 14px 20px; }
          .tp-body { padding: 24px 16px 60px; }
        }
      `}</style>

      <div className="tp-page">
        <div className="tp-header">
          <div className="tp-header-title">
            <ScrollText size={18} style={{ color: "#9b0000" }} />
            Terms & Conditions
          </div>
          {!isNewUser && (
            <Link to="/" className="tp-back-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Back to Home
            </Link>
          )}
        </div>

        <div className="tp-body">
          <div className="tp-card">
            <div className="tp-card-header">
              <div className="tp-card-title">
                Submission Terms & Conditions
              </div>
              <p className="tp-card-sub">
                DLSL Thesis Management System —{" "}
                {isNewUser
                  ? "please read and accept to continue."
                  : "last updated 2025."}
              </p>
            </div>

            {isNewUser && (
              <div className={`tp-scroll-hint ${scrolled ? "done" : "pending"}`}>
                {scrolled ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    You've read all the terms — check the box below to continue.
                  </>
                ) : (
                  <>
                    <Clock size={13} />
                    Scroll to the bottom to read all terms before continuing.
                  </>
                )}
              </div>
            )}

            <div className="tp-content" onScroll={isNewUser ? handleScroll : undefined}>
              <TermsContent />
            </div>

            {isNewUser ? (
              <div className="tp-footer">
                {err && <div className="tp-err">{err}</div>}
                <div className="tp-check-row">
                  <input
                    type="checkbox"
                    id="tp-check"
                    checked={checked}
                    disabled={!scrolled || busy}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  <label htmlFor="tp-check" className="tp-check-label">
                    I have read and agree to the Terms & Conditions. I confirm this paper is an original academic work produced at <strong>De La Salle Lipa</strong>.
                    {!scrolled && <span className="hint">Scroll to the bottom first to enable this checkbox.</span>}
                  </label>
                </div>
                <div className="tp-actions">
                  <button
                    className="tp-btn-accept"
                    disabled={!checked || busy}
                    onClick={handleAccept}
                  >
                    {busy ? "Saving…" : "I Agree — Continue"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="tp-readonly-note">
                Questions? Contact the CITE-TMS administrator.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}