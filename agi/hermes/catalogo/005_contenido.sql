-- Fase 2 — Enriquecimiento + motor de contenido.
-- detalle didáctico (público), receta de contenido por herramienta (privada) y la marca (privada).
-- Idempotente.

-- Descripción didáctica de la herramienta (cómo aplicarla, ventajas, método). Pública.
alter table public.herramientas add column if not exists detalle text;

-- Receta de contenido extraída del reel (para replicar con la marca propia). PRIVADA.
create table if not exists public.contenido_herramienta (
  id                 uuid primary key default gen_random_uuid(),
  herramienta_id     uuid not null references public.herramientas(id) on delete cascade,
  guion              text,        -- transcripción / guion del reel original
  descripcion_visual text,        -- escenas, imágenes, qué se ve en pantalla
  formato            text,        -- estructura: hook, demo, CTA, duración, estilo
  notas              text,
  creado_en          timestamptz not null default now()
);
create index if not exists contenido_herramienta_idx on public.contenido_herramienta (herramienta_id);

-- Marca de Sergio para generar contenido con su sello (no idéntico al original). PRIVADA. 1 fila.
create table if not exists public.marca (
  id     int primary key default 1,
  nombre text,
  avatar text,
  tono   text,
  estilo text,
  cta    text,
  idioma text default 'es-AR',
  constraint marca_single check (id = 1)
);
insert into public.marca (id) values (1) on conflict (id) do nothing;

-- RLS: receta y marca NO son públicas (solo las lee la Edge Function con service_role).
alter table public.contenido_herramienta enable row level security;
alter table public.marca                 enable row level security;
-- (sin policy anon a propósito: privadas)
