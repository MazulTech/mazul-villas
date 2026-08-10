import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearMejora, listarVillas, type VillaBasica } from "../lib/data";
import type { Resolucion } from "../types";
import { CLASE_PILL_URGENCIA, LABEL_URGENCIA, SLA_POR_URGENCIA, calcularUrgencia } from "../lib/urgencia";

export default function NuevaTarea() {
  const navigate = useNavigate();
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [villaId, setVillaId] = useState("");
  const [zona, setZona] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [afectaSeguridadOperacion, setAfectaSeguridadOperacion] = useState<boolean | null>(null);
  const [afectaAmenidad, setAfectaAmenidad] = useState<boolean | null>(null);
  const [resolucion, setResolucion] = useState<Resolucion>("equipo");
  const [materialNecesario, setMaterialNecesario] = useState("");
  const [especialista, setEspecialista] = useState("");
  const [costoEstimado, setCostoEstimado] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    listarVillas().then((v) => {
      setVillas(v);
      setVillaId(v[0]?.id ?? "");
    });
  }, []);

  const urgenciaCalculada =
    afectaSeguridadOperacion === null || afectaAmenidad === null
      ? null
      : calcularUrgencia(afectaSeguridadOperacion, afectaAmenidad);

  const puedeGuardar =
    descripcion.trim().length > 0 && zona.trim().length > 0 && urgenciaCalculada !== null && villaId !== "";

  const guardar = async () => {
    if (afectaSeguridadOperacion === null || afectaAmenidad === null) return;
    setGuardando(true);
    try {
      await crearMejora({
        villaId,
        zona,
        descripcion,
        afectaSeguridadOperacion,
        afectaAmenidad,
        resolucion,
        materialNecesario: materialNecesario || undefined,
        especialistaNecesario: especialista || undefined,
        costoEstimado: costoEstimado ? Number(costoEstimado) : undefined,
      });
      navigate("/mejoras");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Nueva tarea de mejora</h1>
      <p className="page-sub">Aplica para cualquier villa, no solo la del recorrido de hoy</p>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Villa</label>
        <select value={villaId} onChange={(e) => setVillaId(e.target.value)}>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="card card-dashed" style={{ marginBottom: 10, padding: 16 }}>
        Foto adjunta (opcional) — arrastra o toma una foto de evidencia
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Zona</label>
        <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Cocina, terraza, habitación 2..." />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="field-label">Descripción</label>
        <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Fuga en la llave del fregadero" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">
          ¿Esto impide usar la villa con seguridad, o va a empeorar si no se atiende hoy?
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`choice-row${afectaSeguridadOperacion === true ? " selected" : ""}`}
            onClick={() => setAfectaSeguridadOperacion(true)}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Sí
          </button>
          <button
            type="button"
            className={`choice-row${afectaSeguridadOperacion === false ? " selected" : ""}`}
            onClick={() => setAfectaSeguridadOperacion(false)}
            style={{ flex: 1, justifyContent: "center" }}
          >
            No
          </button>
        </div>
      </div>

      {afectaSeguridadOperacion === false && (
        <div style={{ marginBottom: 10 }}>
          <label className="field-label">
            ¿Afecta un servicio o amenidad que el huésped usa directamente? (A/C, wifi, TV, alberca, cocina)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={`choice-row${afectaAmenidad === true ? " selected" : ""}`}
              onClick={() => setAfectaAmenidad(true)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Sí
            </button>
            <button
              type="button"
              className={`choice-row${afectaAmenidad === false ? " selected" : ""}`}
              onClick={() => setAfectaAmenidad(false)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              No
            </button>
          </div>
        </div>
      )}

      {urgenciaCalculada && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--sand)", border: "none" }}>
          <div style={{ fontSize: 12 }}>
            Urgencia calculada · SLA: {SLA_POR_URGENCIA[urgenciaCalculada]}
          </div>
          <span className={CLASE_PILL_URGENCIA[urgenciaCalculada]}>{LABEL_URGENCIA[urgenciaCalculada]}</span>
        </div>
      )}

      <div style={{ margin: "14px 0 10px" }}>
        <label className="field-label">¿Cómo se resuelve?</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            className={`choice-row${resolucion === "equipo" ? " selected" : ""}`}
            onClick={() => setResolucion("equipo")}
          >
            Lo resuelve el equipo
          </button>
          <button
            type="button"
            className={`choice-row${resolucion === "materiales" ? " selected" : ""}`}
            onClick={() => setResolucion("materiales")}
          >
            Requiere comprar material o pieza
          </button>
          <button
            type="button"
            className={`choice-row${resolucion === "contratar" ? " selected" : ""}`}
            onClick={() => setResolucion("contratar")}
          >
            Requiere contratar a alguien
          </button>
        </div>
      </div>

      {resolucion === "materiales" && (
        <div style={{ background: "var(--sand)", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label className="field-label">Material o pieza necesaria</label>
            <input value={materialNecesario} onChange={(e) => setMaterialNecesario(e.target.value)} placeholder="Llave mezcladora para fregadero" />
          </div>
          <div>
            <label className="field-label">Costo estimado (opcional)</label>
            <input value={costoEstimado} onChange={(e) => setCostoEstimado(e.target.value)} placeholder="$450 MXN" />
          </div>
        </div>
      )}

      {resolucion === "contratar" && (
        <div style={{ background: "var(--sand)", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label className="field-label">Tipo de especialista</label>
            <input value={especialista} onChange={(e) => setEspecialista(e.target.value)} placeholder="Plomero, electricista, técnico de albercas..." />
          </div>
          <div>
            <label className="field-label">Costo estimado (opcional)</label>
            <input value={costoEstimado} onChange={(e) => setCostoEstimado(e.target.value)} placeholder="$800 MXN" />
          </div>
        </div>
      )}

      <button className="btn btn-primary-dark" disabled={!puedeGuardar || guardando} onClick={guardar}>
        {guardando ? "Guardando..." : "Guardar tarea"}
      </button>
    </div>
  );
}
