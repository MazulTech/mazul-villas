import { useState } from "react";
import { insumos as insumosSeed, villas } from "../data/mockData";

function nivelStock(actual: number, objetivo: number) {
  const ratio = objetivo === 0 ? 1 : actual / objetivo;
  if (ratio <= 0.15) return { label: "Reabastecer", clase: "pill pill-danger" };
  if (ratio < 0.7) return { label: "Bajo", clase: "pill pill-warn" };
  return { label: "Ok", clase: "pill pill-ok" };
}

export default function Insumos() {
  const [villaId, setVillaId] = useState(villas[0].id);
  const items = insumosSeed.filter((i) => i.villaId === villaId);

  return (
    <div>
      <h1 className="page-title">Insumos</h1>
      <p className="page-sub">Stock por villa, con alertas de reabasto</p>

      <div style={{ marginBottom: 14 }}>
        <label className="field-label">Villa</label>
        <select value={villaId} onChange={(e) => setVillaId(e.target.value)}>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 && (
        <div className="card card-dashed">Sin insumos registrados para esta villa.</div>
      )}

      {items.map((it) => {
        const nivel = nivelStock(it.stockActual, it.stockObjetivo);
        return (
          <div key={it.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{it.nombre}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Stock: {it.stockActual} de {it.stockObjetivo}
              </div>
            </div>
            <span className={nivel.clase}>{nivel.label}</span>
          </div>
        );
      })}

      <button className="btn btn-secondary" style={{ marginTop: 8 }}>
        Solicitar reabasto
      </button>
    </div>
  );
}
