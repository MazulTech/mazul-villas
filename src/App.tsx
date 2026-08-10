import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Checklist from "./pages/Checklist";
import Insumos from "./pages/Insumos";
import Mejoras from "./pages/Mejoras";
import NuevaTarea from "./pages/NuevaTarea";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/villa/:villaId/checklist" element={<Checklist />} />
        <Route path="/insumos" element={<Insumos />} />
        <Route path="/mejoras" element={<Mejoras />} />
        <Route path="/mejoras/nueva" element={<NuevaTarea />} />
      </Route>
    </Routes>
  );
}

export default App;
