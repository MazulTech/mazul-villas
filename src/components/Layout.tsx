import { NavLink, Outlet } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import { useAuth } from "../contexts/AuthContext";
import { LABEL_ROL } from "../lib/permissions";

export default function Layout() {
  const { profile, signOut } = useAuth();
  const esDemo = profile?.id === "demo";

  return (
    <div className="app-shell">
      <header className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="wordmark">MAZUL</span>
          <div className="subtitle">Puerto Escondido · Oaxaca</div>
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
          Inicio
        </NavLink>
        <NavLink to="/insumos" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Insumos
        </NavLink>
        <NavLink to="/mejoras" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Mejoras
        </NavLink>
        <NavLink to="/inventario" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Inventario
        </NavLink>
      </nav>
    </div>
  );
}
