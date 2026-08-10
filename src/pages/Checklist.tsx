import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { checklist as checklistSeed, villas } from "../data/mockData";

export default function Checklist() {
  const { villaId } = useParams();
  const villa = villas.find((v) => v.id === villaId);
  const [items, setItems] = useState(() =>
    checklistSeed.filter((c) => c.villaId === villaId)
  );

  const completados = items.filter((i) => i.completado).length;
  const progreso = items.length ? Math.round((completados / items.length) * 100) : 0;

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, completado: !i.completado } : i))
    );
  };

  const listo = useMemo(() => completados === items.length && items.length > 0, [completados, items.length]);

  if (!villa) {
    return <p>Villa no encontrada. <Link to="/">Volver</Link></p>;
  }

  return (
    <div>
      <h1 className="page-title">Villa {villa.nombre}</h1>
      <p className="page-sub">Checklist de turnover</p>

      <div
        style={{
          height: 6,
          background: "var(--sand)",
          borderRadius: 4,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progreso}%`,
            background: "var(--terra)",
            transition: "width 0.2s",
          }}
        />
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className="card"
          onClick={() => toggle(item.id)}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <input type="checkbox" checked={item.completado} readOnly style={{ width: 18 }} />
          <span style={{ fontSize: 13, fontWeight: 700, textDecoration: item.completado ? "line-through" : "none", color: item.completado ? "var(--text-muted)" : "var(--espresso)" }}>
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
