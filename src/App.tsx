import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Cargando from "./components/Cargando";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checklist from "./pages/Checklist";
import Insumos from "./pages/Insumos";
import AlmacenGeneral from "./pages/AlmacenGeneral";
import NuevoInsumoCatalogo from "./pages/NuevoInsumoCatalogo";
import RepartirInsumo from "./pages/RepartirInsumo";
import Mejoras from "./pages/Mejoras";
import MejoraDetalle from "./pages/MejoraDetalle";
import NuevaTarea from "./pages/NuevaTarea";
import Inventario from "./pages/Inventario";
import InventarioVilla from "./pages/InventarioVilla";
import NuevoItemInventario from "./pages/NuevoItemInventario";
import EditarItemInventario from "./pages/EditarItemInventario";
import VillaPerfil from "./pages/VillaPerfil";
import Reservas from "./pages/Reservas";
import ReservasVilla from "./pages/ReservasVilla";
import NuevaReserva from "./pages/NuevaReserva";
import NuevoDueno from "./pages/NuevoDueno";
import Usuarios from "./pages/Usuarios";

function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, cargando } = useAuth();
  if (cargando) {
    return (
      <div style={{ padding: 20 }}>
        <Cargando />
      </div>
    );
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
          <Route path="/villa/:villaId/perfil" element={<VillaPerfil />} />
          <Route path="/insumos" element={<Insumos />} />
          <Route path="/almacen" element={<AlmacenGeneral />} />
          <Route path="/almacen/nuevo" element={<NuevoInsumoCatalogo />} />
          <Route path="/almacen/repartir" element={<RepartirInsumo />} />
          <Route path="/mejoras" element={<Mejoras />} />
          <Route path="/mejoras/nueva" element={<NuevaTarea />} />
          <Route path="/mejoras/:id" element={<MejoraDetalle />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/inventario/villa/:villaId" element={<InventarioVilla />} />
          <Route path="/inventario/villa/:villaId/nuevo" element={<NuevoItemInventario />} />
          <Route path="/inventario/:id/editar" element={<EditarItemInventario />} />
          <Route path="/reservas" element={<Reservas />} />
          <Route path="/reservas/villa/:villaId" element={<ReservasVilla />} />
          <Route path="/reservas/villa/:villaId/nueva" element={<NuevaReserva />} />
          <Route path="/admin/duenos/nuevo" element={<NuevoDueno />} />
          <Route path="/admin/usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
