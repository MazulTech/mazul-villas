import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./theme.css";
import App from "./App.tsx";
import { iniciarSincronizacionAutomatica } from "./lib/sync";

// Deja que la app abra aunque no haya señal (cachea la app en sí) y avisa
// cuando hay tareas guardadas localmente esperando a subirse.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
iniciarSincronizacionAutomatica();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
