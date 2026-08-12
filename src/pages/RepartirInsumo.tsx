import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarAlmacen, listarVillas, repartirInsumo, type VillaBasica } from "../lib/data";
import type { InsumoCatalogo } from "../types";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { puedeRepartirInsumos } from "../lib/permissions";

export default function RepartirInsumo() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const autorizado = puedeRepartirInsumos(profile);
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [villaId, setVillaId] = useState("");
  const [items, setItems] = useState<InsumoCatalogo[]>([]);
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autorizado) return;
    listarVillas(profile)
      .then((v) => {
        setVillas(v);
        setVillaId(v[0]?.id ?? "");
      })
      .catch((e: Error) => setError(e.message));
    listarAlmacen()
      .then((v) => {
        setItems(v);
        setInsumoId(v[0]?.id ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [profile, autorizado]);

  const insumoSeleccionado = items.find((i) => i.id === insumoId);
  const cantidadNum = Number(cantidad);
  const puedeGuardar =
    villaId !== "" && insumoId !== "" && cantidadNum > 0 && (!insumoSeleccionado || cantidadNum <= insumoSeleccionado.stockActual);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await repartirInsumo(villaId, insumoId, cantidadNum);
      navigate("/almacen");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el reparto.");
    } finally {
      setGuardando(false);
    }
  };

  if (!autorizado) {
    return (
      <div>
        <h1 className="page-title">Repartir insumo</h1>
        <div className="card card-dashed">Tu rol no tiene permiso para repartir insumos.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Repartir insumo</h1>
      <p className="page-sub">Resta del almacén general y suma al stock de la villa</p>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Insumo</label>
        <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre} (disponible: {i.stockActual} {i.unidad || ""})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Villa destino</label>
        <select value={villaId} onChange={(e) => setVillaId(e.target.value)}>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {etiquetaVilla(v)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="field-label">Cantidad</label>
        <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        {insumoSeleccionado && cantidadNum > insumoSeleccionado.stockActual && (
          <p style={{ fontSize: 11, color: "var(--danger)", margin: "4px 0 0" }}>
            No hay suficiente en el almacén (disponible: {insumoSeleccionado.stockActual}).
          </p>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      <button className="btn btn-primary-dark" disabled={!puedeGuardar || guardando} onClick={guardar}>
        {guardando ? "Guardando..." : "Registrar reparto"}
      </button>
    </div>
  );
}
