import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div
          style={{
            display: "inline-block",
            width: "40px",
            height: "40px",
            border: "4px solid #e2e8f0",
            borderTop: "4px solid #4f46e5",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: "12px", color: "#64748b" }}>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
