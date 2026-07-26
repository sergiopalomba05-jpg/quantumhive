# QuantumCore Video Ingest Telegram Dominus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the real Video Ingest Agent loop where Sergio sends IG Reels/video links to the existing Dominus Telegram channel, Dominus routes them to a video-ingest worker, Gemini analyzes them, and QuantumCore stores reviewable catalog drafts in Supabase using the existing catalog taxonomy.

**Architecture:** Telegram is the communication channel; Dominus is the router; Video Ingest Agent is the processor. The frontend never downloads or renders heavy media. Supabase remains the source of truth for the catalog, with drafts held as `pending_review` before being promoted into `herramientas`/taxonomy links.

**Tech Stack:** Cloud Run, Express, TypeScript, Vertex/Gemini, Supabase REST/client, Telegram Bot API webhooks, existing `/video-inbox`, existing Capa 3 Recursos/Videos, existing catalog PWA schema.

## Global Constraints

- Do not create a new Dominus Telegram bot if one already exists; use existing token/chat config when present.
- Store all secrets in GCP Secret Manager / Cloud Run env, never frontend/localStorage/code.
- Telegram first; WhatsApp is phase 2.
- No heavy browser video processing; Cloud Run backend owns ingestion and analysis.
- Respect existing Supabase catalog taxonomy: `divisiones`, `subdivisiones`, `herramientas`, `herramienta_subdivision`, `stack_categorias`, `stack_items`.
- Existing PWA catalog reads `herramientas(id,nombre,repo_url,para_que,estado,detalle)`, so promoted records must use those names.
- New video items must start as `pending_review`; no automatic final catalog mutation without approval.
- Do not delete files or data.

---

## File Structure

- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/videoIngest.ts`
  - Pure parsing/classification utilities: platform detection, URL extraction, source normalization, structured analysis schema validation.
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/videoIngestStore.ts`
  - Server-side Supabase persistence helpers for draft items and catalog promotion.
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/videoIngest.ts`
  - HTTP API for Telegram webhook, manual URL ingest, listing inbox items, approval to catalog.
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/vision.ts`
  - Reuse Gemini analysis prompt and return structured analysis where possible.
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/app.ts`
  - Register `videoIngestRouter` under `/api`.
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/pages/VideoInbox.tsx`
  - Load real backend items and support URL/manual ingest + approve to catalog.
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/componentes/memoria/SeccionMemoriaYOrganizacion.tsx`
  - Fix importer/promoted resource mapping to `nombre`, `repo_url`, `para_que`, `estado`, `detalle`.
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/store/useStore.ts`
  - Mark Telegram channel seed as backend-ready/active when env is configured; keep existing Dominus seed.
- Create tests:
  - `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/video-ingest.test.ts`
  - `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/video-ingest-api.test.ts`
  - `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/catalog-taxonomy.test.ts`

---

### Task 1: Core Video Ingest Parser

**Files:**
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/videoIngest.ts`
- Test: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/video-ingest.test.ts`

**Interfaces:**
- Produces: `extractUrls(text: string): string[]`
- Produces: `detectVideoSource(input: string): 'instagram_reel' | 'youtube' | 'tiktok' | 'x_video' | 'web'`
- Produces: `normalizeTelegramMessage(update: TelegramUpdate): NormalizedVideoInput | null`
- Produces: `validateStructuredVideoAnalysis(value: unknown): StructuredVideoAnalysis`

- [ ] **Step 1: Write parser tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectVideoSource, extractUrls, normalizeTelegramMessage, validateStructuredVideoAnalysis } from '../src/core/videoIngest';

