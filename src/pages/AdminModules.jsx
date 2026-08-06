// src/pages/AdminModules.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", color: "#4f46e5", icon: "📘" });
  const [editingId, setEditingId] = useState(null);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "modules"));
      const data = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setModules(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchModules(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, "modules", editingId), form);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "modules"), form);
      }
      setForm({ title: "", description: "", color: "#4f46e5", icon: "📘" });
      fetchModules();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ?")) {
      try {
        await deleteDoc(doc(db, "modules", id));
        fetchModules();
      } catch (err) { console.error(err); }
    }
  };

  const handleEdit = (mod) => {
    setEditingId(mod.id);
    setForm({ title: mod.title, description: mod.description, color: mod.color, icon: mod.icon || "📘" });
  };

  return (
    <div className="admin-modules">
      <h2>Gestion des modules</h2>
      <form onSubmit={handleSubmit} className="admin-form">
        <input type="text" placeholder="Titre" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
        <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required />
        <input type="text" placeholder="Icône" value={form.icon} onChange={(e) => setForm({...form, icon: e.target.value})} maxLength={2} />
        <input type="color" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} />
        <button type="submit" className="btn-save">{editingId ? "Mettre à jour" : "Ajouter"}</button>
        {editingId && <button type="button" className="btn-cancel" onClick={() => { setEditingId(null); setForm({ title: "", description: "", color: "#4f46e5", icon: "📘" }); }}>Annuler</button>}
      </form>
      {loading && <p>Chargement...</p>}
      <div className="modules-list">
        {modules.map(mod => (
          <div key={mod.id} className="module-item">
            <div className="module-color" style={{ background: mod.color }} />
            <div className="module-info"><strong>{mod.icon} {mod.title}</strong><p>{mod.description}</p></div>
            <div className="module-actions">
              <button onClick={() => handleEdit(mod)}>✏️</button>
              <button onClick={() => handleDelete(mod.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}