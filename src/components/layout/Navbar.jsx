import React from 'react';

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      {/* Left side: Menu and Links */}
      <div style={styles.leftSection}>
        <button style={styles.iconButton}>
          <span style={styles.hamburger}>☰</span> 
        </button>
        
        <div style={styles.links}>
          <a href="#profile" style={styles.link}>My profile</a>
          <a href="#library" style={styles.link}>My library</a>
          <a href="#labs" style={styles.link}>Labs</a>
        </div>
      </div>

      {/* Right side: Sign In */}
      <div style={styles.rightSection}>
        <button style={styles.signInButton}>SIGN IN</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #ebebeb", // Subtle line like the screenshot
    width: "100%",
    boxSizing: "border-box",
  },
  leftSection: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  iconButton: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "5px",
    color: "#5f6368",
  },
  links: {
    display: "flex",
    gap: "25px",
  },
  link: {
    textDecoration: "none",
    color: "#5f6368",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  icon: {
    fontSize: "16px",
  },
  rightSection: {
    display: "flex",
    alignItems: "center",
  },
  signInButton: {
    background: "none",
    border: "none",
    color: "#5f6368",
    fontWeight: "500",
    fontSize: "13px",
    cursor: "pointer",
    padding: "5px 10px",
  },
};