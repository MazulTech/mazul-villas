import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  crearInventarioItem,
  listarVillas,
  buscarLinksCompra,
  type VillaBasica,
  type SugerenciaLinkCompra,
} from "../lib/data";
import { subirFoto } from "../lib/storage";
import { mensajeError } from "../lib/errores";
import type { Condicion } from "../types";
import { CLASE_PILL_CONDICION, LABEL_CONDICION } from "../lib/inventario";
import { etiquetaVilla } from "../lib/villas";
import { OTRA_ZONA, ZONAS } from "../data/zonas";
import { CATEGORIAS_INVENTARIO, OTRA_CATEGORIA_INVENTARIO } from "../data/categoriasInventario";
import { useAuth } from "../contexts/AuthContext";
import { puedeGestionarInventario } from "../lib/permissions";

const CONDICIONES: Condicion[] = ["bueno", "regular", "danado"];

// Se llega aquí desde InventarioVilla.tsx, así que la villa ya se sabe (no
// hay que volver a elegirla) — al guardar, regresa a esa misma villa.
export default function NuevoItemInventario() {
  const { villaId = "" } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const autorizado = puedeGestionarInventario(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [villa, setVilla] = useState<VillaBasica | null>(null);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>(ZONAS[0]);
  const [zonaOtra, setZonaOtra] = useState("");
  const zona = zonaSeleccionada === OTRA_ZONA ? zonaOtra : zonaSeleccionada;
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>(CATEGORIAS_INVENTARIO[0]);
  const [categoriaOtra, setCategoriaOtra] = useState("");
  const categoria = categoriaSeleccionada === OTRA_CATEGORIA_INVENTARIO ? categoriaOtra : categoriaSeleccionada;
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [condicion, setCondicion] = useState<Condicion>("bueno");
  const [descripcionCondicion, setDescripcionCondicion] = useState("");
  const [linkCompra, setLinkCompra] = useState("");
  const [sugerencias, setSugerencias] = useState<SugerenciaLinkCompra[]>([]);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarVillas(profile)
      .then((v) => setVilla(v.find((x) => x.id === villaId) ?? null))
      .catch((e: Error) => setError(e.message));
  }, [profile, villaId]);

  // Busca (con un poco de espera para no disparar en cada tecla) si ya se
  // compró algo con nombre parecido en otra villa y tiene link guardado —
  // así no hay que volver a buscarlo desde cero.
  useEffect(() => {
    if (nombre.trim().length < 3 || linkCompra.trim().length > 0) {
      setSugerencias([]);
      return;
    }
    let vivo = true;
    const t = setTimeout(() => {
      buscarLinksCompra(nombre)
        .then((res) => {
          if (vivo) setSugerencias(res.filter((s) => s.villaId !== villaId));
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, villaId]);

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
      const url = await subirFoto(file, `inventario/${villaId || "sin-villa"}`);
      setFotoUrl(url);
    } catch (e) {
      setErrorFoto(mensajeError(e, "No se pudo subir la foto, intenta de nuevo."));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const puedeGuardar = nombre.trim().length > 0 && zona.trim().length > 0 && Number(cantidad) > 0 && !subiendoFoto;

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await crearInventarioItem({
        villaId,
        zona,
        nombre,
        categoria: categoria || undefined,
        cantidad: Number(cantidad),
        condicion,
        descripcionCondicion: condicion !== "bueno" ? descripcionCondicion || undefined : undefined,
        linkCompra: linkCompra.trim() || undefined,
        fotoUrl: fotoUrl || undefined,
      });
      navigate(`/inventario/villa/${villaId}`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar el item."));
    } finally {
      setGuardando(false);
    }
  };

  if (!autorizado) {
    return (
      <div>
        <h1 className="page-title">Nuevo item de inventario</h1>
        <div className="card card-dashed">Tu rol no tiene permiso para agregar items de inventario.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Nuevo item de inventario</h1>
      <p className="page-sub">{villa ? etiquetaVilla(villa) : "Villa"}</p>

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

      {sugerencias.length > 0 && (
        <div className="card" style={{ background: "var(--sand)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 6px" }}>
            Ya se compró algo parecido en otra villa:
          </p>
          {sugerencias.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: i > 0 ? 6 : 0 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.nombre}
              </span>
              <button
                type="button"
                className="btn"
                style={{ fontSize: 11, padding: "3px 8px", flexShrink: 0 }}
                onClick={() => setLinkCompra(s.linkCompra)}
              >
                Usar este link
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Link de compra (opcional)</label>
        <input
          value={linkCompra}
          onChange={(e) => setLinkCompra(e.target.value)}
          placeholder="https://..."
        />
        <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          Para no tener que volver a buscarlo si hay que comprar lo mismo en otra villa.
        </p>
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
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
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
              onClick={() => {
                setCondicion(c);
                if (c === "bueno") setDescripcionCondicion("");
              }}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <span className={CLASE_PILL_CONDICION[c]} style={{ marginRight: condicion === c ? 6 : 0 }}>
                {LABEL_CONDICION[c]}
              </span>
            </button>
          ))}
        </div>
        {condicion !== "bueno" && (
          <textarea
            style={{ marginTop: 8, width: "100%", minHeight: 60, resize: "vertical" }}
            value={descripcionCondicion}
            onChange={(e) => setDescripcionCondicion(e.target.value)}
            placeholder="¿Qué tiene? Ej: pata rota, ya no enciende, mancha en el respaldo..."
          />
        )}
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      <button className="btn btn-primary-dark" disabled={!puedeGuardar || guardando} onClick={guardar}>
        {guardando ? "Guardando..." : "Guardar item"}
      </button>
    </div>
  );
}
