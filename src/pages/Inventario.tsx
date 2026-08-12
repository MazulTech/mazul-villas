import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarInventario, listarVillas, type VillaBasica } from "../lib/data";
import type { InventarioItem } from "../types";
import { CLASE_PILL_CONDICION, LABEL_CONDICION } from "../lib/inventario";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { puedeGestionarInventario } from "../lib/permissions";
import Cargando from "../components/Cargando";

export default function Inventario() {
  const { profile } = useAuth();
  const gestionar = puedeGestionarInventario(profile);
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [villaId, setVillaId] = useState("");
  const [items, setItems] = useState<InventarioItem[]>([]);
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
    listarInventario(villaId)
      .then((data) => setItems(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, [villaId]);

  const porZona = useMemo(() => {
    const grupos: Record<string, InventarioItem[]> = {};
    for (const it of items) {
      grupos[it.zona] = grupos[it.zona] ? [...grupos[it.zona], it] : [it];
    }
    return grupos;
  }, [items]);

  return (
    <div>
      <h1 className="page-title">Inventario</h1>
      <p className="page-sub">Mobiliario y equipo por villa, con foto</p>

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

      {cargando && <Cargando texto="Cargando inventario..." />}

      {!cargando && items.length === 0 && (
        <div className="card card-dashed">Sin items registrados para esta villa todavía.</div>
      )}

      {Object.entries(porZona).map(([zona, itemsZona]) => (
        <div key={zona} style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 6px" }}>{zona.toUpperCase()}</p>
          {itemsZona.map((it) => (
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
                  Cantidad: {it.cantidad} · {new Date(it.creadoEn).toLocaleDateString("es-MX")}
                </div>
              </div>
              <span className={CLASE_PILL_CONDICION[it.condicion]}>{LABEL_CONDICION[it.condicion]}</span>
            </div>
          ))}
        </div>
      ))}

      {gestionar && (
        <Link
          to="/inventario/nuevo"
          className="btn btn-primary-dark"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 8 }}
        >
          + Agregar item
        </Link>
      )}
    </div>
  );
}
