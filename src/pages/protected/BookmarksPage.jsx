import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import LoginPage from "../public/LoginPage";

export default function BookmarksPage() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const content = user ? (
    <div style={styles.card}>
      <h1 style={styles.heading}>Bookmarks</h1>
      <p style={styles.description}>
        This section will show your saved theses and research items.
      </p>
      <p style={styles.muted}>Feature coming soon.</p>
    </div>
  ) : (
    <div style={styles.card}>
      <h1 style={styles.heading}>Sign in to view bookmarks</h1>
      <p style={styles.description}>
        You need to sign in with your Google account to access bookmarks.
      </p>
      <button
        style={styles.primaryButton}
        onClick={() => setShowLogin(true)}
      >
        Sign in with Google
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
    marginBottom: "12px",
  },
  description: {
    fontSize: "14px",
    color: "#4b5563",
    marginBottom: "16px",
    lineHeight: 1.5,
  },
  muted: {
    fontSize: "13px",
    color: "#9ca3af",
  },
  primaryButton: {
    width: "100%",
    marginTop: "8px",
    padding: "11px 12px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#006400",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
};

