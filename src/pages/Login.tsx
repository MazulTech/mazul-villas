import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { signIn, error, profile, cargando } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Si el login ya funcionó (o ya habia sesion activa), mandar a la app en
  // vez de dejar a la persona parada en la pantalla de login.
  if (!cargando && profile) {
    return <Navigate to="/" replace />;
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErrorLocal(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="app-shell" style={{ justifyContent: "center" }}>
      <form onSubmit={enviar} style={{ width: "100%", maxWidth: 320, margin: "0 auto", padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/glyph.png" alt="Mazul" width={56} height={54} style={{ marginBottom: 8 }} />
          <div>
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, letterSpacing: 4, fontSize: 22, color: "var(--espresso)" }}>
              MAZUL
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>Puerto Escondido · Oaxaca</p>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label className="field-label" htmlFor="login-email">Correo</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label" htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {(errorLocal || error) && (
          <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>
              {errorLocal || error}
            </p>
          </div>
        )}

        <button className="btn btn-primary-dark" disabled={enviando} type="submit">
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
