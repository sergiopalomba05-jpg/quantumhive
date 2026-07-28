# QuantumHive Idea-to-Project Control Plane And HumanIA Chat Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the internal pipeline that captures new ideas, classifies them, routes them to CEO agents, and keeps HumanIA Chat/World expansion organized without blocking Carta Viva MVP.

**Architecture:** Treat `QuantumHive Control Plane` as the internal operating system and `HumanIA Chat` as a user-facing channel. The existing `HUMANIA PLATAFORMA COMUNICACIONES` project is a strong HumanIA Chat/Marketplace prototype, but it should not become the Control Plane backend or source of truth.

**Tech Stack:** React 19, Vite, Express, Firebase Auth, Firestore, Gemini API, future Supabase/Postgres or Firestore collection for Control Plane state.

## Global Constraints

- Do not delete files or folders.
- Do not commit unless the user explicitly asks.
- Carta Viva MVP stays priority 1 and remains isolated from HumanIA and Control Plane.
- HumanIA World is a future frontend/channel, not a new backend.
- Control Plane owns ideas, projects, agents, branches, tasks, events, cloud resources, decisions, and status.
- HumanIA Chat owns user-facing AI contacts, services, conversations, calls, and marketplace flows.
- Roblox/Unreal/Second Life style worlds are visualization/experience layers only.
- No user-facing app should store provider API keys in client state.
- Google OAuth sensitive scopes must be minimized before public production.
- Deploy previews are allowed only after build and secret handling are verified.

---

## Current HumanIA Assessment

**Project inspected:** `C:\Users\sergio\Desktop\boveda obsidian\HUMANIA PLATAFORMA COMUNICACIONES`

**Good base for HumanIA Chat:** Yes. It already has agent contacts, marketplace categories, chat overlay, video-call simulation, billing/minutes UI, memory-plan UI, agent creator, Firebase Auth, Firestore message persistence, Google integration hubs, translation endpoint, and Express backend proxying Gemini.

**Good base for QuantumHive Control Plane:** No. It is too user-facing, emotional/social, and monolithic to become the internal orchestrator. Control Plane needs a dashboard for projects, branches, CEOs, events, workers, cloud resources, cost logs, approvals, and audit trails.

**Best role:** Keep it as `HumanIA Chat MVP` and later connect it to the shared `Agent Registry + Memory + Model Router + Event Bus` exposed by the Control Plane.

**Main blockers before Cloud Run production:**
- `src/App.tsx` is monolithic and mixes auth, Firestore, contacts, calls, chat, billing, Google integrations, VM configuration, and layout.
- `src/lib/firebase.ts` requests broad sensitive Google scopes including Gmail, Calendar, Contacts, Directory, and Classroom from the client.
- `src/components/VmConfigurator.tsx` exposes a client-side API key input shape through `VmConfig.liveModelApiKey`.
- Avatar constants in `src/App.tsx` and `AgentCreator.tsx` use string URLs like `/src/assets/images/...`, which are fragile for production Vite builds because static runtime URLs should live in `public/` or be imported as modules.
- `app.yaml` is App Engine config, not a Cloud Run service definition. Cloud Run can deploy via source/buildpacks, but this project needs explicit deployment documentation.
- There is no installed `node_modules` at inspection time, so build was not run in this session.

---

## HumanIA World Idea Record

```json
{
  "title": "HumanIA World Second Life",
  "macro_division": "HumanIA",
  "type": "immersive_social_world",
  "stage": "vision",
  "priority": "later",
  "depends_on": [
    "HumanIA Chat",
    "Agent Registry",
    "Memory",
    "Model Router",
    "Event Bus"
  ],
  "notes": "Social world where humans and NPC AIs coexist. User discovers agents in-world, asks for their number, then continues relationship in HumanIA Chat. Roblox/Unreal are future clients, not source of truth."
}
```

---

## File Structure

