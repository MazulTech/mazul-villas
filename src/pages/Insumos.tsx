import { useEffect, useState } from "react";
import { listarInsumos, listarVillas, type VillaBasica } from "../lib/data";
import type { InsumoStock } from "../types";

function nivelStock(actual: number, objetivo: number) {
  const ratio = objetivo === 0 ? 1 : actual / objetivo;
  if (ratio <= 0.15) return { label: "Reabastecer", clase: "pill pill-danger" };
  if (ratio < 0.7) return { label: "Bajo", clase: "pill pill-warn" };
  return { label: "Ok", clase: "pill pill-ok" };
}

export default function Insumos() {
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [villaId, setVillaId] = useState<string>("");
  const [items, setItems] = useState<InsumoStock[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    listarVillas().then((v) => {
      setVillas(v);
      setVillaId(v[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!villaId) return;
    setCargando(true);
    listarInsumos(villaId).then((data) => {
      setItems(data);
      setCargando(false);
    });
  }, [villaId]);

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

      {cargando && <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cargando insumos...</p>}

      {!cargando && items.length === 0 && (
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
