import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../services/supabase";

const ALLOWED_ADMIN_EMAILS = [
  "gncrlatienza@gmail.com",
  "cite.tms.admin@dlsl.edu.ph",
];

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setStatus("denied"); return; }

        // Trust the whitelist directly — avoids RLS issues
        if (ALLOWED_ADMIN_EMAILS.includes(session.user.email)) {
          setStatus("allowed");
        } else {
          setStatus("denied");
        }
      } catch {
        setStatus("denied");
      }
    };
    check();
  }, []);

  if (status === "checking") {
    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        background: "radial-gradient(circle at top,#f0fdf4 0,#ffffff 52%)",
        fontFamily: "system-ui, sans-serif"
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid #bbf7d0", borderTopColor: "#166534",
          animation: "spin 0.9s ease-in-out infinite"
        }} />
        <div style={{ fontSize: 12, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Verifying access…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Denied → back to home where they can open the login modal
  if (status === "denied") return <Navigate to="/" replace />;

  return children;
}