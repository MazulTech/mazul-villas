import { useMemo } from "react";
import type { ReservaCalendario, VillaBasica } from "../lib/data";
import { etiquetaVilla } from "../lib/villas";

const ANCHO_COL_VILLA = 96;
const ANCHO_COL_DIA = 38;

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
//
// Ojo: esto se construye con CSS Grid (divs), NO con un <table>. Se probó
// primero con tabla (con sticky en la primera columna) y en varios
// celulares el navegador corrompía el layout: las celdas con reserva
// aparecían flotando fuera de su fila/columna en vez de alineadas a la
// cuadrícula. Es un problema conocido de mezclar table-layout con celdas
// "position: sticky". Con CSS Grid no pasa — cada celda es un div normal
// con su propio borde, así que el sticky en la primera columna no
// interfiere con el resto.
//
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

  const bordeCelda = { borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" } as const;

  return (
    <div>
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${ANCHO_COL_VILLA}px repeat(${dias.length}, ${ANCHO_COL_DIA}px)`,
            width: "max-content",
            minWidth: "100%",
          }}
        >
          {/* Encabezado */}
          <div
            style={{
              position: "sticky",
              left: 0,
              zIndex: 2,
              background: "var(--bg)",
              padding: "6px 8px",
              display: "flex",
              alignItems: "center",
              fontSize: 10,
              color: "var(--text-secondary)",
              ...bordeCelda,
            }}
          >
            Villa
          </div>
          {dias.map((iso, i) => {
            const et = etiquetaDia(iso);
            return (
              <div
                key={`h-${iso}`}
                style={{
                  padding: "6px 2px",
                  textAlign: "center",
                  fontSize: 10,
                  color: i === 0 ? "var(--terra-dark)" : "var(--text-secondary)",
                  background: i === 0 ? "rgba(184, 106, 74, 0.1)" : "transparent",
                  ...bordeCelda,
                }}
              >
                <div style={{ textTransform: "capitalize" }}>{et.dia}</div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{et.numero}</div>
              </div>
            );
          })}

          {/* Filas: villa + un div por cada día */}
          {villas.flatMap((v) => {
            const lista = reservasPorVilla.get(v.id) ?? [];
            const filaVilla = (
              <div
                key={`v-${v.id}`}
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 1,
                  background: "var(--bg)",
                  padding: "7px 8px",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 700,
                  fontSize: 11,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  ...bordeCelda,
                }}
              >
                {etiquetaVilla(v)}
              </div>
            );
            const celdasDias = dias.map((iso) => {
              const r = lista.find((x) => iso >= x.fechaInicio && iso <= x.fechaFin);
              const esEntrada = !!r && iso === r.fechaInicio;
              const esSalida = !!r && iso === r.fechaFin;
              return (
                <div
                  key={`${v.id}-${iso}`}
                  title={r ? (esEntrada ? "Entrada" : esSalida ? "Salida" : "Ocupada") : "Libre"}
                  style={{
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    background: r ? "rgba(184, 106, 74, 0.16)" : "transparent",
                    ...bordeCelda,
                  }}
                >
                  {esEntrada && <span style={{ color: "var(--warn)" }}>▶</span>}
                  {esSalida && <span style={{ color: "var(--danger)" }}>◀</span>}
                  {r && !esEntrada && !esSalida && <span style={{ color: "var(--terra-dark)" }}>•</span>}
                </div>
              );
            });
            return [filaVilla, ...celdasDias];
          })}
        </div>
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
