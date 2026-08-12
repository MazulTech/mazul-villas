import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarMejoras, listarVillas, type VillaBasica } from "../lib/data";
import type { Mejora } from "../types";
import { CLASE_PILL_URGENCIA, LABEL_URGENCIA, SLA_POR_URGENCIA } from "../lib/urgencia";
import { CLASE_PILL_ESTADO_MEJORA, LABEL_ESTADO_MEJORA } from "../lib/estadoMejora";
import { LABEL_RESOLUCION } from "../lib/resolucion";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import Cargando from "../components/Cargando";

export default function Mejoras() {
  const { profile } = useAuth();
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [villaFiltro, setVillaFiltro] = useState<string>("todas");
  const [mejoras, setMejoras] = useState<Mejora[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarVillas(profile)
      .then(setVillas)
      .catch((e: Error) => setError(e.message));
  }, [profile]);

  useEffect(() => {
    setCargando(true);
    listarMejoras(villaFiltro === "todas" ? undefined : villaFiltro, profile)
      .then((data) => setMejoras(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, [villaFiltro, profile]);

  const items = useMemo(() => {
    const orden = { critico: 0, operacional: 1, estetica: 2 } as const;
    return [...mejoras].sort((a, b) => orden[a.urgencia] - orden[b.urgencia]);
  }, [mejoras]);

  const nombreVilla = (id: string) => {
    const v = villas.find((v) => v.id === id);
    return v ? etiquetaVilla(v) : id;
  };

  return (
    <div>
      <h1 className="page-title">Mejoras</h1>
      <p className="page-sub">Detectadas en recorridos por todas las villas</p>

      <div style={{ marginBottom: 14 }}>
        <label className="field-label">Villa</label>
        <select value={villaFiltro} onChange={(e) => setVillaFiltro(e.target.value)}>
          <option value="todas">Todas las villas</option>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {etiquetaVilla(v)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {cargando && <Cargando texto="Cargando mejoras..." />}

      {!cargando && items.length === 0 && <div className="card card-dashed">Sin mejoras registradas.</div>}

      {items.map((m) => (
        <Link key={m.id} to={`/mejoras/${m.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6, gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {villaFiltro === "todas" ? `${nombreVilla(m.villaId)} · ` : ""}
              {m.zona} · {m.descripcion}
            </span>
            <span className={CLASE_PILL_URGENCIA[m.urgencia]}>{LABEL_URGENCIA[m.urgencia]}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
            {LABEL_RESOLUCION[m.resolucion]} · SLA: {SLA_POR_URGENCIA[m.urgencia]}
          </div>
          <span className={CLASE_PILL_ESTADO_MEJORA[m.estado]}>{LABEL_ESTADO_MEJORA[m.estado]}</span>
        </Link>
      ))}

      <Link
        to="/mejoras/nueva"
        className="btn btn-primary-dark"
        style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}
      >
        + Nueva tarea de mejora
      </Link>
    </div>
  );
}
