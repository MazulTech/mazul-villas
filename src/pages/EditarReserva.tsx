import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { actualizarReserva, obtenerReserva, listarVillas, type VillaBasica } from "../lib/data";
import { mensajeError } from "../lib/errores";
import { etiquetaVilla } from "../lib/villas";
import { CANALES_RESERVA, OTRO_CANAL_RESERVA } from "../data/canalesReserva";
import { useAuth } from "../contexts/AuthContext";
import { puedeGestionarReservas } from "../lib/permissions";
import Cargando from "../components/Cargando";

// Corregir una reserva ya capturada (cambio de última hora en fechas,
// monto, canal...). Solo administración/supervisión, ver
// puedeGestionarReservas en permissions.ts.
export default function EditarReserva() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const autorizado = puedeGestionarReservas(profile);
  const [villa, setVilla] = useState<VillaBasica | null>(null);
  const [villaId, setVillaId] = useState<string | null>(null);

  const [huesped, setHuesped] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [canalSeleccionado, setCanalSeleccionado] = useState<string>(CANALES_RESERVA[0]);
  const [canalOtro, setCanalOtro] = useState("");
  const canal = canalSeleccionado === OTRO_CANAL_RESERVA ? canalOtro : canalSeleccionado;
  const [montoPagado, setMontoPagado] = useState("");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autorizado) {
      setCargando(false);
      return;
    }
    obtenerReserva(id)
      .then((r) => {
        if (!r) {
          setError("No se encontró esta reserva.");
          return;
        }
        setVillaId(r.villaId);
        setHuesped(r.huesped ?? "");
        setFechaInicio(r.fechaInicio);
        setFechaFin(r.fechaFin);
        setMontoPagado(String(r.montoPagado));
        setNotas(r.notas ?? "");
        if ((CANALES_RESERVA as readonly string[]).includes(r.canal)) {
          setCanalSeleccionado(r.canal);
        } else {
          setCanalSeleccionado(OTRO_CANAL_RESERVA);
          setCanalOtro(r.canal);
        }
        return listarVillas(profile).then((v) => setVilla(v.find((x) => x.id === r.villaId) ?? null));
      })
      .catch((e: Error) => setError(mensajeError(e, "No se pudo cargar la reserva.")))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, autorizado]);

  const puedeGuardar =
    fechaInicio.length > 0 &&
    fechaFin.length > 0 &&
    fechaFin >= fechaInicio &&
    canal.trim().length > 0 &&
    Number(montoPagado) >= 0 &&
    montoPagado.trim().length > 0;

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await actualizarReserva(id, {
        huesped: huesped || undefined,
        fechaInicio,
        fechaFin,
        canal,
        montoPagado: Number(montoPagado),
        notas: notas || undefined,
      });
      navigate(`/reservas/villa/${villaId}`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar el cambio."));
    } finally {
      setGuardando(false);
    }
  };

  if (!autorizado) {
    return (
      <div>
        <h1 className="page-title">Editar reserva</h1>
        <div className="card card-dashed">Tu rol no tiene permiso para editar reservas.</div>
      </div>
    );
  }

  if (cargando) {
    return <Cargando texto="Cargando reserva..." />;
  }

  return (
    <div>
      <h1 className="page-title">Editar reserva</h1>
      <p className="page-sub">{villa ? etiquetaVilla(villa) : "Villa"}</p>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {villaId && (
        <>
          <div style={{ marginBottom: 10 }}>
            <label className="field-label">Huésped (opcional)</label>
            <input value={huesped} onChange={(e) => setHuesped(e.target.value)} placeholder="Nombre o referencia" />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Entrada</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Salida</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="field-label">Canal</label>
            <select value={canalSeleccionado} onChange={(e) => setCanalSeleccionado(e.target.value)}>
              {CANALES_RESERVA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {canalSeleccionado === OTRO_CANAL_RESERVA && (
              <input
                style={{ marginTop: 6 }}
                value={canalOtro}
                onChange={(e) => setCanalOtro(e.target.value)}
                placeholder="Especifica el canal"
              />
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="field-label">Monto pagado (MXN)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Notas (opcional)</label>
            <textarea
              style={{ width: "100%", minHeight: 60, resize: "vertical" }}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Cualquier detalle adicional..."
            />
          </div>

          <button className="btn btn-primary-dark" disabled={!puedeGuardar || guardando} onClick={guardar}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </>
      )}
    </div>
  );
}
