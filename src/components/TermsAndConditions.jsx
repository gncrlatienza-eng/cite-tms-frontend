import { useState } from "react";
import { ScrollText, Clock, AlertTriangle } from "lucide-react";

export const TERMS_CONTENT = [
  {
    num: "1",
    title: "Institutional Affiliation",
    body: "The paper being submitted must be an original academic work produced at De La Salle Lipa (DLSL). Submissions from other schools, universities, or institutions are strictly not allowed. The submitter must be a current or former student of DLSL.",
  },
  {
    num: "2",
    title: "Authorship & Originality",
    body: "You confirm that the paper is your own original work, completed as part of a DLSL course or program requirement such as a thesis, capstone project, or research subject. You certify that you are the primary author or an authorized co-author of the submitted paper, and that all listed co-authors have consented to being named.",
  },
  {
    num: "3",
    title: "Academic Integrity",
    body: "The submitted paper must not contain plagiarized content. All sources, references, and external works cited within the paper must be properly acknowledged. Submitting another person's work as your own is a violation of academic integrity and DLSL's code of conduct.",
  },
  {
    num: "4",
    title: "Accuracy of Information",
    body: "You confirm that all metadata provided during submission — including the title, author names, year, program, and abstract — is accurate, complete, and truthful. Intentionally providing false or misleading information may result in the rejection or removal of your submission.",
  },
  {
    num: "5",
    title: "Intellectual Property & Usage Rights",
    body: "By submitting your paper, you grant De La Salle Lipa and the DLSL Thesis Management System a non-exclusive, royalty-free license to store, display, and distribute your work in accordance with the access type you have selected. You retain full ownership and copyright of your work. You confirm that submitting this paper does not violate any existing publishing agreements or third-party rights.",
  },
  {
    num: "6",
    title: "Access Type Acknowledgment",
    body: "You understand and accept the implications of the access type you have chosen. Open Access means your paper will be visible and downloadable by anyone. Students Only means your paper will only be accessible to logged-in DLSL students. Restricted means other students must request your approval before viewing your paper. You may contact an administrator if you wish to change your access type after submission.",
  },
  {
    num: "7",
    title: "Review & Approval Process",
    body: "You acknowledge that submitting a paper does not guarantee its publication on the platform. All submissions are subject to admin review and approval. The administration reserves the right to reject any submission that violates these terms, university policies, or academic integrity standards.",
  },
  {
    num: "8",
    title: "Consequences of Violation",
    body: "Any submission found to be in violation of these terms may be removed from the platform without prior notice. Depending on the severity of the violation, the submitter's Author access may be revoked, and the matter may be escalated to the appropriate DLSL academic authorities.",
  },
  {
    num: "9",
    title: "Consent",
    body: "By proceeding with your submission, you confirm that you have read, understood, and agreed to all of the terms and conditions stated above.",
  },
];

// ── Shared content renderer ──────────────────────────────────
export function TermsContent() {
  return (
    <>
      {TERMS_CONTENT.map((section, i) => (
        <div key={section.num} className="up-terms-section">
          {i > 0 && <hr className="up-terms-divider" />}
          <div className="up-terms-section-title">
            <div className="up-terms-section-num">{section.num}</div>
            {section.title}
          </div>
          <p className="up-terms-section-body">{section.body}</p>
        </div>
      ))}
    </>
  );
}

// ── Modal version — used in UploadPaper.jsx ──────────────────
export function TermsModal({ onClose, onAgree, initialChecked = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [checked, setChecked]   = useState(initialChecked);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setScrolled(true);
    }
  };

  return (
    <div className="up-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="up-terms-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="up-terms-modal-header">
          <div className="up-terms-modal-title">
            <ScrollText size={20} style={{ color: "#9b0000", flexShrink: 0 }} />
            Submission Terms & Conditions
          </div>
          <p className="up-terms-modal-sub">DLSL Thesis Management System — please read carefully before submitting.</p>
        </div>

        <div className={`up-terms-modal-scroll-hint ${scrolled ? "done" : "pending"}`}>
          {scrolled ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              You've read all the terms — check the box below to agree.
            </>
          ) : (
            <>
              <Clock size={13} />
              Scroll to the bottom to read all terms before agreeing.
            </>
          )}
        </div>

        <div className="up-terms-modal-body" onScroll={handleScroll}>
          <TermsContent />
        </div>

        <div className="up-terms-modal-footer">
          <div className="up-terms-modal-check-row">
            <input
              type="checkbox"
              id="terms-modal-check"
              checked={checked}
              disabled={!scrolled}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <label htmlFor="terms-modal-check" className="up-terms-modal-check-label">
              I have read and agree to the Submission Terms & Conditions.
              {!scrolled && <span className="hint">Scroll to the bottom first to enable this checkbox.</span>}
            </label>
          </div>
          <div className="up-terms-modal-actions">
            <button className="up-modal-btn-cancel" onClick={onClose}>Close</button>
            <button
              className="up-modal-btn-submit"
              disabled={!scrolled || !checked}
              onClick={() => { onAgree(); onClose(); }}
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}