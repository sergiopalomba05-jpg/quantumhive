import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractConversationKeyPoints,
  findConversationCorrelations,
} from '../src/lib/conversationIngestion';

describe('conversation ingestion model', () => {
  it('extracts useful key points from a pasted conversation', () => {
    const points = extractConversationKeyPoints(
      'Plan QuantumCore',
      `Usuario: Necesito dejar de perder contexto entre agentes.
Asistente: La prioridad es guardar conversaciones completas y extraer puntos clave.
Usuario: Tambien hay que vincular cada charla con ideas y proyectos.
Asistente: N8N queda para despues, primero memoria operativa y contexto.`
    );

    assert.equal(points.length, 3);
    assert.equal(points[0].title, 'Plan QuantumCore - punto clave 1');
    assert.match(points[0].content, /perder contexto/);
    assert.deepEqual(points[0].tags, ['conversacion', 'punto_clave', 'plan-quantumcore']);
  });

  it('finds related ideas and projects by shared keywords', () => {
    const correlations = findConversationCorrelations(
      'Necesitamos memoria operativa, contexto por proyecto y conversaciones completas.',
      [
        { id: 'idea_1', type: 'idea', title: 'Automatizar WhatsApp', text: 'Webhook para reels.' },
        { id: 'project_1', type: 'project', title: 'QuantumCore Memoria', text: 'Contexto por proyecto y memoria operativa.' },
      ]
    );

    assert.equal(correlations[0].id, 'project_1');
    assert.equal(correlations[0].type, 'project');
    assert.ok(correlations[0].score > 0);
  });
});
