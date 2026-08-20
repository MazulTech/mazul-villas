-- Datos iniciales. Correr DESPUÉS de schema.sql.
-- Lista real tomada del documento "LISTA DE HUESPEDES" en Drive. Las villas
-- sin apodo confirmado (6, 9, 10, 14, 17, 19, 20) quedan con nombre = null;
-- la app las muestra solo como "Villa N" hasta que se les asigne apodo.
-- Cuando abran nuevas villas, solo se agrega otra fila aqui (o desde el
-- editor de tablas de Supabase) con el siguiente numero.

insert into villas (id, numero, nombre) values
  ('villa-1', 1, 'Ostión'),
  ('villa-2', 2, 'Sierra'),
  ('villa-3', 3, 'Mantarraya'),
  ('villa-4', 4, 'Cangrejo'),
  ('villa-5', 5, 'Bozo'),
  ('villa-6', 6, null),
  ('villa-7', 7, 'Coral'),
  ('villa-8', 8, 'Erizo'),
  ('villa-9', 9, null),
  ('villa-10', 10, null),
  ('villa-11', 11, 'Barracuda'),
  ('villa-12', 12, 'Pargo'),
  ('villa-13', 13, 'Concha'),
  ('villa-14', 14, null),
  ('villa-15', 15, 'Langosta'),
  ('villa-16', 16, 'Pulpos'),
  ('villa-17', 17, null),
  ('villa-18', 18, 'Gallo'),
  ('villa-19', 19, null),
  ('villa-20', 20, null),
  ('villa-21', 21, 'Caracol')
on conflict (id) do nothing;

-- Insumos de ejemplo para dos villas, solo para probar las alertas de stock.
insert into insumos (villa_id, nombre, stock_actual, stock_objetivo) values
  ('villa-1', 'Toallas de baño', 4, 8),
  ('villa-1', 'Shampoo amenity', 10, 10),
  ('villa-1', 'Café / cápsulas', 1, 12),
  ('villa-11', 'Toallas de baño', 8, 8),
  ('villa-11', 'Papel higiénico', 2, 10);

-- Almacén general de ejemplo: catálogo central del que se reparte a las
-- villas (ver /almacen en la app y la función repartir_insumo).
insert into insumos_catalogo (nombre, unidad, categoria, stock_actual, stock_minimo) values
  ('Toallas de baño', 'piezas', 'Blancos y toallas', 46, 20),
  ('Shampoo amenity', 'piezas', 'Baño', 80, 40),
  ('Café / cápsulas', 'cajas', 'Cocina', 6, 15),
  ('Papel higiénico', 'rollos', 'Baño', 30, 40)
on conflict (nombre) do nothing;

-- Inventario de ejemplo (Villa 2 = Sierra, la del recorrido de hoy).
insert into inventario_items (villa_id, zona, nombre, categoria, cantidad, condicion) values
  ('villa-2', 'Sala', 'TV sala', 'Electrónica', 1, 'bueno'),
  ('villa-2', 'Cocina', 'Refrigerador', 'Electrodomésticos', 1, 'regular'),
  ('villa-2', 'Terraza', 'Sillas de exterior', 'Muebles', 6, 'danado');

-- Reservas de ejemplo (rentas ya cobradas, no calendario a futuro).
insert into reservas (villa_id, huesped, fecha_inicio, fecha_fin, canal, monto_pagado) values
  ('villa-2', 'Familia Torres', '2026-07-10', '2026-07-15', 'Airbnb', 18500),
  ('villa-2', 'J. Ramírez', '2026-08-01', '2026-08-04', 'Booking.com', 9200);
