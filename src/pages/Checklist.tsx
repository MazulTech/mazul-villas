import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { listarChecklist, actualizarChecklistItem, listarVillas, type VillaBasica } from "../lib/data";
import type { ChecklistTarea } from "../types";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { puedeEditarChecklist } from "../lib/permissions";

export default function Checklist() {
  const { villaId = "" } = useParams();
  const { profile } = useAuth();
  const editable = puedeEditarChecklist(profile);
  const [villa, setVilla] = useState<VillaBasica | null>(null);
  const [items, setItems] = useState<ChecklistTarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    Promise.all([listarVillas(profile), listarChecklist(villaId)])
      .then(([villas, checklist]) => {
        if (!activo) return;
        setVilla(villas.find((v) => v.id === villaId) ?? null);
        setItems(checklist);
      })
      .catch((e: Error) => activo && setError(e.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [villaId, profile]);

  const completados = items.filter((i) => i.completado).length;
  const progreso = items.length ? Math.round((completados / items.length) * 100) : 0;
  const listo = useMemo(() => completados === items.length && items.length > 0, [completados, items.length]);

  const toggle = (id: string) => {
    if (!editable) return;
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

  if (error) {
    return (
      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
      </div>
    );
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
      <h1 className="page-title">{etiquetaVilla(villa)}</h1>
      <p className="page-sub">Checklist de turnover</p>

      <div style={{ height: 6, background: "var(--sand)", borderRadius: 4, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progreso}%`, background: "var(--terra)", transition: "width 0.2s" }} />
      </div>

      {!editable && (
        <div className="card" style={{ background: "var(--sand)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, margin: 0 }}>Solo consulta: como dueño puedes ver el checklist, no editarlo.</p>
        </div>
      )}

      {items.length === 0 && <div className="card card-dashed">Sin checklist activo para hoy.</div>}

      {items.map((item) => (
        <div
          key={item.id}
          className="card"
          onClick={() => toggle(item.id)}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: editable ? "pointer" : "default" }}
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

      {editable && (
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!listo}>
          {listo ? "Marcar villa como lista" : "Completa el checklist para continuar"}
        </button>
      )}
    </div>
  );
}
