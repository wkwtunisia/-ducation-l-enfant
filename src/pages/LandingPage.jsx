// src/pages/LandingPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage, useTheme } from "../App";
import "./LandingPage.css";

export default function LandingPage() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme, themes, darkMode, setDarkMode } = useTheme();
  const [showFeatures, setShowFeatures] = useState(false);

  const t = (fr, ar) => (language === "fr" ? fr : ar);

  useEffect(() => {
    // Animation au scroll
    const handleScroll = () => {
      const features = document.querySelector(".features-section");
      if (features) {
        const rect = features.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          setShowFeatures(true);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-container" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header de la landing */}
      <header className="landing-header">
        <div className="logo">
          <span>🎓</span>
          <h1>Pro Éducation Enfant</h1>
        </div>
        <div className="header-actions">
          <button
            className="btn-lang"
            onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
          >
            {language === "fr" ? "🇸🇦 العربية" : "🇫🇷 Français"}
          </button>
          <button
            className="btn-darkmode"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <Link to="/login" className="btn-login">
            {t("Se connecter", "تسجيل الدخول")}
          </Link>
        </div>
      </header>

      {/* Section Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              {t(
                "📚 Apprendre en s'amusant",
                "📚 تعلم بالمرح"
              )}
            </h1>
            <p className="hero-subtitle">
              {t(
                "Des histoires interactives, des quiz et des activités éducatives pour les enfants de 3 à 12 ans.",
                "قصص تفاعلية، اختبارات وأنشطة تعليمية للأطفال من 3 إلى 12 سنة."
              )}
            </p>
            <Link to="/login" className="btn-start">
              {t("Commencer maintenant →", "ابدأ الآن ←")}
            </Link>
          </div>
          <div className="hero-image">
            <div className="floating-emoji">📖</div>
            <div className="floating-emoji delay-1">⭐</div>
            <div className="floating-emoji delay-2">🧠</div>
            <div className="hero-illustration">
              <span className="big-emoji">🧒</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section className={`features-section ${showFeatures ? "visible" : ""}`}>
        <h2 className="section-title">
          {t("Pourquoi Pro Éducation Enfant ?", "لماذا برو إديوكيشن إنفانت؟")}
        </h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📖</div>
            <h3>{t("Histoires interactives", "قصص تفاعلية")}</h3>
            <p>
              {t(
                "Des histoires captivantes avec des images et des quiz pour renforcer la compréhension.",
                "قصص مشوقة مع صور واختبارات لتعزيز الفهم."
              )}
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>{t("Bilingue (FR/AR)", "ثنائي اللغة (فرنسي/عربي)")}</h3>
            <p>
              {t(
                "Apprenez dans les deux langues pour développer vos compétences linguistiques.",
                "تعلم باللغتين لتطوير مهاراتك اللغوية."
              )}
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏅</div>
            <h3>{t("Système de badges", "نظام الشارات")}</h3>
            <p>
              {t(
                "Gagnez des badges en lisant des histoires et en réussissant des quiz.",
                "احصل على شارات بقراءة القصص واجتياز الاختبارات."
              )}
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>{t("Thèmes personnalisables", "ثيمات قابلة للتخصيص")}</h3>
            <p>
              {t(
                "Choisissez votre couleur préférée pour personnaliser l'application.",
                "اختر لونك المفضل لتخصيص التطبيق."
              )}
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>{t("Suivi de progression", "تتبع التقدم")}</h3>
            <p>
              {t(
                "Visualisez les histoires lues, les badges gagnés et votre progression.",
                "شاهد القصص المقروءة والشارات المحققة وتقدمك."
              )}
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔊</div>
            <h3>{t("Lecture audio", "قراءة صوتية")}</h3>
            <p>
              {t(
                "Écoutez les histoires avec la synthèse vocale intégrée.",
                "استمع إلى القصص باستخدام تحويل النص إلى كلام."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Section des packs (pour donner envie) */}
      <section className="packs-preview">
        <h2 className="section-title">
          {t("Choisissez votre formule", "اختر باقاتك")}
        </h2>
        <div className="packs-preview-grid">
          <div className="pack-preview-card">
            <h3>{t("Pack 7 histoires", "حزمة 7 قصص")}</h3>
            <p className="price">5 Dinar</p>
            <p>{t("Idéal pour commencer", "مثالي للبدء")}</p>
          </div>
          <div className="pack-preview-card featured">
            <h3>{t("Pack 17 histoires", "حزمة 17 قصة")}</h3>
            <p className="price">10 Dinar</p>
            <p>{t("Le plus populaire", "الأكثر شعبية")}</p>
          </div>
          <div className="pack-preview-card">
            <h3>{t("Pack Illimité", "حزمة غير محدودة")}</h3>
            <p className="price">15 Dinar</p>
            <p>{t("Tout débloquer", "افتح كل شيء")}</p>
          </div>
        </div>
      </section>

      {/* Section Call-to-Action */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>{t("Prêt à commencer l'aventure ?", "هل أنت مستعد لبدء المغامرة؟")}</h2>
          <p>
            {t(
              "Rejoignez des centaines d'enfants qui apprennent en s'amusant chaque jour.",
              "انضم إلى مئات الأطفال الذين يتعلمون ويستمتعون كل يوم."
            )}
          </p>
          <Link to="/login" className="btn-cta">
            {t("Créer un compte gratuit", "إنشاء حساب مجاني")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Pro Éducation Enfant — {t("Tous droits réservés.", "جميع الحقوق محفوظة.")}</p>
      </footer>
    </div>
  );
}