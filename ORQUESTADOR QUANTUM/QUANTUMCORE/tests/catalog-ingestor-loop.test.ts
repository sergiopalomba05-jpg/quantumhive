import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCatalogIngestionResult,
  findCatalogDuplicate,
  normalizeToolName,
  scoreCatalogTool,
} from '../src/core/catalogIngestor';

const existingTools = [
  {
    id: 'tool-framer',
    nombre: 'Framer',
    repo_url: 'https://www.framer.com/',
    para_que: 'Crear landings premium y sitios visuales',
    detalle: 'Freemium. Muy fuerte en diseño web visual.',
    estado: 'publicable',
  },
];

describe('catalog ingestor loop', () => {
  it('normalizes tool names for duplicate detection', () => {
    assert.equal(normalizeToolName('  Framer AI!!! '), 'framer ai');
  });

  it('detects duplicate tools by domain and normalized name', () => {
    const duplicate = findCatalogDuplicate(
      {
        nombre: 'Framer AI',
        repo_url: 'https://framer.com/ai',
      },
      existingTools,
    );

    assert.equal(duplicate?.id, 'tool-framer');
  });

  it('scores tools by quality, utility, price access, automation, and confidence', () => {
    const score = scoreCatalogTool({
      pricing: 'freemium',
      qualitySignals: ['producto conocido', 'buenos resultados visuales'],
      utility: 'crear webs premium',
      automationSignals: ['genera páginas con IA'],
      confidence: 0.86,
    });

    assert.equal(score.confianza, 86);
    assert.ok(score.calidad >= 7);
    assert.ok(score.utilidadQuantumCore >= 7);
    assert.ok(score.precioAccesibilidad >= 6);
    assert.ok(score.automatizacion >= 6);
  });

  it('builds a publicable taxonomy result when confidence is high and there is no duplicate', () => {
    const result = buildCatalogIngestionResult({
      analysis: {
        title: 'v0 by Vercel',
        summary: 'Generador de interfaces React para crear webs y componentes.',
        category: 'ai_tool',
        detectedToolName: 'v0',
        paraQue: 'Crear interfaces web React rapidamente',
        detalle: 'Herramienta de Vercel para generar UI con IA.',
        tags: ['web', 'react', 'ui'],
        actionableSteps: ['Comparar contra Framer y Webflow'],
        confidence: 0.9,
      },
      input: {
        sourceType: 'web',
        originalUrl: 'https://v0.dev/',
        telegram: { chatId: 1, messageId: 2 },
      },
      existingTools,
    });

    assert.equal(result.estadoCatalogo, 'publicable');
    assert.equal(result.herramienta.nombre, 'v0');
    assert.equal(result.taxonomia.division, 'Webs y Apps');
    assert.equal(result.taxonomia.subdivision, 'Generadores de UI y frontend');
    assert.match(result.comparativa.mejorPara, /interfaces web/i);
    assert.equal(result.duplicadoDe, undefined);
  });

  it('marks repeated tools as duplicated instead of creating a clean new catalog item', () => {
    const result = buildCatalogIngestionResult({
      analysis: {
        title: 'Framer',
        summary: 'Crear sitios visuales con IA.',
        category: 'ai_tool',
        detectedToolName: 'Framer',
        paraQue: 'Crear landings premium',
        detalle: 'Nuevo reel sobre Framer.',
        tags: ['web', 'landing'],
        actionableSteps: ['Enriquecer ficha existente'],
        confidence: 0.91,
      },
      input: {
        sourceType: 'instagram_reel',
        originalUrl: 'https://framer.com/templates',
        telegram: { chatId: 1, messageId: 3 },
      },
      existingTools,
    });

    assert.equal(result.estadoCatalogo, 'duplicada');
    assert.equal(result.duplicadoDe, 'tool-framer');
    assert.match(result.accionSugerida, /enriquecer/i);
  });
});
