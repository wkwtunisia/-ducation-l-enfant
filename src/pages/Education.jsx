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
import {
  useLanguage,
  useUserAccess,
  useTheme,
} from "../App";
import {
  rateStory,
  getStoryRating,
  getUserRatingForStory,
  toggleFavorite,
  getFavorites,
  awardBadge,
  getUserBadges,
  getReadCount,
  incrementReadCount,
} from "../firebase";
import Confetti from 'react-confetti';
import toast from 'react-hot-toast';
import "./Education.css";

export default function Education() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme, themes, darkMode, setDarkMode } = useTheme();
  const { userAccess, setUserAccess } = useUserAccess();
  const [user, setUser] = useState(auth.currentUser);
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Nouvelles fonctionnalités
  const [ratings, setRatings] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [badges, setBadges] = useState([]);
  const [readCount, setReadCount] = useState(0);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [speaking, setSpeaking] = useState(null);

  // Filtres, recherche, pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    category: "all",
    age: "all",
    duration: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const storiesPerPage = 10;

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

  // Chargement des données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storyQuery = query(collection(db, "stories"), orderBy("order", "asc"));
        const snapshot = await getDocs(storyQuery);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStories(data);
        const cats = [...new Set(data.map((s) => s.category).filter(Boolean))];
        setCategories(cats);

        const favs = await getFavorites();
        setFavorites(favs);
        const userBadges = await getUserBadges();
        setBadges(userBadges);
        const count = await getReadCount();
        setReadCount(count);

        const ratingPromises = data.map(async (story) => {
          const avg = await getStoryRating(story.id);
          const userR = await getUserRatingForStory(story.id);
          return { id: story.id, avg, userR };
        });
        const ratingResults = await Promise.all(ratingPromises);
        const avgRatings = {};
        const userRatingsMap = {};
        ratingResults.forEach((r) => {
          avgRatings[r.id] = r.avg;
          userRatingsMap[r.id] = r.userR;
        });
        setRatings(avgRatings);
        setUserRatings(userRatingsMap);
      } catch (err) {
        console.error("Erreur chargement:", err);
        toast.error(t("Erreur de chargement des histoires", "خطأ في تحميل القصص"));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Calcul des histoires accessibles
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

  // Confettis
  useEffect(() => {
    if (unlockedCount > 2 && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [unlockedCount]);

  // Filtrage + recherche
  const filteredStories = stories.filter((story) => {
    const title = getLocalizedValue(story.title, language).toLowerCase();
    const description = getLocalizedValue(story.description, language).toLowerCase();
    const cat = story.category?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    const matchSearch = title.includes(term) || description.includes(term) || cat.includes(term);
    if (!matchSearch) return false;
    if (filters.category !== "all" && story.category !== filters.category) return false;
    if (filters.age !== "all" && story.age !== filters.age) return false;
    if (filters.duration !== "all" && story.duration !== filters.duration) return false;
    return true;
  });

  const indexOfLastStory = currentPage * storiesPerPage;
  const indexOfFirstStory = indexOfLastStory - storiesPerPage;
  const currentStories = filteredStories.slice(indexOfFirstStory, indexOfLastStory);
  const totalPages = Math.ceil(filteredStories.length / storiesPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Gestion des notes
  const handleRate = async (storyId, rating) => {
    try {
      await rateStory(storyId, rating);
      const avg = await getStoryRating(storyId);
      setRatings((prev) => ({ ...prev, [storyId]: avg }));
      setUserRatings((prev) => ({ ...prev, [storyId]: rating }));
      toast.success(t("⭐ Note enregistrée !", "⭐ تم تسجيل التقييم!"));
    } catch (err) {
      toast.error(t("Erreur lors de l'enregistrement", "خطأ في التسجيل"));
    }
  };

  // Gestion des favoris
  const handleToggleFavorite = async (storyId) => {
    try {
      await toggleFavorite(storyId);
      const favs = await getFavorites();
      setFavorites(favs);
      toast.success(favs.includes(storyId) ? t("❤️ Ajouté aux favoris !", "❤️ تمت الإضافة إلى المفضلة!") : t("💔 Retiré des favoris", "💔 تمت الإزالة من المفضلة"));
    } catch (err) {
      toast.error(t("Erreur", "خطأ"));
    }
  };

  // Lecture audio
  // src/pages/Education.jsx (extrait modifié)

// Ajoutez cette fonction utilitaire (en dehors du composant)
// Avec gestion des voix et fallback
const handleSpeak = (content, lang = "fr-FR") => {
  if (!window.speechSynthesis) {
    toast.error(t("Votre navigateur ne supporte pas la synthèse vocale.", "متصفحك لا يدعم تحويل النص إلى كلام."));
    return;
  }
  if (speaking === content) {
    window.speechSynthesis.cancel();
    setSpeaking(null);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(content);
  // Forcer la langue arabe si 'ar' est détecté
  utterance.lang = lang.startsWith('ar') ? 'ar' : lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.1;

  // Chercher une voix appropriée
  const voices = window.speechSynthesis.getVoices();
  let voice = voices.find(v => v.lang.startsWith(utterance.lang));
  if (!voice && lang.startsWith('ar')) {
    voice = voices.find(v => v.lang.startsWith('ar'));
  }
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => setSpeaking(null);
  utterance.onerror = (e) => {
    console.error("Erreur de synthèse vocale :", e);
    toast.error(t("Erreur lors de la lecture audio.", "خطأ في تشغيل الصوت."));
    setSpeaking(null);
  };
  window.speechSynthesis.speak(utterance);
  setSpeaking(content);
};

  // Marquer comme lue
  const handleReadStory = async (storyId) => {
    try {
      await incrementReadCount(storyId);
      const newCount = await getReadCount();
      setReadCount(newCount);
      if (newCount >= 3) await awardBadge("reader-beginner");
      if (newCount >= 10) await awardBadge("bookworm");
      if (newCount >= 25) await awardBadge("explorer");
      const userBadges = await getUserBadges();
      setBadges(userBadges);
      toast.success(t("📖 Histoire marquée comme lue !", "📖 تم وضع علامة مقروءة!"));
    } catch (err) {
      toast.error(t("Erreur", "خطأ"));
    }
  };

  // Gestion packs
  const handlePackSelection = (pack) => {
    setSelectedPack(pack);
    setPackForm({ name: "", phone: "" });
    setPackRequestStatus(null);
  };

  const submitPackRequest = async () => {
    if (!packForm.name || !packForm.phone) {
      toast.error(t("Veuillez remplir tous les champs.", "يرجى ملء جميع الحقول."));
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
      toast.success(t("✅ Demande envoyée ! L'admin validera sous peu.", "✅ تم إرسال الطلب! سيقوم المسؤول بالتحقق قريباً."));
      setTimeout(() => {
        setShowPackModal(false);
        setSelectedPack(null);
        setPackRequestStatus(null);
      }, 2000);
    } catch (err) {
      console.error(err);
      setPackRequestStatus("error");
      toast.error(t("❌ Erreur lors de l'envoi.", "❌ خطأ في الإرسال."));
    }
  };

  // Quiz
  const openQuiz = (story) => {
    if (!story.quiz || story.quiz.length === 0) {
      toast.error(t("Pas de quiz pour cette histoire.", "لا يوجد اختبار لهذه القصة."));
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

  const submitQuiz = async () => {
    const correctCount = currentQuiz.questions.reduce((acc, q, idx) => {
      return acc + (quizAnswers[idx] === q.correctAnswerIndex ? 1 : 0);
    }, 0);
    const total = currentQuiz.questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    setQuizResult({
      correct: correctCount,
      total: total,
      percentage,
    });
    if (percentage === 100) {
      await awardBadge("quiz-master");
      const userBadges = await getUserBadges();
      setBadges(userBadges);
      toast.success(t("🏆 Quiz parfait ! Nouveau badge débloqué !", "🏆 اختبار مثالي! تم فتح شارة جديدة!"));
    } else {
      toast.success(t(`✅ Quiz terminé : ${correctCount}/${total}`, `✅ انتهى الاختبار: ${correctCount}/${total}`));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className={`education-container ${darkMode ? "dark-mode" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
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
          <button className="btn-badges" onClick={() => setShowBadgesModal(true)}>
            🏅 {badges.length}
          </button>
        </div>
        <div className="header-right">
          <button className="btn-darkmode" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️" : "🌙"}
          </button>
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
          <div className="search-bar">
            <input
              type="text"
              placeholder={t("Rechercher une histoire...", "ابحث عن قصة...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filters">
            <div className="filter-group">
              <label>{t("Catégorie", "الفئة")}</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="all">{t("Toutes", "الكل")}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>{t("Âge", "العمر")}</label>
              <select
                value={filters.age}
                onChange={(e) => setFilters({ ...filters, age: e.target.value })}
              >
                <option value="all">{t("Tous", "الكل")}</option>
                <option value="3-5">3-5 ans</option>
                <option value="6-8">6-8 ans</option>
                <option value="9-12">9-12 ans</option>
              </select>
            </div>
            <div className="filter-group">
              <label>{t("Durée", "المدة")}</label>
              <select
                value={filters.duration}
                onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
              >
                <option value="all">{t("Toutes", "الكل")}</option>
                <option value="court">{t("Courte (5 min)", "قصيرة (5 دقائق)")}</option>
                <option value="moyen">{t("Moyenne (10 min)", "متوسطة (10 دقائق)")}</option>
                <option value="long">{t("Longue (15 min)", "طويلة (15 دقائق)")}</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loader"><span></span><span></span><span></span></div>
        ) : filteredStories.length === 0 ? (
          <p>{t("Aucune histoire disponible.", "لا توجد قصص متاحة.")}</p>
        ) : (
          <>
            <div className="stories-grid">
              {currentStories.map((story, index) => {
                const accessible = isStoryAccessible(story);
                const title = getLocalizedValue(story.title, language);
                const description = getLocalizedValue(story.description, language);
                const content = getLocalizedValue(story.content, language);
                const isFav = favorites.includes(story.id);
                const avgRating = ratings[story.id] || 0;
                const userRating = userRatings[story.id] || 0;

                return (
                  <div key={story.id} className={`story-card ${!accessible ? "locked" : ""}`} style={{ animationDelay: `${index * 0.08}s` }}>
                    {story.imageUrl && (
                      <img src={story.imageUrl} alt={title} className="story-card-image" loading="lazy" />
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

                      <div className="story-actions-bar">
                        <div className="rating-stars">
                          {[1, 2, 3, 4, 5].map((r) => (
                            <span
                              key={r}
                              onClick={() => accessible && handleRate(story.id, r)}
                              style={{ cursor: accessible ? "pointer" : "default", opacity: accessible ? 1 : 0.5 }}
                            >
                              {r <= (userRating || avgRating) ? "⭐" : "☆"}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => accessible && handleToggleFavorite(story.id)}
                          disabled={!accessible}
                          className={!accessible ? "disabled" : ""}
                        >
                          {isFav ? "❤️" : "🤍"}
                        </button>
                        {accessible && (
                          <button onClick={() => handleSpeak(content, language === "fr" ? "fr-FR" : "ar-SA")}>
                            {speaking === content ? "🔊" : "🔈"}
                          </button>
                        )}
                      </div>

                      {accessible ? (
                        <>
                          <details>
                            <summary>{t("Lire l'histoire", "اقرأ القصة")}</summary>
                            <div className="story-text">{content}</div>
                            {story.images && story.images.length > 0 && (
                              <div className="story-gallery">
                                {story.images.map((url, idx) => (
                                  <img key={idx} src={url} alt={`illustration ${idx}`} loading="lazy" />
                                ))}
                              </div>
                            )}
                          </details>
                          <button
                            onClick={() => handleReadStory(story.id)}
                            className="btn-read"
                          >
                            📖 {t("Marquer comme lue", "وضع علامة مقروءة")}
                          </button>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={prevPage} disabled={currentPage === 1}>
                  ← {t("Précédent", "السابق")}
                </button>
                <span>{currentPage} / {totalPages}</span>
                <button onClick={nextPage} disabled={currentPage === totalPages}>
                  {t("Suivant", "التالي")} →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Modals (thème, badges, packs, quiz) */}
      {/* Modal thème */}
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

      {/* Modal badges */}
      {showBadgesModal && (
        <div className="modal-overlay" onClick={() => setShowBadgesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🏅 {t("Mes badges", "شاراتي")}</h2>
            {badges.length === 0 ? (
              <p>{t("Pas encore de badges. Continuez à lire et à faire des quiz !", "لا توجد شارات بعد. استمر في القراءة وحل الاختبارات!")}</p>
            ) : (
              <div className="badges-grid">
                {badges.map((badge) => {
                  const badgeInfo = {
                    "reader-beginner": { label: "📖 Lecteur débutant", desc: "3 histoires lues" },
                    "bookworm": { label: "🐛 Ver de livre", desc: "10 histoires lues" },
                    "explorer": { label: "🧭 Explorateur", desc: "25 histoires lues" },
                    "quiz-master": { label: "🏆 Maître des quiz", desc: "Quiz à 100% réussi" },
                  };
                  const info = badgeInfo[badge] || { label: badge, desc: "" };
                  return (
                    <div key={badge} className="badge-item-card">
                      <span className="badge-icon">{info.label.split(" ")[0]}</span>
                      <div>
                        <strong>{info.label}</strong>
                        <p>{info.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="btn-close-modal" onClick={() => setShowBadgesModal(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Modal packs */}
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

      {/* Modal quiz */}
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