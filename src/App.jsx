import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import AuthCallback from "./pages/public/AuthCallback";
import PapersPage from "./pages/public/PapersPage";
import ResearchDetails from "./pages/public/ResearchDetails";  // ← ADDED
import ProfilePage from "./pages/protected/ProfilePage";
import BookmarksPage from "./pages/protected/BookmarksPage";
import RequestsPage from "./pages/protected/RequestsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoute from "./routes/AdminRoute";
import { useAuth } from "./context/AuthContext";

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && profile?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      {/* Public — admins get bounced to dashboard */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/papers" element={<PublicRoute><PapersPage /></PublicRoute>} />
      <Route path="/papers/:id" element={<PublicRoute><ResearchDetails /></PublicRoute>} />  {/* ← ADDED */}

      {/* Auth callback — no redirect wrapper, handles its own logic */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected student/author pages */}
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/bookmarks" element={<BookmarksPage />} />
      <Route path="/requests" element={<RequestsPage />} />

      {/* Admin — /admin and /admin/login both go straight to dashboard (guarded) */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/login" element={<Navigate to="/admin/dashboard" replace />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  );
}

export default App;