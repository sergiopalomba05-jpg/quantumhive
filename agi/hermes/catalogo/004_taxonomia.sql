-- Fase 2.1 — Taxonomía por OBJETIVO (capa de navegación sobre el catálogo).
-- División = "qué querés crear"; subdivisión = cada parte de ese proceso.
-- Las herramientas se mapean (many-to-many) a la parte que sirven. Esto se va armando con la ingesta.
-- Aditivo: no toca `herramientas` ni `stack`. Idempotente.

create table if not exists public.divisiones (
  id          text primary key,        -- slug: 'crear-web'
  nombre      text not null,
  descripcion text,
  orden       int
);

create table if not exists public.subdivisiones (
  id          text primary key,        -- slug: 'web-ui'
  division_id text not null references public.divisiones(id) on delete cascade,
  nombre      text not null,
  descripcion text,
  orden       int
);

create table if not exists public.herramienta_subdivision (
  herramienta_id uuid not null references public.herramientas(id) on delete cascade,
  subdivision_id text not null references public.subdivisiones(id) on delete cascade,
  primary key (herramienta_id, subdivision_id)
);

create index if not exists subdivisiones_division_idx on public.subdivisiones (division_id);
create index if not exists hs_subdivision_idx on public.herramienta_subdivision (subdivision_id);

alter table public.divisiones              enable row level security;
alter table public.subdivisiones           enable row level security;
alter table public.herramienta_subdivision enable row level security;

drop policy if exists divisiones_anon_read on public.divisiones;
create policy divisiones_anon_read on public.divisiones for select to anon using (true);
drop policy if exists subdivisiones_anon_read on public.subdivisiones;
create policy subdivisiones_anon_read on public.subdivisiones for select to anon using (true);
drop policy if exists hs_anon_read on public.herramienta_subdivision;
create policy hs_anon_read on public.herramienta_subdivision for select to anon using (true);
