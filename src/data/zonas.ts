// Lista estándar de zonas para no depender de texto libre (evita que
// "cocina", "Cocina", "COCINA" se traten como zonas distintas al agrupar).
// Si una villa tiene una zona que no está aquí, se usa "Otra zona" y se
// especifica con texto libre.
export const ZONAS = [
  "Sala",
  "Cocina",
  "Comedor",
  "Habitación principal",
  "Habitación 2",
  "Habitación 3",
  "Habitación 4",
  "Baño principal",
  "Baño 2",
  "Terraza",
  "Alberca",
  "Palapa",
  "Jardín",
  "Fachada / entrada",
  "Estacionamiento",
  "Lavandería",
  "Otra zona",
] as const;

export const OTRA_ZONA = "Otra zona";
