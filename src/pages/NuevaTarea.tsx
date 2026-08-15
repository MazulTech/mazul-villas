import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { crearMejora, listarVillas, type VillaBasica } from "../lib/data";
import { subirFoto } from "../lib/storage";
import { mensajeError } from "../lib/errores";
import type { Resolucion, TipoMantenimiento } from "../types";
import { CLASE_PILL_URGENCIA, LABEL_URGENCIA, SLA_POR_URGENCIA, calcularUrgencia } from "../lib/urgencia";
import { etiquetaVilla } from "../lib/villas";
import { OTRA_ZONA, ZONAS } from "../data/zonas";
import { useAuth } from "../contexts/AuthContext";
import { puedeElegirTipoMantenimiento } from "../lib/permissions";

// Si el celular bloquea la pantalla, el navegador puede recargar la
// pestaña por completo al volver (para liberar memoria), lo que borra
// el estado de React. No se puede guardar la foto en sí (no es texto),
// pero sí el resto del formulario, para no perder todo el trabajo.
const CLAVE_BORRADOR = "mazul-borrador-nueva-tarea";

interface Borrador {
  villaId: string;
  zonaSeleccionada: string;
  zonaOtra: string;
  descripcion: string;
  afectaSeguridadOperacion: boolean | null;
  afectaAmenidad: boolean | null;
  tipoMantenimiento: TipoMantenimiento | null;
  resolucion: Resolucion;
  materialNecesario: string;
  especialista: string;
  costoEstimado: string;
  fotoAntesUrl: string | null;
}

function leerBorrador(): Borrador | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE_BORRADOR);
    return crudo ? (JSON.parse(crudo) as Borrador) : null;
  } catch {
    return null;
  }
}

// Cuando se llega desde el botón "Reportar como mejora" de Inventario.tsx,
// viene esta info en location.state para no tener que volver a escribir
// villa/zona/descripción ni retomar la foto.
interface PrefillDesdeInventario {
  villaId?: string;
  zona?: string;
  descripcion?: string;
  fotoUrl?: string;
  inventarioItemId?: string;
}

