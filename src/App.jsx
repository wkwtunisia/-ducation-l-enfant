// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useState, useContext, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, createUserDocument } from "./firebase";
import Login from "./pages/Login";
import Education from "./pages/Education";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { Toaster } from "react-hot-toast";
import "./App.css";

// Contextes
export const LanguageContext = createContext();
export const useLanguage = () => useContext(LanguageContext);

export const UserAccessContext = createContext();
export const useUserAccess = () => useContext(UserAccessContext);

export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const themes = {
  blue: { primary: "#4f46e5", secondary: "#818cf8", accent: "#e0e7ff", bg: "#f5f7fa" },
  pink: { primary: "#ec4899", secondary: "#f472b6", accent: "#fce7f3", bg: "#fdf2f8" },
  green: { primary: "#22c55e", secondary: "#4ade80", accent: "#dcfce7", bg: "#f0fdf4" },
  orange: { primary: "#f59e0b", secondary: "#fbbf24", accent: "#fef3c7", bg: "#fffbeb" },
  purple: { primary: "#8b5cf6", secondary: "#a78bfa", accent: "#ede9fe", bg: "#f5f3ff" },
};

function App() {
  const [language, setLanguage] = useState("fr");
  const [theme, setTheme] = useState("blue");
  const [darkMode, setDarkMode] = useState(false);
  const [userAccess, setUserAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  // Appliquer le thème et le mode sombre
  useEffect(() => {
    const colors = themes[theme];
    if (darkMode) {
      document.documentElement.style.setProperty("--primary", colors.primary);
      document.documentElement.style.setProperty("--secondary", colors.secondary);
      document.documentElement.style.setProperty("--accent", colors.accent);
      document.documentElement.style.setProperty("--bg", "#1a1a2e");
      document.documentElement.style.setProperty("--text", "#f0f0f0");
      document.documentElement.style.setProperty("--card-bg", "#2d2d44");
      document.documentElement.style.setProperty("--border", "#444");
    } else {
      document.documentElement.style.setProperty("--primary", colors.primary);
      document.documentElement.style.setProperty("--secondary", colors.secondary);
      document.documentElement.style.setProperty("--accent", colors.accent);
      document.documentElement.style.setProperty("--bg", colors.bg);
      document.documentElement.style.setProperty("--text", "#1a1a2e");
      document.documentElement.style.setProperty("--card-bg", "#ffffff");
      document.documentElement.style.setProperty("--border", "#e2e8f0");
    }
  }, [theme, darkMode]);

  // Étoiles de fond (uniquement en mode clair, ou adapté)
  useEffect(() => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    for (let i = 0; i < 30; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.width = (Math.random() * 6 + 2) + 'px';
      star.style.height = star.style.width;
      star.style.animationDelay = (Math.random() * 3) + 's';
      container.appendChild(star);
    }
    document.body.appendChild(container);
    return () => document.body.removeChild(container);
  }, []);

  // Chargement de l'utilisateur
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await createUserDocument(user);
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
            <div className="app-container" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
              <Toaster position="top-right" />
              <Routes>
                <Route path="/" element={<Login />} />
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