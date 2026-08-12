import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarInsumos, listarVillas, type VillaBasica } from "../lib/data";
import type { InsumoStock } from "../types";
import { etiquetaVilla } from "../lib/villas";
import { nivelStock } from "../lib/stock";
import { useAuth } from "../contexts/AuthContext";
import { puedeGestionarInsumos, puedeRepartirInsumos } from "../lib/permissions";
import Cargando from "../components/Cargando";

export default function Insumos() {
  const { profile } = useAuth();
  const gestionar = puedeGestionarInsumos(profile);
  const verAlmacen = puedeRepartirInsumos(profile);
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [villaId, setVillaId] = useState<string>("");
  const [items, setItems] = useState<InsumoStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarVillas(profile)
      .then((v) => {
        setVillas(v);
        setVillaId(v[0]?.id ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [profile]);

  useEffect(() => {
    if (!villaId) return;
    setCargando(true);
    listarInsumos(villaId)
      .then((data) => setItems(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, [villaId]);

  return (
    <div>
      <h1 className="page-title">Insumos</h1>
      <p className="page-sub">Stock por villa, con alertas de reabasto</p>

      {verAlmacen && (
        <Link
          to="/almacen"
          style={{ display: "inline-block", fontSize: 12, color: "var(--terra-dark)", marginBottom: 14, textDecoration: "underline" }}
        >
          Ver almacén general →
        </Link>
      )}

      <div style={{ marginBottom: 14 }}>
        <label className="field-label">Villa</label>
        <select value={villaId} onChange={(e) => setVillaId(e.target.value)}>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {etiquetaVilla(v)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {cargando && <Cargando texto="Cargando insumos..." />}

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

      {gestionar && (
        <button className="btn btn-secondary" style={{ marginTop: 8 }}>
          Solicitar reabasto
        </button>
      )}
    </div>
  );
}
