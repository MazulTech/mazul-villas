import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { mejoras as mejorasSeed, villas } from "../data/mockData";
import { CLASE_PILL_URGENCIA, LABEL_URGENCIA, SLA_POR_URGENCIA } from "../lib/urgencia";

const RESOLUCION_LABEL: Record<string, string> = {
  equipo: "Lo resuelve el equipo",
  materiales: "Requiere comprar material o pieza",
  contratar: "Requiere contratar a alguien",
};

export default function Mejoras() {
  const [villaFiltro, setVillaFiltro] = useState<string>("todas");

  const items = useMemo(() => {
    const base = villaFiltro === "todas" ? mejorasSeed : mejorasSeed.filter((m) => m.villaId === villaFiltro);
    const orden = { critico: 0, operacional: 1, estetica: 2 } as const;
    return [...base].sort((a, b) => orden[a.urgencia] - orden[b.urgencia]);
  }, [villaFiltro]);

  const nombreVilla = (id: string) => villas.find((v) => v.id === id)?.nombre ?? id;

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
              {v.nombre}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 && (
        <div className="card card-dashed">Sin mejoras registradas.</div>
      )}

      {items.map((m) => (
        <div key={m.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {villaFiltro === "todas" ? `${nombreVilla(m.villaId)} · ` : ""}
              {m.zona} · {m.descripcion}
            </span>
            <span className={CLASE_PILL_URGENCIA[m.urgencia]}>{LABEL_URGENCIA[m.urgencia]}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {RESOLUCION_LABEL[m.resolucion]} · SLA: {SLA_POR_URGENCIA[m.urgencia]}
          </div>
        </div>
      ))}

      <Link to="/mejoras/nueva" className="btn btn-primary-dark" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>
        + Nueva tarea de mejora
      </Link>
    </div>
  );
}
