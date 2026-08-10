import { Link } from "react-router-dom";
import { villas, mejoras } from "../data/mockData";

const ESTADO_PILL: Record<string, string> = {
  lista: "pill pill-ok",
  limpieza: "pill pill-warn",
  incidencia: "pill pill-danger",
};

const ESTADO_LABEL: Record<string, string> = {
  lista: "Lista",
  limpieza: "Limpieza",
  incidencia: "Incidencia",
};

export default function Dashboard() {
  const listas = villas.filter((v) => v.estadoHoy === "lista").length;
  const enProceso = villas.filter((v) => v.estadoHoy === "limpieza").length;
  const conIncidencia = villas.filter((v) => v.estadoHoy === "incidencia").length;
  const criticas = mejoras.filter((m) => m.urgencia === "critico").length;

  return (
    <div>
      <h1 className="page-title">Hoy</h1>
      <p className="page-sub">
        {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
        {criticas > 0 ? ` · ${criticas} mejora(s) crítica(s) sin resolver` : ""}
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="num" style={{ color: "var(--ok)" }}>{listas}</div>
          <div className="lbl">listas</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--warn)" }}>{enProceso}</div>
          <div className="lbl">en limpieza</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--danger)" }}>{conIncidencia}</div>
          <div className="lbl">incidencias</div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px" }}>VILLAS</p>
      {villas.map((v) => (
        <Link
          key={v.id}
          to={`/villa/${v.id}/checklist`}
          className="card"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
        >
          <span style={{ fontWeight: 700, fontSize: 14 }}>{v.nombre}</span>
          <span className={ESTADO_PILL[v.estadoHoy]}>{ESTADO_LABEL[v.estadoHoy]}</span>
        </Link>
      ))}
    </div>
  );
}
