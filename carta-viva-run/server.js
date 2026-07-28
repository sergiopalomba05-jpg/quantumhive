const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Dialogflow CX config
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'bubbly-stone-502214-u7';
const AGENT_ID = process.env.DIALOGFLOW_AGENT_ID || '';
const LOCATION = process.env.DIALOGFLOW_LOCATION || 'us-central1';

// Auth client
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Session ID counter
let sessionCounter = 0;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If no Dialogflow agent configured, use fallback responses
    if (!AGENT_ID) {
      const reply = getFallbackReply(message);
      return res.json({ reply, source: 'fallback' });
    }

    // Dialogflow CX REST API
    const sid = sessionId || `session-${++sessionCounter}`;
    const url = `https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/sessions/${sid}:detectIntent`;

    const client = await auth.getIdTokenClient('https://.googleapis.com/auth/cloud-platform');
    const authHeader = await client.getRequestHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader.Authorization,
      },
      body: JSON.stringify({
        queryInput: {
          text: {
            text: message,
          },
          languageCode: 'es',
        },
      }),
    });

    const data = await response.json();

    let reply = 'No pude entender tu mensaje. Probá de nuevo.';
    if (data.queryResult && data.queryResult.responseMessages) {
      const textMsg = data.queryResult.responseMessages.find(
        (msg) => msg.text && msg.text.text && msg.text.text.length > 0
      );
      if (textMsg) {
        reply = textMsg.text.text[0];
      }
    }

    res.json({ reply, sessionId: sid, source: 'dialogflow' });
  } catch (error) {
    console.error('Chat error:', error.message);
    // Fallback to local responses on error
    const reply = getFallbackReply(req.body.message || '');
    res.json({ reply, source: 'fallback', error: error.message });
  }
});

// Fallback replies when Dialogflow is not configured
function getFallbackReply(message) {
  const msg = message.toLowerCase();

  if (msg.includes('carta') || msg.includes('menu')) {
    return 'Carta QR Viva es una carta digital interactiva que se actualiza en tiempo real. Los escaneás con el celular y tenés el menú completo con fotos, precios y descripciones.';
  }
  if (msg.includes('precio') || msg.includes('costo') || msg.includes('cuanto')) {
    return 'El precio depende del tamaño de tu restaurante y la cantidad de platos. Escribinos al WhatsApp 11 2407-0819 y te damos un presupuesto sin cargo.';
  }
  if (msg.includes('demo') || msg.includes('prueba') || msg.includes('probar')) {
    return 'Podés probar la demo en vivo tocando el botón "Ver demo de Avatar en vivo" en la parte de arriba. Ahí vas a ver cómo funciona la experiencia completa.';
  }
  if (msg.includes('whatsapp') || msg.includes('contacto') || msg.includes('hablar')) {
    return 'Escribinos al WhatsApp 11 2407-0819 y te atendemos al toque. También podés mandar un mail a ceo@quantumhive.com.ar';
  }
  if (msg.includes('qr') || msg.includes('escanear')) {
    return 'El cliente escanea un código QR con la cámara del celular y accede directo a la carta. Sin apps, sin descargas, sin fricción.';
  }
  if (msg.includes(' actualizar') || msg.includes('cambiar')) {
    return 'Podés actualizar precios, platos, fotos y descripciones desde un panel simple. Los cambios se reflejan al instante en la carta del cliente.';
  }

  return '¡Hola! Soy el asistente de Carta QR Viva. Preguntame sobre la carta digital, precios, demos o cómo funciona. También podés escribirnos al WhatsApp 11 2407-0819.';
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dialogflow: !!AGENT_ID });
});

// Catch all - serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Carta Viva running on port ${PORT}`);
  console.log(`Dialogflow: ${AGENT_ID ? 'ENABLED' : 'FALLBACK MODE'}`);
});
