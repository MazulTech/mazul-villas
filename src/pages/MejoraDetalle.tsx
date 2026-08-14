import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  actualizarDetallesMejora,
  aprobarCotizacion,
  aprobarMejora,
  eliminarMejora,
  marcarCotizacionPagada,
  marcarMejoraResuelta,
  obtenerMejora,
  rechazarMejora,
  listarVillas,
  type VillaBasica,
} from "../lib/data";
import { subirFoto } from "../lib/storage";
import { mensajeError } from "../lib/errores";
import type { Mejora, Resolucion, TipoMantenimiento } from "../types";
import { CLASE_PILL_URGENCIA, LABEL_URGENCIA, SLA_POR_URGENCIA } from "../lib/urgencia";
import { CLASE_PILL_ESTADO_MEJORA, LABEL_ESTADO_MEJORA } from "../lib/estadoMejora";
import { LABEL_RESOLUCION } from "../lib/resolucion";
import { LABEL_QUIEN_PAGA, LABEL_TIPO_MANTENIMIENTO } from "../lib/tipoMantenimiento";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import {
  puedeAprobarCotizacion,
  puedeAprobarORechazar,
  puedeBorrarMejora,
  puedeEditarCotizacion,
  puedeElegirTipoMantenimiento,
  puedeMarcarCotizacionPagada,
  puedeMarcarResuelta,
  puedeVerDetallesCotizacion,
  puedeVerVilla,
} from "../lib/permissions";
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

  const [editandoDetalles, setEditandoDetalles] = useState(false);
  const [resolucionEdit, setResolucionEdit] = useState<Resolucion>("equipo");
  const [tipoMantenimientoEdit, setTipoMantenimientoEdit] = useState<TipoMantenimiento>("correctivo");
  const [materialEdit, setMaterialEdit] = useState("");
  const [especialistaEdit, setEspecialistaEdit] = useState("");
  const [costoEdit, setCostoEdit] = useState("");
  const [proveedorEdit, setProveedorEdit] = useState("");
  const [fotoCotizacionEdit, setFotoCotizacionEdit] = useState<string | null>(null);
  const [previewCotizacion, setPreviewCotizacion] = useState<string | null>(null);
  const [subiendoFotoCotizacion, setSubiendoFotoCotizacion] = useState(false);
  const [errorFotoCotizacion, setErrorFotoCotizacion] = useState<string | null>(null);
  const [guardandoDetalles, setGuardandoDetalles] = useState(false);
  const [errorDetalles, setErrorDetalles] = useState<string | null>(null);
  const fileInputCotizacionRef = useRef<HTMLInputElement>(null);
  const [procesandoCotizacion, setProcesandoCotizacion] = useState(false);

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

  const empezarEdicion = () => {
    if (!mejora) return;
    setResolucionEdit(mejora.resolucion);
    setTipoMantenimientoEdit(mejora.tipoMantenimiento);
    setMaterialEdit(mejora.materialNecesario ?? "");
    setEspecialistaEdit(mejora.especialistaNecesario ?? "");
    setCostoEdit(mejora.costoEstimado !== undefined ? String(mejora.costoEstimado) : "");
    setProveedorEdit(mejora.proveedorOLink ?? "");
    setFotoCotizacionEdit(mejora.fotoCotizacionUrl ?? null);
    setPreviewCotizacion(mejora.fotoCotizacionUrl ?? null);
    setErrorFotoCotizacion(null);
    setErrorDetalles(null);
    setEditandoDetalles(true);
  };

  const onFotoCotizacionSeleccionada = async (file: File | null) => {
    if (!file) return;
    const urlLocal = URL.createObjectURL(file);
    setPreviewCotizacion((anterior) => {
      if (anterior && anterior.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return urlLocal;
    });
    setSubiendoFotoCotizacion(true);
    setErrorFotoCotizacion(null);
    try {
      const url = await subirFoto(file, `mejoras/${mejora?.villaId ?? "sin-villa"}`);
      setFotoCotizacionEdit(url);
    } catch (e) {
      setErrorFotoCotizacion(mensajeError(e, "No se pudo subir la foto, intenta de nuevo."));
    } finally {
      setSubiendoFotoCotizacion(false);
    }
  };

  const guardarDetalles = async () => {
    if (!id) return;
    setGuardandoDetalles(true);
    setErrorDetalles(null);
    try {
      await actualizarDetallesMejora(id, {
        resolucion: resolucionEdit,
        materialNecesario: materialEdit || undefined,
        especialistaNecesario: especialistaEdit || undefined,
        costoEstimado: costoEdit ? Number(costoEdit) : undefined,
        fotoCotizacionUrl: fotoCotizacionEdit || undefined,
        proveedorOLink: proveedorEdit || undefined,
        tipoMantenimiento: puedeElegirTipoMantenimiento(profile) ? tipoMantenimientoEdit : undefined,
      });
      setEditandoDetalles(false);
      cargar();
    } catch (e) {
      setErrorDetalles(mensajeError(e, "No se pudieron guardar los cambios."));
    } finally {
      setGuardandoDetalles(false);
    }
  };

  const aprobarLaCotizacion = async () => {
    if (!id) return;
    setProcesandoCotizacion(true);
    setError(null);
    try {
      await aprobarCotizacion(id);
      cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo aprobar la cotización."));
    } finally {
      setProcesandoCotizacion(false);
    }
  };

  const marcarPagada = async () => {
    if (!id) return;
    if (!window.confirm("¿Confirmar que la cotización ya se pagó/compró?")) return;
    setProcesandoCotizacion(true);
    setError(null);
    try {
      await marcarCotizacionPagada(id);
      cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo marcar como pagada."));
    } finally {
      setProcesandoCotizacion(false);
    }
  };

  const borrar = async () => {
    if (!id) return;
    if (!window.confirm("¿Borrar esta tarea? No se puede deshacer.")) return;
    setProcesando(true);
    setError(null);
    try {
      await eliminarMejora(id);
      navigate("/mejoras");
    } catch (e) {
      setError(mensajeError(e, "No se pudo borrar la tarea."));
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
  const puedeBorrar = puedeBorrarMejora(profile);
  const estadoEditable = mejora.estado === "pendiente" || mejora.estado === "en_proceso" || mejora.estado === "rechazada";
  const puedeEditarDetalles = puedeEditarCotizacion(profile) && estadoEditable;
  const requiereCompra = mejora.resolucion !== "equipo";
  const puedeVerCotizacion = puedeVerDetallesCotizacion(profile, requiereCompra, mejora.cotizacionAprobada);
  const puedeAprobarLaCotizacion =
    puedeAprobarCotizacion(profile) && requiereCompra && !mejora.cotizacionAprobada && !!mejora.materialNecesario;
  const puedeMarcarPago =
    puedeMarcarCotizacionPagada(profile, mejora.villaId, mejora.tipoMantenimiento) &&
    requiereCompra &&
    mejora.cotizacionAprobada &&
    !mejora.cotizacionPagada;
  const trabajoBloqueadoPorCotizacion = requiereCompra && !(mejora.cotizacionAprobada && mejora.cotizacionPagada);

  return (
    <div>
      <h1 className="page-title">{nombreVilla(mejora.villaId)}</h1>
      <p className="page-sub">
        {mejora.zona} · {mejora.descripcion}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span className={CLASE_PILL_URGENCIA[mejora.urgencia]}>{LABEL_URGENCIA[mejora.urgencia]}</span>
        <span className={CLASE_PILL_ESTADO_MEJORA[mejora.estado]}>{LABEL_ESTADO_MEJORA[mejora.estado]}</span>
        <span className="pill" style={{ background: "var(--sand)", color: "var(--espresso)" }}>
          {LABEL_TIPO_MANTENIMIENTO[mejora.tipoMantenimiento]}
        </span>
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
        {!editandoDetalles ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <p style={{ fontSize: 12, margin: "0 0 4px" }}>{LABEL_RESOLUCION[mejora.resolucion]}</p>
              {puedeEditarDetalles && (
                <button
                  type="button"
                  onClick={empezarEdicion}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--terra-dark)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Editar
                </button>
              )}
            </div>
            {!puedeVerCotizacion ? (
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
                Administración está revisando la cotización. Te avisamos en cuanto esté lista para pagar.
              </p>
            ) : (
              <>
                {mejora.materialNecesario && (
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px", whiteSpace: "pre-line" }}>
                    Materiales:{"\n"}
                    {mejora.materialNecesario}
                  </p>
                )}
                {mejora.especialistaNecesario && (
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
                    Especialista: {mejora.especialistaNecesario}
                  </p>
                )}
                {mejora.proveedorOLink && (
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px", wordBreak: "break-word" }}>
                    Proveedor / link: {mejora.proveedorOLink}
                  </p>
                )}
                {mejora.costoEstimado !== undefined && (
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
                    Costo estimado: ${mejora.costoEstimado} MXN
                  </p>
                )}
                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
                  {LABEL_QUIEN_PAGA[mejora.tipoMantenimiento]}
                </p>
                {mejora.fotoCotizacionUrl && (
                  <img
                    src={mejora.fotoCotizacionUrl}
                    alt="Foto de la cotización"
                    style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8, margin: "6px 0" }}
                  />
                )}
                {requiereCompra && !mejora.materialNecesario && !mejora.especialistaNecesario && puedeEditarDetalles && (
                  <p style={{ fontSize: 11, color: "var(--warn)", margin: "0 0 2px" }}>
                    Todavía no se registran detalles. Toca "Editar" cuando los sepas.
                  </p>
                )}
                {requiereCompra && (
                  <span
                    className={mejora.cotizacionPagada ? "pill pill-ok" : mejora.cotizacionAprobada ? "pill pill-warn" : "pill pill-danger"}
                    style={{ display: "inline-block", margin: "4px 0" }}
                  >
                    {mejora.cotizacionPagada
                      ? "Cotización pagada"
                      : mejora.cotizacionAprobada
                        ? "Cotización aprobada · falta pagar"
                        : "Cotización sin aprobar"}
                  </span>
                )}
                {puedeAprobarLaCotizacion && (
                  <button
                    className="btn btn-primary-dark"
                    disabled={procesandoCotizacion}
                    onClick={aprobarLaCotizacion}
                    style={{ marginTop: 8 }}
                  >
                    {procesandoCotizacion ? "Guardando..." : "Aprobar cotización"}
                  </button>
                )}
                {puedeMarcarPago && (
                  <button
                    className="btn btn-primary-dark"
                    disabled={procesandoCotizacion}
                    onClick={marcarPagada}
                    style={{ marginTop: 8 }}
                  >
                    {procesandoCotizacion ? "Guardando..." : "Marcar como pagada / comprada"}
                  </button>
                )}
              </>
            )}
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>
              SLA: {SLA_POR_URGENCIA[mejora.urgencia]}
            </p>
          </>
        ) : (
          <div>
            {puedeElegirTipoMantenimiento(profile) && (
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">¿Preventivo o correctivo?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={`choice-row${tipoMantenimientoEdit === "preventivo" ? " selected" : ""}`}
                    onClick={() => setTipoMantenimientoEdit("preventivo")}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Preventivo
                  </button>
                  <button
                    type="button"
                    className={`choice-row${tipoMantenimientoEdit === "correctivo" ? " selected" : ""}`}
                    onClick={() => setTipoMantenimientoEdit("correctivo")}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Correctivo
                  </button>
                </div>
              </div>
            )}
            <label className="field-label">¿Cómo se resuelve?</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              <button
                type="button"
                className={`choice-row${resolucionEdit === "equipo" ? " selected" : ""}`}
                onClick={() => setResolucionEdit("equipo")}
              >
                Lo resuelve el equipo
              </button>
              <button
                type="button"
                className={`choice-row${resolucionEdit === "materiales" ? " selected" : ""}`}
                onClick={() => setResolucionEdit("materiales")}
              >
                Requiere comprar material o pieza
              </button>
              <button
                type="button"
                className={`choice-row${resolucionEdit === "contratar" ? " selected" : ""}`}
                onClick={() => setResolucionEdit("contratar")}
              >
                Requiere contratar a alguien
              </button>
            </div>

            {resolucionEdit === "materiales" && (
              <div style={{ marginBottom: 8 }}>
                <label className="field-label">Materiales o piezas necesarias (uno por línea si son varios)</label>
                <textarea
                  rows={3}
                  value={materialEdit}
                  onChange={(e) => setMaterialEdit(e.target.value)}
                  placeholder={"Llave mezcladora para fregadero\nTubo PVC 2\"\nPegamento"}
                />
              </div>
            )}
            {resolucionEdit === "contratar" && (
              <div style={{ marginBottom: 8 }}>
                <label className="field-label">Tipo de especialista</label>
                <input value={especialistaEdit} onChange={(e) => setEspecialistaEdit(e.target.value)} placeholder="Plomero, electricista, técnico de albercas..." />
              </div>
            )}
            {resolucionEdit !== "equipo" && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <label className="field-label">Proveedor o link de compra</label>
                  <input
                    value={proveedorEdit}
                    onChange={(e) => setProveedorEdit(e.target.value)}
                    placeholder="Ferretería López, o link de la tienda en línea"
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label className="field-label">Costo estimado (opcional)</label>
                  <input value={costoEdit} onChange={(e) => setCostoEdit(e.target.value)} placeholder="$450 MXN" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label className="field-label">Foto del producto o de la cotización</label>
                  <div
                    className="card card-dashed"
                    style={{ padding: 16, cursor: "pointer", textAlign: "center" }}
                    onClick={() => fileInputCotizacionRef.current?.click()}
                  >
                    {previewCotizacion ? (
                      <>
                        <img
                          src={previewCotizacion}
                          alt="Vista previa"
                          style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 8 }}
                        />
                        {subiendoFotoCotizacion && (
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>Subiendo foto...</p>
                        )}
                        {!subiendoFotoCotizacion && fotoCotizacionEdit && (
                          <p style={{ fontSize: 11, color: "var(--ok)", margin: "6px 0 0" }}>✓ Foto guardada</p>
                        )}
                      </>
                    ) : (
                      "Toca para tomar una foto nueva o elegir una de tu galería"
                    )}
                    <input
                      ref={fileInputCotizacionRef}
                      type="file"
                      accept="image/*"
                      className="input-foto-oculto"
                      onChange={(e) => onFotoCotizacionSeleccionada(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {errorFotoCotizacion && (
                    <p style={{ fontSize: 11, color: "var(--danger)", margin: "4px 0 0" }}>
                      {errorFotoCotizacion} Toca la foto para intentar de nuevo.
                    </p>
                  )}
                </div>
              </>
            )}

            {errorDetalles && (
              <p style={{ fontSize: 11, color: "var(--danger)", margin: "0 0 8px", wordBreak: "break-word" }}>{errorDetalles}</p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary-dark" disabled={guardandoDetalles} onClick={guardarDetalles} style={{ flex: 1 }}>
                {guardandoDetalles ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                className="btn btn-secondary"
                disabled={guardandoDetalles}
                onClick={() => setEditandoDetalles(false)}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
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
        puedeResolver &&
        trabajoBloqueadoPorCotizacion && (
          <div className="card" style={{ background: "var(--sand)", border: "none", marginBottom: 14 }}>
            <p style={{ fontSize: 11, margin: 0 }}>
              {!mejora.cotizacionAprobada
                ? "Falta que administración apruebe la cotización antes de poder trabajar en esto."
                : mejora.tipoMantenimiento === "preventivo"
                  ? "La cotización ya está aprobada. Falta que administración confirme el pago (fondos de Mazul) antes de poder trabajar en esto."
                  : "La cotización ya está aprobada. Falta que el dueño pague/compre el material antes de poder trabajar en esto."}
            </p>
          </div>
        )}

      {(mejora.estado === "pendiente" || mejora.estado === "en_proceso" || mejora.estado === "rechazada") &&
        puedeResolver &&
        !trabajoBloqueadoPorCotizacion && (
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

      {puedeBorrar && (
        <button
          className="btn"
          disabled={procesando}
          onClick={borrar}
          style={{
            marginTop: 20,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "transparent",
          }}
        >
          Borrar tarea
        </button>
      )}
    </div>
  );
}
