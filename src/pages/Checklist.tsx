import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { listarChecklist, actualizarChecklistItem, listarVillas, type VillaBasica } from "../lib/data";
import type { ChecklistTarea } from "../types";

export default function Checklist() {
  const { villaId = "" } = useParams();
  const [villa, setVilla] = useState<VillaBasica | null>(null);
  const [items, setItems] = useState<ChecklistTarea[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    Promise.all([listarVillas(), listarChecklist(villaId)]).then(([villas, checklist]) => {
      if (!activo) return;
      setVilla(villas.find((v) => v.id === villaId) ?? null);
      setItems(checklist);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [villaId]);

  const completados = items.filter((i) => i.completado).length;
  const progreso = items.length ? Math.round((completados / items.length) * 100) : 0;
  const listo = useMemo(() => completados === items.length && items.length > 0, [completados, items.length]);

  const toggle = (id: string) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, completado: !i.completado } : i));
      const item = next.find((i) => i.id === id);
      if (item) actualizarChecklistItem(id, item.completado).catch(() => {});
      return next;
    });
  };

  if (cargando) {
    return <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cargando checklist...</p>;
  }

  if (!villa) {
    return (
      <p>
        Villa no encontrada. <Link to="/">Volver</Link>
      </p>
    );
  }

  return (
    <div>
      <h1 className="page-title">Villa {villa.nombre}</h1>
      <p className="page-sub">Checklist de turnover</p>

      <div style={{ height: 6, background: "var(--sand)", borderRadius: 4, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progreso}%`, background: "var(--terra)", transition: "width 0.2s" }} />
      </div>

      {items.length === 0 && <div className="card card-dashed">Sin checklist activo para hoy.</div>}

      {items.map((item) => (
        <div
          key={item.id}
          className="card"
          onClick={() => toggle(item.id)}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <input type="checkbox" checked={item.completado} readOnly style={{ width: 18 }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              textDecoration: item.completado ? "line-through" : "none",
              color: item.completado ? "var(--text-muted)" : "var(--espresso)",
            }}
          >
            {item.texto}
          </span>
        </div>
      ))}

      <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!listo}>
        {listo ? "Marcar villa como lista" : "Completa el checklist para continuar"}
      </button>
    </div>
  );
}
