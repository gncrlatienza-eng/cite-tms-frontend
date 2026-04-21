import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import AuthCallback from "./pages/public/AuthCallback";
import PapersPage from "./pages/public/PapersPage";
import PaperPreviewPage from "./pages/public/PaperPreviewPage";
import TermsPage from "./pages/public/TermsPage";
import ProfilePage from "./pages/protected/ProfilePage";
import BookmarksPage from "./pages/protected/BookmarksPage";
import RequestsPage from "./pages/protected/RequestsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AuthorDashboard from "./pages/author/AuthorDashboard";
import MyPapers from "./pages/author/MyPapers";
import AccessRequests from "./pages/author/AccessRequests";
import UploadPaper from "./pages/student/UploadPaper";
import AdminRoute from "./routes/AdminRoute";
import AuthorRoute from "./routes/AuthorRoute";
import { useAuth } from "./context/AuthContext";

function GlobalLoader() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center",
      justifyContent: "center", background: "#fff", zIndex: 9999,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "3px solid #bbf7d0", borderTopColor: "#166534",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RouteRestorer() {
  const { user, isAdmin, isAuthor, loading, profileLoading, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user || !profile) return; // wait for full profile
    if (location.pathname !== "/") return;

    // Restore authors and admins to their dashboards when they revisit the site
    // Students are intentionally left on the landing page
    if (isAdmin)  { window.location.replace("/admin/dashboard");  return; }
    if (isAuthor) { window.location.replace("/author/dashboard"); return; }
  }, [loading, profileLoading, user, profile, isAdmin, isAuthor, location.pathname]);

  return null;
}

function PublicRoute({ children }) {
  const { user, isAdmin, loading, profileLoading, profile } = useAuth();

  if (loading || (profileLoading && !profile)) return <GlobalLoader />;

  // Only redirect admins — RouteRestorer handles authors, AuthCallback handles post-login
  if (user && isAdmin) return <Navigate to="/admin/dashboard" replace />;

  return children;
}

function App() {
  const { loading, profileLoading, profile, user } = useAuth();

  if (loading || (profileLoading && !profile && user)) return <GlobalLoader />;

  return (
    <>
      <RouteRestorer />
      <Routes>
        {/* Public */}
        <Route path="/"           element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/login"      element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/papers"     element={<PapersPage />} />
        <Route path="/papers/:id" element={<PaperPreviewPage />} />
        <Route path="/terms"      element={<TermsPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected */}
        <Route path="/profile"   element={<ProfilePage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/requests"  element={<RequestsPage />} />

        {/* Student */}
        <Route path="/student/upload" element={<UploadPaper />} />

        {/* Author */}
        <Route path="/author/dashboard" element={<AuthorRoute><AuthorDashboard /></AuthorRoute>} />
        <Route path="/author/papers"    element={<AuthorRoute><MyPapers /></AuthorRoute>} />
        <Route path="/author/requests"  element={<AuthorRoute><AccessRequests /></AuthorRoute>} />

        {/* Admin */}
        <Route path="/admin"           element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login"     element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </>
  );
}

export default App;