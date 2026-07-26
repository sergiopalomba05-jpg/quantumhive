import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildVideoAnalysisPrompt,
  detectVideoSource,
  extractUrls,
  normalizeTelegramMessage,
  validateStructuredVideoAnalysis,
} from '../src/core/videoIngest';

describe('video ingest parser', () => {
  it('extracts URLs from Telegram text', () => {
    assert.deepEqual(extractUrls('mira este reel https://www.instagram.com/reel/ABC123/?igsh=xxx'), [
      'https://www.instagram.com/reel/ABC123/?igsh=xxx',
    ]);
  });

  it('detects supported video platforms', () => {
    assert.equal(detectVideoSource('https://www.instagram.com/reel/ABC123/'), 'instagram_reel');
    assert.equal(detectVideoSource('https://youtu.be/abc'), 'youtube');
    assert.equal(detectVideoSource('https://www.tiktok.com/@x/video/123'), 'tiktok');
    assert.equal(detectVideoSource('https://x.com/user/status/123'), 'x_video');
    assert.equal(detectVideoSource('https://example.com/resource'), 'web');
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
    assert.equal(result?.telegram.chatId, 123);
  });

  it('normalizes Telegram video captions when a file is sent', () => {
    const result = normalizeTelegramMessage({
      update_id: 2,
      message: {
        message_id: 100,
        chat: { id: 123, type: 'group' },
        from: { id: 456, first_name: 'Sergio' },
        caption: 'guardar esto https://youtu.be/abc',
        video: { file_id: 'file-123', mime_type: 'video/mp4' },
        date: 1785000000,
      },
    });

    assert.equal(result?.sourceType, 'youtube');
    assert.equal(result?.telegram.fileId, 'file-123');
  });

  it('rejects malformed structured analysis', () => {
    assert.throws(() => validateStructuredVideoAnalysis({
      title: 'sin categoria',
      summary: 'Resumen',
      paraQue: 'Uso',
      detalle: 'Detalle',
      tags: [],
      actionableSteps: [],
      confidence: 0.5,
    }), /category/i);
  });

  it('validates structured analysis with catalog fields', () => {
    const result = validateStructuredVideoAnalysis({
      title: 'Runway Gen-4',
      summary: 'Video sobre una herramienta IA para generar videos.',
      category: 'ai_tool',
      detectedToolName: 'Runway',
      paraQue: 'Generar videos de producto con IA.',
      detalle: 'Detectado desde un reel enviado por Telegram.',
      tags: ['video', 'ia'],
      actionableSteps: ['Probar pricing', 'Comparar con Kling'],
      confidence: 0.8,
    });

    assert.equal(result.detectedToolName, 'Runway');
    assert.equal(result.confidence, 0.8);
  });

  it('builds a prompt that preserves catalog taxonomy and review policy', () => {
    const prompt = buildVideoAnalysisPrompt({
      sourceType: 'instagram_reel',
      originalUrl: 'https://www.instagram.com/reel/ABC/',
      telegram: { chatId: 1, messageId: 2, fromId: 3 },
    });

    assert.match(prompt, /pending_review/);
    assert.match(prompt, /herramientas/);
    assert.match(prompt, /nombre/);
    assert.match(prompt, /repo_url/);
    assert.match(prompt, /para_que/);
    assert.match(prompt, /detalle/);
  });
});
