export function nivelStock(actual: number, objetivo: number) {
  const ratio = objetivo === 0 ? 1 : actual / objetivo;
  if (ratio <= 0.15) return { label: "Reabastecer", clase: "pill pill-danger" };
  if (ratio < 0.7) return { label: "Bajo", clase: "pill pill-warn" };
  return { label: "Ok", clase: "pill pill-ok" };
}
