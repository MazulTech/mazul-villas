-- Datos iniciales. Correr DESPUÉS de schema.sql.
-- Opcional: si prefieres empezar totalmente vacío, no corras este archivo
-- (la app funciona igual, solo verás las listas sin datos hasta capturar).

insert into villas (id, nombre) values
  ('ostion', 'Ostión'),
  ('barracuda', 'Barracuda'),
  ('pulpos', 'Pulpos'),
  ('sierra', 'Sierra'),
  ('langosta', 'Langosta'),
  ('coral', 'Coral'),
  ('erizo', 'Erizo'),
  ('gallo', 'Gallo'),
  ('pargo', 'Pargo'),
  ('concha', 'Concha'),
  ('cangrejo', 'Cangrejo'),
  ('caracol', 'Caracol'),
  ('mantarraya', 'Mantarraya')
on conflict (id) do nothing;

-- Insumos de ejemplo para dos villas, solo para probar las alertas de stock.
insert into insumos (villa_id, nombre, stock_actual, stock_objetivo) values
  ('ostion', 'Toallas de baño', 4, 8),
  ('ostion', 'Shampoo amenity', 10, 10),
  ('ostion', 'Café / cápsulas', 1, 12),
  ('barracuda', 'Toallas de baño', 8, 8),
  ('barracuda', 'Papel higiénico', 2, 10);
