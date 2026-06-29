// Edge Function: carta-voz
// TTS de la PRESENTACIÓN de Carta QR Viva (QuantumHive).
// Convierte un tramo de texto en audio con Gemini TTS y devuelve PCM 16-bit (base64)
// + el sample rate; el frontend lo envuelve en WAV y lo reproduce.
// La key de Gemini vive SOLO como secret (GEMINI_API_KEY), nunca en el repo (repo público).
import { corsHeaders, json } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
// Modelo y voz configurables por secret; defaults verificados (gemini-2.5-flash-preview-tts, voz "Charon" = varón).
const TTS_MODEL = Deno.env.get('GEMINI_TTS_MODEL') ?? 'gemini-2.5-flash-preview-tts'
const TTS_VOICE = Deno.env.get('GEMINI_TTS_VOICE') ?? 'Charon'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY no configurado' }, 500)

  try {
    const body = await req.json().catch(() => ({}))
    // El frontend habla por tramos cortos; 800 chars por llamada es de sobra y acota abuso.
    const text = String(body?.text ?? '').slice(0, 800).trim()
    if (!text) return json({ error: 'texto vacío' }, 400)

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
            },
          },
        }),
      },
    )
    const data = await r.json()
    if (!r.ok) return json({ error: 'Gemini TTS rechazó la consulta', detail: data }, 502)

    // Gemini TTS devuelve PCM 16-bit mono dentro de inlineData; el rate viene en el mimeType
    // (ej. "audio/L16;codec=pcm;rate=24000").
    const part = (data?.candidates?.[0]?.content?.parts ?? []).find(
      (p: { inlineData?: { data?: string } }) => p?.inlineData?.data,
    )
    const audio = part?.inlineData?.data
    if (!audio) return json({ error: 'sin audio en la respuesta', detail: data }, 502)

    const mime: string = part?.inlineData?.mimeType ?? ''
    const m = mime.match(/rate=(\d+)/)
    const rate = m ? Number(m[1]) : 24000

    return json({ audio, rate })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
