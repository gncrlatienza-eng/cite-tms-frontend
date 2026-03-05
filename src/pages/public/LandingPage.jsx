import { useState } from "react";
import Navbar from "../../components/layout/Navbar";
import SearchBar from "../../components/search/SearchBar";
import LoginPage from "./LoginPage";
// ✅ No supabase import, no useEffect — AuthContext handles everything

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <div style={{
        filter: showLogin ? 'blur(1px)' : 'none',
        transition: 'filter 0.3s ease',
        pointerEvents: showLogin ? 'none' : 'auto',
      }}>
        <Navbar onLoginClick={() => setShowLogin(true)} />

        <div style={styles.container}>
          <h1 style={styles.title}>CITE-TMS</h1>
          <p style={styles.subtitle}>De La Salle Lipa Research Repository</p>

          <div style={styles.searchWrapper}>
            <SearchBar />
          </div>
        </div>
      </div>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 56px)",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    color: "#000000",
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
  },
  title: {
    fontSize: "64px",
    fontWeight: "bold",
    marginBottom: "5px",
    letterSpacing: "-1px",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: "18px",
    marginBottom: "40px",
    color: "#666666",
    textAlign: "center",
  },
  searchWrapper: {
    width: "90%",
    maxWidth: "600px",
  },
};