- Create later: `control-plane/schema/idea_to_project.sql`
- Create later: `control-plane/docs/event-taxonomy.md`
- Create later: `control-plane/docs/ceo-agents.md`
- Modify later: `HUMANIA PLATAFORMA COMUNICACIONES/src/App.tsx`
- Modify later: `HUMANIA PLATAFORMA COMUNICACIONES/src/lib/firebase.ts`
- Modify later: `HUMANIA PLATAFORMA COMUNICACIONES/src/components/VmConfigurator.tsx`
- Modify later: `HUMANIA PLATAFORMA COMUNICACIONES/src/assets` or move app-safe assets to `public/assets`
- Create later: `HUMANIA PLATAFORMA COMUNICACIONES/docs/cloud-run-deploy.md`

---

### Task 1: Define Control Plane Source Of Truth

**Files:**
- Create: `control-plane/schema/idea_to_project.sql`

**Interfaces:**
- Produces: tables for `ideas`, `projects`, `agents`, `tasks`, `events`, `cloud_resources`, and `decisions`.
- Consumes: no existing application code.

- [ ] **Step 1: Create the schema draft**

Create `control-plane/schema/idea_to_project.sql` with this content:

```sql
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  macro_division text not null,
  idea_type text not null,
  stage text not null check (stage in ('inbox', 'vision', 'backlog', 'active', 'paused', 'rejected', 'shipped')),
  priority text not null check (priority in ('now', 'next', 'later', 'parking_lot')),
  description text not null default '',
  dependencies jsonb not null default '[]'::jsonb,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references ideas(id),
  name text not null,
  macro_division text not null,
  repository_path text not null default '',
  branch_name text not null default '',
  status text not null check (status in ('planned', 'active', 'blocked', 'paused', 'shipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  macro_division text not null,
  project_id uuid references projects(id),
  agent_type text not null check (agent_type in ('global_assistant', 'ceo', 'worker', 'reviewer')),
  status text not null check (status in ('active', 'paused', 'retired')),
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  assigned_agent_id uuid references agents(id),
  title text not null,
  status text not null check (status in ('todo', 'in_progress', 'blocked', 'review', 'done')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  acceptance_criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  project_id uuid references projects(id),
  task_id uuid references tasks(id),
  actor_agent_id uuid references agents(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists cloud_resources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  resource_type text not null,
  resource_name text not null,
  project_id uuid references projects(id),
  status text not null check (status in ('planned', 'active', 'blocked', 'deleted')),
  monthly_cost_estimate numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  title text not null,
  decision text not null,
  rationale text not null,
  decided_by text not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Seed the HumanIA World idea**

Add this insert below the schema:

```sql
insert into ideas (title, macro_division, idea_type, stage, priority, description, dependencies, source)
values (
  'HumanIA World Second Life',
  'HumanIA',
  'immersive_social_world',
  'vision',
  'later',
  'Social world where humans and NPC IAs coexist; relationship continues in HumanIA Chat after discovery.',
  '["HumanIA Chat", "Agent Registry", "Memory", "Model Router", "Event Bus"]'::jsonb,
  'conversation'
);
```

---

### Task 2: Keep HumanIA As Chat/Marketplace MVP

**Files:**
- Modify: `HUMANIA PLATAFORMA COMUNICACIONES/src/App.tsx`
- Modify: `HUMANIA PLATAFORMA COMUNICACIONES/src/components/AgentCreator.tsx`

**Interfaces:**
- Consumes: existing `Contact`, `Message`, and Firestore paths.
- Produces: clearer HumanIA Chat MVP boundaries without Control Plane responsibilities.

- [ ] **Step 1: Rename product framing in copy only**

Replace user-facing labels that imply internal orchestration, such as `Mother Intelligence Core`, `Cloud Persistence Layer`, and `Core Portal`, with HumanIA-facing labels:

```text
HumanIA Chat
HumanIA Cloud Memory
HumanIA Services
HumanIA Agent Studio
```

Do not rename code identifiers in this task.

- [ ] **Step 2: Keep Ares but classify him as a user-facing executive agent**

In `CONTACTS_DATA`, keep `ares`, but treat it as a HumanIA service contact. Do not let it impersonate the actual Control Plane CEO until the Control Plane backend exists.

Expected user-facing role:

```ts
role: "Executive Strategy Agent"
```

---

### Task 3: Make HumanIA Deployable On Cloud Run Preview

**Files:**
- Modify: `HUMANIA PLATAFORMA COMUNICACIONES/src/App.tsx`
- Modify: `HUMANIA PLATAFORMA COMUNICACIONES/src/components/AgentCreator.tsx`
- Create: `HUMANIA PLATAFORMA COMUNICACIONES/docs/cloud-run-deploy.md`

**Interfaces:**
- Consumes: existing `npm run build` and `npm start` scripts.
- Produces: a Cloud Run source deployment path that does not rely on App Engine `app.yaml`.

- [ ] **Step 1: Fix production asset paths**

Move image assets to a public runtime path or import them as modules. Preferred minimal change: import images in `src/App.tsx` and `src/components/AgentCreator.tsx` instead of using string URLs.

Use this pattern:

```ts
import aresAvatar from "./assets/images/ares_avatar_1784422343159.jpg";
```

For `AgentCreator.tsx`, use:

```ts
import aresAvatar from "../assets/images/ares_avatar_1784422343159.jpg";
```

Then assign `url: aresAvatar` instead of `url: "/src/assets/images/ares_avatar_1784422343159.jpg"`.

- [ ] **Step 2: Document Cloud Run source deploy**

Create `docs/cloud-run-deploy.md` with this content:

```markdown
# HumanIA Cloud Run Preview Deploy

