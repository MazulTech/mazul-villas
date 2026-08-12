import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Si algo se rompe al renderizar cualquier pantalla, esto evita que la app
// se quede "congelada" en silencio: muestra el error en pantalla para poder
// leerlo directo desde el celular, sin necesitar la consola del navegador.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error capturado por ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16 }}>
          <div className="card" style={{ borderColor: "var(--danger)" }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--danger)", margin: "0 0 6px" }}>
              Algo se rompió en esta pantalla
            </p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 10px", wordBreak: "break-word" }}>
              {this.state.error.message}
            </p>
            <button className="btn btn-secondary" onClick={() => window.location.assign("/")}>
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
