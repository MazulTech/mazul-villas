// Lista estándar de categorías del inventario de cada villa (mobiliario y
// equipo), para poder filtrar y agrupar los items — mismo patrón que
// CATEGORIAS_INSUMOS en categoriasInsumos.ts (almacén general) y ZONAS en
// zonas.ts. Si un item no encaja en ninguna, se usa "Otra" y se especifica
// con texto libre.
export const CATEGORIAS_INVENTARIO = [
  "Muebles",
  "Electrodomésticos",
  "Cristalería y vajilla",
  "Electrónica",
  "Cocina",
  "Baño",
  "Recámara",
  "Exterior y alberca",
  "Otra",
] as const;

export const OTRA_CATEGORIA_INVENTARIO = "Otra";
