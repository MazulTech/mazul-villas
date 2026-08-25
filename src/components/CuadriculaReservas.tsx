import { useMemo } from "react";
import type { ReservaCalendario, VillaBasica } from "../lib/data";
import { etiquetaVilla } from "../lib/villas";

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

interface Props {
  villas: VillaBasica[];
  reservas: ReservaCalendario[];
  diasAdelante?: number;
}

// Cuadrícula villas (eje Y) contra próximos días (eje X): de un vistazo,
// qué villa tiene huésped cada día, cuándo entra (▶) y cuándo sale (◀).
// Componente compartido: se usa tanto embebido en la pantalla "Hoy" (para
// que limpieza lo vea sin dar clic) como en la pantalla de Reservas >
// Calendario. Solo fechas, sin monto/canal/huésped.
export default function CuadriculaReservas({ villas, reservas, diasAdelante = 7 }: Props) {
  const dias = useMemo(() => rangoDeDias(diasAdelante), [diasAdelante]);

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
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 10 }}>
        {/*
          Ojo: NO usar borderCollapse "collapse" aquí. Combinado con las
          celdas "sticky" (columna de villa fija), varios navegadores
          (sobre todo Safari/Chrome en celular) simplemente no pintan los
          bordes colapsados sobre el contenido sticky, así que la
          cuadrícula se ve sin líneas aunque el CSS las tenga. Con
          "separate" + box-shadow inset por celda (en vez de border) el
          borde se pinta siempre, sticky o no.
        */}
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  background: "var(--bg)",
                  padding: "6px 8px",
                  textAlign: "left",
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  width: 92,
                  boxShadow: "inset -1px -1px 0 0 var(--border)",
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
                      padding: "6px 2px",
                      textAlign: "center",
                      fontSize: 10,
                      width: 38,
                      color: i === 0 ? "var(--terra-dark)" : "var(--text-secondary)",
                      background: i === 0 ? "rgba(184, 106, 74, 0.1)" : "transparent",
                      boxShadow: "inset -1px -1px 0 0 var(--border)",
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
                      zIndex: 1,
                      background: "var(--bg)",
                      padding: "7px 8px",
                      fontWeight: 700,
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      boxShadow: "inset -1px -1px 0 0 var(--border)",
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
                          height: 32,
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          boxShadow: "inset -1px -1px 0 0 var(--border)",
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
