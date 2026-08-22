import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Villa } from "../types";
import { listarVillasConEstado, listarProximosMovimientos, type ProximoMovimiento } from "../lib/data";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { esDueno } from "../lib/permissions";
import Cargando from "../components/Cargando";

// Diferencia en días de calendario entre hoy y una fecha yyyy-mm-dd (parseo
// con hora fija al mediodía para no correrse un día por la zona horaria).
function diasDesdeHoy(iso: string): number {
  const hoyStr = new Date().toISOString().slice(0, 10);
  const a = new Date(`${hoyStr}T12:00:00`).getTime();
  const b = new Date(`${iso}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function etiquetaCuando(iso: string): string {
  const dias = diasDesdeHoy(iso);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

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
  const [movimientos, setMovimientos] = useState<ProximoMovimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    Promise.all([listarVillasConEstado(profile), listarProximosMovimientos().catch(() => [])])
      .then(([v, m]) => {
        if (!activo) return;
        setVillas(v);
        setMovimientos(m);
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

          {movimientos.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 8px" }}>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                  PRÓXIMAS ENTRADAS Y SALIDAS
                </p>
                <Link to="/reservas/calendario" style={{ fontSize: 11, color: "var(--terra-dark)", fontWeight: 700 }}>
                  Ver calendario →
                </Link>
              </div>
              {movimientos.map((m, i) => {
                const v = villas.find((x) => x.id === m.villaId);
                return (
                  <div
                    key={`${m.villaId}-${m.tipo}-${m.fecha}-${i}`}
                    className="card"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{v ? etiquetaVilla(v) : m.villaId}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {m.tipo === "entrada" ? "Entra huésped — dejar lista antes" : "Sale huésped — limpiar después"}
                      </div>
                    </div>
                    <span className={m.tipo === "entrada" ? "pill pill-warn" : "pill pill-danger"}>
                      {etiquetaCuando(m.fecha)}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px" }}>VILLAS</p>
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
