import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="wordmark">MAZUL</span>
        <div className="subtitle">Puerto Escondido · Oaxaca</div>
      </header>
      <main className="content">
        <Outlet />
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
      </nav>
    </div>
  );
}
