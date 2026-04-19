import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoadingScreen = ({ message = "Verifying access…" }) => (
  <div style={{
    position: "fixed", inset: 0, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 12,
    background: "radial-gradient(circle at top, #f0fdf4 0, #ffffff 52%)",
    fontFamily: "system-ui, sans-serif",
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      border: "3px solid #bbf7d0", borderTopColor: "#166534",
      animation: "spin 0.9s ease-in-out infinite",
    }} />
    <div style={{
      fontSize: 12, color: "#6b7280",
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      {message}
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading, profileLoading, profile } = useAuth();

  // Auth still initializing
  if (loading) return <LoadingScreen message="Verifying access…" />;

  // Only block on profileLoading if profile not yet loaded
  if (profileLoading && !profile) return <LoadingScreen message="Loading profile…" />;

  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return children;
}