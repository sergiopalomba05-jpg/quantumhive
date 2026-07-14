import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable JSON bodies
app.use(express.json());

// Initialize Gemini SDK safely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini SDK successfully initialized on server.");
  } catch (err) {
    console.error("Failed to initialize Gemini SDK:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not set or using placeholder. Running with mock fallbacks.");
}

// ---------------------------------------------------------
// 1. API Endpoint: Real-Time Translation helper
// ---------------------------------------------------------
app.post('/api/translate', async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  const languageMap: Record<string, string> = {
    es: 'Spanish (Español)',
    en: 'English (Inglés)',
    pt: 'Portuguese (Portugués)',
    fr: 'French (Francés)',
    de: 'German (Alemán)',
    it: 'Italian (Italiano)',
    ja: 'Japanese (Japonés)'
  };

  const targetLangName = languageMap[targetLanguage] || targetLanguage || 'Spanish';

  // If Gemini is not configured, do a high-quality local mock translation
  if (!ai) {
    console.log("[Mock Translation] API Key missing, translating locally.");
    const mockTranslations: Record<string, Record<string, string>> = {
      es: {
        "hello": "hola",
        "how are you": "cómo estás",
        "what is your name": "cómo te llamas",
        "good morning": "buenos días",
        "goodbye": "adiós",
        "thank you": "gracias",
        "welcome to the video call": "bienvenido a la videollamada"
      },
      en: {
        "hola": "hello",
        "cómo estás": "how are you",
        "como estas": "how are you",
        "cómo te llamas": "what is your name",
        "buenos días": "good morning",
        "buenos dias": "good morning",
        "adiós": "goodbye",
        "gracias": "thank you",
        "bienvenido a la videollamada": "welcome to the video call"
      }
    };

    const lowercaseText = text.toLowerCase().trim();
    const match = mockTranslations[targetLanguage]?.[lowercaseText];
    if (match) {
      return res.json({ translatedText: match });
    }
    
    // Simple placeholder appending translation request
    return res.json({ 
      translatedText: `[Traducido a ${targetLangName}]: ${text}` 
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Translate the following speech to ${targetLangName}. Preserve the casual tone of spoken speech. Only return the translated text itself with no extra explanation or quotes: "${text}"`,
    });

    const translatedText = response.text?.trim() || text;
    res.json({ translatedText });
  } catch (err: any) {
    console.error("Translation error:", err);
    res.json({ translatedText: `[Error: ${err.message || 'Error de traducción'}]` });
  }
});

// ---------------------------------------------------------
// 2. API Endpoint: Live Vertex / LLM Agent call response
// ---------------------------------------------------------
app.post('/api/ai-response', async (req, res) => {
  const { text, targetLanguage, voice, enableTranslation, avatarId, speechStyleId } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  const languageMap: Record<string, string> = {
    es: 'Spanish',
    en: 'English',
    pt: 'Portuguese',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ja: 'Japanese'
  };

  const targetLangName = languageMap[targetLanguage] || 'Spanish';
  const opposingLangName = targetLanguage === 'es' ? 'English' : 'Spanish';

  const avatars: Record<string, { name: string; role: string; personality: string }> = {
    clara: {
      name: "Clara",
      role: "Acompañante Empática",
      personality: "Escucha con profunda compasión, ofrece apoyo afectivo incondicional y valida tus sentimientos con calidez humana y dulzura."
    },
    elias: {
      name: "Elías",
      role: "Mentor Filosófico",
      personality: "Analiza los problemas desde perspectivas amplias, comparte reflexiones profundas y te ayuda a encontrar sabiduría en la calma."
    },
    nova: {
      name: "Nova",
      role: "Mente de Vanguardia",
      personality: "Apasionada por la ciencia, el cosmos y la tecnología cuántica de última generación. Inspira curiosidad y descubrimientos."
    },
    dante: {
      name: "Dante",
      role: "Compañero Carismático",
      personality: "Lleno de humor, bromas ligeras, respuestas rápidas y sarcasmo divertido. Ideal para conversaciones cotidianas con chispa."
    }
  };

  const speechStyles: Record<string, string> = {
    warm: 'Speak with deep empathy, emotional warmth, and supportive words. Be extremely compassionate, validating, and act as a loving virtual companion.',
    intellectual: 'Speak with high intellectual depth, philosophical analogies, sophisticated vocabulary, and a calm, authoritative yet gentle tone.',
    casual: 'Speak like a close, casual daily friend. Use everyday natural phrasing, be informal, light-hearted, and conversational.',
    witty: 'Speak with sharp wit, playful sarcasm, light ironies, and fun humor. Keep the user entertained while still answering as a companion.'
  };

  const selectedAvatar = avatars[avatarId] || avatars.clara;
  const selectedStyle = speechStyles[speechStyleId] || speechStyles.warm;

  // Mock reply if Gemini is offline
  if (!ai) {
    const fallbackReply = targetLanguage === 'es'
      ? `¡Hola! Soy ${selectedAvatar.name}, tu ${selectedAvatar.role.toLowerCase()}. Entiendo perfectamente. Me dijiste "${text}". Estoy funcionando en modo demostración local.`
      : `Hello! I am ${selectedAvatar.name}, your ${selectedAvatar.role.toLowerCase()}. I hear you loud and clear. You said "${text}". I am running in offline demo mode.`;
    
    const fallbackTrans = targetLanguage === 'es'
      ? `Hello! I am ${selectedAvatar.name}, your ${selectedAvatar.role.toLowerCase()}. I understand perfectly. You told me "${text}".`
      : `¡Hola! Soy ${selectedAvatar.name}, tu ${selectedAvatar.role.toLowerCase()}. Te escucho fuerte y claro. Me dijiste "${text}".`;

    return res.json({
      reply: fallbackReply,
      translation: enableTranslation ? fallbackTrans : ''
    });
  }

  try {
    // Generate AI conversational response in target language matching chosen personality/avatar
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are "${selectedAvatar.name}", an AI virtual companion playing the role of "${selectedAvatar.role}" for everyday support and interaction. 
      Your core personality traits: "${selectedAvatar.personality}".
      Conversational speaking style guidelines: "${selectedStyle}".
      
      The user just said: "${text}".
      Please respond to them directly, staying fully in character. 
      Keep it brief (1 to 2 short sentences) as this is a real-time voice call.
      You MUST write your response entirely in ${targetLangName}. 
      Do not add markdown formatting, asterisks, brackets, quotes, or headers.`
    });

    const reply = aiResponse.text?.trim() || 'Hola, ¿cómo estás?';

    // Generate translation of AI's response to opposing language if translation is enabled
    let translation = '';
    if (enableTranslation) {
      try {
        const transResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `Translate the following speech to ${opposingLangName}. Only return the translation with no extra quotes or labels: "${reply}"`
        });
        translation = transResponse.text?.trim() || '';
      } catch (e) {
        console.error("Failed to translate AI response:", e);
      }
    }

    res.json({ reply, translation });
  } catch (err: any) {
    console.error("AI response error:", err);
    res.status(500).json({ error: err.message || 'Vertex LLM processing error' });
  }
});

// ---------------------------------------------------------
// 3. Mock signaling gateway route for testing WebRTC
// ---------------------------------------------------------
app.all('/api/rtc', (req, res) => {
  res.status(426).send('Upgrade Required: WebSocket Connection expected for WebRTC signaling.');
});

// ---------------------------------------------------------
// 4. Vite Dev Server / Static files handler
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving production static files from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LiveAI Video Call Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