describe('video ingest parser', () => {
  it('extracts URLs from Telegram text', () => {
    assert.deepEqual(extractUrls('mirá este reel https://www.instagram.com/reel/ABC123/?igsh=xxx'), [
      'https://www.instagram.com/reel/ABC123/?igsh=xxx',
    ]);
  });

  it('detects supported video platforms', () => {
    assert.equal(detectVideoSource('https://www.instagram.com/reel/ABC123/'), 'instagram_reel');
    assert.equal(detectVideoSource('https://youtu.be/abc'), 'youtube');
    assert.equal(detectVideoSource('https://www.tiktok.com/@x/video/123'), 'tiktok');
    assert.equal(detectVideoSource('https://x.com/user/status/123'), 'x_video');
  });

  it('normalizes Telegram message text into Dominus video input', () => {
    const result = normalizeTelegramMessage({
      update_id: 1,
      message: {
        message_id: 99,
        chat: { id: 123, type: 'group' },
        from: { id: 456, first_name: 'Sergio' },
        text: 'https://www.instagram.com/reel/ABC123/',
        date: 1785000000,
      },
    });

    assert.equal(result?.sourceType, 'instagram_reel');
    assert.equal(result?.originalUrl, 'https://www.instagram.com/reel/ABC123/');
    assert.equal(result?.telegram.messageId, 99);
  });

  it('rejects malformed structured analysis', () => {
    assert.throws(() => validateStructuredVideoAnalysis({ title: 'sin categoria' }), /category/i);
  });
});
```

- [ ] **Step 2: Run failing parser tests**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-ingest.test.ts`

Expected: FAIL because `src/core/videoIngest.ts` does not exist.

- [ ] **Step 3: Implement parser utilities**

Implement the exported types and functions with no external dependencies. `validateStructuredVideoAnalysis` must require:

```ts
{
  title: string;
  summary: string;
  category: 'ai_tool' | 'skill' | 'business_idea' | 'tutorial' | 'competitor' | 'inspiration' | 'bugfix' | 'automation' | 'design' | 'avatar' | 'marketing' | 'trading' | 'other';
  detectedToolName?: string;
  catalogDivision?: string;
  catalogSubdivision?: string;
  paraQue: string;
  detalle: string;
  tags: string[];
  actionableSteps: string[];
  confidence: number;
}
```

- [ ] **Step 4: Verify parser tests pass**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-ingest.test.ts`

Expected: PASS.

---

### Task 2: Server-Side Supabase Draft Store

**Files:**
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/videoIngestStore.ts`
- Test: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/catalog-taxonomy.test.ts`

**Interfaces:**
- Consumes: `StructuredVideoAnalysis`, `NormalizedVideoInput`
- Produces: `buildPendingReviewTool(input, analysis): CatalogDraftInsert`
- Produces: `buildCatalogPromotion(draft): CatalogToolUpsert`

- [ ] **Step 1: Write taxonomy mapping tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPendingReviewTool } from '../src/core/videoIngestStore';

describe('catalog taxonomy mapping', () => {
  it('maps video analysis to existing herramientas field names', () => {
    const draft = buildPendingReviewTool(
      { sourceType: 'instagram_reel', originalUrl: 'https://www.instagram.com/reel/ABC123/', telegram: { chatId: 1, messageId: 2, fromId: 3 } },
      {
        title: 'Runway Gen-4',
        summary: 'Herramienta para video IA',
        category: 'ai_tool',
        detectedToolName: 'Runway',
        paraQue: 'Generar videos de producto con IA',
        detalle: 'Detectado desde reel enviado por Telegram. Revisar antes de publicar.',
        tags: ['video', 'ia'],
        actionableSteps: ['Probar landing', 'Comparar pricing'],
        confidence: 0.8,
      }
    );

    assert.equal(draft.nombre, 'Runway');
    assert.equal(draft.repo_url, 'https://www.instagram.com/reel/ABC123/');
    assert.equal(draft.estado, 'pending_review');
    assert.match(draft.para_que, /Generar videos/);
    assert.match(draft.detalle, /reel enviado/);
  });
});
```

- [ ] **Step 2: Run failing taxonomy tests**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/catalog-taxonomy.test.ts`

Expected: FAIL because `videoIngestStore.ts` does not exist.

- [ ] **Step 3: Implement mapping without DB writes first**

Create mapping helpers that use the PWA field contract:

```ts
export interface CatalogDraftInsert {
  nombre: string;
  repo_url: string;
  para_que: string;
  detalle: string;
  estado: 'pending_review';
}
```

Do not write to Supabase in this step.

- [ ] **Step 4: Verify taxonomy tests pass**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/catalog-taxonomy.test.ts`

