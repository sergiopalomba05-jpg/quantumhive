# Avatar Cache Engine MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded Sol avatar clip mappings with a small reusable cache manifest so Carta Viva can launch with manually generated avatar videos now and automate generation later.

**Architecture:** Keep the MVP static and cheap: store avatar clip metadata in versioned JSON under `public/avatar-videos/<avatarId>/<version>/manifest.json`, load it from the React app, and fall back to the existing hardcoded clips if the manifest cannot load. Do not introduce a database or queue in this first pass; the manifest format is the seam that later connects Supabase jobs, manual uploads, or GPU workers.

**Tech Stack:** Vite, React 19, TypeScript, Express static serving, existing WebM files in `public/avatar-videos/sol/v1`.

## Global Constraints

- Do not delete files or folders.
- Do not commit unless the user explicitly asks for a commit.
- Keep Carta Viva isolated from HumanIA, Ghost, Roblox, Unreal, and the future QuantumHive Control Plane.
- Do not require GPU, LongCat, MuseTalk, or VM quota for this MVP.
- Do not add new npm dependencies.
- Preserve the existing Sol UI behavior and current clip names.
- Prefer the smallest working change over a large refactor of `src/App.tsx`.
- The initial cache source of truth is static JSON and files under `public/avatar-videos`.
- Tests must run locally with existing tooling only.

---

## File Structure

- Create: `agencia/motor madre/motor-avatares-video-test/public/avatar-videos/sol/v1/manifest.json`
- Create: `agencia/motor madre/motor-avatares-video-test/src/avatarCache.ts`
- Create: `agencia/motor madre/motor-avatares-video-test/src/avatarCache.test.ts`
- Modify: `agencia/motor madre/motor-avatares-video-test/src/App.tsx`
- Verify: `agencia/motor madre/motor-avatares-video-test/package.json` scripts remain unchanged unless the existing test command is insufficient.

The manifest owns clip metadata. `src/avatarCache.ts` owns path resolution and fallback behavior. `src/App.tsx` should only consume a ready `Record<string, string>` and should not know how clip paths are assembled.

---

### Task 1: Add Static Sol Manifest And Resolver

**Files:**
- Create: `agencia/motor madre/motor-avatares-video-test/public/avatar-videos/sol/v1/manifest.json`
- Create: `agencia/motor madre/motor-avatares-video-test/src/avatarCache.ts`
- Create: `agencia/motor madre/motor-avatares-video-test/src/avatarCache.test.ts`

**Interfaces:**
- Consumes: Existing clip files in `/avatar-videos/sol/v1/*.webm`.
- Produces: `fallbackSolAvatarVideoByKey: Record<string, string>`, `loadAvatarManifest(avatarId: string, version: string): Promise<AvatarManifest>`, and `buildAvatarVideoMap(manifest: AvatarManifest): Record<string, string>`.

- [ ] **Step 1: Create the Sol manifest**

Create `public/avatar-videos/sol/v1/manifest.json` with exactly this content:

```json
{
  "avatarId": "sol",
  "version": "v1",
  "basePath": "/avatar-videos/sol/v1",
  "defaultClipKey": "connector_idle",
  "welcomeClipKey": "connector_welcome",
  "idleClipKeys": [
    "connector_idle_cut_hair",
    "connector_idle_cut_3",
    "connector_idle_cut_4",
    "connector_idle_cut_6"
  ],
  "longWaitClipKey": "connector_idle_cut_wait",
  "clips": {
    "connector_idle": "connector_idle_cut_1.webm",
    "connector_idle_cut_1": "connector_idle_cut_1.webm",
    "connector_idle_cut_hair": "connector_idle_cut_hair.webm",
    "connector_idle_cut_3": "connector_idle_cut_3.webm",
    "connector_idle_cut_4": "connector_idle_cut_4.webm",
    "connector_idle_cut_wait": "connector_idle_cut_wait.webm",
    "connector_idle_cut_6": "connector_idle_cut_6.webm",
    "connector_look_left_cut": "connector_look_left_cut.webm",
    "connector_look_right_cut": "connector_look_right_cut.webm",
    "connector_taking_order_cut": "connector_taking_order_cut.webm",
    "connector_welcome_cut": "connector_welcome_cut.webm",
    "connector_farewell_cut": "connector_farewell_cut.webm",
    "connector_live_invite_cut": "connector_live_invite_cut.webm",
    "connector_welcome": "connector_welcome_cut.webm",
    "connector_entradas": "connector_entradas.webm"
  }
}
```

