import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildPendingReviewTool, saveVideoDraft } from '../src/core/videoIngestStore';

const inputFixture = {
  sourceType: 'instagram_reel' as const,
  originalUrl: 'https://www.instagram.com/reel/ABC123/',
  telegram: { chatId: 1, messageId: 2, fromId: 3 },
};

const analysisFixture = {
  title: 'Runway Gen-4',
  summary: 'Herramienta para video IA',
  category: 'ai_tool' as const,
  detectedToolName: 'Runway',
  paraQue: 'Generar videos de producto con IA',
  detalle: 'Detectado desde reel enviado por Telegram. Revisar antes de publicar.',
  tags: ['video', 'ia'],
  actionableSteps: ['Probar landing', 'Comparar pricing'],
  confidence: 0.8,
};

describe('catalog taxonomy mapping', () => {
  it('maps video analysis to existing herramientas field names', () => {
    const draft = buildPendingReviewTool(inputFixture, analysisFixture);

    assert.equal(draft.nombre, 'Runway');
    assert.equal(draft.repo_url, 'https://www.instagram.com/reel/ABC123/');
    assert.equal(draft.estado, 'pending_review');
    assert.match(draft.para_que, /Generar videos/);
    assert.match(draft.detalle, /reel enviado/);
    assert.match(draft.detalle, /Confianza: 80%/);
  });

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
    assert.equal(result.status, 'pending_review');
    assert.equal((inserted[0] as any).estado, 'pending_review');
    assert.equal((inserted[0] as any).repo_url, inputFixture.originalUrl);
  });

  it('Capa 3 HTML importer uses PWA-compatible herramientas fields', () => {
    const source = readFileSync('src/componentes/memoria/SeccionMemoriaYOrganizacion.tsx', 'utf8');

    assert.match(source, /repo_url/);
    assert.match(source, /para_que/);
    assert.match(source, /detalle/);
    assert.match(source, /estado/);
    assert.doesNotMatch(source, /descripcion:\s*r\.descripcion/);
    assert.doesNotMatch(source, /url:\s*r\.url/);
  });
});
