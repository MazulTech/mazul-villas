export default function Cargando({ texto = "Cargando..." }: { texto?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
      <span className="spinner" aria-hidden="true" />
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{texto}</span>
    </div>
  );
}
