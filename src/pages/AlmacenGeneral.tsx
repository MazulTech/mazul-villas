import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarAlmacen, registrarCompraInsumo } from "../lib/data";
import type { InsumoCatalogo } from "../types";
import { nivelStock } from "../lib/stock";
import { mensajeError } from "../lib/errores";
import { useAuth } from "../contexts/AuthContext";
import { puedeGestionarInsumos, puedeRepartirInsumos } from "../lib/permissions";
import Cargando from "../components/Cargando";

const SIN_CATEGORIA = "Sin categoría";

export default function AlmacenGeneral() {
  const { profile } = useAuth();
  const gestionar = puedeGestionarInsumos(profile);
  const puedeRepartir = puedeRepartirInsumos(profile);
  const [items, setItems] = useState<InsumoCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [comprando, setComprando] = useState<string | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  const cargar = () => {
    setCargando(true);
    listarAlmacen()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const categorias = useMemo(() => {
    const set = new Set(items.map((it) => it.categoria || SIN_CATEGORIA));
    return Array.from(set).sort();
  }, [items]);

  const itemsFiltrados = useMemo(() => {
    if (categoriaFiltro === "todas") return items;
    return items.filter((it) => (it.categoria || SIN_CATEGORIA) === categoriaFiltro);
  }, [items, categoriaFiltro]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, InsumoCatalogo[]>();
    for (const it of itemsFiltrados) {
      const cat = it.categoria || SIN_CATEGORIA;
      if (!mapa.has(cat)) mapa.set(cat, []);
      mapa.get(cat)!.push(it);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [itemsFiltrados]);

  const comprar = async (id: string) => {
    const cantidad = Number(cantidades[id] || 0);
    if (!cantidad || cantidad <= 0) return;
    setComprando(id);
    setError(null);
    try {
      await registrarCompraInsumo(id, cantidad);
      setCantidades((prev) => ({ ...prev, [id]: "" }));
      cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar la compra."));
    } finally {
      setComprando(null);
    }
  };

  if (!puedeRepartir) {
    return (
      <div>
        <h1 className="page-title">Almacén general</h1>
        <div className="card card-dashed">Tu rol no tiene acceso al almacén general.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Almacén general</h1>
      <p className="page-sub">Se compra aquí y de aquí se reparte a cada villa</p>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {categorias.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Categoría</label>
          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
            <option value="todas">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {cargando && <Cargando texto="Cargando almacén..." />}

      {!cargando && items.length === 0 && <div className="card card-dashed">Sin insumos en el catálogo todavía.</div>}

      {!cargando && items.length > 0 && itemsFiltrados.length === 0 && (
        <div className="card card-dashed">Sin insumos en esta categoría.</div>
      )}

      {grupos.map(([categoria, itemsCategoria]) => (
        <div key={categoria} style={{ marginBottom: 14 }}>
          {categoriaFiltro === "todas" && (
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {categoria}
            </p>
          )}
          {itemsCategoria.map((it) => {
            const nivel = nivelStock(it.stockActual, it.stockMinimo);
            return (
              <div key={it.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: gestionar ? 8 : 0 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{it.nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      Stock: {it.stockActual} {it.unidad || ""} · mínimo {it.stockMinimo}
                    </div>
                  </div>
                  <span className={nivel.clase}>{nivel.label}</span>
                </div>

                {gestionar && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Cantidad comprada"
                      value={cantidades[it.id] || ""}
                      onChange={(e) => setCantidades((prev) => ({ ...prev, [it.id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ width: "auto", padding: "0 14px" }}
                      disabled={comprando === it.id}
                      onClick={() => comprar(it.id)}
                    >
                      {comprando === it.id ? "..." : "Registrar compra"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        <Link
          to="/almacen/repartir"
          className="btn btn-primary-dark"
          style={{ display: "block", textAlign: "center", textDecoration: "none" }}
        >
          Repartir a una villa
        </Link>
        {gestionar && (
          <Link
            to="/almacen/nuevo"
            className="btn btn-secondary"
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            + Agregar insumo al catálogo
          </Link>
        )}
      </div>
    </div>
  );
}
