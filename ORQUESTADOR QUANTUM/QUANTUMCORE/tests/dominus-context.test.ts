import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDominusContextPack, extractMemoryProposal } from '../src/core/dominusContext';

describe('Dominus context pack', () => {
  it('builds a prompt with system core, constitution, critical memories, and user message', () => {
    const result = buildDominusContextPack({
      agent: { name: 'Dominus Prime', role: 'Orquestador General' },
      systemCore: 'Sos Dominus Prime.',
      constitution: 'Sergio es autoridad final.',
      memories: [
        { title: 'Baja', content: 'menos importante', importance: 'baja', type: 'Contexto', tags: [] },
        { title: 'Critica', content: 'memoria critica', importance: 'critica', type: 'Decision', tags: ['dominus'] },
      ],
      message: 'Que seguimos haciendo?',
    });

    assert.match(result.prompt, /SYSTEM CORE/);
    assert.match(result.prompt, /Sos Dominus Prime/);
    assert.match(result.prompt, /CONSTITUCION/);
    assert.match(result.prompt, /Sergio es autoridad final/);
    assert.match(result.prompt, /Critica/);
    assert.match(result.prompt, /Que seguimos haciendo\?/);
    assert.equal(result.prompt.includes('Baja'), true);
  });

  it('instructs the model to propose memory without claiming it was saved', () => {
    const result = buildDominusContextPack({
      agent: { name: 'Dominus Prime', role: 'Orquestador General' },
      systemCore: 'core',
      constitution: 'constitution',
      memories: [],
      message: 'guardar esta decision',
    });

    assert.match(result.prompt, /memoryProposal/);
    assert.match(result.prompt, /No afirmes que fue guardado/i);
  });

  it('extracts a memoryProposal JSON block from model text', () => {
    const result = extractMemoryProposal('Respuesta\n```json\n{"memoryProposal":{"title":"Decision","content":"Guardar esto","type":"Decision","importance":"alta","tags":["dominus"]}}\n```');

    assert.equal(result.text.includes('memoryProposal'), false);
    assert.equal(result.memoryProposal?.title, 'Decision');
    assert.equal(result.memoryProposal?.importance, 'alta');
  });
});