- [ ] **Step 2: Write a failing resolver test**

Create `src/avatarCache.test.ts` with this content:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildAvatarVideoMap, fallbackSolAvatarManifest } from "./avatarCache";

test("buildAvatarVideoMap resolves manifest clips against basePath", () => {
  const map = buildAvatarVideoMap(fallbackSolAvatarManifest);

  assert.equal(map.connector_idle, "/avatar-videos/sol/v1/connector_idle_cut_1.webm");
  assert.equal(map.connector_welcome, "/avatar-videos/sol/v1/connector_welcome_cut.webm");
  assert.equal(map.connector_entradas, "/avatar-videos/sol/v1/connector_entradas.webm");
});

test("buildAvatarVideoMap strips duplicate slashes between base path and file name", () => {
  const map = buildAvatarVideoMap({
    avatarId: "demo",
    version: "v1",
    basePath: "/avatar-videos/demo/v1/",
    defaultClipKey: "idle",
    welcomeClipKey: "welcome",
    idleClipKeys: ["idle"],
    longWaitClipKey: "idle",
    clips: {
      idle: "idle.webm",
      welcome: "welcome.webm"
    }
  });

  assert.equal(map.idle, "/avatar-videos/demo/v1/idle.webm");
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run from `agencia/motor madre/motor-avatares-video-test`:

```bash
node --import tsx --test src/avatarCache.test.ts
```

Expected: FAIL because `src/avatarCache.ts` does not exist yet.

- [ ] **Step 4: Implement the resolver**

Create `src/avatarCache.ts` with this content:

```ts
export type AvatarManifest = {
  avatarId: string;
  version: string;
  basePath: string;
  defaultClipKey: string;
  welcomeClipKey: string;
  idleClipKeys: string[];
  longWaitClipKey: string;
  clips: Record<string, string>;
};

export const fallbackSolAvatarManifest: AvatarManifest = {
  avatarId: "sol",
  version: "v1",
  basePath: "/avatar-videos/sol/v1",
  defaultClipKey: "connector_idle",
  welcomeClipKey: "connector_welcome",
  idleClipKeys: [
    "connector_idle_cut_hair",
    "connector_idle_cut_3",
    "connector_idle_cut_4",
    "connector_idle_cut_6"
  ],
  longWaitClipKey: "connector_idle_cut_wait",
  clips: {
    connector_idle: "connector_idle_cut_1.webm",
    connector_idle_cut_1: "connector_idle_cut_1.webm",
    connector_idle_cut_hair: "connector_idle_cut_hair.webm",
    connector_idle_cut_3: "connector_idle_cut_3.webm",
    connector_idle_cut_4: "connector_idle_cut_4.webm",
    connector_idle_cut_wait: "connector_idle_cut_wait.webm",
    connector_idle_cut_6: "connector_idle_cut_6.webm",
    connector_look_left_cut: "connector_look_left_cut.webm",
    connector_look_right_cut: "connector_look_right_cut.webm",
    connector_taking_order_cut: "connector_taking_order_cut.webm",
    connector_welcome_cut: "connector_welcome_cut.webm",
    connector_farewell_cut: "connector_farewell_cut.webm",
    connector_live_invite_cut: "connector_live_invite_cut.webm",
    connector_welcome: "connector_welcome_cut.webm",
    connector_entradas: "connector_entradas.webm"
  }
};

export const fallbackSolAvatarVideoByKey = buildAvatarVideoMap(fallbackSolAvatarManifest);

export function buildAvatarVideoMap(manifest: AvatarManifest): Record<string, string> {
  const basePath = manifest.basePath.replace(/\/+$/, "");

  return Object.fromEntries(
    Object.entries(manifest.clips).map(([key, fileName]) => [
      key,
      `${basePath}/${fileName.replace(/^\/+/, "")}`
    ])
  );
}

export async function loadAvatarManifest(avatarId: string, version: string): Promise<AvatarManifest> {
  const response = await fetch(`/avatar-videos/${avatarId}/${version}/manifest.json`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Avatar manifest not found: ${avatarId}/${version}`);
  }

  return response.json() as Promise<AvatarManifest>;
}
```

- [ ] **Step 5: Run the resolver test to verify it passes**

Run from `agencia/motor madre/motor-avatares-video-test`:

```bash
node --import tsx --test src/avatarCache.test.ts
```

Expected: PASS with two tests passing.

- [ ] **Step 6: Review checkpoint**

Run:

```bash
git diff -- public/avatar-videos/sol/v1/manifest.json src/avatarCache.ts src/avatarCache.test.ts
```

Expected: Diff only contains the three files from this task. Do not commit unless the user explicitly asks.

---

### Task 2: Load Manifest In The React App With Safe Fallback

**Files:**
- Modify: `agencia/motor madre/motor-avatares-video-test/src/App.tsx`

**Interfaces:**
- Consumes: `fallbackSolAvatarManifest`, `fallbackSolAvatarVideoByKey`, `buildAvatarVideoMap`, `loadAvatarManifest` from `src/avatarCache.ts`.
- Produces: Existing `playAvatarClip(key: string)` behavior backed by loaded manifest when available.

- [ ] **Step 1: Write the minimal integration patch**

In `src/App.tsx`, add this import near the existing imports:

```ts
import {
  buildAvatarVideoMap,
  fallbackSolAvatarManifest,
  fallbackSolAvatarVideoByKey,
  loadAvatarManifest,
  type AvatarManifest
} from "./avatarCache";
```

Replace the existing hardcoded `const avatarVideoByKey: Record<string, string> = { ... };` block with:

```ts
const defaultAvatarManifest = fallbackSolAvatarManifest;
const defaultAvatarVideoByKey = fallbackSolAvatarVideoByKey;
```

Inside the main `App` component, add state near the existing avatar state declarations:

```ts
const [avatarManifest, setAvatarManifest] = useState<AvatarManifest>(defaultAvatarManifest);
const [avatarVideoByKey, setAvatarVideoByKey] = useState<Record<string, string>>(defaultAvatarVideoByKey);
```

Add this effect before the existing preload effect:

```ts
useEffect(() => {
  let cancelled = false;

  loadAvatarManifest("sol", "v1")
    .then((manifest) => {
      if (cancelled) return;
      setAvatarManifest(manifest);
      setAvatarVideoByKey(buildAvatarVideoMap(manifest));
    })
    .catch((error) => {
      console.warn("No se pudo cargar el manifest de avatar; usando fallback local.", error);
    });

  return () => {
    cancelled = true;
  };
}, []);
```

Replace these top-level constants:

```ts
const idleAvatarVideo = avatarVideoByKey.connector_idle;
const idleAvatarVariants = [
  { key: "connector_idle_cut_hair", src: avatarVideoByKey.connector_idle_cut_hair },
  { key: "connector_idle_cut_3", src: avatarVideoByKey.connector_idle_cut_3 },
  { key: "connector_idle_cut_4", src: avatarVideoByKey.connector_idle_cut_4 },
  { key: "connector_idle_cut_6", src: avatarVideoByKey.connector_idle_cut_6 }
];
const longWaitIdleAvatarVariant = { key: "connector_idle_cut_wait", src: avatarVideoByKey.connector_idle_cut_wait };
const fallbackIdleAvatarVariant = { key: "connector_idle", src: idleAvatarVideo };
```

with derived values inside the `App` component after the new state:

```ts
const idleAvatarVideo = avatarVideoByKey[avatarManifest.defaultClipKey] || defaultAvatarVideoByKey.connector_idle;
const idleAvatarVariants = avatarManifest.idleClipKeys.map((key) => ({
  key,
  src: avatarVideoByKey[key] || defaultAvatarVideoByKey[key]
}));
const longWaitIdleAvatarVariant = {
  key: avatarManifest.longWaitClipKey,
  src: avatarVideoByKey[avatarManifest.longWaitClipKey] || defaultAvatarVideoByKey.connector_idle_cut_wait
};
const fallbackIdleAvatarVariant = { key: avatarManifest.defaultClipKey, src: idleAvatarVideo };
```

Move `isIdleVariantKey` inside the `App` component after `longWaitIdleAvatarVariant`, keeping the same expression:

```ts
const isIdleVariantKey = (key: string | null) => Boolean(
  key && [...idleAvatarVariants, longWaitIdleAvatarVariant].some((variant) => variant.key === key)
);
```

- [ ] **Step 2: Update preload dependencies**

In the existing preload effect, change the dependency array from:

```ts
}, []);
```

to:

```ts
}, [avatarVideoByKey]);
```

Expected behavior: existing fallback videos preload immediately; manifest-loaded video map preloads once fetched.

- [ ] **Step 3: Run TypeScript validation**

Run from `agencia/motor madre/motor-avatares-video-test`:

```bash
npm run lint
```

Expected: PASS. If TypeScript reports that a moved constant is referenced before declaration, move only that derived constant earlier inside the component; do not refactor unrelated UI.

- [ ] **Step 4: Run production build**

Run from `agencia/motor madre/motor-avatares-video-test`:

```bash
npm run build
```

Expected: PASS and `dist/` generated.

- [ ] **Step 5: Review checkpoint**

Run:

```bash
git diff -- src/App.tsx src/avatarCache.ts src/avatarCache.test.ts public/avatar-videos/sol/v1/manifest.json
```

Expected: Diff only replaces hardcoded avatar clip configuration with manifest-backed configuration. Do not commit unless the user explicitly asks.

---

### Task 3: Add A Manual Cache Inventory Script Without New Dependencies

**Files:**
- Create: `agencia/motor madre/motor-avatares-video-test/scripts/check-avatar-cache.mjs`
- Modify: `agencia/motor madre/motor-avatares-video-test/package.json`

**Interfaces:**
- Consumes: `public/avatar-videos/sol/v1/manifest.json` and local files named in `clips`.
- Produces: `npm run check:avatar-cache` that fails if a manifest clip points to a missing file.

- [ ] **Step 1: Create the script**

Create `scripts/check-avatar-cache.mjs` with this content:

```js
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(projectRoot, "public", "avatar-videos", "sol", "v1", "manifest.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const clipDir = path.join(projectRoot, "public", manifest.basePath.replace(/^\/+/, ""));
const missing = Object.entries(manifest.clips)
  .filter(([, fileName]) => !existsSync(path.join(clipDir, String(fileName))))
  .map(([key, fileName]) => `${key}: ${fileName}`);

if (missing.length > 0) {
  console.error("Missing avatar cache files:");
  for (const line of missing) console.error(`- ${line}`);
  process.exit(1);
}

console.log(`Avatar cache OK: ${Object.keys(manifest.clips).length} clips found for ${manifest.avatarId}/${manifest.version}`);
```

- [ ] **Step 2: Add the npm script**

In `package.json`, change the scripts block from:

```json
"scripts": {
  "dev": "tsx server.ts",
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
  "start": "node dist/server.cjs",
  "clean": "rm -rf dist server.js",
  "lint": "tsc --noEmit"
}
```

to:

```json
"scripts": {
  "dev": "tsx server.ts",
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
  "start": "node dist/server.cjs",
  "clean": "rm -rf dist server.js",
  "lint": "tsc --noEmit",
  "check:avatar-cache": "node scripts/check-avatar-cache.mjs"
}
```

- [ ] **Step 3: Run inventory validation**

Run from `agencia/motor madre/motor-avatares-video-test`:

```bash
npm run check:avatar-cache
```

Expected: PASS with `Avatar cache OK: 15 clips found for sol/v1`.

- [ ] **Step 4: Run build validation again**

Run from `agencia/motor madre/motor-avatares-video-test`:

```bash
npm run lint
npm run build
```

Expected: both commands PASS.

- [ ] **Step 5: Review checkpoint**

Run:

```bash
git diff -- package.json scripts/check-avatar-cache.mjs public/avatar-videos/sol/v1/manifest.json
```

Expected: Diff only adds the inventory check and npm script. Do not commit unless the user explicitly asks.

---

### Task 4: Document Manual Clip Pack Workflow For Tomorrow

**Files:**
- Create: `agencia/motor madre/motor-avatares-video-test/docs/avatar-cache-manual-workflow.md`

**Interfaces:**
- Consumes: Current Sol manifest schema and generated WebM files.
- Produces: A checklist the user can follow when creating clips manually with Google Vids or another video tool.

- [ ] **Step 1: Create the workflow document**

Create `docs/avatar-cache-manual-workflow.md` with this content:

```markdown
# Avatar Cache Manual Workflow

## Purpose

Use this when creating Carta Viva avatar clips manually before GPU automation is available.

## Folder Convention

Use this structure for every avatar pack:

```text
public/avatar-videos/<avatarId>/<version>/
  manifest.json
  connector_idle_cut_1.webm
  connector_welcome_cut.webm
  connector_taking_order_cut.webm
```

Current MVP pack:

```text
public/avatar-videos/sol/v1/
```

## Required Clip Types

- `connector_welcome`: first greeting after splash.
- `connector_idle`: neutral idle fallback.
- `connector_idle_cut_hair`, `connector_idle_cut_3`, `connector_idle_cut_4`, `connector_idle_cut_6`: short idle variety clips.
- `connector_idle_cut_wait`: longer waiting clip after inactivity.
- `connector_look_left_cut`: points attention to left-side choices.
- `connector_look_right_cut`: points attention to right-side choices.
- `connector_taking_order_cut`: used when customer adds items or starts an order flow.
- `connector_live_invite_cut`: used before voice/live mode.
- `connector_farewell_cut`: used at checkout/close.

## Optional Category Clips

- `connector_entradas`: intro for starters.
- Future examples: `connector_principales`, `connector_bebidas`, `connector_postres`, `connector_parrilla`, `connector_gaseosas`.

## Export Rules

- Prefer `.webm` for the web app.
- Keep each connector under 6 seconds when possible.
- Keep idle clips loop-safe and visually calm.
- Do not make one unique lip-sync video for every dish in MVP.
- Pair generic avatar clips with text, cards, and menu highlights.
- Keep the same avatar, lighting, framing, and outfit across a version.

## Add A New Clip

1. Export the clip into `public/avatar-videos/sol/v1/`.
2. Add the file name to `public/avatar-videos/sol/v1/manifest.json` under `clips`.
3. Run `npm run check:avatar-cache`.
4. Run `npm run build`.
5. Test the UI path that should play the clip.

## Automation Later

The future job table should track these fields:

- `job_id`
- `restaurant_id`
- `avatar_id`
- `version`
- `clip_key`
- `script`
- `status`
- `asset_url`
- `created_at`
- `completed_at`

This MVP does not need that table yet.
```

- [ ] **Step 2: Run cache validation**

Run from `agencia/motor madre/motor-avatares-video-test`:

```bash
npm run check:avatar-cache
```

Expected: PASS.

- [ ] **Step 3: Review checkpoint**

Run:

```bash
git diff -- docs/avatar-cache-manual-workflow.md public/avatar-videos/sol/v1/manifest.json
```

Expected: Diff documents the manual workflow and references only current manifest structure. Do not commit unless the user explicitly asks.

---

## Self-Review

**Spec coverage:** This plan covers the immediate Carta Viva launch path with avatar cache, existing Sol clips, manual generation tomorrow, reusable manifest format, and no GPU dependency. It intentionally does not implement QuantumHive Control Plane, HumanIA Chat, Supabase migrations, Roblox, Unreal, or VM quota because those are separate subsystems.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, or unspecified test steps remain.

**Type consistency:** `AvatarManifest`, `fallbackSolAvatarManifest`, `fallbackSolAvatarVideoByKey`, `buildAvatarVideoMap`, and `loadAvatarManifest` are defined in Task 1 and consumed by Task 2 with matching names.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-20-avatar-cache-engine-mvp.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