export default function NuevaTarea() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const borradorInicial = useRef(leerBorrador()).current;
  // Si venimos de Inventario, ese contexto manda sobre cualquier borrador
  // viejo que hubiera quedado a medias.
  const prefill = useRef((location.state as PrefillDesdeInventario | null) ?? null).current;
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [villaId, setVillaId] = useState(prefill?.villaId ?? borradorInicial?.villaId ?? "");
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>(() => {
    if (prefill?.zona) return ZONAS.includes(prefill.zona as (typeof ZONAS)[number]) ? prefill.zona : OTRA_ZONA;
    return borradorInicial?.zonaSeleccionada ?? ZONAS[0];
  });
  const [zonaOtra, setZonaOtra] = useState(() => {
    if (prefill?.zona && !ZONAS.includes(prefill.zona as (typeof ZONAS)[number])) return prefill.zona;
    return borradorInicial?.zonaOtra ?? "";
  });
  const zona = zonaSeleccionada === OTRA_ZONA ? zonaOtra : zonaSeleccionada;
  const [descripcion, setDescripcion] = useState(prefill?.descripcion ?? borradorInicial?.descripcion ?? "");
  const [fotoAntesUrl, setFotoAntesUrl] = useState<string | null>(
    prefill?.fotoUrl ?? borradorInicial?.fotoAntesUrl ?? null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    prefill?.fotoUrl ?? borradorInicial?.fotoAntesUrl ?? null
  );
  const [inventarioItemId] = useState<string | undefined>(prefill?.inventarioItemId);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [afectaSeguridadOperacion, setAfectaSeguridadOperacion] = useState<boolean | null>(
    borradorInicial?.afectaSeguridadOperacion ?? null
  );
  const [afectaAmenidad, setAfectaAmenidad] = useState<boolean | null>(borradorInicial?.afectaAmenidad ?? null);
  const [tipoMantenimiento, setTipoMantenimiento] = useState<TipoMantenimiento | null>(
    borradorInicial?.tipoMantenimiento ?? null
  );
  const [resolucion, setResolucion] = useState<Resolucion>(borradorInicial?.resolucion ?? "equipo");
  const [materialNecesario, setMaterialNecesario] = useState(borradorInicial?.materialNecesario ?? "");
  const [especialista, setEspecialista] = useState(borradorInicial?.especialista ?? "");
  const [costoEstimado, setCostoEstimado] = useState(borradorInicial?.costoEstimado ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [huboBorrador] = useState(!prefill && borradorInicial !== null);
  const puedeElegirTipo = puedeElegirTipoMantenimiento(profile);

  useEffect(() => {
    listarVillas(profile)
      .then((v) => {
        setVillas(v);
        setVillaId((actual) => actual || v[0]?.id || "");
      })
      .catch((e: Error) => setError(e.message));
  }, [profile]);

  // Guarda un borrador con cada cambio. La foto ya se sube apenas se toma
  // (ver onFotoSeleccionada), así que aquí solo persistimos su URL, no el
  // archivo — eso es lo que permite recuperarla si la app se recarga.
  useEffect(() => {
    const borrador: Borrador = {
      villaId,
      zonaSeleccionada,
      zonaOtra,
      descripcion,
      afectaSeguridadOperacion,
      afectaAmenidad,
      tipoMantenimiento,
      resolucion,
      materialNecesario,
      especialista,
      costoEstimado,
      fotoAntesUrl,
    };
    try {
      window.localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));
    } catch {
      // si localStorage no está disponible, simplemente no persistimos
    }
  }, [
    villaId,
    zonaSeleccionada,
    zonaOtra,
    descripcion,
    afectaSeguridadOperacion,
    afectaAmenidad,
    tipoMantenimiento,
    resolucion,
    materialNecesario,
    especialista,
    costoEstimado,
    fotoAntesUrl,
  ]);

  const borrarBorrador = () => {
    try {
      window.localStorage.removeItem(CLAVE_BORRADOR);
    } catch {
      // sin acción si no hay localStorage
    }
  };

  // Sube la foto a Supabase apenas se toma/selecciona, en vez de esperar
  // hasta "Guardar tarea". Si la app se recarga justo después de volver
  // de la cámara (algo común en celulares), la foto ya quedó a salvo y
  // solo se pierde si el usuario nunca llegó a este paso.
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
      const url = await subirFoto(file, `mejoras/${villaId || "sin-villa"}`);
      setFotoAntesUrl(url);
    } catch (e) {
      setErrorFoto(mensajeError(e, "No se pudo subir la foto, intenta de nuevo."));
      setPreviewUrl(fotoAntesUrl);
    } finally {
      setSubiendoFoto(false);
    }
  };

  const urgenciaCalculada =
    afectaSeguridadOperacion === null || afectaAmenidad === null
      ? null
      : calcularUrgencia(afectaSeguridadOperacion, afectaAmenidad);

  const faltantes: string[] = [];
  if (villaId === "") faltantes.push("elegir la villa");
  if (subiendoFoto) faltantes.push('esperar a que suba la foto "antes"');
  else if (!fotoAntesUrl) faltantes.push('la foto "antes"');
  if (zona.trim().length === 0) faltantes.push("la zona");
  if (descripcion.trim().length === 0) faltantes.push("la descripción");
  if (afectaSeguridadOperacion === null) faltantes.push("responder si afecta seguridad/operación");
  else if (afectaSeguridadOperacion === false && afectaAmenidad === null) faltantes.push("responder si afecta una amenidad");
  if (puedeElegirTipo && tipoMantenimiento === null) faltantes.push("elegir si es preventivo o correctivo");

  const puedeGuardar = faltantes.length === 0;

  const guardar = async () => {
    if (afectaSeguridadOperacion === null || afectaAmenidad === null || !fotoAntesUrl) return;
    // Quien no es admin no elige preventivo/correctivo (lo decide
    // administración después); se guarda como correctivo por default.
    const tipoAGuardar = puedeElegirTipo ? tipoMantenimiento : "correctivo";
    if (tipoAGuardar === null) return;
    setGuardando(true);
    setError(null);
    try {
      await crearMejora({
        villaId,
        zona,
        descripcion,
        fotoAntesUrl,
        afectaSeguridadOperacion,
        afectaAmenidad,
        tipoMantenimiento: tipoAGuardar,
        resolucion,
        materialNecesario: materialNecesario || undefined,
        especialistaNecesario: especialista || undefined,
        costoEstimado: costoEstimado ? Number(costoEstimado) : undefined,
        inventarioItemId,
      });
      borrarBorrador();
      navigate("/mejoras");
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la tarea."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Nueva tarea de mejora</h1>
      <p className="page-sub">Aplica para cualquier villa, no solo la del recorrido de hoy</p>

      {inventarioItemId && (
        <div className="card" style={{ background: "var(--sand)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, margin: 0 }}>
            Reportado desde un item del inventario. Revisa los datos y agrega lo que haga falta.
          </p>
        </div>
      )}

      {huboBorrador && (
        <div className="card" style={{ background: "var(--warn-bg)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, margin: 0, color: "var(--warn)" }}>
            {fotoAntesUrl
              ? "Recuperamos lo que llevabas escrito, incluida la foto."
              : 'Recuperamos lo que llevabas escrito. Vuelve a tomar la foto "antes" para poder guardar.'}
          </p>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Villa</label>
        <select value={villaId} onChange={(e) => setVillaId(e.target.value)}>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {etiquetaVilla(v)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Foto "antes" (obligatoria)</label>
        <div
          className="card card-dashed"
          style={{ padding: 16, cursor: "pointer", textAlign: "center" }}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Vista previa" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8 }} />
              {subiendoFoto && (
                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>Subiendo foto...</p>
              )}
              {!subiendoFoto && fotoAntesUrl && (
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
          <div className="card" style={{ borderColor: "var(--danger)", marginTop: 8, marginBottom: 0 }}>
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>
              No se pudo subir la foto: {errorFoto}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Toca la foto para intentar de nuevo.
            </p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Zona</label>
        <select value={zonaSeleccionada} onChange={(e) => setZonaSeleccionada(e.target.value)}>
          {ZONAS.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        {zonaSeleccionada === OTRA_ZONA && (
          <input
            style={{ marginTop: 6 }}
            value={zonaOtra}
            onChange={(e) => setZonaOtra(e.target.value)}
            placeholder="Especifica la zona"
          />
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="field-label">Descripción</label>
        <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Fuga en la llave del fregadero" />
      </div>

      {puedeElegirTipo && (
      <div style={{ marginBottom: 10 }}>
        <label className="field-label">¿Es mantenimiento preventivo (programado) o correctivo (se reporta una falla)?</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`choice-row${tipoMantenimiento === "preventivo" ? " selected" : ""}`}
            onClick={() => setTipoMantenimiento("preventivo")}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Preventivo
          </button>
          <button
            type="button"
            className={`choice-row${tipoMantenimiento === "correctivo" ? " selected" : ""}`}
            onClick={() => setTipoMantenimiento("correctivo")}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Correctivo
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>
          {tipoMantenimiento === "preventivo"
            ? "Si hay que comprar algo, se paga con fondos de Mazul."
            : tipoMantenimiento === "correctivo"
              ? "Si hay que comprar algo, lo paga el dueño de la villa."
              : "Preventivo = programado (se paga con fondos de Mazul). Correctivo = falla reportada (lo paga el dueño)."}
        </p>
      </div>
      )}

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
            <label className="field-label">Materiales o piezas necesarias (uno por línea si son varios)</label>
            <textarea
              rows={2}
              value={materialNecesario}
              onChange={(e) => setMaterialNecesario(e.target.value)}
              placeholder={"Llave mezcladora para fregadero\nTubo PVC 2\"\nPegamento"}
            />
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

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {faltantes.length > 0 && (
        <div className="card" style={{ background: "var(--sand)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, margin: 0 }}>Falta: {faltantes.join(", ")}.</p>
        </div>
      )}

      <button className="btn btn-primary-dark" disabled={!puedeGuardar || guardando} onClick={guardar}>
        {guardando ? "Guardando..." : "Guardar tarea"}
      </button>
    </div>
  );
}
