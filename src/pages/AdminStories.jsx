// src/pages/AdminStories.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";

export default function AdminStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    titleFr: "",
    titleAr: "",
    contentFr: "",
    contentAr: "",
    coverImage: "",
    images: "", // sera splitté en array
  });

  const fetchStories = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setStories(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { titleFr, titleAr, contentFr, contentAr, coverImage, images } = form;
    if (!titleFr || !titleAr || !contentFr || !contentAr || !coverImage) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const storyData = {
      title: { fr: titleFr, ar: titleAr },
      content: { fr: contentFr, ar: contentAr },
      coverImage,
      images: images.split(",").map((url) => url.trim()).filter(Boolean),
      createdAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "stories", editingId), storyData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "stories"), storyData);
      }
      setForm({
        titleFr: "",
        titleAr: "",
        contentFr: "",
        contentAr: "",
        coverImage: "",
        images: "",
      });
      fetchStories();
    } catch (err) {
      console.error(err);
      alert("Erreur d'enregistrement.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette histoire ?")) {
      try {
        await deleteDoc(doc(db, "stories", id));
        fetchStories();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEdit = (story) => {
    setEditingId(story.id);
    setForm({
      titleFr: story.title.fr || "",
      titleAr: story.title.ar || "",
      contentFr: story.content.fr || "",
      contentAr: story.content.ar || "",
      coverImage: story.coverImage || "",
      images: (story.images || []).join(", "),
    });
  };

  return (
    <div className="admin-stories">
      <h2>📖 Gestion des histoires</h2>

      <form onSubmit={handleSubmit} className="admin-form story-form">
        <div className="form-row">
          <input
            type="text"
            placeholder="Titre (FR)"
            value={form.titleFr}
            onChange={(e) => setForm({ ...form, titleFr: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="العنوان (AR)"
            value={form.titleAr}
            onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <textarea
            placeholder="Contenu (FR)"
            value={form.contentFr}
            onChange={(e) => setForm({ ...form, contentFr: e.target.value })}
            rows="4"
            required
          />
          <textarea
            placeholder="المحتوى (AR)"
            value={form.contentAr}
            onChange={(e) => setForm({ ...form, contentAr: e.target.value })}
            rows="4"
            required
          />
        </div>
        <div className="form-row">
          <input
            type="url"
            placeholder="URL de l'image de couverture"
            value={form.coverImage}
            onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <input
            type="text"
            placeholder="URLs des images supplémentaires (séparées par des virgules)"
            value={form.images}
            onChange={(e) => setForm({ ...form, images: e.target.value })}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-save">
            {editingId ? "Mettre à jour" : "Ajouter"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn-cancel"
              onClick={() => {
                setEditingId(null);
                setForm({
                  titleFr: "",
                  titleAr: "",
                  contentFr: "",
                  contentAr: "",
                  coverImage: "",
                  images: "",
                });
              }}
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {loading && <p>Chargement des histoires...</p>}
      <div className="stories-list">
        {stories.map((story) => (
          <div key={story.id} className="story-item">
            <img src={story.coverImage} alt={story.title.fr} width="80" height="80" style={{ objectFit: "cover" }} />
            <div className="story-info">
              <strong>{story.title.fr}</strong> / <span dir="rtl">{story.title.ar}</span>
              <p>{story.content.fr?.substring(0, 60)}...</p>
            </div>
            <div className="story-actions">
              <button onClick={() => handleEdit(story)}>✏️</button>
              <button onClick={() => handleDelete(story.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}