import Navbar from "../../components/layout/Navbar";
import SearchBar from "../../components/search/SearchBar";

export default function LandingPage() {
  return (
    <div>
      <Navbar />
      <div style={styles.container}>
        <h1 style={styles.title}>CITE-TMS</h1>
        <p style={styles.subtitle}>De La Salle Lipa Research Repository</p>

        {/* This wrapper ensures the search bar is centered and responsive */}
        <div style={styles.searchWrapper}>
          <SearchBar />
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    // Layout
    minHeight: "calc(100vh - 56px)",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",

    // Aesthetic
    backgroundColor: "#ffffff",
    color: "#000000",
    margin: 0,
    padding: 0,
    boxSizing: "border-box"
  },
  title: {
    fontSize: "64px",
    fontWeight: "bold",
    marginBottom: "5px",
    letterSpacing: "-1px",    // Tighter spacing looks more modern on white
    color: "#1a1a1a"          // Off-black for a softer look
  },
  subtitle: {
    fontSize: "18px",
    marginBottom: "40px",
    color: "#666666",         // Medium gray for the tagline
    textAlign: "center"
  },
  searchWrapper: {
    width: "90%",             // Flexible width for mobile
    maxWidth: "600px"         // Fixed max width for desktop
  }
};