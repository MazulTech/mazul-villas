import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarVillas, listarReservasCalendario, type VillaBasica, type ReservaCalendario } from "../lib/data";
import { useAuth } from "../contexts/AuthContext";
import { mensajeError } from "../lib/errores";
import { conCache } from "../lib/offlineDb";
import Cargando from "../components/Cargando";
import CuadriculaReservas from "../components/CuadriculaReservas";

const DIAS_ADELANTE = 7;

// Vista completa del calendario de reservas (villas × próximos días), a la
// que se llega desde el menú de Reservas. La misma cuadrícula también se ve
// directo en la pantalla "Hoy" (ver Dashboard.tsx) para que nadie tenga que
// dar clic para verla.
export default function CalendarioReservas() {
  const { profile } = useAuth();
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [reservas, setReservas] = useState<ReservaCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deCache, setDeCache] = useState(false);

  useEffect(() => {
    setCargando(true);
    setError(null);
    Promise.all([
      conCache(`villas:${profile?.id ?? "anon"}`, () => listarVillas(profile)),
      conCache(`reservas-calendario:${profile?.id ?? "anon"}`, () => listarReservasCalendario(DIAS_ADELANTE)),
    ])
      .then(([v, r]) => {
        setVillas(v.datos);
        setReservas(r.datos);
        setDeCache(v.deCache || r.deCache);
      })
      .catch((e) => setError(mensajeError(e, "No se pudo cargar el calendario.")))
      .finally(() => setCargando(false));
  }, [profile]);

  return (
    <div>
      <Link to="/reservas" style={{ fontSize: 12, color: "var(--terra-dark)", display: "inline-block", marginBottom: 12 }}>
        ← Reservas
      </Link>

      <h1 className="page-title">Calendario</h1>
      <p className="page-sub">Próximos {DIAS_ADELANTE} días · quién entra y quién sale</p>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {deCache && (
        <div className="card" style={{ background: "var(--warn-bg)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, margin: 0, color: "var(--warn)" }}>
            Sin conexión: mostrando lo último guardado en este celular.
          </p>
        </div>
      )}

      {cargando ? (
        <Cargando texto="Cargando calendario..." />
      ) : (
        <CuadriculaReservas villas={villas} reservas={reservas} diasAdelante={DIAS_ADELANTE} />
      )}
    </div>
  );
}