## Required Secret

- `GEMINI_API_KEY` must be configured as a Cloud Run environment variable or Secret Manager mounted variable.

## Local Verification

```bash
npm install
npm run lint
npm run build
npm start
```

Open `http://localhost:3000/api/health` and expect JSON with `status: "ok"`.

## Deploy With Source Buildpacks

```bash
gcloud run deploy humania-chat-preview \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

## Production Gate

Do not connect public Google Gmail/Calendar/Classroom features until OAuth scopes are minimized and verified.
```

- [ ] **Step 3: Verify build**

Run from `HUMANIA PLATAFORMA COMUNICACIONES`:

```bash
npm install
npm run lint
npm run build
```

Expected: PASS before any Cloud Run deploy.

---

### Task 4: Harden OAuth And VM Configuration Before Public Launch

**Files:**
- Modify: `HUMANIA PLATAFORMA COMUNICACIONES/src/lib/firebase.ts`
- Modify: `HUMANIA PLATAFORMA COMUNICACIONES/src/components/VmConfigurator.tsx`
- Modify: `HUMANIA PLATAFORMA COMUNICACIONES/src/types.ts`

**Interfaces:**
- Consumes: Firebase Auth and current `VmConfig` type.
- Produces: safer client app that does not ask users for all Google scopes by default and does not store provider keys in client state.

- [ ] **Step 1: Reduce default OAuth scopes**

Default sign-in should request identity only. Add Gmail, Calendar, Contacts, or Classroom scopes later behind explicit feature-specific consent.

Minimal default scope list:

```ts
const scopes = [
  "profile",
  "email"
];
```

- [ ] **Step 2: Remove client provider API key storage**

Remove `liveModelApiKey?: string;` from `VmConfig` in `src/types.ts`.

Remove the API key input block from `VmConfigurator.tsx`. Keep provider selection, WebSocket URL, HTTP URL, latency, audio quality, camera vision, and custom prompt.

Expected principle: provider credentials live in backend Secret Manager, not browser state.

---

## Execution Order

1. Finish Carta Viva manual avatar cache tomorrow.
2. Implement Task 1 for Control Plane schema when ready to formalize ideas and CEO routing.
3. Implement Task 3 to make HumanIA deployable as a preview.
4. Implement Task 4 before public OAuth launch.
5. Defer HumanIA World until HumanIA Chat and Agent Registry exist.

## Self-Review

**Spec coverage:** Captures HumanIA World as a future idea, preserves Carta Viva priority, separates HumanIA Chat from Control Plane, records deployment blockers, and defines the first Control Plane data model.

**Placeholder scan:** No placeholder tasks remain; every future task has exact files and concrete expected content.

**Type consistency:** `VmConfig.liveModelApiKey` exists today and is explicitly removed in hardening. `Contact` and `Message` remain the HumanIA MVP data types.
