import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checklist from "./pages/Checklist";
import Insumos from "./pages/Insumos";
import Mejoras from "./pages/Mejoras";
import MejoraDetalle from "./pages/MejoraDetalle";
import NuevaTarea from "./pages/NuevaTarea";
import Inventario from "./pages/Inventario";
import NuevoItemInventario from "./pages/NuevoItemInventario";

function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, cargando } = useAuth();
  if (cargando) {
    return <p style={{ padding: 20, fontSize: 13, color: "var(--text-secondary)" }}>Cargando...</p>;
  }
  if (!profile) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/villa/:villaId/checklist" element={<Checklist />} />
          <Route path="/insumos" element={<Insumos />} />
          <Route path="/mejoras" element={<Mejoras />} />
          <Route path="/mejoras/nueva" element={<NuevaTarea />} />
          <Route path="/mejoras/:id" element={<MejoraDetalle />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/inventario/nuevo" element={<NuevoItemInventario />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
