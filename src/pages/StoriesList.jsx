// src/pages/StoriesList.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import "./StoriesList.css";

export default function StoriesList() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
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
    fetchStories();
  }, []);

  return (
    <div className="stories-list-page">
      <h1>📖 Histoires pour enfants</h1>
      {loading && <p>Chargement...</p>}
      <div className="stories-grid">
        {stories.map((story) => (
          <Link to={`/story/${story.id}`} key={story.id} className="story-card-link">
            <div className="story-card">
              <img src={story.coverImage} alt={story.title.fr} className="story-cover" />
              <h3>{story.title.fr}</h3>
              <p>{story.title.ar}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}