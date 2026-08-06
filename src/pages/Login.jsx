import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "../firebase";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/education");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎓 Pro Éducation Enfant</h1>
          <p>{isRegistering ? "Créer un compte" : "Connectez-vous à votre espace"}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? "Chargement..."
              : isRegistering
              ? "Créer un compte"
              : "Se connecter"}
          </button>

          <div className="toggle-mode">
            <span>
              {isRegistering
                ? "Vous avez déjà un compte ?"
                : "Pas encore de compte ?"}
            </span>
            <button
              type="button"
              className="btn-link"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? "Se connecter" : "Créer un compte"}
            </button>
          </div>
        </form>

        <div className="login-footer">
          <p>🔒 Connexion sécurisée avec Firebase</p>
        </div>
      </div>
    </div>
  );
}
