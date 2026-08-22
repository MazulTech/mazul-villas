import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { actualizarInventarioExtra, listarUsuarios, listarVillas, type VillaBasica } from "../lib/data";
import type { Profile, Rol } from "../types";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { esAdmin, LABEL_ROL } from "../lib/permissions";
import { mensajeError } from "../lib/errores";
import Cargando from "../components/Cargando";

const ORDEN_ROLES: Rol[] = ["administracion", "supervisor", "mantenimiento", "housekeeping", "dueno"];

const DESCRIPCION_ROL: Record<Rol, string> = {
  administracion:
    "Acceso total (igual para Administración y Supervisor): crea cuentas, ve y edita todo en cualquier villa, decide preventivo vs. correctivo, aprueba y marca cotizaciones pagadas, corrige o borra inventario y reservas, gestiona el almacén general.",
  supervisor: "Mismo acceso que administración — pensado para gerencia.",
  mantenimiento:
    "Ve todas las villas. Agrega items nuevos al inventario, edita cotizaciones (material/proveedor/precio), reporta y resuelve tareas de mejora, edita el checklist de turnover, reparte insumos del almacén a las villas.",
  housekeeping:
    "Ve todas las villas. Edita el checklist de turnover, reporta tareas de mejora, marca el estado (Regular/Dañado) de items de inventario ya existentes con su descripción, reparte insumos del almacén. No agrega inventario nuevo, salvo la excepción por persona que se active abajo.",
  dueno:
    "Solo ve las villas que se le asignaron. Consulta inventario, checklist, historial de mejoras y reservas/ingresos de sus villas. Aprueba o rechaza tareas de mejora y puede marcar como pagada una cotización correctiva. No agrega ni edita inventario, no ve insumos ni el almacén general, no crea cuentas.",
};

// Pantalla de solo-lectura (más un toggle puntual) para que admin vea de un
// vistazo quién tiene cuenta, con qué rol, y qué puede hacer cada rol en la
// app. La excepción por persona de inventarioExtra (ver NuevoDueno.tsx y
// puedeGestionarInventario en permissions.ts) se puede prender/apagar
// directo desde aquí, sin tener que volver a crear la cuenta.
export default function Usuarios() {
  const { profile } = useAuth();
  const autorizado = esAdmin(profile);
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!autorizado) {
      setCargando(false);
      return;
    }
    setCargando(true);
    Promise.all([listarUsuarios(), listarVillas(profile)])
      .then(([usuariosRes, villasRes]) => {
        setUsuarios(usuariosRes);
        setVillas(villasRes);
      })
      .catch((e) => setError(mensajeError(e, "No se pudieron cargar los usuarios.")))
      .finally(() => setCargando(false));
  }, [profile, autorizado]);

  const nombreVilla = (id: string) => {
    const v = villas.find((x) => x.id === id);
    return v ? etiquetaVilla(v) : id;
  };

  const toggleInventarioExtra = async (u: Profile) => {
    setActualizandoId(u.id);
    setError(null);
    try {
      await actualizarInventarioExtra(u.id, !u.inventarioExtra);
      setUsuarios((actual) => actual.map((x) => (x.id === u.id ? { ...x, inventarioExtra: !u.inventarioExtra } : x)));
    } catch (e) {
      setError(mensajeError(e, "No se pudo actualizar el permiso."));
    } finally {
      setActualizandoId(null);
    }
  };

  if (!autorizado) {
    return (
      <div>
        <h1 className="page-title">Usuarios y permisos</h1>
        <div className="card card-dashed">Tu rol no tiene acceso a esta pantalla.</div>
      </div>
    );
  }

  if (cargando) {
    return <Cargando texto="Cargando usuarios..." />;
  }

  const usuariosPorRol = ORDEN_ROLES.map((r) => ({ rol: r, usuarios: usuarios.filter((u) => u.rol === r) })).filter(
    (g) => g.usuarios.length > 0
  );

  return (
    <div>
      <h1 className="page-title">Usuarios y permisos</h1>
      <p className="page-sub">Quién tiene cuenta, con qué rol, y qué puede hacer cada uno</p>

      <Link
        to="/admin/duenos/nuevo"
        className="btn btn-primary-dark"
        style={{ display: "block", textAlign: "center", textDecoration: "none", marginBottom: 18 }}
      >
        + Crear usuario
      </Link>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {usuarios.length === 0 && <div className="card card-dashed">Sin usuarios registrados todavía.</div>}

      {usuariosPorRol.map(({ rol, usuarios: usuariosDelRol }) => (
        <div key={rol} style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 6px", fontWeight: 700 }}>
            {LABEL_ROL[rol].toUpperCase()}
          </p>
          {usuariosDelRol.map((u) => (
            <div key={u.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{u.nombre || "Sin nombre"}</div>
              {u.email && <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{u.email}</div>}
              {u.rol === "dueno" && (
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {u.villasAsignadas.length > 0
                    ? u.villasAsignadas.map(nombreVilla).join(", ")
                    : "Sin villa asignada todavía"}
                </div>
              )}
              {u.rol === "housekeeping" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span className={u.inventarioExtra ? "pill pill-ok" : "pill"}>
                    {u.inventarioExtra ? "Puede agregar inventario" : "Solo reporta estado"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={actualizandoId === u.id}
                    onClick={() => toggleInventarioExtra(u)}
                    style={{ fontSize: 11, padding: "4px 10px", width: "auto" }}
                  >
                    {actualizandoId === u.id ? "..." : u.inventarioExtra ? "Quitar permiso" : "Dar permiso"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "18px 0 8px", fontWeight: 700 }}>
        QUÉ PUEDE HACER CADA ROL
      </p>
      {ORDEN_ROLES.filter((r) => r !== "supervisor").map((r) => (
        <div key={r} className="card" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{LABEL_ROL[r]}</div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            {DESCRIPCION_ROL[r]}
          </p>
        </div>
      ))}
    </div>
  );
}
