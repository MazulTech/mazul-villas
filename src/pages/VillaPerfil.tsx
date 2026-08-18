import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listarMejoras, listarInventario, listarVillasConEstado } from "../lib/data";
import type { Mejora, InventarioItem, Villa, EstadoMejora } from "../types";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { puedeVerVilla } from "../lib/permissions";
import { mensajeError } from "../lib/errores";
import { conCache } from "../lib/offlineDb";
import { CLASE_PILL_URGENCIA, LABEL_URGENCIA } from "../lib/urgencia";
import { CLASE_PILL_ESTADO_MEJORA, LABEL_ESTADO_MEJORA } from "../lib/estadoMejora";
import Cargando from "../components/Cargando";

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

const ORDEN_ESTADOS: EstadoMejora[] = ["pendiente", "en_proceso", "esperando_aprobacion", "rechazada", "aprobada"];

export default function VillaPerfil() {
  const { villaId = "" } = useParams();
  const { profile } = useAuth();
  const [villa, setVilla] = useState<Villa | null>(null);
  const [mejoras, setMejoras] = useState<Mejora[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    Promise.all([
      conCache(`villas-estado:${profile?.id ?? "anon"}`, () => listarVillasConEstado(profile)),
      conCache(`mejoras:${villaId}:${profile?.id ?? "anon"}`, () => listarMejoras(villaId, profile)),
      conCache(`inventario:${villaId}`, () => listarInventario(villaId)),
    ])
      .then(([villasRes, mejorasRes, inventarioRes]) => {
        if (!activo) return;
        setVilla(villasRes.datos.find((v) => v.id === villaId) ?? null);
        setMejoras(mejorasRes.datos);
        setInventario(inventarioRes.datos);
      })
      .catch((e) => activo && setError(mensajeError(e, "No se pudo cargar el perfil de la villa.")))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [villaId, profile]);

  const resumenInventario = useMemo(() => {
    const bueno = inventario.filter((i) => i.condicion === "bueno").length;
    const regular = inventario.filter((i) => i.condicion === "regular").length;
    const danado = inventario.filter((i) => i.condicion === "danado").length;
    return { total: inventario.length, bueno, regular, danado };
  }, [inventario]);

  const resumenMejoras = useMemo(() => {
    const porEstado: Record<EstadoMejora, number> = {
      pendiente: 0,
      en_proceso: 0,
      esperando_aprobacion: 0,
      aprobada: 0,
      rechazada: 0,
    };
    for (const m of mejoras) porEstado[m.estado]++;
    const activas = porEstado.pendiente + porEstado.en_proceso + porEstado.esperando_aprobacion + porEstado.rechazada;
    return { total: mejoras.length, porEstado, activas, aprobadas: porEstado.aprobada };
  }, [mejoras]);

  const gastoCorrectivoPagado = useMemo(() => {
    return mejoras
      .filter((m) => m.tipoMantenimiento === "correctivo" && m.cotizacionPagada)
      .reduce((suma, m) => suma + (m.costoEstimado ?? 0), 0);
  }, [mejoras]);

  if (cargando) {
    return <Cargando texto="Cargando perfil de la villa..." />;
  }

  if (!puedeVerVilla(profile, villaId)) {
    return <div className="card card-dashed">Tu rol no tiene acceso a esta villa.</div>;
  }

  if (!villa) {
    return (
      <div>
        {error && (
          <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
          </div>
        )}
        <div className="card card-dashed">Villa no encontrada.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <h1 className="page-title">{etiquetaVilla(villa)}</h1>
        <span className={ESTADO_PILL[villa.estadoHoy]}>{ESTADO_LABEL[villa.estadoHoy]}</span>
      </div>
      <p className="page-sub">Perfil de la villa</p>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      <Link
        to={`/villa/${villaId}/checklist`}
        className="card"
        style={{ display: "block", textDecoration: "none", color: "inherit", fontWeight: 700, fontSize: 13 }}
      >
        Ver checklist de turnover →
      </Link>

      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "18px 0 8px", fontWeight: 700 }}>
        INVENTARIO
      </p>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="num">{resumenInventario.total}</div>
          <div className="lbl">items</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--ok)" }}>{resumenInventario.bueno}</div>
          <div className="lbl">en buen estado</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--danger)" }}>{resumenInventario.regular + resumenInventario.danado}</div>
          <div className="lbl">necesitan atención</div>
        </div>
      </div>
      <Link
        to={`/villa/${villaId}/reporte-inventario`}
        className="btn btn-secondary"
        style={{ display: "block", textAlign: "center", textDecoration: "none", marginBottom: 18 }}
      >
        Descargar reporte de inventario (PDF)
      </Link>

      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px", fontWeight: 700 }}>MEJORAS</p>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="num">{resumenMejoras.total}</div>
          <div className="lbl">tareas en total</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--warn)" }}>{resumenMejoras.activas}</div>
          <div className="lbl">activas</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "var(--ok)" }}>{resumenMejoras.aprobadas}</div>
          <div className="lbl">resueltas</div>
        </div>
      </div>

      {resumenMejoras.total > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {ORDEN_ESTADOS.filter((e) => resumenMejoras.porEstado[e] > 0).map((e) => (
            <span key={e} className={CLASE_PILL_ESTADO_MEJORA[e]}>
              {resumenMejoras.porEstado[e]} · {LABEL_ESTADO_MEJORA[e]}
            </span>
          ))}
        </div>
      )}

      <div className="card" style={{ background: "var(--sand)", border: "none", marginBottom: 18 }}>
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
          Pagado en mantenimiento correctivo
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-serif)", margin: 0 }}>
          ${gastoCorrectivoPagado.toLocaleString("es-MX")} MXN
        </p>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px", fontWeight: 700 }}>
        HISTORIAL DE TAREAS
      </p>
      {mejoras.length === 0 && <div className="card card-dashed">Sin tareas registradas para esta villa.</div>}
      {mejoras.map((m) => (
        <Link
          key={m.id}
          to={`/mejoras/${m.id}`}
          className="card"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6, gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {m.zona} · {m.descripcion}
            </span>
            <span className={CLASE_PILL_URGENCIA[m.urgencia]}>{LABEL_URGENCIA[m.urgencia]}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
            {new Date(m.creadoEn).toLocaleDateString("es-MX")}
          </div>
          <span className={CLASE_PILL_ESTADO_MEJORA[m.estado]}>{LABEL_ESTADO_MEJORA[m.estado]}</span>
        </Link>
      ))}
    </div>
  );
}
