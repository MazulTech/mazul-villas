import { NavLink, Outlet } from "react-router-dom";
import { Home, Package, ClipboardCheck, Boxes, CalendarDays, LogOut, Users } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";
import { useAuth } from "../contexts/AuthContext";
import { esAdmin, LABEL_ROL } from "../lib/permissions";
import { useOnline, usePendientes } from "../lib/sync";

export default function Layout() {
  const { profile, signOut } = useAuth();
  const esDemo = profile?.id === "demo";
  const online = useOnline();
  const pendientes = usePendientes();

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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--cream)", fontWeight: 700 }}>{profile.nombre || "Sin nombre"}</div>
              <div style={{ fontSize: 10, color: "var(--sand)" }}>{LABEL_ROL[profile.rol]}</div>
            </div>
            {esAdmin(profile) && (
              <NavLink
                to="/admin/usuarios"
                title="Usuarios y permisos"
                aria-label="Usuarios y permisos"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid rgba(233, 217, 195, 0.35)",
                  background: "rgba(233, 217, 195, 0.1)",
                  color: "var(--sand)",
                  flexShrink: 0,
                }}
              >
                <Users size={16} strokeWidth={2} />
              </NavLink>
            )}
            <button
              onClick={() => signOut()}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 8,
                border: "1px solid rgba(233, 217, 195, 0.35)",
                background: "rgba(233, 217, 195, 0.1)",
                color: "var(--sand)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        )}
      </header>
      {(!online || pendientes.length > 0) && (
        <div
          style={{
            background: online ? "var(--warn-bg)" : "var(--danger)",
            color: online ? "var(--warn)" : "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "6px 14px",
            textAlign: "center",
          }}
        >
          {!online && "Sin conexión. "}
          {pendientes.length > 0 &&
            `${pendientes.length} ${pendientes.length === 1 ? "tarea guardada" : "tareas guardadas"} en este celular, pendiente${pendientes.length === 1 ? "" : "s"} de subir.`}
        </div>
      )}
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
        <NavLink to="/reservas" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <CalendarDays size={20} strokeWidth={2} />
          Reservas
        </NavLink>
      </nav>
    </div>
  );
}
