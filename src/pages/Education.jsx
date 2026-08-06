// src/pages/Education.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, signOut } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ADMIN_EMAIL } from "../constants";
import { getLocalizedValue } from "../utils";
import { useLanguage, useUserAccess, useTheme } from "../App";
import Confetti from 'react-confetti';
import "./Education.css";

export default function Education() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme, themes } = useTheme();
  const { userAccess, setUserAccess } = useUserAccess();
  const [user, setUser] = useState(auth.currentUser);
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Modals
  const [showPackModal, setShowPackModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [packForm, setPackForm] = useState({ name: "", phone: "" });
  const [packRequestStatus, setPackRequestStatus] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const t = (fr, ar) => (language === "fr" ? fr : ar);

  const packsOffers = [
    { label: "Jusqu'à 7 histoires", maxStories: 7, price: 5 },
    { label: "Jusqu'à 17 histoires", maxStories: 17, price: 10 },
    { label: "Toutes les histoires", maxStories: 999, price: 15 },
  ];

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const storyQuery = query(collection(db, "stories"), orderBy("order", "asc"));
        const snapshot = await getDocs(storyQuery);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStories(data);
        const cats = [...new Set(data.map((s) => s.category).filter(Boolean))];
        setCategories(cats);
      } catch (err) {
        console.error("Erreur chargement stories:", err);
      }
      setLoading(false);
    };
    fetchStories();
  }, []);

  // Calcul des stories accessibles
  const freeStories = stories.filter((s) => !s.isPremium);
  const premiumStories = stories.filter((s) => s.isPremium);
  const maxStories = userAccess?.maxStories || 0;
  const unlockedPremium = premiumStories.slice(0, Math.max(0, maxStories - freeStories.length));
  const isStoryAccessible = (story) => {
    if (!story.isPremium) return true;
    const index = premiumStories.findIndex((s) => s.id === story.id);
    return index < unlockedPremium.length;
  };

  const unlockedCount = stories.filter((s) => isStoryAccessible(s)).length;
  const totalCount = stories.length;
  const progress = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Confettis lors du déblocage
  useEffect(() => {
    if (unlockedCount > 2 && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [unlockedCount]);

  const filteredStories = stories.filter(
    (story) => selectedCategory === "all" || story.category === selectedCategory
  );

  // Gestion packs
  const handlePackSelection = (pack) => {
    setSelectedPack(pack);
    setPackForm({ name: "", phone: "" });
    setPackRequestStatus(null);
  };

  const submitPackRequest = async () => {
    if (!packForm.name || !packForm.phone) {
      alert(t("Veuillez remplir tous les champs.", "يرجى ملء جميع الحقول."));
      return;
    }
    try {
      await addDoc(collection(db, "packRequests"), {
        uid: user.uid,
        email: user.email,
        name: packForm.name,
        phone: packForm.phone,
        maxStories: selectedPack.maxStories,
        price: selectedPack.price,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setPackRequestStatus("success");
      setTimeout(() => {
        setShowPackModal(false);
        setSelectedPack(null);
        setPackRequestStatus(null);
      }, 2000);
    } catch (err) {
      console.error(err);
      setPackRequestStatus("error");
    }
  };

  // Quiz bilingue
  const openQuiz = (story) => {
    if (!story.quiz || story.quiz.length === 0) {
      alert(t("Pas de quiz pour cette histoire.", "لا يوجد اختبار لهذه القصة."));
      return;
    }
    const questions = story.quiz.map((q) => ({
      question: language === "fr" ? q.questionFr : q.questionAr,
      options: language === "fr" ? q.optionsFr : q.optionsAr,
      correctAnswerIndex: q.correctAnswerIndex,
    }));
    setCurrentQuiz({ storyId: story.id, questions });
    setQuizAnswers(new Array(questions.length).fill(null));
    setQuizResult(null);
    setShowQuizModal(true);
  };

  const handleAnswerChange = (qIndex, optionIndex) => {
    const newAnswers = [...quizAnswers];
    newAnswers[qIndex] = optionIndex;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = () => {
    const correctCount = currentQuiz.questions.reduce((acc, q, idx) => {
      return acc + (quizAnswers[idx] === q.correctAnswerIndex ? 1 : 0);
    }, 0);
    const total = currentQuiz.questions.length;
    setQuizResult({
      correct: correctCount,
      total: total,
      percentage: Math.round((correctCount / total) * 100),
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="education-container" dir={language === "ar" ? "rtl" : "ltr"}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      <header className="education-header">
        <div className="header-left">
          <h1>🎓 Pro Éducation Enfant</h1>
          <span className="user-email">{user?.email}</span>
          <span className="user-stats">
            {t("Stories débloquées :", "القصص المفتوحة:")} {unlockedCount}/{totalCount}
          </span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="header-right">
          <button className="btn-lang" onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}>
            {language === "fr" ? "🇸🇦 العربية" : "🇫🇷 Français"}
          </button>
          <button className="btn-theme" onClick={() => setShowThemeModal(true)}>🎨</button>
          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="btn-admin">⚙️ Admin</button>
          )}
          <button onClick={handleLogout} className="btn-logout">
            <span>🚪</span> {t("Se déconnecter", "تسجيل الخروج")}
          </button>
        </div>
      </header>

      <section className="welcome-section">
        <div className="welcome-banner" style={{ background: `linear-gradient(135deg, var(--primary), var(--secondary))` }}>
          <div className="welcome-text">
            <h2 className="bounce-in">{t("👋 Bonjour !", "👋 مرحباً!")}</h2>
            <p className="fade-in">
              {t(
                "Bienvenue sur votre espace d'apprentissage. Découvrez des histoires et quiz éducatifs.",
                "مرحباً بك في فضاء التعلم الخاص بك. اكتشف القصص والاختبارات التعليمية."
              )}
            </p>
          </div>
          <div className="welcome-emoji rotate">⭐</div>
        </div>
      </section>

      <section className="stories-section">
        <div className="stories-header">
          <h2>{t("📖 Histoires éducatives", "📖 قصص تعليمية")}</h2>
          <div className="filters">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="all">{t("Toutes les catégories", "جميع الفئات")}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="loader"><span></span><span></span><span></span></div>
        ) : filteredStories.length === 0 ? (
          <p>{t("Aucune histoire disponible.", "لا توجد قصص متاحة.")}</p>
        ) : (
          <div className="stories-grid">
            {filteredStories.map((story, index) => {
              const accessible = isStoryAccessible(story);
              const title = getLocalizedValue(story.title, language);
              const description = getLocalizedValue(story.description, language);
              const content = getLocalizedValue(story.content, language);
              return (
                <div key={story.id} className={`story-card ${!accessible ? "locked" : ""}`} style={{ animationDelay: `${index * 0.08}s` }}>
                  {story.imageUrl && (
                    <img src={story.imageUrl} alt={title} className="story-card-image" />
                  )}
                  <div className="story-card-content">
                    <h3>
                      {title}
                      <span className="story-category">#{story.category}</span>
                      {story.isPremium && (
                        <span className="premium-badge">{accessible ? "🔓" : "🔒"}</span>
                      )}
                    </h3>
                    {description && <p>{description}</p>}
                    {accessible ? (
                      <>
                        <details>
                          <summary>{t("Lire l'histoire", "اقرأ القصة")}</summary>
                          <div className="story-text">{content}</div>
                          {story.images && story.images.length > 0 && (
                            <div className="story-gallery">
                              {story.images.map((url, idx) => (
                                <img key={idx} src={url} alt={`illustration ${idx}`} />
                              ))}
                            </div>
                          )}
                        </details>
                        {story.quiz && story.quiz.length > 0 && (
                          <button onClick={() => openQuiz(story)} className="btn-quiz pulse">
                            📝 {t("Quiz", "اختبار")}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="lock-overlay">
                        <p>🔒 {t("Cette histoire est verrouillée", "هذه القصة مقفلة")}</p>
                        <button onClick={() => setShowPackModal(true)} className="btn-upgrade glow">
                          {t("Débloquer avec un pack", "افتح بحزمة")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Thème */}
      {showThemeModal && (
        <div className="modal-overlay" onClick={() => setShowThemeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t("Choisissez votre thème", "اختر ثيمك")}</h2>
            <div className="theme-grid">
              {Object.keys(themes).map((key) => (
                <div
                  key={key}
                  className={`theme-option ${theme === key ? "active" : ""}`}
                  style={{ backgroundColor: themes[key].primary }}
                  onClick={() => {
                    setTheme(key);
                    setShowThemeModal(false);
                  }}
                >
                  <span>{key}</span>
                </div>
              ))}
            </div>
            <button className="btn-close-modal" onClick={() => setShowThemeModal(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Modal Packs */}
      {showPackModal && (
        <div className="modal-overlay" onClick={() => {
          if (!selectedPack) setShowPackModal(false);
          else if (window.confirm(t("Annuler la demande en cours ?", "إلغاء الطلب الحالي؟"))) {
            setSelectedPack(null);
            setShowPackModal(false);
            setPackRequestStatus(null);
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t("Choisissez votre pack", "اختر حزمتك")}</h2>
            {!selectedPack ? (
              <div className="packs-grid">
                {packsOffers.map((pack, idx) => (
                  <div key={idx} className="pack-card">
                    <h3>{pack.label}</h3>
                    <p className="pack-price">{pack.price} Dinar</p>
                    <button onClick={() => handlePackSelection(pack)} className="btn-select-pack">
                      {t("Sélectionner", "اختر")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pack-form">
                <h3>{selectedPack.label}</h3>
                <p>{t("Prix :", "السعر:")} {selectedPack.price} Dinar</p>
                <form onSubmit={(e) => { e.preventDefault(); submitPackRequest(); }}>
                  <div className="form-group">
                    <label>{t("Nom complet", "الاسم الكامل")}</label>
                    <input
                      type="text"
                      required
                      value={packForm.name}
                      onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("Numéro de téléphone", "رقم الهاتف")}</label>
                    <input
                      type="tel"
                      required
                      value={packForm.phone}
                      onChange={(e) => setPackForm({ ...packForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("Email (automatique)", "البريد الإلكتروني (تلقائي)")}</label>
                    <input type="email" value={user?.email || ""} disabled />
                  </div>
                  <div className="pack-form-actions">
                    <button type="submit" className="btn-submit-request">
                      {t("Envoyer la demande", "إرسال الطلب")}
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setSelectedPack(null);
                        setPackRequestStatus(null);
                      }}
                    >
                      {t("Retour", "رجوع")}
                    </button>
                  </div>
                </form>
                {packRequestStatus === "success" && (
                  <p className="success-msg">✅ {t("Demande envoyée ! L'admin validera sous peu.", "تم إرسال الطلب! سيقوم المسؤول بالتحقق قريباً.")}</p>
                )}
                {packRequestStatus === "error" && (
                  <p className="error-msg">❌ {t("Erreur lors de l'envoi.", "خطأ في الإرسال.")}</p>
                )}
              </div>
            )}
            <button className="btn-close-modal" onClick={() => {
              setShowPackModal(false);
              setSelectedPack(null);
              setPackRequestStatus(null);
            }}>✕</button>
          </div>
        </div>
      )}

      {/* Modal Quiz */}
      {showQuizModal && currentQuiz && (
        <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="modal-content quiz-modal" onClick={(e) => e.stopPropagation()}>
            <h2>📝 {t("Quiz", "اختبار")}</h2>
            {quizResult ? (
              <div className="quiz-result">
                <p>{t("Votre score :", "نتيجتك:")} {quizResult.correct}/{quizResult.total}</p>
                <p>{quizResult.percentage}%</p>
                <button onClick={() => setShowQuizModal(false)} className="btn-close-quiz">
                  {t("Fermer", "إغلاق")}
                </button>
              </div>
            ) : (
              <>
                {currentQuiz.questions.map((q, qIdx) => (
                  <div key={qIdx} className="quiz-question">
                    <p><strong>{qIdx + 1}. {q.question}</strong></p>
                    <div className="quiz-options">
                      {q.options.map((opt, oIdx) => (
                        <label key={oIdx}>
                          <input
                            type="radio"
                            name={`q${qIdx}`}
                            value={oIdx}
                            checked={quizAnswers[qIdx] === oIdx}
                            onChange={() => handleAnswerChange(qIdx, oIdx)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={submitQuiz} className="btn-submit-quiz">
                  {t("Soumettre", "إرسال")}
                </button>
              </>
            )}
            <button className="btn-close-modal" onClick={() => setShowQuizModal(false)}>✕</button>
          </div>
        </div>
      )}

      <footer className="education-footer">
        <p>
          {t(
            "© 2026 Pro Éducation Enfant — Tous droits réservés.",
            "© 2026 برو إديوكيشن إنفانت — جميع الحقوق محفوظة."
          )}
        </p>
      </footer>
    </div>
  );
}