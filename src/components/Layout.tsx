import { NavLink, Outlet } from "react-router-dom";
import { Home, Package, ClipboardCheck, Boxes } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";
import { useAuth } from "../contexts/AuthContext";
import { LABEL_ROL } from "../lib/permissions";

export default function Layout() {
  const { profile, signOut } = useAuth();
  const esDemo = profile?.id === "demo";

  return (
    <div className="app-shell">
      <header className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="var(--terra)" />
            <path
              d="M14 46V20.5c0-1.1.9-2 2-2h1.6c.7 0 1.35.36 1.72.96L32 39.5l12.68-20.04c.37-.6 1.02-.96 1.72-.96H48c1.1 0 2 .9 2 2V46"
              fill="none"
              stroke="var(--cream)"
              strokeWidth="4.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <span className="wordmark">MAZUL</span>
            <div className="subtitle">Puerto Escondido · Oaxaca</div>
          </div>
        </div>
        {profile && !esDemo && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--cream)" }}>{profile.nombre || "Sin nombre"}</div>
            <div style={{ fontSize: 10, color: "var(--sand)", marginBottom: 4 }}>{LABEL_ROL[profile.rol]}</div>
            <button
              onClick={() => signOut()}
              style={{
                fontSize: 10,
                border: "none",
                background: "transparent",
                color: "var(--sand)",
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Salir
            </button>
          </div>
        )}
      </header>
      <main className="content">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <Home size={20} strokeWidth={2} />
          Inicio
        </NavLink>
        <NavLink to="/insumos" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <Package size={20} strokeWidth={2} />
          Insumos
        </NavLink>
        <NavLink to="/mejoras" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <ClipboardCheck size={20} strokeWidth={2} />
          Mejoras
        </NavLink>
        <NavLink to="/inventario" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <Boxes size={20} strokeWidth={2} />
          Inventario
        </NavLink>
      </nav>
    </div>
  );
}
