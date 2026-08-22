import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarVillas, listarReservasCalendario, type VillaBasica, type ReservaCalendario } from "../lib/data";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { mensajeError } from "../lib/errores";
import { conCache } from "../lib/offlineDb";
import Cargando from "../components/Cargando";

const DIAS_ADELANTE = 7;

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangoDeDias(n: number): string[] {
  const hoy = new Date();
  const dias: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + i);
    dias.push(fechaISO(d));
  }
  return dias;
}

function etiquetaDia(iso: string): { dia: string; numero: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    dia: d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", ""),
    numero: d.toLocaleDateString("es-MX", { day: "numeric" }),
  };
}

// Villas (eje Y) contra los próximos días (eje X): de un vistazo, qué villa
// tiene huésped cada día, cuándo entra (▶) y cuándo sale (◀) — solo fechas,
// sin monto ni datos del huésped, así que lo puede ver cualquier rol (la
// RLS "reservas_select" ya filtra a un dueño a solo sus villas).
export default function CalendarioReservas() {
  const { profile } = useAuth();
  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [reservas, setReservas] = useState<ReservaCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deCache, setDeCache] = useState(false);

  const dias = useMemo(() => rangoDeDias(DIAS_ADELANTE), []);

  useEffect(() => {
    setCargando(true);
    setError(null);
    Promise.all([
      conCache(`villas:${profile?.id ?? "anon"}`, () => listarVillas(profile)),
      conCache(`reservas-calendario:${profile?.id ?? "anon"}`, () => listarReservasCalendario(DIAS_ADELANTE)),
    ])
      .then(([v, r]) => {
        setVillas(v.datos);
        setReservas(r.datos);
        setDeCache(v.deCache || r.deCache);
      })
      .catch((e) => setError(mensajeError(e, "No se pudo cargar el calendario.")))
      .finally(() => setCargando(false));
  }, [profile]);

  const reservasPorVilla = useMemo(() => {
    const mapa = new Map<string, ReservaCalendario[]>();
    for (const r of reservas) {
      const lista = mapa.get(r.villaId) ?? [];
      lista.push(r);
      mapa.set(r.villaId, lista);
    }
    return mapa;
  }, [reservas]);

  return (
    <div>
      <Link to="/reservas" style={{ fontSize: 12, color: "var(--terra-dark)", display: "inline-block", marginBottom: 12 }}>
        ← Reservas
      </Link>

      <h1 className="page-title">Calendario</h1>
      <p className="page-sub">Próximos {DIAS_ADELANTE} días · quién entra y quién sale</p>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      {deCache && (
        <div className="card" style={{ background: "var(--warn-bg)", border: "none", marginBottom: 10 }}>
          <p style={{ fontSize: 11, margin: 0, color: "var(--warn)" }}>
            Sin conexión: mostrando lo último guardado en este celular.
          </p>
        </div>
      )}

      {cargando && <Cargando texto="Cargando calendario..." />}

      {!cargando && (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 10 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--bg)",
                    padding: "6px 8px",
                    textAlign: "left",
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    minWidth: 92,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Villa
                </th>
                {dias.map((iso, i) => {
                  const et = etiquetaDia(iso);
                  return (
                    <th
                      key={iso}
                      style={{
                        padding: "6px 3px",
                        textAlign: "center",
                        fontSize: 10,
                        minWidth: 34,
                        color: i === 0 ? "var(--terra-dark)" : "var(--text-secondary)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ textTransform: "capitalize" }}>{et.dia}</div>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{et.numero}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {villas.map((v) => {
                const lista = reservasPorVilla.get(v.id) ?? [];
                return (
                  <tr key={v.id}>
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        background: "var(--bg)",
                        padding: "7px 8px",
                        fontWeight: 700,
                        fontSize: 11,
                        whiteSpace: "nowrap",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {etiquetaVilla(v)}
                    </td>
                    {dias.map((iso) => {
                      const r = lista.find((x) => iso >= x.fechaInicio && iso <= x.fechaFin);
                      const esEntrada = !!r && iso === r.fechaInicio;
                      const esSalida = !!r && iso === r.fechaFin;
                      return (
                        <td
                          key={iso}
                          title={r ? (esEntrada ? "Entrada" : esSalida ? "Salida" : "Ocupada") : "Libre"}
                          style={{
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            borderBottom: "1px solid var(--border)",
                            background: r ? "rgba(184, 106, 74, 0.16)" : "transparent",
                          }}
                        >
                          {esEntrada && <span style={{ color: "var(--warn)" }}>▶</span>}
                          {esSalida && <span style={{ color: "var(--danger)" }}>◀</span>}
                          {r && !esEntrada && !esSalida && <span style={{ color: "var(--terra-dark)" }}>•</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--text-secondary)" }}>
        <span>
          <span style={{ color: "var(--warn)", fontWeight: 700 }}>▶</span> entra huésped
        </span>
        <span>
          <span style={{ color: "var(--danger)", fontWeight: 700 }}>◀</span> sale huésped
        </span>
        <span>
          <span style={{ color: "var(--terra-dark)" }}>•</span> ocupada
        </span>
      </div>
    </div>
  );
}
