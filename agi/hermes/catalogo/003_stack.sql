-- Fase 2 — Stack Definitivo por Categoría (los "ganadores" + estrategia por categoría).
-- Fuente: vault/03 - Stack Definitivo por Categoria.md (v3.0).
-- Complementa a `herramientas` (la biblioteca completa) con la vista curada: qué usar por categoría.
-- Idempotente.

create table if not exists public.stack_categorias (
  clave      text primary key,          -- 'A'..'L'
  categoria  text not null,             -- nombre de la categoría
  estrategia text,                      -- la directiva: qué elegir / cómo encararla
  fase       text,
  orden      int
);

create table if not exists public.stack_items (
  id              uuid primary key default gen_random_uuid(),
  categoria_clave text not null references public.stack_categorias(clave) on delete cascade,
  herramienta     text not null,
  repo_url        text,
  estado          text check (estado in ('ganador','alternativa')),  -- ✅ ganador · 🔵 alternativa
  nota            text,
  fase            text,
  creado_en       timestamptz not null default now()
);

create unique index if not exists stack_items_uniq
  on public.stack_items (categoria_clave, lower(herramienta));
create index if not exists stack_items_categoria_idx on public.stack_items (categoria_clave);

alter table public.stack_categorias enable row level security;
alter table public.stack_items     enable row level security;

drop policy if exists stack_categorias_anon_read on public.stack_categorias;
create policy stack_categorias_anon_read on public.stack_categorias for select to anon using (true);

drop policy if exists stack_items_anon_read on public.stack_items;
create policy stack_items_anon_read on public.stack_items for select to anon using (true);
