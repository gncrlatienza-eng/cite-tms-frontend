import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "../public/LoginPage";

export default function ProfilePage() {
  const { user, profile, loading, isAuthor, isAdmin } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email;

  // Determine role label from is_author / role field
  const roleLabel = isAdmin
    ? "Admin"
    : isAuthor
    ? "Author"
    : "Student";

  const roleBadgeStyle = isAdmin
    ? { color: "#7c3aed", bg: "#f5f3ff" }
    : isAuthor
    ? { color: "#b45309", bg: "#fffbeb" }
    : { color: "#006400", bg: "#f0faf0" };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontSize: 14, color: "#4b5563", fontFamily: "system-ui, sans-serif" }}>Loading profile…</span>
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
        <span style={{
          ...styles.badge,
          color: roleBadgeStyle.color,
          backgroundColor: roleBadgeStyle.bg,
        }}>
          {roleLabel}
        </span>
      </div>

      {/* ── Author status section ─────────────────────────────── */}
      {!isAdmin && (
        <div style={styles.authorSection}>
          <div style={styles.authorSectionHeader}>
            <span style={styles.authorSectionTitle}>
              {isAuthor ? "✅ Author Access" : "🔒 Author Access"}
            </span>
            {isAuthor && (
              <span style={styles.authorActiveBadge}>Active</span>
            )}
          </div>

          {isAuthor ? (
            <>
              <p style={styles.authorDesc}>
                You have author access. You can upload and manage papers from your Author Dashboard.
              </p>
              <button
                style={styles.authorPrimaryBtn}
                onClick={() => navigate("/author/dashboard")}
              >
                Go to Author Dashboard →
              </button>
            </>
          ) : (
            <>
              <p style={styles.authorDesc}>
                Want to become an author? Upload your research paper and an admin will review your request. Once approved, you'll gain access to the Author Dashboard.
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
      <div>
        <Navbar onLoginClick={() => setShowLogin(true)} />
        <div style={styles.page}>{content}</div>
      </div>
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 56px)",
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
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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

  // Author section
  authorSection: {
    marginTop: "20px",
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
  authorSectionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
  },
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