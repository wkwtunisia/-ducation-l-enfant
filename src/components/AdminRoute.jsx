// src/components/AdminRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase";
import { ADMIN_EMAIL } from "../constants";

export default function AdminRoute({ children }) {
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
    return <div style={{ textAlign: "center", padding: "60px" }}>Chargement...</div>;
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/education" replace />;
  }

  return children;
}