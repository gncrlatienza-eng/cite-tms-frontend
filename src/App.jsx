import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import AuthCallback from "./pages/public/AuthCallback";
import PapersPage from "./pages/public/PapersPage";
import PaperPreviewPage from "./pages/public/PaperPreviewPage";
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

function PublicRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (user && isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      {/* Public — admins get bounced to dashboard */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/papers" element={<PapersPage />} />
      <Route path="/papers/:id" element={<PaperPreviewPage />} />

      {/* Auth callback */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected — any logged in user */}
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/bookmarks" element={<BookmarksPage />} />
      <Route path="/requests" element={<RequestsPage />} />

      {/* Student — upload paper */}
      <Route path="/student/upload" element={<UploadPaper />} />

      {/* Author — requires is_author = true */}
      <Route path="/author/dashboard" element={<AuthorRoute><AuthorDashboard /></AuthorRoute>} />
      <Route path="/author/papers" element={<AuthorRoute><MyPapers /></AuthorRoute>} />
      <Route path="/author/requests" element={<AuthorRoute><AccessRequests /></AuthorRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/login" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
    </Routes>
  );
}

export default App;