import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearInventarioItem, listarVillas, type VillaBasica } from "../lib/data";
import { subirFoto } from "../lib/storage";
import type { Condicion } from "../types";
import { CLASE_PILL_CONDICION, LABEL_CONDICION } from "../lib/inventario";
import { etiquetaVilla } from "../lib/villas";
import { OTRA_ZONA, ZONAS } from "../data/zonas";
import { useAuth } from "../contexts/AuthContext";
import { puedeGestionarInventario } from "../lib/permissions";

const CONDICIONES: Condicion[] = ["bueno", "regular", "danado"];

export default function NuevoItemInventario() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const autorizado = puedeGestionarInventario(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [villaId, setVillaId] = useState("");
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>(ZONAS[0]);
  const [zonaOtra, setZonaOtra] = useState("");
  const zona = zonaSeleccionada === OTRA_ZONA ? zonaOtra : zonaSeleccionada;
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [condicion, setCondicion] = useState<Condicion>("bueno");
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarVillas(profile)
      .then((v) => {
        setVillas(v);
        setVillaId(v[0]?.id ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [profile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFotoSeleccionada = (file: File | null) => {
    setFoto(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const puedeGuardar = nombre.trim().length > 0 && zona.trim().length > 0 && villaId !== "" && Number(cantidad) > 0;

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const fotoUrl = foto ? await subirFoto(foto, `inventario/${villaId}`) : undefined;
      await crearInventarioItem({
        villaId,
        zona,
        nombre,
        cantidad: Number(cantidad),
        condicion,
        fotoUrl,
      });
      navigate("/inventario");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el item.");
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
      <p className="page-sub">Aplica para cualquier villa</p>

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

      <div
        className="card card-dashed"
        style={{ marginBottom: 10, padding: 16, cursor: "pointer", textAlign: "center" }}
        onClick={() => fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Vista previa" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8 }} />
            <p style={{ fontSize: 11, color: "var(--ok)", margin: "6px 0 0" }}>✓ Foto lista: {foto?.name}</p>
          </>
        ) : (
          "Toca para tomar o adjuntar una foto del item"
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="input-foto-oculto"
          onChange={(e) => onFotoSeleccionada(e.target.files?.[0] ?? null)}
        />
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

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Item</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="TV sala, refrigerador, sillas de exterior..." />
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
        {guardando ? "Guardando..." : "Guardar item"}
      </button>
    </div>
  );
}
