// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useState, useContext, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, createUserDocument } from "./firebase";
import { Toaster } from 'react-hot-toast';
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Education from "./pages/Education";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import "./App.css";

// ===== CONTEXTES =====
export const LanguageContext = createContext();
export const useLanguage = () => useContext(LanguageContext);

export const UserAccessContext = createContext();
export const useUserAccess = () => useContext(UserAccessContext);

export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// ===== THÈMES =====
const themes = {
  blue: { primary: "#4f46e5", secondary: "#818cf8", accent: "#e0e7ff", bg: "#f5f7fa" },
  pink: { primary: "#ec4899", secondary: "#f472b6", accent: "#fce7f3", bg: "#fdf2f8" },
  green: { primary: "#22c55e", secondary: "#4ade80", accent: "#dcfce7", bg: "#f0fdf4" },
  orange: { primary: "#f59e0b", secondary: "#fbbf24", accent: "#fef3c7", bg: "#fffbeb" },
  purple: { primary: "#8b5cf6", secondary: "#a78bfa", accent: "#ede9fe", bg: "#f5f3ff" },
};

// ===== COMPOSANT PRINCIPAL =====
function App() {
  const [language, setLanguage] = useState("fr");
  const [theme, setTheme] = useState("blue");
  const [darkMode, setDarkMode] = useState(false);
  const [userAccess, setUserAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  // Appliquer le thème et le mode sombre
  useEffect(() => {
    const colors = themes[theme];
    const root = document.documentElement;
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--bg", darkMode ? "#1a1a2e" : colors.bg);
    if (darkMode) {
      root.classList.add("dark-mode");
    } else {
      root.classList.remove("dark-mode");
    }
  }, [theme, darkMode]);

  // Charger l'utilisateur et son accès
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Créer/mettre à jour le document utilisateur
        await createUserDocument(user);
        // Récupérer l'accès
        const userDocRef = doc(db, "userAccess", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserAccess({ uid: user.uid, ...userDoc.data() });
        } else {
          const defaultAccess = {
            uid: user.uid,
            maxStories: 2,
            packId: null,
            purchasedAt: null,
          };
          await setDoc(userDocRef, defaultAccess);
          setUserAccess(defaultAccess);
        }
      } else {
        setUserAccess(null);
      }
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes, darkMode, setDarkMode }}>
      <LanguageContext.Provider value={{ language, setLanguage }}>
        <UserAccessContext.Provider value={{ userAccess, setUserAccess }}>
          <BrowserRouter>
            <div className="app-container" style={{ backgroundColor: 'var(--bg)' }}>
              <Toaster position="top-right" />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/education"
                  element={
                    <ProtectedRoute>
                      <Education />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </BrowserRouter>
        </UserAccessContext.Provider>
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;