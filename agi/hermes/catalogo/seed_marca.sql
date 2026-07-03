-- Marca QuantumHive — datos de Dominus para generar contenido branded.
-- Ejecutar DESPUÉS de 005_contenido.sql.

insert into public.marca (id, nombre, avatar, tono, estilo, cta, idioma)
values (1,
  'Quantum Hive',
  'Dominus — CEO humanoide androide de traje, representante digital de QuantumHive',
  'tranquilo, autoritario, millonario, inteligente, tecnológico, ayuda',
  'mezcla dinámica: capturas de pantalla + Dominus hablando + b-roll + demo en vivo',
  'QuantumHive — El motor de IA que conecta todo',
  'es-AR')
on conflict (id) do update set
  nombre=excluded.nombre, avatar=excluded.avatar, tono=excluded.tono,
  estilo=excluded.estilo, cta=excluded.cta, idioma=excluded.idioma;
