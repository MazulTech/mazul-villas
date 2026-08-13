import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  aprobarMejora,
  marcarMejoraResuelta,
  obtenerMejora,
  rechazarMejora,
  listarVillas,
  type VillaBasica,
} from "../lib/data";
import { subirFoto } from "../lib/storage";
import { mensajeError } from "../lib/errores";
import type { Mejora } from "../types";
import { CLASE_PILL_URGENCIA, LABEL_URGENCIA, SLA_POR_URGENCIA } from "../lib/urgencia";
import { CLASE_PILL_ESTADO_MEJORA, LABEL_ESTADO_MEJORA } from "../lib/estadoMejora";
import { LABEL_RESOLUCION } from "../lib/resolucion";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { puedeAprobarORechazar, puedeMarcarResuelta, puedeVerVilla } from "../lib/permissions";
import Cargando from "../components/Cargando";

export default function MejoraDetalle() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mejora, setMejora] = useState<Mejora | null>(null);
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fotoDespuesUrl, setFotoDespuesUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = () => {
    if (!id) return;
    setCargando(true);
    obtenerMejora(id)
      .then((m) => setMejora(m))
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [id]);

  useEffect(() => {
    listarVillas(profile).then(setVillas).catch(() => undefined);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFotoSeleccionada = async (file: File | null) => {
    if (!file) return;
    const urlLocal = URL.createObjectURL(file);
    setPreviewUrl((anterior) => {
      if (anterior && anterior.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return urlLocal;
    });
    setSubiendoFoto(true);
    setErrorFoto(null);
    try {
      const url = await subirFoto(file, `mejoras/${mejora?.villaId ?? "sin-villa"}`);
      setFotoDespuesUrl(url);
    } catch (e) {
      setErrorFoto(mensajeError(e, "No se pudo subir la foto, intenta de nuevo."));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const nombreVilla = (villaId: string) => {
    const v = villas.find((v) => v.id === villaId);
    return v ? etiquetaVilla(v) : villaId;
  };

  const marcarResuelta = async () => {
    if (!id || !fotoDespuesUrl) return;
    setProcesando(true);
    setError(null);
    try {
      await marcarMejoraResuelta(id, fotoDespuesUrl);
      cargar();
      setFotoDespuesUrl(null);
      setPreviewUrl(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudo marcar como resuelta."));
    } finally {
      setProcesando(false);
    }
  };

  const aprobar = async () => {
    if (!id) return;
    setProcesando(true);
    setError(null);
    try {
      await aprobarMejora(id);
      cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo aprobar la tarea."));
    } finally {
      setProcesando(false);
    }
  };

  const rechazar = async () => {
    if (!id) return;
    setProcesando(true);
    setError(null);
    try {
      await rechazarMejora(id);
      cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo rechazar la tarea."));
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return <Cargando texto="Cargando tarea..." />;
  }

  if (!mejora) {
    return (
      <div>
        {error && (
          <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>
          </div>
        )}
        <div className="card card-dashed">No se encontró esta tarea.</div>
        <button className="btn btn-primary-dark" style={{ marginTop: 12 }} onClick={() => navigate("/mejoras")}>
          Volver a mejoras
        </button>
      </div>
    );
  }

  if (!puedeVerVilla(profile, mejora.villaId)) {
    return (
      <div>
        <div className="card card-dashed">Tu rol no tiene acceso a esta villa.</div>
        <button className="btn btn-primary-dark" style={{ marginTop: 12 }} onClick={() => navigate("/mejoras")}>
          Volver a mejoras
        </button>
      </div>
    );
  }

  const puedeResolver = puedeMarcarResuelta(profile, mejora.creadoPor);
  const puedeAprobar = puedeAprobarORechazar(profile, mejora.villaId);

  return (
    <div>
      <h1 className="page-title">{nombreVilla(mejora.villaId)}</h1>
      <p className="page-sub">
        {mejora.zona} · {mejora.descripcion}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <span className={CLASE_PILL_URGENCIA[mejora.urgencia]}>{LABEL_URGENCIA[mejora.urgencia]}</span>
        <span className={CLASE_PILL_ESTADO_MEJORA[mejora.estado]}>{LABEL_ESTADO_MEJORA[mejora.estado]}</span>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 6px" }}>ANTES</p>
          {mejora.fotoAntesUrl ? (
            <img
              src={mejora.fotoAntesUrl}
              alt="Antes"
              style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
            />
          ) : (
            <div className="card card-dashed" style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
              Sin foto
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 6px" }}>DESPUÉS</p>
          {mejora.fotoDespuesUrl ? (
            <img
              src={mejora.fotoDespuesUrl}
              alt="Después"
              style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
            />
          ) : (
            <div className="card card-dashed" style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
              Todavía no hay
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12, margin: "0 0 4px" }}>{LABEL_RESOLUCION[mejora.resolucion]}</p>
        {mejora.materialNecesario && (
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
            Material: {mejora.materialNecesario}
          </p>
        )}
        {mejora.especialistaNecesario && (
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
            Especialista: {mejora.especialistaNecesario}
          </p>
        )}
        {mejora.costoEstimado !== undefined && (
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
            Costo estimado: ${mejora.costoEstimado} MXN
          </p>
        )}
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
          SLA: {SLA_POR_URGENCIA[mejora.urgencia]}
        </p>
      </div>

      {(mejora.estado === "pendiente" || mejora.estado === "en_proceso" || mejora.estado === "rechazada") &&
        !puedeResolver && (
          <div className="card" style={{ background: "var(--sand)", border: "none", marginBottom: 14 }}>
            <p style={{ fontSize: 11, margin: 0 }}>
              Solo quien reportó este caso (o administración) puede marcarlo como resuelto.
            </p>
          </div>
        )}

      {(mejora.estado === "pendiente" || mejora.estado === "en_proceso" || mejora.estado === "rechazada") &&
        puedeResolver && (
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Foto "después" para mandar a aprobación del dueño</label>
          <div
            className="card card-dashed"
            style={{ padding: 16, cursor: "pointer", textAlign: "center", marginBottom: 8 }}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Vista previa" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8 }} />
                {subiendoFoto && (
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>Subiendo foto...</p>
                )}
                {!subiendoFoto && fotoDespuesUrl && (
                  <p style={{ fontSize: 11, color: "var(--ok)", margin: "6px 0 0" }}>✓ Foto guardada</p>
                )}
              </>
            ) : (
              "Toca para tomar una foto nueva o elegir una de tu galería"
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="input-foto-oculto"
              onChange={(e) => onFotoSeleccionada(e.target.files?.[0] ?? null)}
            />
          </div>
          {errorFoto && (
            <p style={{ fontSize: 11, color: "var(--danger)", margin: "0 0 8px" }}>
              {errorFoto} Toca la foto para intentar de nuevo.
            </p>
          )}
          <button className="btn btn-primary-dark" disabled={!fotoDespuesUrl || subiendoFoto || procesando} onClick={marcarResuelta}>
            {procesando ? "Guardando..." : "Marcar como resuelta y enviar a aprobación"}
          </button>
        </div>
      )}

      {mejora.estado === "esperando_aprobacion" && puedeAprobar && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
            Revisa el resultado y aprueba o rechaza.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary-dark" disabled={procesando} onClick={aprobar} style={{ flex: 1 }}>
              Aprobar
            </button>
            <button
              className="btn"
              disabled={procesando}
              onClick={rechazar}
              style={{ flex: 1, border: "1px solid var(--danger)", color: "var(--danger)", background: "transparent" }}
            >
              Rechazar, falta trabajo
            </button>
          </div>
        </div>
      )}

      {mejora.estado === "esperando_aprobacion" && !puedeAprobar && (
        <div className="card" style={{ background: "var(--sand)", border: "none" }}>
          <p style={{ fontSize: 11, margin: 0 }}>Esperando que el dueño de esta villa revise el resultado.</p>
        </div>
      )}

      {mejora.estado === "aprobada" && (
        <div className="card" style={{ background: "var(--sand)", border: "none" }}>
          Aprobada por el dueño{mejora.aprobadoEn ? ` el ${new Date(mejora.aprobadoEn).toLocaleDateString("es-MX")}` : ""}.
        </div>
      )}
    </div>
  );
}
