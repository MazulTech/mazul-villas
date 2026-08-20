import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarVillas, type VillaBasica } from "../lib/data";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { mensajeError } from "../lib/errores";
import { conCache } from "../lib/offlineDb";
import Cargando from "../components/Cargando";

// Menú principal de Reservas: elige la villa y de ahí entras a su propia
// bitácora de rentas (ver ReservasVilla.tsx). El dueño ve solo las villas
// que le tocan (listarVillas ya filtra por rol).
export default function Reservas() {
  const { profile } = useAuth();
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deCache, setDeCache] = useState(false);

  useEffect(() => {
    setCargando(true);
    conCache(`villas:${profile?.id ?? "anon"}`, () => listarVillas(profile))
      .then(({ datos, deCache: usoCache }) => {
        setVillas(datos);
        setDeCache(usoCache);
      })
      .catch((e) => setError(mensajeError(e, "No se pudieron cargar las villas.")))
      .finally(() => setCargando(false));
  }, [profile]);

  return (
    <div>
      <h1 className="page-title">Reservas</h1>
      <p className="page-sub">Elige una villa para ver sus rentas e ingresos</p>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {deCache && (
        <div className="card" style={{ background: "var(--warn-bg)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, margin: 0, color: "var(--warn)" }}>
            Sin conexión: mostrando las últimas villas guardadas en este celular.
          </p>
        </div>
      )}

      {cargando && <Cargando texto="Cargando villas..." />}

      {!cargando &&
        villas.map((v) => (
          <Link
            key={v.id}
            to={`/reservas/villa/${v.id}`}
            className="card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>{etiquetaVilla(v)}</span>
            <span style={{ color: "var(--text-secondary)" }}>→</span>
          </Link>
        ))}
    </div>
  );
}
