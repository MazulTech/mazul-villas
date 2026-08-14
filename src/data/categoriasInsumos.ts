// Lista estándar de categorías del almacén general, para poder filtrar y
// agrupar el catálogo (mismo patrón que ZONAS en zonas.ts). Si un insumo
// no encaja en ninguna, se usa "Otra" y se especifica con texto libre.
export const CATEGORIAS_INSUMOS = [
  "Blancos y toallas",
  "Baño",
  "Cocina",
  "Limpieza",
  "Herramientas",
  "Jardín y alberca",
  "Electrónica y aires",
  "Otra",
] as const;

export const OTRA_CATEGORIA = "Otra";
