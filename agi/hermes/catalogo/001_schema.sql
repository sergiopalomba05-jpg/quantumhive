-- Fase 2 — Catálogo Vivo de Hermes
-- Schema de la tabla `herramientas` (fuente de verdad del catálogo de IA de QuantumHive).
-- Proyecto Supabase: quantumhive-hermes (gbngjsulhqcwgkqoxozy), org QuantumHive-jpg's Org.
-- Idempotente: se puede re-aplicar sin romper nada.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.herramientas (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  repo_url       text,
  para_que       text,
  categoria      text,
  estado         text check (estado in ('usar','alternativa','verificar','descartado','duplicado')),
  calidad        int  check (calidad between 1 and 5),
  tags           text[] not null default '{}',
  fuente         text,
  notas          text,
  fase           text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Dedup / idempotencia de la importación: nombre normalizado + categoría.
create unique index if not exists herramientas_nombre_categoria_uniq
  on public.herramientas (lower(nombre), coalesce(categoria, ''));

create index if not exists herramientas_categoria_idx on public.herramientas (categoria);
create index if not exists herramientas_tags_idx on public.herramientas using gin (tags);
create index if not exists herramientas_fts_idx on public.herramientas
  using gin (to_tsvector('spanish', coalesce(nombre, '') || ' ' || coalesce(para_que, '')));

-- updated_at automático.
create or replace function public.set_actualizado_en()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists trg_herramientas_updated on public.herramientas;
create trigger trg_herramientas_updated
  before update on public.herramientas
  for each row execute function public.set_actualizado_en();

-- RLS: lectura anónima (para el dashboard solo-lectura futuro).
-- La escritura va por service_role (que bypassa RLS), usada solo por el skill catalogador.
alter table public.herramientas enable row level security;

drop policy if exists herramientas_anon_read on public.herramientas;
create policy herramientas_anon_read on public.herramientas
  for select to anon using (true);
