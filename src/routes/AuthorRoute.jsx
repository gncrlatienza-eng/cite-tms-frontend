import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoadingScreen = () => (
  <div style={{
    position: "fixed", inset: 0, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 12,
    background: "radial-gradient(circle at top, #fef2f2 0, #ffffff 52%)",
    fontFamily: "system-ui, sans-serif",
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      border: "3px solid #fecaca", borderTopColor: "#9b0000",
      animation: "spin 0.9s ease-in-out infinite",
    }} />
    <div style={{
      fontSize: 12, color: "#6b7280",
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      Verifying access…
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function AuthorRoute({ children }) {
  const { user, isAuthor, loading, profileLoading, profile } = useAuth();

  if (loading) return <LoadingScreen />;
  if (profileLoading && !profile) return <LoadingScreen />;
  if (user && !profile) return <LoadingScreen />;

  if (!user) return <Navigate to="/" replace />;
  if (!isAuthor) return <Navigate to="/bookmarks" replace />;

  return children;
}