import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";
import api from "../../services/api";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "../public/LoginPage";
import { CheckCircle, Lock, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

// ── Status styles configuration ──────────────────────────────────
const STATUS_STYLES = {
  pending: {
    bg: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fde68a",
    dot: "#f59e0b",
    icon: Clock,
    label: "Pending",
  },
  approved: {
    bg: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
    dot: "#16a34a",
    icon: CheckCircle2,
    label: "Approved",
  },
  rejected: {
    bg: "#fef2f2",
    color: "#9b0000",
    border: "1px solid #fecaca",
    dot: "#dc2626",
    icon: AlertCircle,
    label: "Rejected",
  },
};

const STATUS_MESSAGES = {
  pending:
    "An admin is currently reviewing your submission. This typically takes 1-2 business days.",
  approved:
    "Welcome! You now have author access. You can upload additional papers from the Author Dashboard.",
  rejected:
    "You can upload another paper to try again. Make sure all required fields are properly filled.",
};

const ROLE_BADGE_STYLES = {
  admin: { color: "#7c3aed", bg: "#f5f3ff" },
  author: { color: "#b45309", bg: "#fffbeb" },
  student: { color: "#006400", bg: "#f0faf0" },
};

// ── Helper functions ─────────────────────────────────────────────
const getSaveButtonStyles = (saveStatus) => ({
  background:
    saveStatus === "saved" ? "#dcfce7" : saveStatus === "error" ? "#fee2e2" : "#111827",
  color:
    saveStatus === "saved" ? "#166534" : saveStatus === "error" ? "#991b1b" : "#fff",
});

const getSaveButtonText = (saveStatus) => {
  const textMap = {
    saving: "Saving…",
    saved: "✓ Saved",
    error: "Error",
  };
  return textMap[saveStatus] || "Save";
};

// Helper to safely extract paper title from upgrade request
const getPaperTitle = (request) => {
  if (!request) return "Untitled";
  // Try multiple possible paths the API might return the title
  return (
    request.papers?.[0]?.title || // Array structure
    request.papers?.title ||      // Single object structure
    request.title ||              // Direct property
    "Untitled"
  );
};

const StatusDot = ({ color }) => (
  <span
    style={{
      display: "inline-block",
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: color,
      marginRight: 6,
    }}
  />
);

// ── Skeleton Loading Component ──────────────────────────────────
function SkeletonLoader({ height = "12px", width = "100%", style = {} }) {
  return (
    <div
      style={{
        height,
        width,
        backgroundColor: "#e5e7eb",
        borderRadius: "8px",
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ...style,
      }}
    />
  );
}

// ── Skeleton Loading State for Author Access  ────────────────────
function AuthorAccessSkeleton({ styles }) {
  return (
    <>
      <SkeletonLoader height="14px" width="60%" style={{ marginBottom: "12px" }} />
      <SkeletonLoader height="12px" width="100%" style={{ marginBottom: "8px" }} />
      <SkeletonLoader height="12px" width="85%" style={{ marginBottom: "12px" }} />
      <SkeletonLoader height="40px" width="100%" style={{ borderRadius: "10px" }} />
    </>
  );
}

// ── Secondary Email Component ────────────────────────────────────
function SecondaryEmailSection({
  profile,
  secondaryEmail,
  setSecondaryEmail,
  saveStatus,
  handleSaveSecondaryEmail,
  styles,
}) {
  return (
    <div style={styles.secondaryEmailSection}>
      <div style={styles.secondaryEmailHeader}>
        <span style={styles.secondaryEmailTitle}>Backup / Secondary Email</span>
        <span style={styles.secondaryEmailHint}>
          Used to log in if your DLSL account expires
        </span>
      </div>
      {profile?.secondary_email ? (
        <div style={styles.secondaryEmailReadOnly}>
          <span style={styles.secondaryEmailValue}>{profile.secondary_email}</span>
          <span style={styles.lockedBadge}>
            Set from your first paper submission
          </span>
        </div>
      ) : (
        <div style={styles.secondaryEmailRow}>
          <input
            type="email"
            value={secondaryEmail}
            onChange={(e) => setSecondaryEmail(e.target.value)}
            placeholder="yourname@gmail.com"
            style={styles.secondaryEmailInput}
          />
          <button
            onClick={handleSaveSecondaryEmail}
            disabled={saveStatus === "saving"}
            style={{ ...styles.saveBtn, ...getSaveButtonStyles(saveStatus) }}
          >
            {getSaveButtonText(saveStatus)}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function ProfilePage() {
  const { user, profile, loading, isAuthor, isAdmin, refreshProfile } =
    useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [upgradeStatus, setUpgradeStatus] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(true);
  const navigate = useNavigate();

  // Pre-fill secondary email from existing profile
  useEffect(() => {
    if (profile?.secondary_email) {
      setSecondaryEmail(profile.secondary_email);
    }
  }, [profile]);

  // Fetch upgrade status for non-authors
  useEffect(() => {
    if (!user || isAuthor || isAdmin) return;

    const fetchUpgradeStatus = async () => {
      setUpgradeLoading(true);
      try {
        const response = await api.get("/api/student/upgrade-status");
        setUpgradeStatus(response.data);
      } catch (err) {
        console.error("Failed to fetch upgrade status:", err);
        setUpgradeStatus(null);
      } finally {
        setUpgradeLoading(false);
      }
    };

    fetchUpgradeStatus();
  }, [user, isAuthor, isAdmin]);

  // Memoize computed values
  const displayName = useMemo(
    () =>
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email,
    [profile, user]
  );

  const roleInfo = useMemo(() => {
    if (isAdmin) return { label: "Admin", style: ROLE_BADGE_STYLES.admin };
    if (isAuthor) return { label: "Author", style: ROLE_BADGE_STYLES.author };
    return { label: "Student", style: ROLE_BADGE_STYLES.student };
  }, [isAdmin, isAuthor]);

  // Save secondary email to Supabase
  const handleSaveSecondaryEmail = async () => {
    if (!secondaryEmail.trim() || !profile?.id) return;
    setSaveStatus("saving");
    try {
      const { error } = await supabase
        .from("users")
        .update({ secondary_email: secondaryEmail.trim().toLowerCase() })
        .eq("id", profile.id);

      if (error) throw error;
      await refreshProfile();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 2500);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            color: "#4b5563",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Loading profile…
        </span>
      </div>
    );
  }

  const content = user ? (
    <div style={styles.card}>
      <h1 style={styles.heading}>My Profile</h1>

      <div style={styles.row}>
        <span style={styles.label}>Name</span>
        <span style={styles.value}>{displayName}</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Email</span>
        <span style={styles.value}>{user.email}</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Account type</span>
        <span
          style={{
            ...styles.badge,
            color: roleInfo.style.color,
            backgroundColor: roleInfo.style.bg,
          }}
        >
          {roleInfo.label}
        </span>
      </div>

      {/* ── Secondary Email — shown to all non-admin users ── */}
      {!isAdmin && (
        <SecondaryEmailSection
          profile={profile}
          secondaryEmail={secondaryEmail}
          setSecondaryEmail={setSecondaryEmail}
          saveStatus={saveStatus}
          handleSaveSecondaryEmail={handleSaveSecondaryEmail}
          styles={styles}
        />
      )}

      {/* ── Author status section ── */}
      {!isAdmin && (
        <div style={styles.authorSection}>
          <div style={styles.authorSectionHeader}>
            <span style={styles.authorSectionTitle}>
              {isAuthor ? (
                <>
                  <CheckCircle
                    size={14}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 5,
                      color: "#15803d",
                    }}
                  />
                  Author Access
                </>
              ) : (
                <>
                  <Lock
                    size={14}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 5,
                    }}
                  />
                  Author Access
                </>
              )}
            </span>
            {isAuthor && <span style={styles.authorActiveBadge}>Active</span>}
          </div>
          {upgradeLoading && !isAuthor ? (
            <AuthorAccessSkeleton styles={styles} />
          ) : isAuthor ? (
            <>
              <p style={styles.authorDesc}>
                You have author access. You can upload and manage papers from
                your Author Dashboard.
              </p>
              <button
                style={styles.authorPrimaryBtn}
                onClick={() => navigate("/author/dashboard")}
              >
                Go to Author Dashboard →
              </button>
            </>
          ) : upgradeStatus && upgradeStatus.status && upgradeStatus.status !== "none" ? (
            <>
              <div style={styles.paperStatusInline}>
                <div style={styles.statusBadgeContainer}>
                  {upgradeStatus.status === "pending" && (
                    <>
                      <Clock
                        size={16}
                        style={{ color: "#f59e0b", marginRight: 8 }}
                      />
                      <span style={styles.statusText}>
                        Your paper is under review
                      </span>
                      <span
                        style={{
                          ...styles.statusBadge,
                          background: "#fffbeb",
                          color: "#92400e",
                          border: "1px solid #fde68a",
                        }}
                      >
                        <StatusDot color="#f59e0b" />
                        Pending
                      </span>
                    </>
                  )}
                  {upgradeStatus.status === "approved" && (
                    <>
                      <CheckCircle2
                        size={16}
                        style={{ color: "#16a34a", marginRight: 8 }}
                      />
                      <span style={styles.statusText}>
                        Your paper has been approved!
                      </span>
                      <span
                        style={{
                          ...styles.statusBadge,
                          background: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <StatusDot color="#16a34a" />
                        Approved
                      </span>
                    </>
                  )}
                  {upgradeStatus.status === "rejected" && (
                    <>
                      <AlertCircle
                        size={16}
                        style={{ color: "#dc2626", marginRight: 8 }}
                      />
                      <span style={styles.statusText}>
                        Your paper request was rejected
                      </span>
                      <span
                        style={{
                          ...styles.statusBadge,
                          background: "#fef2f2",
                          color: "#9b0000",
                          border: "1px solid #fecaca",
                        }}
                      >
                        <StatusDot color="#dc2626" />
                        Rejected
                      </span>
                    </>
                  )}
                </div>
                {upgradeStatus.request && (
                  <div style={styles.paperDetails}>
                    <p style={styles.paperTitle}>
                      <strong>Paper:</strong>{" "}
                      {getPaperTitle(upgradeStatus.request)}
                    </p>
                    <p style={styles.paperDate}>
                      <strong>Submitted:</strong>{" "}
                      {new Date(
                        upgradeStatus.request.created_at
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                <p style={styles.paperMessage}>{STATUS_MESSAGES[upgradeStatus.status]}</p>
              </div>
            </>
          ) : (
            <>
              <p style={styles.authorDesc}>
                Want to become an author? Upload your research paper and an
                admin will review your request.
              </p>
              <button
                style={styles.authorPrimaryBtn}
                onClick={() => navigate("/student/upload")}
              >
                Upload Paper to Apply
              </button>
              <button
                style={styles.authorSecondaryBtn}
                onClick={() => navigate("/requests")}
              >
                Check Request Status
              </button>
            </>
          )}
        </div>
      )}

      <button style={styles.backButton} onClick={() => navigate("/")}>
        Back to Home
      </button>
    </div>
  ) : (
    <div style={styles.card}>
      <h1 style={styles.heading}>Sign in required</h1>
      <p style={styles.description}>
        You need to sign in with your Google account to view your profile.
      </p>
      <button style={styles.primaryButton} onClick={() => setShowLogin(true)}>
        Sign in with Google
      </button>
      <button style={styles.secondaryButton} onClick={() => navigate("/")}>
        Back to Home
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
      <div style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
        <Navbar onLoginClick={() => setShowLogin(true)} />
        <div style={styles.page}>{content}</div>
      </div>
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 57px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 20px 45px rgba(0,0,0,0.08)",
    padding: "28px 28px 24px",
    marginTop: "100px",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  heading: {
    fontSize: "22px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "18px",
  },
  description: {
    fontSize: "14px",
    color: "#4b5563",
    marginBottom: "20px",
    lineHeight: 1.5,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  label: { fontSize: "13px", color: "#6b7280" },
  value: { fontSize: "13px", color: "#111827", fontWeight: 500 },
  badge: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "999px",
  },

  // ── Secondary email section ──────────────────────────────
  secondaryEmailSection: {
    marginTop: "16px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "14px 16px",
    backgroundColor: "#fafafa",
  },
  secondaryEmailHeader: { marginBottom: "10px" },
  secondaryEmailTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
    display: "block",
  },
  secondaryEmailHint: {
    fontSize: "11.5px",
    color: "#9ca3af",
    marginTop: "2px",
    display: "block",
  },
  secondaryEmailRow: { display: "flex", gap: "8px" },
  secondaryEmailInput: {
    flex: 1,
    fontSize: "13px",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    outline: "none",
    color: "#111827",
    fontFamily: "inherit",
  },
  secondaryEmailReadOnly: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px 0",
  },
  secondaryEmailValue: {
    fontSize: "13px",
    color: "#111827",
    fontWeight: 500,
    fontFamily: "inherit",
  },
  lockedBadge: {
    fontSize: "11px",
    color: "#9ca3af",
    fontStyle: "italic",
  },
  saveBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },

  // ── Author section ───────────────────────────────────────
  authorSection: {
    marginTop: "16px",
    border: "1px solid #f0f0f0",
    borderRadius: "12px",
    padding: "16px",
    backgroundColor: "#fafafa",
  },
  authorSectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  authorSectionTitle: { fontSize: "13px", fontWeight: 600, color: "#111827" },
  authorActiveBadge: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#166534",
    background: "#dcfce7",
    borderRadius: "999px",
    padding: "2px 8px",
  },
  authorDesc: {
    fontSize: "12.5px",
    color: "#6b7280",
    lineHeight: 1.6,
    marginBottom: "12px",
  },
  authorPrimaryBtn: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #9b0000, #c0392b)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: "8px",
  },
  authorSecondaryBtn: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },

  // ── Inline paper status (within Author Access section) ─────
  paperStatusInline: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  // ── Paper status section ──────────────────────────────────
  paperStatusSection: {
    marginTop: "16px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    backgroundColor: "#fafafa",
  },
  paperStatusHeader: {
    marginBottom: "12px",
  },
  paperStatusTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
  },
  paperStatusContent: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  statusBadgeContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  statusText: {
    fontSize: "12.5px",
    color: "#6b7280",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "20px",
    whiteSpace: "nowrap",
  },
  paperDetails: {
    fontSize: "12px",
    color: "#6b7280",
    borderTop: "1px solid #e5e7eb",
    paddingTop: "10px",
  },
  paperTitle: {
    margin: "0 0 4px 0",
    fontSize: "12px",
    color: "#111827",
  },
  paperDate: {
    margin: "0",
    fontSize: "11.5px",
    color: "#9ca3af",
  },
  paperMessage: {
    margin: "0",
    fontSize: "12px",
    color: "#6b7280",
    fontStyle: "italic",
    borderTop: "1px solid #e5e7eb",
    paddingTop: "10px",
  },

  primaryButton: {
    width: "100%",
    marginTop: "4px",
    padding: "11px 12px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#006400",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: "8px",
  },
  secondaryButton: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  backButton: {
    marginTop: "20px",
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
};
