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

// Routes we never save as "last route"
const SKIP_SAVE = ["/", "/login", "/terms", "/auth/callback"];

// Saves the current route to localStorage while logged in
function RouteMemory() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const path = location.pathname;
    if (SKIP_SAVE.includes(path) || path.startsWith("/auth") || path.startsWith("/papers")) return;
    localStorage.setItem("last_route", path);
  }, [location.pathname, user]);

  return null;
}

// When a logged-in user lands on "/" (e.g. they typed the URL or refreshed),
// redirect them back to wherever they were
function RouteRestorer() {
  const { user, isAdmin, isAuthor, loading, profileLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) return;
    if (location.pathname !== "/") return;

    const lastRoute = localStorage.getItem("last_route");
    if (!lastRoute || lastRoute === "/") return;

    const isAdminRoute  = lastRoute.startsWith("/admin");
    const isAuthorRoute = lastRoute.startsWith("/author");

    if (isAdminRoute  && isAdmin)  { window.location.replace(lastRoute); return; }
    if (isAuthorRoute && isAuthor) { window.location.replace(lastRoute); return; }
    // Student/protected routes
    if (!isAdminRoute && !isAuthorRoute) { window.location.replace(lastRoute); }
  }, [loading, profileLoading, user, location.pathname]);

  return null;
}

// Full-screen spinner shown while auth resolves — eliminates flash
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

// Redirects already-logged-in users away from public pages
function PublicRoute({ children }) {
  const { user, isAdmin, isAuthor, loading, profileLoading, profile } = useAuth();

  // Wait for full auth resolution before deciding
  if (loading || (profileLoading && !profile)) return <GlobalLoader />;

  if (user && isAdmin)  return <Navigate to="/admin/dashboard"  replace />;
  if (user && isAuthor) return <Navigate to="/author/dashboard" replace />;

  return children;
}

function App() {
  const { loading, profileLoading, profile, user } = useAuth();

  // Block ALL rendering until auth resolves — no flash of wrong content
  if (loading || (profileLoading && !profile && user)) return <GlobalLoader />;

  return (
    <>
      <RouteMemory />
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