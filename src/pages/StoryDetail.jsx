// src/pages/StoryDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import "./StoryDetail.css";

export default function StoryDetail() {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("fr"); // fr ou ar

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const snapshot = await getDoc(doc(db, "stories", id));
        if (snapshot.exists()) {
          setStory({ id: snapshot.id, ...snapshot.data() });
        } else {
          setStory(null);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchStory();
  }, [id]);

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Chargement...</div>;
  if (!story) return <div style={{ padding: "40px" }}>Histoire non trouvée.</div>;

  const title = story.title[lang] || story.title.fr;
  const content = story.content[lang] || story.content.fr;

  return (
    <div className="story-detail-container">
      <div className="story-detail-header">
        <Link to="/stories" className="btn-back-stories">← Retour aux histoires</Link>
        <div className="lang-switch">
          <button onClick={() => setLang("fr")} className={lang === "fr" ? "active" : ""}>Français</button>
          <button onClick={() => setLang("ar")} className={lang === "ar" ? "active" : ""}>العربية</button>
        </div>
      </div>
      <div className="story-detail-content">
        <img src={story.coverImage} alt={title} className="story-detail-cover" />
        <h1>{title}</h1>
        <div className="story-text" dir={lang === "ar" ? "rtl" : "ltr"}>
          {content.split("\n").map((para, i) => <p key={i}>{para}</p>)}
        </div>
        {story.images && story.images.length > 0 && (
          <div className="story-gallery">
            <h3>Images de l'histoire</h3>
            <div className="gallery-grid">
              {story.images.map((url, idx) => (
                <img key={idx} src={url} alt={`Image ${idx+1}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}