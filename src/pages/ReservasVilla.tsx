import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { eliminarReserva, listarReservas, listarVillas, type VillaBasica } from "../lib/data";
import type { Reserva } from "../types";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { puedeGestionarReservas, puedeVerFinanzasReservas, puedeVerVilla } from "../lib/permissions";
import { mensajeError } from "../lib/errores";
import { conCache } from "../lib/offlineDb";
import Cargando from "../components/Cargando";

function formatoMoneda(valor: number): string {
  return valor.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

function formatoFecha(iso: string): string {
  // Se guarda como fecha simple (yyyy-mm-dd); parsear con hora fija evita
  // que el navegador la recorra un día por la zona horaria.
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// Bitácora de rentas ya cobradas de una sola villa: registrar (admin),
// consultar y ver el resumen de ingresos (todos los que ven esta villa,
// incluyendo el dueño).
export default function ReservasVilla() {
  const { villaId = "" } = useParams();
  const { profile } = useAuth();
  const gestionar = puedeGestionarReservas(profile);
  const verFinanzas = puedeVerFinanzasReservas(profile);
  const [villa, setVilla] = useState<VillaBasica | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deCache, setDeCache] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  useEffect(() => {
    conCache(`villas:${profile?.id ?? "anon"}`, () => listarVillas(profile))
      .then(({ datos }) => setVilla(datos.find((v) => v.id === villaId) ?? null))
      .catch(() => undefined);
  }, [profile, villaId]);

  const cargar = () => {
    if (!villaId) return;
    setCargando(true);
    conCache(`reservas:${villaId}`, () => listarReservas(villaId))
      .then(({ datos, deCache: usoCache }) => {
        setReservas(datos);
        setDeCache(usoCache);
      })
      .catch((e) => setError(mensajeError(e, "No se pudieron cargar las reservas.")))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [villaId]);

  const resumen = useMemo(() => {
    const total = reservas.reduce((suma, r) => suma + r.montoPagado, 0);
    return { total, cantidad: reservas.length };
  }, [reservas]);

  const borrar = async (id: string) => {
    if (!window.confirm("¿Borrar esta reserva? No se puede deshacer.")) return;
    setBorrandoId(id);
    setError(null);
    try {
      await eliminarReserva(id);
      setReservas((actual) => actual.filter((r) => r.id !== id));
    } catch (e) {
      setError(mensajeError(e, "No se pudo borrar la reserva."));
    } finally {
      setBorrandoId(null);
    }
  };

  if (!puedeVerVilla(profile, villaId)) {
    return <div className="card card-dashed">Tu rol no tiene acceso a esta villa.</div>;
  }

  return (
    <div>
      <Link to="/reservas" style={{ fontSize: 12, color: "var(--terra-dark)", display: "inline-block", marginBottom: 12 }}>
        ← Todas las villas
      </Link>

      <h1 className="page-title">{villa ? etiquetaVilla(villa) : "Reservas"}</h1>
      <p className="page-sub">{verFinanzas ? "Rentas cobradas e ingresos" : "Fechas de entrada y salida de huéspedes"}</p>

      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="num">{resumen.cantidad}</div>
          <div className="lbl">reservas</div>
        </div>
        {verFinanzas && (
          <div className="stat-card">
            <div className="num" style={{ fontSize: 18 }}>{formatoMoneda(resumen.total)}</div>
            <div className="lbl">ingresos totales</div>
          </div>
        )}
      </div>

      {gestionar && (
        <Link
          to={`/reservas/villa/${villaId}/nueva`}
          className="btn btn-primary-dark"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginBottom: 14 }}
        >
          + Registrar renta
        </Link>
      )}

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {deCache && (
        <div className="card" style={{ background: "var(--warn-bg)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, margin: 0, color: "var(--warn)" }}>
            Sin conexión: mostrando las últimas reservas guardadas en este celular.
          </p>
        </div>
      )}

      {cargando && <Cargando texto="Cargando reservas..." />}

      {!cargando && reservas.length === 0 && (
        <div className="card card-dashed">Sin reservas registradas para esta villa todavía.</div>
      )}

      {reservas.map((r) => (
        <div key={r.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {formatoFecha(r.fechaInicio)} → {formatoFecha(r.fechaFin)}
            </div>
            {verFinanzas && (
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ok)" }}>{formatoMoneda(r.montoPagado)}</div>
            )}
          </div>
          {verFinanzas && (
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {r.canal}
              {r.huesped ? ` · ${r.huesped}` : ""}
            </div>
          )}
          {verFinanzas && r.notas && <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{r.notas}</div>}
          {gestionar && (
            <button
              type="button"
              className="btn"
              disabled={borrandoId === r.id}
              onClick={() => borrar(r.id)}
              style={{
                marginTop: 6,
                alignSelf: "flex-start",
                fontSize: 11,
                padding: "4px 10px",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                background: "transparent",
              }}
            >
              {borrandoId === r.id ? "Borrando..." : "Borrar"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
