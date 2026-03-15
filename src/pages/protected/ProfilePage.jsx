import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "../public/LoginPage";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const fromProfile =
    profile?.role ||
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    null;

  const effectiveRole =
    fromProfile || (user?.email?.endsWith("@dlsl.edu.ph") ? "student" : null);

  const roleLabel =
    effectiveRole === "admin"
      ? "Admin"
      : effectiveRole === "faculty"
      ? "Author"
      : effectiveRole === "student"
      ? "Student"
      : "Unknown";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <span style={{ fontSize: 14, color: "#4b5563" }}>Loading profile…</span>
      </div>
    );
  }

  const handleBackHome = () => {
    navigate("/");
  };

  const content = user ? (
    <div style={styles.card}>
      <h1 style={styles.heading}>My Profile</h1>

      <div style={styles.row}>
        <span style={styles.label}>Name</span>
        <span style={styles.value}>
          {profile?.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email}
        </span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Email</span>
        <span style={styles.value}>{user.email}</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Account type</span>
        <span style={styles.badge}>{roleLabel}</span>
      </div>

      <button style={styles.backButton} onClick={handleBackHome}>
        Back to Home
      </button>
    </div>
  ) : (
    <div style={styles.card}>
      <h1 style={styles.heading}>Sign in required</h1>
      <p style={styles.description}>
        You need to sign in with your Google account to view your profile.
      </p>
      <button
        style={styles.primaryButton}
        onClick={() => setShowLogin(true)}
      >
        Sign in with Google
      </button>
      <button style={styles.secondaryButton} onClick={handleBackHome}>
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
    backgroundColor: "#ffffff",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 20px 45px rgba(0,0,0,0.08)",
    padding: "28px 28px 24px",
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
  label: {
    fontSize: "13px",
    color: "#6b7280",
  },
  value: {
    fontSize: "13px",
    color: "#111827",
    fontWeight: 500,
  },
  badge: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "999px",
    backgroundColor: "#f0faf0",
    color: "#006400",
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

