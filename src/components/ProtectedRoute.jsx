// src/components/ProtectedRoute.jsx
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
      <div className="loader" style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <span></span><span></span><span></span>
      </div>
    );
  }

  if (!user) {
    // Redirige vers la page de connexion si non authentifié
    return <Navigate to="/login" replace />;
  }

  return children;
}