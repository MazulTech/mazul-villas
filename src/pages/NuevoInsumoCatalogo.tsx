import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearInsumoCatalogo } from "../lib/data";
import { useAuth } from "../contexts/AuthContext";
import { puedeGestionarInsumos } from "../lib/permissions";
import { mensajeError } from "../lib/errores";

export default function NuevoInsumoCatalogo() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const autorizado = puedeGestionarInsumos(profile);
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("");
  const [stockActual, setStockActual] = useState("0");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeGuardar = nombre.trim().length > 0;

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await crearInsumoCatalogo({
        nombre,
        unidad: unidad || undefined,
        stockActual: Number(stockActual) || 0,
        stockMinimo: Number(stockMinimo) || 0,
      });
      navigate("/almacen");
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar el insumo."));
    } finally {
      setGuardando(false);
    }
  };

  if (!autorizado) {
    return (
      <div>
        <h1 className="page-title">Nuevo insumo</h1>
        <div className="card card-dashed">Tu rol no tiene permiso para agregar insumos al catálogo.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Nuevo insumo</h1>
      <p className="page-sub">Se agrega al catálogo del almacén general</p>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Toallas de baño" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Unidad (opcional)</label>
        <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="piezas, rollos, cajas..." />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label className="field-label">Stock inicial</label>
          <input type="number" min={0} value={stockActual} onChange={(e) => setStockActual(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="field-label">Stock mínimo (alerta)</label>
          <input type="number" min={0} value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      <button className="btn btn-primary-dark" disabled={!puedeGuardar || guardando} onClick={guardar}>
        {guardando ? "Guardando..." : "Guardar insumo"}
      </button>
    </div>
  );
}