Expected: PASS.

---

### Task 3: Video Ingest API Routes

**Files:**
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/videoIngest.ts`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/app.ts`
- Test: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/video-ingest-api.test.ts`

**Interfaces:**
- Produces: `POST /api/video-ingest/telegram`
- Produces: `POST /api/video-ingest/manual`
- Produces: `GET /api/video-ingest/items`
- Produces: `POST /api/video-ingest/items/:id/approve`

- [ ] **Step 1: Write API route tests with mocked no-secret mode**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { app } from '../src/server/app';

function listen() {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('invalid test server address');
      resolve({ url: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((done) => server.close(() => done())) });
    });
  });
}

describe('video ingest API', () => {
  it('rejects Telegram updates from non-allowed chat when allowlist is configured', async () => {
    process.env.TELEGRAM_ALLOWED_CHAT_ID = '123';
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/video-ingest/telegram`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ update_id: 1, message: { message_id: 1, chat: { id: 999, type: 'group' }, text: 'https://www.instagram.com/reel/ABC/' } }),
      });
      assert.equal(response.status, 403);
    } finally {
      delete process.env.TELEGRAM_ALLOWED_CHAT_ID;
      await server.close();
    }
  });

  it('accepts manual URL ingest and returns queued item metadata', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/video-ingest/manual`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.instagram.com/reel/ABC/' }),
      });
      const data = await response.json() as { item: { sourceType: string; originalUrl: string; status: string } };
      assert.equal(response.status, 202);
      assert.equal(data.item.sourceType, 'instagram_reel');
      assert.equal(data.item.status, 'queued');
    } finally {
      await server.close();
    }
  });
});
```

- [ ] **Step 2: Run failing API tests**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-ingest-api.test.ts`

Expected: FAIL because route is not registered.

- [ ] **Step 3: Implement route skeleton and register it**

Add `videoIngestRouter` with safe responses. In no-secret/local test mode, store accepted items in a module-level in-memory array. In production mode, later tasks will write Supabase.

- [ ] **Step 4: Verify API tests pass**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-ingest-api.test.ts`

Expected: PASS.

---

### Task 4: Gemini Structured Analysis Worker

**Files:**
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/videoIngest.ts`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/videoIngest.ts`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/vision.ts`
- Test: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/video-ingest.test.ts`

**Interfaces:**
- Produces: `buildVideoAnalysisPrompt(input): string`
- Produces: `analyzeVideoInput(input): Promise<StructuredVideoAnalysis>`

- [ ] **Step 1: Add prompt test**

```ts
it('builds a prompt that preserves catalog taxonomy and review policy', () => {
  const prompt = buildVideoAnalysisPrompt({ sourceType: 'instagram_reel', originalUrl: 'https://www.instagram.com/reel/ABC/', telegram: { chatId: 1, messageId: 2, fromId: 3 } });
  assert.match(prompt, /pending_review/);
  assert.match(prompt, /herramientas/);
  assert.match(prompt, /nombre/);
  assert.match(prompt, /repo_url/);
  assert.match(prompt, /para_que/);
  assert.match(prompt, /detalle/);
});
```

- [ ] **Step 2: Run failing prompt test**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-ingest.test.ts`

Expected: FAIL until `buildVideoAnalysisPrompt` exists.

- [ ] **Step 3: Implement prompt and analysis wrapper**

Use Vertex/Gemini text analysis for URLs first. Do not attempt Instagram private scraping in MVP. Prompt asks Gemini to infer from URL/text only and mark low confidence if metadata is insufficient.

- [ ] **Step 4: Verify tests and existing vision routes**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-ingest.test.ts tests/provider-router.test.ts`

Expected: PASS.

---

### Task 5: Supabase Persistence and Approval

**Files:**
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/videoIngestStore.ts`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/videoIngest.ts`
- Test: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/catalog-taxonomy.test.ts`

**Interfaces:**
- Produces: `saveVideoDraft(input, analysis): Promise<{ id: string; status: string }>`
- Produces: `approveVideoDraft(id: string): Promise<{ herramientaId: string }>`

- [ ] **Step 1: Add persistence contract tests with injectable fake client**

```ts
it('persists pending review drafts using herramientas-compatible fields', async () => {
  const inserted: unknown[] = [];
  const fakeSupabase = {
    from: (table: string) => ({
      insert: async (rows: unknown[]) => {
        assert.equal(table, 'herramientas');
        inserted.push(...rows);
        return { data: [{ id: 'tool-1' }], error: null };
      },
    }),
  };

  const result = await saveVideoDraft(fakeSupabase as any, inputFixture, analysisFixture);
  assert.equal(result.id, 'tool-1');
  assert.equal((inserted[0] as any).estado, 'pending_review');
});
```

- [ ] **Step 2: Run failing persistence tests**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/catalog-taxonomy.test.ts`

Expected: FAIL until persistence helper exists.

- [ ] **Step 3: Implement persistence with service-role-aware Supabase client**

Use backend env vars:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Fallback to current anon client only for read/manual test mode; writes require service role in production.

- [ ] **Step 4: Verify persistence tests pass**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/catalog-taxonomy.test.ts`

Expected: PASS.

---

### Task 6: VideoInbox UI Real Backend Loop

**Files:**
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/pages/VideoInbox.tsx`
- Test: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/video-inbox-ui.test.ts`

**Interfaces:**
- Consumes: `GET /api/video-ingest/items`
- Consumes: `POST /api/video-ingest/manual`
- Consumes: `POST /api/video-ingest/items/:id/approve`

- [ ] **Step 1: Write UI text/static behavior test**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

describe('VideoInbox UI', () => {
  it('exposes Telegram/manual ingest and approval copy', () => {
    const source = readFileSync('src/pages/VideoInbox.tsx', 'utf8');
    assert.match(source, /Telegram/i);
    assert.match(source, /Reel|URL|link/i);
    assert.match(source, /Aprobar/i);
    assert.match(source, /pending_review|Revisión/i);
  });
});
```

- [ ] **Step 2: Run failing UI test**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-inbox-ui.test.ts`

Expected: FAIL until UI is updated.

- [ ] **Step 3: Implement lightweight UI**

Add:
- URL input for manual ingest.
- Status cards from backend items.
- Telegram status panel: `Dominus Telegram conectado` when env-backed endpoint responds.
- Approve button for `pending_review` items.

- [ ] **Step 4: Verify UI test passes**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-inbox-ui.test.ts`

Expected: PASS.

---

### Task 7: Capa 3 Catalog Mapping Fix

**Files:**
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/componentes/memoria/SeccionMemoriaYOrganizacion.tsx`
- Test: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/catalog-taxonomy.test.ts`

**Interfaces:**
- Produces: importer rows compatible with PWA: `nombre`, `repo_url`, `para_que`, `detalle`, `estado`.

- [ ] **Step 1: Add static taxonomy test for Capa 3 importer**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

describe('Capa 3 catalog importer contract', () => {
  it('uses PWA-compatible herramientas fields', () => {
    const source = readFileSync('src/componentes/memoria/SeccionMemoriaYOrganizacion.tsx', 'utf8');
    assert.match(source, /repo_url/);
    assert.match(source, /para_que/);
    assert.match(source, /detalle/);
    assert.match(source, /estado/);
  });
});
```

- [ ] **Step 2: Run failing taxonomy test**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/catalog-taxonomy.test.ts`

Expected: FAIL because current importer writes `descripcion` and `url`.

- [ ] **Step 3: Update importer field mapping**

Change insert payload from:

```ts
{ nombre: r.nombre, descripcion: r.descripcion, url: r.url }
```

to:

```ts
{
  nombre: r.nombre,
  repo_url: r.url,
  para_que: r.descripcion,
  detalle: `Importado desde HTML de 100 recursos. Fuente: ${r.url}`,
  estado: 'pending_review',
}
```

- [ ] **Step 4: Verify taxonomy test passes**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/catalog-taxonomy.test.ts`

Expected: PASS.

---

### Task 8: Cloud Run Secrets and Telegram Webhook Setup

**Files:**
- Modify docs only if needed: `ORQUESTADOR QUANTUM/QUANTUMCORE/.env.example` if present.

**Interfaces:**
- Consumes secrets:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_ALLOWED_CHAT_ID`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 1: Verify secrets exist without printing values**

Run:

```powershell
gcloud secrets list --project bubbly-stone-502214-u7
```

Expected: secret names are visible; values are never printed.

- [ ] **Step 2: Add missing secrets if Sergio provides values**

Run only for missing secrets:

```powershell
"VALUE_FROM_SERGIO" | gcloud secrets create TELEGRAM_BOT_TOKEN --project bubbly-stone-502214-u7 --data-file=- --replication-policy="automatic"
```

- [ ] **Step 3: Grant Cloud Run service account access**

Run:

```powershell
gcloud secrets add-iam-policy-binding TELEGRAM_BOT_TOKEN --member="serviceAccount:854335368640-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project bubbly-stone-502214-u7
```

- [ ] **Step 4: Bind secrets to Cloud Run**

Run:

```powershell
gcloud run services update quantumcore --update-secrets "TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest" --update-env-vars "TELEGRAM_ALLOWED_CHAT_ID=CHAT_ID,SUPABASE_URL=https://okknbcumosciujogcqtc.supabase.co,GRAPHIFY_PATH=/app/graphify-out/graph.json" --region us-central1 --project bubbly-stone-502214-u7
```

- [ ] **Step 5: Register Telegram webhook**

Run:

```powershell
$token = gcloud secrets versions access latest --secret=TELEGRAM_BOT_TOKEN --project bubbly-stone-502214-u7
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook" -Method Post -Body @{ url = "https://quantumcore-854335368640.us-central1.run.app/api/video-ingest/telegram" }
```

Expected: Telegram returns `{ "ok": true }`.

---

### Task 9: Final Verification and Deploy

**Files:**
- All files from previous tasks.

- [ ] **Step 1: Run targeted tests**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test -- tests/video-ingest.test.ts tests/video-ingest-api.test.ts tests/catalog-taxonomy.test.ts tests/video-inbox-ui.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm test`

Expected: all existing tests pass.

- [ ] **Step 3: Build**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; npm run build`

Expected: Vite build and `dist/server.cjs` created.

- [ ] **Step 4: Deploy**

Run: `cd "ORQUESTADOR QUANTUM/QUANTUMCORE"; gcloud run deploy quantumcore --source . --region us-central1 --project bubbly-stone-502214-u7 --allow-unauthenticated`

Expected: new Cloud Run revision serving 100% traffic.

- [ ] **Step 5: Production smoke test**

Run:

```powershell
Invoke-RestMethod -Uri "https://quantumcore-854335368640.us-central1.run.app/api/video-ingest/manual" -Method Post -ContentType "application/json" -Body '{"url":"https://www.instagram.com/reel/SMOKE_TEST/"}'
```

Expected: HTTP 202 with `sourceType: instagram_reel` and `status: queued`.

- [ ] **Step 6: Manual Telegram test**

Send an IG Reel link in the existing Dominus Telegram group.

Expected:
- Telegram webhook receives update.
- QuantumCore creates/updates draft.
- `/video-inbox` shows item.
- Item remains `pending_review` until Sergio approves.

---

## Self-Review

- Spec coverage: Telegram intake, Dominus routing, video ingestion, Supabase taxonomy, existing HTML/PWA catalog, VideoInbox, Capa 3, deploy, and no heavy frontend work are covered.
- Placeholder scan: no TBD/TODO placeholders remain; secret values are intentionally represented as names/placeholders because they must come from GCP Secret Manager or Sergio.
- Type consistency: parser outputs feed store mapping; store mapping feeds API; API feeds UI.
- Scope check: WhatsApp and real IG scraping/download are explicitly phase 2; MVP remains Telegram + URL/file metadata + Gemini analysis + Supabase draft.
