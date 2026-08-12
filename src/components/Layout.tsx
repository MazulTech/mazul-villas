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
          <img src="/glyph.png" alt="" width={28} height={27} aria-hidden="true" />
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
