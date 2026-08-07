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

// Fonction utilitaire pour extraire l'ID YouTube
function extractVideoId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : '';
}

export default function Education() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme, themes, darkMode, setDarkMode } = useTheme();
  const { userAccess, setUserAccess } = useUserAccess();
  const [user, setUser] = useState(auth.currentUser);
  const [resources, setResources] = useState([]);
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
  const resourcesPerPage = 10;

  // Modals packs et quiz
  const [showPackModal, setShowPackModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [packForm, setPackForm] = useState({ name: "", phone: "" });
  const [packRequestStatus, setPackRequestStatus] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState([]);
  const [quizAttempted, setQuizAttempted] = useState(false);

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
        // Récupérer les histoires
        const storyQuery = query(collection(db, "stories"), orderBy("order", "asc"));
        const storySnapshot = await getDocs(storyQuery);
        const storiesData = storySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          type: "story",
        }));

        // Récupérer les vidéos
        const videoQuery = query(collection(db, "videos"), orderBy("order", "asc"));
        const videoSnapshot = await getDocs(videoQuery);
        const videosData = videoSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          type: "video",
        }));

        // Fusionner et trier par ordre
        const allResources = [...storiesData, ...videosData].sort((a, b) => (a.order || 0) - (b.order || 0));
        setResources(allResources);

        // Extraire les catégories uniques
        const cats = [...new Set(allResources.map((r) => r.category).filter(Boolean))];
        setCategories(cats);

        // Favoris, badges, lectures
        const favs = await getFavorites();
        setFavorites(favs);

        const userBadges = await getUserBadges();
        setBadges(userBadges);

        const count = await getReadCount();
        setReadCount(count);

        // Charger les notes (seulement pour les histoires)
        const ratingPromises = allResources
          .filter(r => r.type === "story")
          .map(async (story) => {
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
        toast.error(t("Erreur de chargement des données.", "خطأ في تحميل البيانات."));
      }
      setLoading(false);
    };
    fetchData();
  }, [language]);

  // Calcul des ressources accessibles
  const maxResources = userAccess?.maxStories || 0;
  const freeResources = resources.filter((r) => !r.isPremium);
  const premiumResources = resources.filter((r) => r.isPremium);
  const unlockedPremium = premiumResources.slice(0, Math.max(0, maxResources - freeResources.length));
  const isResourceAccessible = (resource) => {
    if (!resource.isPremium) return true;
    const index = premiumResources.findIndex((r) => r.id === resource.id);
    return index < unlockedPremium.length;
  };

  const unlockedCount = resources.filter((r) => isResourceAccessible(r)).length;
  const totalCount = resources.length;
  const progress = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Confettis
  useEffect(() => {
    if (unlockedCount > 2 && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [unlockedCount]);

  // Filtrage et pagination
  const filteredResources = resources.filter((resource) => {
    const title = getLocalizedValue(resource.title, language).toLowerCase();
    const description = getLocalizedValue(resource.description, language).toLowerCase();
    const cat = resource.category?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    const matchSearch = title.includes(term) || description.includes(term) || cat.includes(term);
    const matchCategory = filters.category === "all" || resource.category === filters.category;
    const matchAge = filters.age === "all" || resource.age === filters.age;
    const matchDuration = filters.duration === "all" || resource.duration === filters.duration || !resource.duration;
    return matchSearch && matchCategory && matchAge && matchDuration;
  });

  const totalPages = Math.ceil(filteredResources.length / resourcesPerPage);
  const indexOfLastResource = currentPage * resourcesPerPage;
  const indexOfFirstResource = indexOfLastResource - resourcesPerPage;
  const currentResources = filteredResources.slice(indexOfFirstResource, indexOfLastResource);

  // Gestion des notes
  const handleRate = async (resourceId, rating) => {
    const resource = resources.find(r => r.id === resourceId);
    if (resource?.type !== "story") {
      toast.info(t("Cette ressource ne peut pas être notée.", "لا يمكن تقييم هذا المورد."));
      return;
    }
    try {
      await rateStory(resourceId, rating);
      const avg = await getStoryRating(resourceId);
      setRatings((prev) => ({ ...prev, [resourceId]: avg }));
      setUserRatings((prev) => ({ ...prev, [resourceId]: rating }));
      toast.success(t("⭐ Note enregistrée !", "⭐ تم تسجيل التقييم!"));
    } catch (err) {
      toast.error(t("Erreur lors de la notation.", "خطأ في التقييم."));
    }
  };

  // Gestion des favoris
  const handleToggleFavorite = async (resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    if (resource?.type !== "story") {
      toast.info(t("Seules les histoires peuvent être mises en favoris.", "يمكن إضافة القصص فقط إلى المفضلة."));
      return;
    }
    try {
      await toggleFavorite(resourceId);
      const favs = await getFavorites();
      setFavorites(favs);
      toast.success(favs.includes(resourceId) ? t("❤️ Ajouté aux favoris !", "❤️ تمت الإضافة إلى المفضلة!") : t("💔 Retiré des favoris.", "💔 تمت الإزالة من المفضلة."));
    } catch (err) {
      toast.error(t("Erreur.", "خطأ."));
    }
  };

  // Lecture audio
  const getVoiceForLanguage = (lang) => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => v.lang.startsWith(lang));
    if (!voice && lang.startsWith('ar')) {
      voice = voices.find(v => v.lang.startsWith('ar'));
    }
    if (!voice) voice = voices[0];
    return voice;
  };

  const handleSpeak = (content, lang = "fr-FR") => {
    if (!content) {
      toast.info(t("Aucun contenu à lire.", "لا يوجد محتوى للقراءة."));
      return;
    }
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
    utterance.lang = lang.startsWith('ar') ? 'ar' : lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    const voice = getVoiceForLanguage(utterance.lang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = (e) => {
      console.error("Erreur vocale :", e);
      toast.error(t("Erreur de lecture audio.", "خطأ في تشغيل الصوت."));
      setSpeaking(null);
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(content);
  };

  // Marquer comme lu
  const handleReadStory = async (resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    if (resource?.type !== "story") {
      toast.info(t("Seules les histoires peuvent être marquées comme lues.", "يمكن وضع علامة مقروءة على القصص فقط."));
      return;
    }
    try {
      await incrementReadCount(resourceId);
      const newCount = await getReadCount();
      setReadCount(newCount);
      if (newCount >= 3) await awardBadge("reader-beginner");
      if (newCount >= 10) await awardBadge("bookworm");
      if (newCount >= 25) await awardBadge("explorer");
      const userBadges = await getUserBadges();
      setBadges(userBadges);
      toast.success(t("📖 Histoire marquée comme lue !", "📖 تم وضع علامة مقروءة!"));
    } catch (err) {
      toast.error(t("Erreur.", "خطأ."));
    }
  };

  // Quiz
  const openQuiz = (resource) => {
    if (resource.type !== "story") {
      toast.info(t("Pas de quiz pour cette ressource.", "لا يوجد اختبار لهذا المورد."));
      return;
    }
    if (!resource.quiz || resource.quiz.length === 0) {
      toast(t("Pas de quiz pour cette histoire.", "لا يوجد اختبار لهذه القصة."));
      return;
    }
    const questions = resource.quiz.map((q) => ({
      question: language === "fr" ? q.questionFr : q.questionAr,
      options: language === "fr" ? q.optionsFr : q.optionsAr,
      correctAnswerIndex: q.correctAnswerIndex,
    }));
    setCurrentQuiz({ storyId: resource.id, questions });
    setQuizAnswers(new Array(questions.length).fill(null));
    setQuizFeedback(new Array(questions.length).fill(null));
    setQuizResult(null);
    setQuizAttempted(false);
    setShowQuizModal(true);
  };

  const handleAnswerChange = (qIndex, optionIndex) => {
    const newAnswers = [...quizAnswers];
    newAnswers[qIndex] = optionIndex;
    setQuizAnswers(newAnswers);
    const feedback = quizFeedback.map((f, i) => {
      if (i === qIndex) {
        const correct = optionIndex === currentQuiz.questions[i].correctAnswerIndex;
        return { answered: true, correct };
      }
      return f;
    });
    setQuizFeedback(feedback);
  };

  const submitQuiz = async () => {
    const questions = currentQuiz.questions;
    let correctCount = 0;
    const feedback = questions.map((q, idx) => {
      const userAnswer = quizAnswers[idx];
      const isCorrect = userAnswer === q.correctAnswerIndex;
      if (isCorrect) correctCount++;
      return { answered: userAnswer !== null, correct: isCorrect, userAnswer, correctAnswer: q.correctAnswerIndex };
    });
    setQuizFeedback(feedback);
    setQuizAttempted(true);
    const total = questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    setQuizResult({ correct: correctCount, total, percentage });
    if (percentage === 100) {
      await awardBadge("quiz-master");
      const userBadges = await getUserBadges();
      setBadges(userBadges);
      toast.success("🏆 Quiz parfait ! Vous avez gagné le badge Maître des quiz !");
    } else {
      toast.info(t(`Vous avez ${correctCount}/${total} bonnes réponses.`, `لديك ${correctCount}/${total} إجابة صحيحة.`));
    }
  };

  const resetQuiz = () => {
    setQuizAnswers(new Array(currentQuiz.questions.length).fill(null));
    setQuizFeedback(new Array(currentQuiz.questions.length).fill(null));
    setQuizResult(null);
    setQuizAttempted(false);
  };

  // Gestion des packs
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
      toast.success(t("✅ Demande envoyée ! L'admin validera sous peu.", "✅ تم إرسال الطلب! سيقوم المسؤول بالتحقق قريباً."));
      setPackRequestStatus("success");
      setTimeout(() => {
        setShowPackModal(false);
        setSelectedPack(null);
        setPackRequestStatus(null);
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error(t("❌ Erreur lors de l'envoi.", "❌ خطأ في الإرسال."));
      setPackRequestStatus("error");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // Rendu d'une ressource
  const renderResourceCard = (resource, index) => {
    const accessible = isResourceAccessible(resource);
    const title = getLocalizedValue(resource.title, language);
    const description = getLocalizedValue(resource.description, language);
    const isFav = favorites.includes(resource.id);
    const avgRating = ratings[resource.id] || 0;
    const userRating = userRatings[resource.id] || 0;

    return (
      <div key={resource.id} className={`resource-card ${!accessible ? "locked" : ""}`} style={{ animationDelay: `${index * 0.08}s` }}>
        {resource.type === "video" && resource.youtubeUrl && (
          <div className="video-player">
            <iframe
              src={`https://www.youtube.com/embed/${extractVideoId(resource.youtubeUrl)}`}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )}
        {resource.type === "story" && resource.imageUrl && (
          <img src={resource.imageUrl} alt={title} className="resource-image" loading="lazy" />
        )}

        <div className="resource-content">
          <h3>
            {title}
            <span className="resource-category">#{resource.category}</span>
            {resource.isPremium && (
              <span className="premium-badge">{accessible ? "🔓" : "🔒"}</span>
            )}
            <span className="resource-type-badge">
              {resource.type === "video" ? "🎬 Vidéo" : "📖 Histoire"}
            </span>
          </h3>
          {description && <p>{description}</p>}

          {/* Actions communes */}
          <div className="resource-actions-bar">
            {resource.type === "story" && (
              <>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <span
                      key={r}
                      onClick={() => accessible && handleRate(resource.id, r)}
                      style={{ cursor: accessible ? "pointer" : "default", opacity: accessible ? 1 : 0.5 }}
                    >
                      {r <= (userRating || avgRating) ? "⭐" : "☆"}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => accessible && handleToggleFavorite(resource.id)}
                  disabled={!accessible}
                  className={!accessible ? "disabled" : ""}
                >
                  {isFav ? "❤️" : "🤍"}
                </button>
                {accessible && (
                  <button onClick={() => handleSpeak(resource.content?.[language] || "", language === "fr" ? "fr-FR" : "ar-SA")}>
                    {speaking === resource.content?.[language] ? "🔊" : "🔈"}
                  </button>
                )}
              </>
            )}
          </div>

          {accessible ? (
            <>
              {resource.type === "story" && resource.content && (
                <details>
                  <summary>{t("Lire l'histoire", "اقرأ القصة")}</summary>
                  <div className="story-text">{getLocalizedValue(resource.content, language)}</div>
                  {resource.images && resource.images.length > 0 && (
                    <div className="story-gallery">
                      {resource.images.map((url, idx) => (
                        <img key={idx} src={url} alt={`illustration ${idx}`} loading="lazy" />
                      ))}
                    </div>
                  )}
                </details>
              )}
              {resource.type === "video" && (
                <div className="video-description">
                  {getLocalizedValue(resource.description, language)}
                </div>
              )}
              {resource.type === "story" && (
                <>
                  <button onClick={() => handleReadStory(resource.id)} className="btn-read">
                    📖 {t("Marquer comme lue", "وضع علامة مقروءة")}
                  </button>
                  {resource.quiz && resource.quiz.length > 0 && (
                    <button onClick={() => openQuiz(resource)} className="btn-quiz pulse">
                      📝 {t("Quiz", "اختبار")}
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="lock-overlay">
              <p>🔒 {t("Cette ressource est verrouillée", "هذا المورد مقفل")}</p>
              <button onClick={() => setShowPackModal(true)} className="btn-upgrade glow">
                {t("Débloquer avec un pack", "افتح بحزمة")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
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
          <button className="btn-lang" onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}>
            {language === "fr" ? "🇸🇦 العربية" : "🇫🇷 Français"}
          </button>
          <button className="btn-darkmode" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️" : "🌙"}
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
            <div className="search-bar">
              <input
                type="text"
                placeholder={t("Rechercher une histoire...", "ابحث عن قصة...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
        ) : filteredResources.length === 0 ? (
          <p>{t("Aucune ressource disponible.", "لا توجد موارد متاحة.")}</p>
        ) : (
          <>
            <div className="stories-grid">
              {currentResources.map((resource, index) => renderResourceCard(resource, index))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>
                  ← {t("Précédent", "السابق")}
                </button>
                <span>{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>
                  {t("Suivant", "التالي")} →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Modal Badges */}
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

      {/* Modal Quiz amélioré */}
      {showQuizModal && currentQuiz && (
        <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="modal-content quiz-modal" onClick={(e) => e.stopPropagation()}>
            <h2>📝 {t("Quiz", "اختبار")}</h2>
            {quizResult ? (
              <div className="quiz-result">
                <p>{t("Votre score :", "نتيجتك:")} {quizResult.correct}/{quizResult.total}</p>
                <p>{quizResult.percentage}%</p>
                {quizResult.percentage === 100 && <p>🏆 {t("Parfait !", "ممتاز!")}</p>}
                <div className="quiz-feedback">
                  {quizFeedback.map((fb, idx) => (
                    <div key={idx} className={`feedback-item ${fb.correct ? "correct" : "incorrect"}`}>
                      <strong>{idx+1}.</strong> {fb.correct ? "✅" : "❌"}
                      {!fb.correct && <span> {t("Bonne réponse :", "الإجابة الصحيحة:")} {currentQuiz.questions[idx].options[fb.correctAnswer]}</span>}
                    </div>
                  ))}
                </div>
                <button onClick={resetQuiz} className="btn-retry-quiz">
                  🔄 {t("Recommencer", "إعادة المحاولة")}
                </button>
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
                      {q.options.map((opt, oIdx) => {
                        const answered = quizFeedback[qIdx]?.answered;
                        const isCorrect = quizFeedback[qIdx]?.correct;
                        const isSelected = quizAnswers[qIdx] === oIdx;
                        let className = "quiz-option";
                        if (answered) {
                          if (oIdx === q.correctAnswerIndex) className += " correct";
                          else if (isSelected && !isCorrect) className += " incorrect";
                        }
                        return (
                          <label key={oIdx} className={className}>
                            <input
                              type="radio"
                              name={`q${qIdx}`}
                              value={oIdx}
                              checked={isSelected}
                              onChange={() => handleAnswerChange(qIdx, oIdx)}
                              disabled={quizFeedback[qIdx]?.answered}
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button onClick={submitQuiz} className="btn-submit-quiz" disabled={quizAnswers.some(a => a === null)}>
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