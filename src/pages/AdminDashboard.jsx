// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, signOut } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  setDoc,
} from "firebase/firestore";
import { ADMIN_EMAIL } from "../constants";
import { getAllUsers } from "../firebase";
import toast from 'react-hot-toast';
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("requests");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = auth.currentUser;

  // --- Stories ---
  const [stories, setStories] = useState([]);
  const [storyForm, setStoryForm] = useState({
    titleFr: "",
    titleAr: "",
    descriptionFr: "",
    descriptionAr: "",
    contentFr: "",
    contentAr: "",
    imageUrl: "",
    images: [],
    category: "",
    order: 0,
    isPremium: false,
    quiz: [],
    age: "6-8",
    duration: "moyen",
  });
  const [editingStoryId, setEditingStoryId] = useState(null);
  const [imageInput, setImageInput] = useState("");
  const [quizQuestion, setQuizQuestion] = useState({
    questionFr: "",
    questionAr: "",
    optionsFr: ["", "", "", ""],
    optionsAr: ["", "", "", ""],
    correctAnswerIndex: 0,
  });

  // --- Quiz management modal ---
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuizStoryId, setCurrentQuizStoryId] = useState(null);
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState([]);
  const [editingQuizQuestionIndex, setEditingQuizQuestionIndex] = useState(null);
  const [tempQuizQuestion, setTempQuizQuestion] = useState({
    questionFr: "",
    questionAr: "",
    optionsFr: ["", "", "", ""],
    optionsAr: ["", "", "", ""],
    correctAnswerIndex: 0,
  });

  // --- Videos ---
  const [videos, setVideos] = useState([]);
  const [videoForm, setVideoForm] = useState({
    titleFr: "",
    titleAr: "",
    descriptionFr: "",
    descriptionAr: "",
    youtubeUrl: "",
    category: "",
    age: "6-8",
    order: 0,
    isPremium: false,
  });
  const [editingVideoId, setEditingVideoId] = useState(null);

  // --- Packs ---
  const [packs, setPacks] = useState([]);
  const [packForm, setPackForm] = useState({
    name: "",
    price: "",
    storyCount: "",
    description: "",
  });
  const [editingPackId, setEditingPackId] = useState(null);

  // --- Demandes ---
  const [requests, setRequests] = useState([]);

  // --- Utilisateurs ---
  const [users, setUsers] = useState([]);
  const [usersAccess, setUsersAccess] = useState([]);

  // Redirection admin
  useEffect(() => {
    if (user?.email !== ADMIN_EMAIL) navigate("/education");
  }, [user, navigate]);

  // ----- Chargement des données -----
  const fetchStories = async () => {
    try {
      const q = query(collection(db, "stories"), orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      setStories(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur stories:", err);
      setStories([]);
    }
  };

  const fetchVideos = async () => {
    try {
      const q = query(collection(db, "videos"), orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      setVideos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur videos:", err);
      setVideos([]);
    }
  };

  const fetchPacks = async () => {
    try {
      const snapshot = await getDocs(collection(db, "packs"));
      setPacks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur packs:", err);
      setPacks([]);
    }
  };

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, "packRequests"), where("status", "==", "pending"));
      const snapshot = await getDocs(q);
      setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur requests:", err);
      setRequests([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersData = await getAllUsers();
      setUsers(usersData || []);
    } catch (err) {
      console.error("Erreur users:", err);
      setUsers([]);
    }
  };

  const fetchUsersAccess = async () => {
    try {
      const snapshot = await getDocs(collection(db, "userAccess"));
      setUsersAccess(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur userAccess:", err);
      setUsersAccess([]);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchStories(),
      fetchVideos(),
      fetchPacks(),
      fetchRequests(),
      fetchUsers(),
      fetchUsersAccess(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ----- Gestion des histoires (formulaire principal) -----
  const addQuizQuestion = () => {
    if (
      !quizQuestion.questionFr ||
      !quizQuestion.questionAr ||
      quizQuestion.optionsFr.some((o) => !o.trim()) ||
      quizQuestion.optionsAr.some((o) => !o.trim())
    ) {
      toast.error("Veuillez remplir toutes les questions et options dans les deux langues.");
      return;
    }
    setStoryForm((prev) => ({
      ...prev,
      quiz: [...(prev.quiz || []), { ...quizQuestion }],
    }));
    setQuizQuestion({
      questionFr: "",
      questionAr: "",
      optionsFr: ["", "", "", ""],
      optionsAr: ["", "", "", ""],
      correctAnswerIndex: 0,
    });
  };

  const removeQuizQuestion = (index) => {
    setStoryForm((prev) => ({
      ...prev,
      quiz: (prev.quiz || []).filter((_, i) => i !== index),
    }));
  };

  const handleStorySubmit = async (e) => {
    e.preventDefault();
    if (!storyForm.titleFr && !storyForm.titleAr) {
      toast.error("Titre requis au moins en français ou arabe.");
      return;
    }
    const storyData = {
      title: { fr: storyForm.titleFr, ar: storyForm.titleAr },
      description: { fr: storyForm.descriptionFr, ar: storyForm.descriptionAr },
      content: { fr: storyForm.contentFr, ar: storyForm.contentAr },
      imageUrl: storyForm.imageUrl || "",
      images: storyForm.images || [],
      category: storyForm.category || "Général",
      order: Number(storyForm.order) || 0,
      isPremium: storyForm.isPremium || false,
      quiz: storyForm.quiz || [],
      age: storyForm.age || "6-8",
      duration: storyForm.duration || "moyen",
      createdAt: serverTimestamp(),
    };
    try {
      if (editingStoryId) {
        await updateDoc(doc(db, "stories", editingStoryId), storyData);
        toast.success("Histoire mise à jour !");
        setEditingStoryId(null);
      } else {
        await addDoc(collection(db, "stories"), storyData);
        toast.success("Histoire ajoutée !");
      }
      setStoryForm({
        titleFr: "",
        titleAr: "",
        descriptionFr: "",
        descriptionAr: "",
        contentFr: "",
        contentAr: "",
        imageUrl: "",
        images: [],
        category: "",
        order: 0,
        isPremium: false,
        quiz: [],
        age: "6-8",
        duration: "moyen",
      });
      setImageInput("");
      fetchStories();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const loadStoryForEdit = (story) => {
    setEditingStoryId(story.id);
    setStoryForm({
      titleFr: story.title?.fr || "",
      titleAr: story.title?.ar || "",
      descriptionFr: story.description?.fr || "",
      descriptionAr: story.description?.ar || "",
      contentFr: story.content?.fr || "",
      contentAr: story.content?.ar || "",
      imageUrl: story.imageUrl || "",
      images: story.images || [],
      category: story.category || "",
      order: story.order || 0,
      isPremium: story.isPremium || false,
      quiz: story.quiz || [],
      age: story.age || "6-8",
      duration: story.duration || "moyen",
    });
  };

  // ----- Gestion du quiz (modal dédié) -----
  const openQuizManager = (story) => {
    setCurrentQuizStoryId(story.id);
    setCurrentQuizQuestions(story.quiz || []);
    setEditingQuizQuestionIndex(null);
    setTempQuizQuestion({
      questionFr: "",
      questionAr: "",
      optionsFr: ["", "", "", ""],
      optionsAr: ["", "", "", ""],
      correctAnswerIndex: 0,
    });
    setShowQuizModal(true);
  };

  const handleEditQuizQuestion = (index) => {
    const q = currentQuizQuestions[index];
    setEditingQuizQuestionIndex(index);
    setTempQuizQuestion({
      questionFr: q.questionFr || "",
      questionAr: q.questionAr || "",
      optionsFr: q.optionsFr || ["", "", "", ""],
      optionsAr: q.optionsAr || ["", "", "", ""],
      correctAnswerIndex: q.correctAnswerIndex || 0,
    });
  };

  const handleDeleteQuizQuestion = async (index) => {
    if (!window.confirm("Supprimer cette question du quiz ?")) return;
    const newQuestions = currentQuizQuestions.filter((_, i) => i !== index);
    setCurrentQuizQuestions(newQuestions);
    try {
      await updateDoc(doc(db, "stories", currentQuizStoryId), {
        quiz: newQuestions,
      });
      toast.success("Question supprimée !");
      fetchStories();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleSaveQuizQuestion = async () => {
    if (
      !tempQuizQuestion.questionFr ||
      !tempQuizQuestion.questionAr ||
      tempQuizQuestion.optionsFr.some(o => !o.trim()) ||
      tempQuizQuestion.optionsAr.some(o => !o.trim())
    ) {
      toast.error("Veuillez remplir tous les champs en français et en arabe.");
      return;
    }
    const newQuestions = [...currentQuizQuestions];
    if (editingQuizQuestionIndex !== null) {
      newQuestions[editingQuizQuestionIndex] = { ...tempQuizQuestion };
    } else {
      newQuestions.push({ ...tempQuizQuestion });
    }
    setCurrentQuizQuestions(newQuestions);
    try {
      await updateDoc(doc(db, "stories", currentQuizStoryId), {
        quiz: newQuestions,
      });
      toast.success(editingQuizQuestionIndex !== null ? "Question modifiée !" : "Question ajoutée !");
      setEditingQuizQuestionIndex(null);
      setTempQuizQuestion({
        questionFr: "",
        questionAr: "",
        optionsFr: ["", "", "", ""],
        optionsAr: ["", "", "", ""],
        correctAnswerIndex: 0,
      });
      fetchStories();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const cancelQuizEdit = () => {
    setEditingQuizQuestionIndex(null);
    setTempQuizQuestion({
      questionFr: "",
      questionAr: "",
      optionsFr: ["", "", "", ""],
      optionsAr: ["", "", "", ""],
      correctAnswerIndex: 0,
    });
  };

  // ----- Gestion des vidéos -----
  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    if (!videoForm.titleFr && !videoForm.titleAr) {
      toast.error("Titre requis au moins en français ou arabe.");
      return;
    }
    const videoData = {
      title: { fr: videoForm.titleFr, ar: videoForm.titleAr },
      description: { fr: videoForm.descriptionFr, ar: videoForm.descriptionAr },
      youtubeUrl: videoForm.youtubeUrl || "",
      category: videoForm.category || "Général",
      age: videoForm.age || "6-8",
      order: Number(videoForm.order) || 0,
      isPremium: videoForm.isPremium || false,
      createdAt: serverTimestamp(),
    };
    try {
      if (editingVideoId) {
        await updateDoc(doc(db, "videos", editingVideoId), videoData);
        toast.success("Vidéo mise à jour !");
        setEditingVideoId(null);
      } else {
        await addDoc(collection(db, "videos"), videoData);
        toast.success("Vidéo ajoutée !");
      }
      setVideoForm({
        titleFr: "",
        titleAr: "",
        descriptionFr: "",
        descriptionAr: "",
        youtubeUrl: "",
        category: "",
        age: "6-8",
        order: 0,
        isPremium: false,
      });
      fetchVideos();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const loadVideoForEdit = (video) => {
    setEditingVideoId(video.id);
    setVideoForm({
      titleFr: video.title?.fr || "",
      titleAr: video.title?.ar || "",
      descriptionFr: video.description?.fr || "",
      descriptionAr: video.description?.ar || "",
      youtubeUrl: video.youtubeUrl || "",
      category: video.category || "",
      age: video.age || "6-8",
      order: video.order || 0,
      isPremium: video.isPremium || false,
    });
  };

  // ----- Gestion des packs -----
  const handlePackSubmit = async (e) => {
    e.preventDefault();
    if (!packForm.name || !packForm.price || !packForm.storyCount) return;
    const data = {
      name: packForm.name,
      price: Number(packForm.price),
      storyCount: Number(packForm.storyCount),
      description: packForm.description || "",
    };
    try {
      if (editingPackId) {
        await updateDoc(doc(db, "packs", editingPackId), data);
        setEditingPackId(null);
        toast.success("Pack mis à jour !");
      } else {
        await addDoc(collection(db, "packs"), data);
        toast.success("Pack ajouté !");
      }
      setPackForm({ name: "", price: "", storyCount: "", description: "" });
      fetchPacks();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const handleDeletePack = async (id) => {
    if (!window.confirm("Supprimer ce pack ?")) return;
    try {
      await deleteDoc(doc(db, "packs", id));
      toast.success("Pack supprimé !");
      fetchPacks();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleEditPack = (pack) => {
    setEditingPackId(pack.id);
    setPackForm({
      name: pack.name,
      price: String(pack.price),
      storyCount: String(pack.storyCount),
      description: pack.description || "",
    });
  };

  // ----- Gestion des demandes -----
  const approveRequest = async (requestId, uid, maxStories) => {
    try {
      const userAccessRef = doc(db, "userAccess", uid);
      await setDoc(userAccessRef, { maxStories }, { merge: true });
      await updateDoc(doc(db, "packRequests", requestId), {
        status: "approved",
        processedAt: serverTimestamp(),
      });
      toast.success("Demande approuvée !");
      await fetchRequests();
      await fetchUsersAccess();
    } catch (err) {
      console.error("Erreur approbation:", err);
      toast.error("Erreur lors de l'approbation. Vérifiez les permissions.");
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await updateDoc(doc(db, "packRequests", requestId), {
        status: "rejected",
        processedAt: serverTimestamp(),
      });
      toast.info("Demande rejetée.");
      await fetchRequests();
    } catch (err) {
      console.error("Erreur rejet:", err);
      toast.error("Erreur lors du rejet.");
    }
  };

  // ----- Gestion des utilisateurs -----
  const resetUserAccess = async (uid) => {
    if (!window.confirm("Réinitialiser l'accès de cet utilisateur à 2 histoires ?")) return;
    try {
      await setDoc(doc(db, "userAccess", uid), {
        uid,
        maxStories: 2,
        packId: null,
        purchasedAt: null,
      });
      toast.success("Accès réinitialisé !");
      fetchUsersAccess();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la réinitialisation.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (user?.email !== ADMIN_EMAIL) return null;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>⚙️ Administration</h1>
        <div>
          <span className="admin-email">{user?.email}</span>
          <button onClick={() => navigate("/education")} className="btn-back">
            ← Retour
          </button>
          <button onClick={handleLogout} className="btn-logout-admin">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="admin-content">
        <aside className="admin-sidebar">
          <ul>
            <li
              className={activeTab === "requests" ? "active" : ""}
              onClick={() => setActiveTab("requests")}
            >
              📨 Demandes ({requests.length})
            </li>
            <li
              className={activeTab === "stories" ? "active" : ""}
              onClick={() => setActiveTab("stories")}
            >
              📖 Histoires ({stories.length})
            </li>
            <li
              className={activeTab === "videos" ? "active" : ""}
              onClick={() => setActiveTab("videos")}
            >
              🎬 Vidéos ({videos.length})
            </li>
            <li
              className={activeTab === "packs" ? "active" : ""}
              onClick={() => setActiveTab("packs")}
            >
              📦 Packs ({packs.length})
            </li>
            <li
              className={activeTab === "users" ? "active" : ""}
              onClick={() => setActiveTab("users")}
            >
              👥 Utilisateurs ({users.length})
            </li>
          </ul>
        </aside>

        <main className="admin-main">
          <div className="admin-stats">
            <div className="stat-card" style={{ borderLeftColor: "var(--primary)" }}>
              <span className="stat-number">{stories.length + videos.length}</span>
              <span>📚 Ressources</span>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "#f59e0b" }}>
              <span className="stat-number">{packs.length}</span>
              <span>📦 Packs</span>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "#22c55e" }}>
              <span className="stat-number">{usersAccess.length}</span>
              <span>👥 Utilisateurs</span>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "#ec4899" }}>
              <span className="stat-number">{requests.length}</span>
              <span>📨 Demandes</span>
            </div>
          </div>

          {/* ===== ONGLET DEMANDES ===== */}
          {activeTab === "requests" && (
            <section>
              <h2>📨 Demandes de packs en attente</h2>
              {loading ? (
                <div className="loader"><span></span><span></span><span></span></div>
              ) : requests.length === 0 ? (
                <p className="empty-state">Aucune demande en attente.</p>
              ) : (
                <div className="requests-list">
                  {requests.map((req) => (
                    <div key={req.id} className="request-item">
                      <div className="request-info">
                        <p><strong>Nom :</strong> {req.name}</p>
                        <p><strong>Email :</strong> {req.email}</p>
                        <p><strong>Téléphone :</strong> {req.phone}</p>
                        <p><strong>Pack :</strong> {req.maxStories === 999 ? "Toutes" : `Jusqu'à ${req.maxStories} histoires`}</p>
                        <p><strong>Prix :</strong> {req.price} Dinar</p>
                        <p><strong>Demandé le :</strong> {req.createdAt?.toDate?.().toLocaleString() || "N/A"}</p>
                      </div>
                      <div className="request-actions">
                        <button
                          onClick={() => approveRequest(req.id, req.uid, req.maxStories)}
                          className="btn-approve"
                        >
                          ✅ Approuver
                        </button>
                        <button
                          onClick={() => rejectRequest(req.id)}
                          className="btn-reject"
                        >
                          ❌ Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ===== ONGLET HISTOIRES ===== */}
          {activeTab === "stories" && (
            <section className="story-management">
              <h2>📖 Gestion des histoires (quiz bilingue)</h2>

              <form onSubmit={handleStorySubmit} className="admin-form story-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Titre (FR) *</label>
                    <input
                      type="text"
                      placeholder="Titre en français"
                      value={storyForm.titleFr}
                      onChange={(e) => setStoryForm({ ...storyForm, titleFr: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Titre (AR) *</label>
                    <input
                      type="text"
                      placeholder="العنوان بالعربية"
                      value={storyForm.titleAr}
                      onChange={(e) => setStoryForm({ ...storyForm, titleAr: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Description (FR)</label>
                    <textarea
                      placeholder="Description en français"
                      value={storyForm.descriptionFr}
                      onChange={(e) => setStoryForm({ ...storyForm, descriptionFr: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (AR)</label>
                    <textarea
                      placeholder="الوصف بالعربية"
                      value={storyForm.descriptionAr}
                      onChange={(e) => setStoryForm({ ...storyForm, descriptionAr: e.target.value })}
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Contenu (FR)</label>
                    <textarea
                      placeholder="Contenu français"
                      value={storyForm.contentFr}
                      onChange={(e) => setStoryForm({ ...storyForm, contentFr: e.target.value })}
                      rows={5}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contenu (AR)</label>
                    <textarea
                      placeholder="النص بالعربية"
                      value={storyForm.contentAr}
                      onChange={(e) => setStoryForm({ ...storyForm, contentAr: e.target.value })}
                      rows={5}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Image principale (URL)</label>
                    <input
                      type="text"
                      placeholder="https://exemple.com/image.jpg"
                      value={storyForm.imageUrl}
                      onChange={(e) => setStoryForm({ ...storyForm, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Catégorie</label>
                    <input
                      type="text"
                      placeholder="Ex: Aventure"
                      value={storyForm.category}
                      onChange={(e) => setStoryForm({ ...storyForm, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Ordre (numéro)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={storyForm.order}
                      onChange={(e) => setStoryForm({ ...storyForm, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Premium</label>
                    <input
                      type="checkbox"
                      checked={storyForm.isPremium}
                      onChange={(e) => setStoryForm({ ...storyForm, isPremium: e.target.checked })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Âge recommandé</label>
                    <select
                      value={storyForm.age}
                      onChange={(e) => setStoryForm({ ...storyForm, age: e.target.value })}
                    >
                      <option value="3-5">3-5 ans</option>
                      <option value="6-8">6-8 ans</option>
                      <option value="9-12">9-12 ans</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Durée de lecture</label>
                    <select
                      value={storyForm.duration}
                      onChange={(e) => setStoryForm({ ...storyForm, duration: e.target.value })}
                    >
                      <option value="court">Courte (5 min)</option>
                      <option value="moyen">Moyenne (10 min)</option>
                      <option value="long">Longue (15 min)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Images supplémentaires</label>
                  <div className="image-gallery-input">
                    <input
                      type="text"
                      placeholder="URL d'une image"
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (imageInput.trim()) {
                          setStoryForm((prev) => ({
                            ...prev,
                            images: [...(prev.images || []), imageInput.trim()],
                          }));
                          setImageInput("");
                        }
                      }}
                    >
                      Ajouter
                    </button>
                  </div>
                  <div className="image-preview-list">
                    {(storyForm.images || []).map((url, idx) => (
                      <div key={idx} className="image-preview-item">
                        <img src={url} alt="" width="60" />
                        <button
                          type="button"
                          onClick={() =>
                            setStoryForm((prev) => ({
                              ...prev,
                              images: (prev.images || []).filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quiz avec sélection visuelle */}
                <div className="form-group quiz-section">
                  <label>Quiz (questions/réponses bilingues)</label>
                  <div className="quiz-builder">
                    <input
                      type="text"
                      placeholder="Question (FR)"
                      value={quizQuestion.questionFr}
                      onChange={(e) => setQuizQuestion({ ...quizQuestion, questionFr: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Question (AR)"
                      value={quizQuestion.questionAr}
                      onChange={(e) => setQuizQuestion({ ...quizQuestion, questionAr: e.target.value })}
                      dir="rtl"
                    />
                    <div className="quiz-options-input">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="option-pair">
                          <input
                            type="text"
                            placeholder={`Option ${i + 1} (FR)`}
                            value={quizQuestion.optionsFr[i] || ""}
                            onChange={(e) => {
                              const opts = [...quizQuestion.optionsFr];
                              opts[i] = e.target.value;
                              setQuizQuestion({ ...quizQuestion, optionsFr: opts });
                            }}
                          />
                          <input
                            type="text"
                            placeholder={`Option ${i + 1} (AR)`}
                            value={quizQuestion.optionsAr[i] || ""}
                            onChange={(e) => {
                              const opts = [...quizQuestion.optionsAr];
                              opts[i] = e.target.value;
                              setQuizQuestion({ ...quizQuestion, optionsAr: opts });
                            }}
                            dir="rtl"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="correct-answer-selector">
                      <label>Réponse correcte :</label>
                      <div className="options-radio-group">
                        {[0, 1, 2, 3].map((i) => (
                          <label key={i} className={`option-radio ${quizQuestion.correctAnswerIndex === i ? 'selected' : ''}`}>
                            <input
                              type="radio"
                              name="correctAnswer"
                              value={i}
                              checked={quizQuestion.correctAnswerIndex === i}
                              onChange={() => setQuizQuestion({ ...quizQuestion, correctAnswerIndex: i })}
                            />
                            <span className="option-label">
                              {quizQuestion.optionsFr[i] || `Option ${i+1}`} / {quizQuestion.optionsAr[i] || `خيار ${i+1}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button type="button" onClick={addQuizQuestion}>
                      Ajouter une question
                    </button>
                  </div>
                  <div className="quiz-preview">
                    {(storyForm.quiz || []).map((q, idx) => (
                      <div key={idx} className="quiz-item">
                        <span>
                          {idx + 1}. FR: {q.questionFr} / AR: {q.questionAr}
                        </span>
                        <button type="button" onClick={() => removeQuizQuestion(idx)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save">
                    {editingStoryId ? "Mettre à jour l'histoire" : "Ajouter l'histoire"}
                  </button>
                  {editingStoryId && (
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setEditingStoryId(null);
                        setStoryForm({
                          titleFr: "",
                          titleAr: "",
                          descriptionFr: "",
                          descriptionAr: "",
                          contentFr: "",
                          contentAr: "",
                          imageUrl: "",
                          images: [],
                          category: "",
                          order: 0,
                          isPremium: false,
                          quiz: [],
                          age: "6-8",
                          duration: "moyen",
                        });
                        setImageInput("");
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>

              <div className="stories-list">
                {stories.map((story) => (
                  <div key={story.id} className="story-item">
                    <div className="story-header">
                      <strong>{story.title?.fr || story.title?.ar || "Sans titre"}</strong>
                      <span className="badge order">Ordre {story.order}</span>
                      <span className={`badge ${story.isPremium ? "premium" : "free"}`}>
                        {story.isPremium ? "🔒 Premium" : "🆓 Gratuit"}
                      </span>
                      <span className="badge quiz-count">Quiz: {(story.quiz || []).length}</span>
                      <span className="badge age-badge">{story.age || "6-8"}</span>
                      <span className="badge duration-badge">{story.duration || "moyen"}</span>
                      <div className="story-actions">
                        <button onClick={() => loadStoryForEdit(story)} title="Modifier l'histoire">✏️</button>
                        <button onClick={() => openQuizManager(story)} title="Gérer le quiz" className="btn-quiz-manage">📝</button>
                        <button
                          onClick={async () => {
                            if (window.confirm("Supprimer cette histoire ?")) {
                              await deleteDoc(doc(db, "stories", story.id));
                              toast.success("Histoire supprimée !");
                              fetchStories();
                            }
                          }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== ONGLET VIDÉOS ===== */}
          {activeTab === "videos" && (
            <section className="video-management">
              <h2>🎬 Gestion des vidéos éducatives</h2>

              <form onSubmit={handleVideoSubmit} className="admin-form video-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Titre (FR) *</label>
                    <input
                      type="text"
                      placeholder="Titre en français"
                      value={videoForm.titleFr}
                      onChange={(e) => setVideoForm({ ...videoForm, titleFr: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Titre (AR) *</label>
                    <input
                      type="text"
                      placeholder="العنوان بالعربية"
                      value={videoForm.titleAr}
                      onChange={(e) => setVideoForm({ ...videoForm, titleAr: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Description (FR)</label>
                    <textarea
                      placeholder="Description en français"
                      value={videoForm.descriptionFr}
                      onChange={(e) => setVideoForm({ ...videoForm, descriptionFr: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (AR)</label>
                    <textarea
                      placeholder="الوصف بالعربية"
                      value={videoForm.descriptionAr}
                      onChange={(e) => setVideoForm({ ...videoForm, descriptionAr: e.target.value })}
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>URL YouTube</label>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoForm.youtubeUrl}
                      onChange={(e) => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Catégorie</label>
                    <input
                      type="text"
                      placeholder="Ex: Science, Musique..."
                      value={videoForm.category}
                      onChange={(e) => setVideoForm({ ...videoForm, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Âge recommandé</label>
                    <select
                      value={videoForm.age}
                      onChange={(e) => setVideoForm({ ...videoForm, age: e.target.value })}
                    >
                      <option value="3-5">3-5 ans</option>
                      <option value="6-8">6-8 ans</option>
                      <option value="9-12">9-12 ans</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ordre</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={videoForm.order}
                      onChange={(e) => setVideoForm({ ...videoForm, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Premium</label>
                    <input
                      type="checkbox"
                      checked={videoForm.isPremium}
                      onChange={(e) => setVideoForm({ ...videoForm, isPremium: e.target.checked })}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save">
                    {editingVideoId ? "Mettre à jour la vidéo" : "Ajouter la vidéo"}
                  </button>
                  {editingVideoId && (
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setEditingVideoId(null);
                        setVideoForm({
                          titleFr: "",
                          titleAr: "",
                          descriptionFr: "",
                          descriptionAr: "",
                          youtubeUrl: "",
                          category: "",
                          age: "6-8",
                          order: 0,
                          isPremium: false,
                        });
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>

              <div className="videos-list">
                {videos.map((video) => (
                  <div key={video.id} className="video-item">
                    <div className="video-header">
                      <strong>{video.title?.fr || video.title?.ar || "Sans titre"}</strong>
                      <span className="badge order">Ordre {video.order}</span>
                      <span className={`badge ${video.isPremium ? "premium" : "free"}`}>
                        {video.isPremium ? "🔒 Premium" : "🆓 Gratuit"}
                      </span>
                      <span className="badge age-badge">{video.age || "6-8"}</span>
                      <div className="video-actions">
                        <button onClick={() => loadVideoForEdit(video)}>✏️</button>
                        <button
                          onClick={async () => {
                            if (window.confirm("Supprimer cette vidéo ?")) {
                              await deleteDoc(doc(db, "videos", video.id));
                              toast.success("Vidéo supprimée !");
                              fetchVideos();
                            }
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {video.youtubeUrl && (
                      <div className="video-preview">
                        <iframe
                          width="200"
                          height="113"
                          src={`https://www.youtube.com/embed/${extractVideoId(video.youtubeUrl)}`}
                          title="Aperçu vidéo"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== ONGLET PACKS ===== */}
          {activeTab === "packs" && (
            <section>
              <h2>📦 Gestion des packs (offres)</h2>
              <form onSubmit={handlePackSubmit} className="admin-form">
                <input
                  type="text"
                  placeholder="Nom du pack"
                  value={packForm.name}
                  onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Prix (Dinar)"
                  value={packForm.price}
                  onChange={(e) => setPackForm({ ...packForm, price: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Nombre d'histoires"
                  value={packForm.storyCount}
                  onChange={(e) => setPackForm({ ...packForm, storyCount: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={packForm.description}
                  onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                />
                <button type="submit" className="btn-save">
                  {editingPackId ? "Mettre à jour" : "Ajouter"}
                </button>
                {editingPackId && (
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setEditingPackId(null);
                      setPackForm({ name: "", price: "", storyCount: "", description: "" });
                    }}
                  >
                    Annuler
                  </button>
                )}
              </form>
              <div className="packs-list">
                {packs.map((pack) => (
                  <div key={pack.id} className="pack-item">
                    <strong>{pack.name}</strong> - {pack.price} Dinar - {pack.storyCount} histoires
                    <div className="pack-actions">
                      <button onClick={() => handleEditPack(pack)}>✏️</button>
                      <button onClick={() => handleDeletePack(pack.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== ONGLET UTILISATEURS ===== */}
          {activeTab === "users" && (
            <section>
              <h2>👥 Gestion des utilisateurs</h2>
              <div className="users-list">
                {users.map((u) => {
                  const access = usersAccess.find((a) => a.id === u.uid);
                  return (
                    <div key={u.uid} className="user-item">
                      <span><strong>Email :</strong> {u.email}</span>
                      <span><strong>UID :</strong> {u.uid}</span>
                      <span><strong>Inscrit le :</strong> {u.createdAt?.toDate?.().toLocaleDateString() || "N/A"}</span>
                      <span><strong>Stories débloquées :</strong> {access?.maxStories || 2}</span>
                      <span><strong>Pack :</strong> {access?.packId || "Aucun"}</span>
                      <button onClick={() => resetUserAccess(u.uid)} className="btn-reset">
                        Réinitialiser (2 gratuites)
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ===== MODAL DE GESTION DU QUIZ ===== */}
      {showQuizModal && (
        <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="modal-content quiz-modal" onClick={(e) => e.stopPropagation()}>
            <h2>📝 Gestion du quiz</h2>
            {currentQuizQuestions.length > 0 && (
              <div className="quiz-questions-list">
                <h4>Questions existantes :</h4>
                {currentQuizQuestions.map((q, idx) => (
                  <div key={idx} className="quiz-question-item">
                    <div className="quiz-question-header">
                      <strong>Q{idx+1} :</strong> {q.questionFr} / {q.questionAr}
                      <div className="quiz-question-actions">
                        <button onClick={() => handleEditQuizQuestion(idx)}>✏️</button>
                        <button onClick={() => handleDeleteQuizQuestion(idx)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <hr />
            <h4>{editingQuizQuestionIndex !== null ? "Modifier la question" : "Ajouter une question"}</h4>
            <div className="quiz-builder-simple">
              <input
                type="text"
                placeholder="Question (FR)"
                value={tempQuizQuestion.questionFr}
                onChange={(e) => setTempQuizQuestion({ ...tempQuizQuestion, questionFr: e.target.value })}
              />
              <input
                type="text"
                placeholder="Question (AR)"
                value={tempQuizQuestion.questionAr}
                onChange={(e) => setTempQuizQuestion({ ...tempQuizQuestion, questionAr: e.target.value })}
                dir="rtl"
              />
              <div className="options-pair">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="option-pair">
                    <input
                      type="text"
                      placeholder={`Option ${i+1} (FR)`}
                      value={tempQuizQuestion.optionsFr[i] || ""}
                      onChange={(e) => {
                        const opts = [...tempQuizQuestion.optionsFr];
                        opts[i] = e.target.value;
                        setTempQuizQuestion({ ...tempQuizQuestion, optionsFr: opts });
                      }}
                    />
                    <input
                      type="text"
                      placeholder={`Option ${i+1} (AR)`}
                      value={tempQuizQuestion.optionsAr[i] || ""}
                      onChange={(e) => {
                        const opts = [...tempQuizQuestion.optionsAr];
                        opts[i] = e.target.value;
                        setTempQuizQuestion({ ...tempQuizQuestion, optionsAr: opts });
                      }}
                      dir="rtl"
                    />
                  </div>
                ))}
              </div>

              <div className="correct-answer-selector">
                <label>Réponse correcte :</label>
                <div className="options-radio-group">
                  {[0, 1, 2, 3].map((i) => (
                    <label key={i} className={`option-radio ${tempQuizQuestion.correctAnswerIndex === i ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="tempCorrectAnswer"
                        value={i}
                        checked={tempQuizQuestion.correctAnswerIndex === i}
                        onChange={() => setTempQuizQuestion({ ...tempQuizQuestion, correctAnswerIndex: i })}
                      />
                      <span className="option-label">
                        {tempQuizQuestion.optionsFr[i] || `Option ${i+1}`} / {tempQuizQuestion.optionsAr[i] || `خيار ${i+1}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="quiz-actions">
                <button onClick={handleSaveQuizQuestion} className="btn-save">
                  {editingQuizQuestionIndex !== null ? "Mettre à jour" : "Ajouter"}
                </button>
                {editingQuizQuestionIndex !== null && (
                  <button onClick={cancelQuizEdit} className="btn-cancel">Annuler</button>
                )}
              </div>
            </div>
            <button className="btn-close-modal" onClick={() => setShowQuizModal(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Fonction utilitaire pour extraire l'ID YouTube
function extractVideoId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : '';
}