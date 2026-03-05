import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import AuthCallback from "./pages/public/AuthCallback";
import PapersPage from "./pages/public/PapersPage";
import ProfilePage from "./pages/protected/ProfilePage";
import BookmarksPage from "./pages/protected/BookmarksPage";
import RequestsPage from "./pages/protected/RequestsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/papers" element={<PapersPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/bookmarks" element={<BookmarksPage />} />
      <Route path="/requests" element={<RequestsPage />} />
    </Routes>
  );
}

export default App;