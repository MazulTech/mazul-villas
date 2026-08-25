import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Villa } from "../types";
import { listarVillasConEstado, listarReservasCalendario, type ReservaCalendario } from "../lib/data";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { esDueno } from "../lib/permissions";
import Cargando from "../components/Cargando";
import CuadriculaReservas from "../components/CuadriculaReservas";

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
  const { profile } = useAuth();
  const dueno = esDueno(profile);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [reservas, setReservas] = useState<ReservaCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    Promise.all([listarVillasConEstado(profile), listarReservasCalendario(7).catch(() => [])])
      .then(([v, r]) => {
        if (!activo) return;
        setVillas(v);
        setReservas(r);
      })
      .catch((e: Error) => activo && setError(e.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [profile]);

  const listas = villas.filter((v) => v.estadoHoy === "lista").length;
  const enProceso = villas.filter((v) => v.estadoHoy === "limpieza").length;
  const conIncidencia = villas.filter((v) => v.estadoHoy === "incidencia").length;

  return (
    <div>
      <h1 className="page-title">Hoy</h1>
      <p className="page-sub">
        {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
      </p>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {cargando ? (
        <Cargando texto="Cargando villas..." />
      ) : (
        <>
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

          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px" }}>
            PRÓXIMOS 7 DÍAS · ENTRADAS Y SALIDAS
          </p>
          <CuadriculaReservas villas={villas} reservas={reservas} />

          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "14px 0 8px" }}>VILLAS</p>
          {villas.map((v) => (
            <Link
              key={v.id}
              to={dueno ? `/villa/${v.id}/perfil` : `/villa/${v.id}/checklist`}
              className="card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>{etiquetaVilla(v)}</span>
              <span className={ESTADO_PILL[v.estadoHoy]}>{ESTADO_LABEL[v.estadoHoy]}</span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
