import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listarInventario, listarVillas, type VillaBasica } from "../lib/data";
import type { InventarioItem } from "../types";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { puedeVerVilla } from "../lib/permissions";
import { mensajeError } from "../lib/errores";
import { conCache } from "../lib/offlineDb";
import { CLASE_PILL_CONDICION, LABEL_CONDICION } from "../lib/inventario";
import Cargando from "../components/Cargando";

// Reporte pensado para imprimir/guardar como PDF (window.print — el
// navegador ya trae esa opción, no hace falta generar el PDF nosotros).
// El CSS de impresión (ver theme.css, sección "Impresión de reportes")
// oculta la barra superior, el menú inferior y todo lo marcado con
// "no-print" al momento de imprimir.
export default function ReporteInventarioVilla() {
  const { villaId = "" } = useParams();
  const { profile } = useAuth();
  const [villa, setVilla] = useState<VillaBasica | null>(null);
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    Promise.all([
      conCache(`villas:${profile?.id ?? "anon"}`, () => listarVillas(profile)),
      conCache(`inventario:${villaId}`, () => listarInventario(villaId)),
    ])
      .then(([villasRes, itemsRes]) => {
        if (!activo) return;
        setVilla(villasRes.datos.find((v) => v.id === villaId) ?? null);
        setItems(itemsRes.datos);
      })
      .catch((e) => activo && setError(mensajeError(e, "No se pudo cargar el inventario.")))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [villaId, profile]);

  if (cargando) {
    return <Cargando texto="Preparando reporte..." />;
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
      <Link to={`/villa/${villaId}/perfil`} className="no-print" style={{ fontSize: 12, color: "var(--terra-dark)", display: "inline-block", marginBottom: 12 }}>
        ← Volver al perfil de la villa
      </Link>

      <h1 className="page-title">{etiquetaVilla(villa)}</h1>
      <p className="page-sub">
        Reporte de inventario · generado el {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
      </p>

      {error && (
        <div className="card no-print" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      <button className="btn btn-primary-dark no-print" style={{ marginBottom: 16 }} onClick={() => window.print()}>
        Descargar / imprimir PDF
      </button>

      {items.length === 0 && <div className="card card-dashed">Sin items registrados para esta villa.</div>}

      {items.map((it) => (
        <div key={it.id} className="card" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {it.fotoUrl ? (
            <img
              src={it.fotoUrl}
              alt={it.nombre}
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: "var(--sand)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "var(--text-secondary)",
                textAlign: "center",
              }}
            >
              Sin foto
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{it.nombre}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {it.zona} · Cantidad: {it.cantidad} · {new Date(it.creadoEn).toLocaleDateString("es-MX")}
            </div>
          </div>
          <span className={CLASE_PILL_CONDICION[it.condicion]}>{LABEL_CONDICION[it.condicion]}</span>
        </div>
      ))}
    </div>
  );
}
