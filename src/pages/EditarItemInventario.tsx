import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { actualizarInventarioItem, obtenerInventarioItem, listarVillas, type VillaBasica } from "../lib/data";
import { subirFoto } from "../lib/storage";
import { mensajeError } from "../lib/errores";
import type { Condicion, InventarioItem } from "../types";
import { CLASE_PILL_CONDICION, LABEL_CONDICION } from "../lib/inventario";
import { etiquetaVilla } from "../lib/villas";
import { OTRA_ZONA, ZONAS } from "../data/zonas";
import { CATEGORIAS_INVENTARIO, OTRA_CATEGORIA_INVENTARIO } from "../data/categoriasInventario";
import { useAuth } from "../contexts/AuthContext";
import { puedeEditarInventario } from "../lib/permissions";
import Cargando from "../components/Cargando";

const CONDICIONES: Condicion[] = ["bueno", "regular", "danado"];

// Corregir un item ya registrado (error de captura: nombre, zona, cantidad,
// condición o foto). Solo administración/supervisión — ver
// puedeEditarInventario en permissions.ts. No se puede cambiar de villa
// aquí; si el item quedó en la villa equivocada, hay que borrarlo desde
// Supabase y volver a capturarlo en la villa correcta.
export default function EditarItemInventario() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const autorizado = puedeEditarInventario(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<InventarioItem | null>(null);
  const [villa, setVilla] = useState<VillaBasica | null>(null);
  const [cargando, setCargando] = useState(true);

  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>(ZONAS[0]);
  const [zonaOtra, setZonaOtra] = useState("");
  const zona = zonaSeleccionada === OTRA_ZONA ? zonaOtra : zonaSeleccionada;
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>(CATEGORIAS_INVENTARIO[0]);
  const [categoriaOtra, setCategoriaOtra] = useState("");
  const categoria = categoriaSeleccionada === OTRA_CATEGORIA_INVENTARIO ? categoriaOtra : categoriaSeleccionada;
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [condicion, setCondicion] = useState<Condicion>("bueno");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autorizado) {
      setCargando(false);
      return;
    }
    let activo = true;
    setCargando(true);
    Promise.all([obtenerInventarioItem(id), listarVillas(profile)])
      .then(([it, villas]) => {
        if (!activo || !it) return;
        setItem(it);
        setVilla(villas.find((v) => v.id === it.villaId) ?? null);
        setZonaSeleccionada(ZONAS.includes(it.zona as (typeof ZONAS)[number]) ? it.zona : OTRA_ZONA);
        setZonaOtra(ZONAS.includes(it.zona as (typeof ZONAS)[number]) ? "" : it.zona);
        const cat = it.categoria ?? "";
        const catConocida = CATEGORIAS_INVENTARIO.includes(cat as (typeof CATEGORIAS_INVENTARIO)[number]);
        setCategoriaSeleccionada(cat ? (catConocida ? cat : OTRA_CATEGORIA_INVENTARIO) : CATEGORIAS_INVENTARIO[0]);
        setCategoriaOtra(cat && !catConocida ? cat : "");
        setNombre(it.nombre);
        setCantidad(String(it.cantidad));
        setCondicion(it.condicion);
        setFotoUrl(it.fotoUrl ?? null);
        setPreviewUrl(it.fotoUrl ?? null);
      })
      .catch((e) => activo && setError(mensajeError(e, "No se pudo cargar el item.")))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [id, profile, autorizado]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
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
      const url = await subirFoto(file, `inventario/${item?.villaId ?? "sin-villa"}`);
      setFotoUrl(url);
    } catch (e) {
      setErrorFoto(mensajeError(e, "No se pudo subir la foto, intenta de nuevo."));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const puedeGuardar = nombre.trim().length > 0 && zona.trim().length > 0 && Number(cantidad) > 0 && !subiendoFoto;

  const guardar = async () => {
    if (!item) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarInventarioItem(id, {
        zona,
        nombre,
        categoria: categoria || undefined,
        cantidad: Number(cantidad),
        condicion,
        fotoUrl: fotoUrl || undefined,
      });
      navigate(`/inventario/villa/${item.villaId}`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la corrección."));
    } finally {
      setGuardando(false);
    }
  };

  if (!autorizado) {
    return (
      <div>
        <h1 className="page-title">Editar item de inventario</h1>
        <div className="card card-dashed">Tu rol no tiene permiso para editar items de inventario.</div>
      </div>
    );
  }

  if (cargando) {
    return <Cargando texto="Cargando item..." />;
  }

  if (!item) {
    return (
      <div>
        {error && (
          <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
          </div>
        )}
        <div className="card card-dashed">Item no encontrado.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Editar item de inventario</h1>
      <p className="page-sub">{villa ? etiquetaVilla(villa) : "Villa"} · corrige lo que esté mal capturado</p>

      <div
        className="card card-dashed"
        style={{ marginBottom: 10, padding: 16, cursor: "pointer", textAlign: "center" }}
        onClick={() => fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Vista previa" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8 }} />
            {subiendoFoto && (
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>Subiendo foto...</p>
            )}
            {!subiendoFoto && fotoUrl && (
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
        <p style={{ fontSize: 11, color: "var(--danger)", margin: "-6px 0 10px" }}>
          {errorFoto} Toca la foto para intentar de nuevo.
        </p>
      )}

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

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Item</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="TV sala, refrigerador, sillas de exterior..." />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Categoría</label>
        <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)}>
          {CATEGORIAS_INVENTARIO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {categoriaSeleccionada === OTRA_CATEGORIA_INVENTARIO && (
          <input
            style={{ marginTop: 6 }}
            value={categoriaOtra}
            onChange={(e) => setCategoriaOtra(e.target.value)}
            placeholder="Especifica la categoría"
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label className="field-label">Cantidad</label>
          <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="field-label">Condición</label>
        <div style={{ display: "flex", gap: 8 }}>
          {CONDICIONES.map((c) => (
            <button
              key={c}
              type="button"
              className={`choice-row${condicion === c ? " selected" : ""}`}
              onClick={() => setCondicion(c)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <span className={CLASE_PILL_CONDICION[c]} style={{ marginRight: condicion === c ? 6 : 0 }}>
                {LABEL_CONDICION[c]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      <button className="btn btn-primary-dark" disabled={!puedeGuardar || guardando} onClick={guardar}>
        {guardando ? "Guardando..." : "Guardar corrección"}
      </button>
    </div>
  );
}
