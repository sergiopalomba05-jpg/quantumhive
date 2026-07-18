/**
 * QuantumHive Bus Proxy — Cloud Run
 * 
 * HTTP API que permite a agentes externos (Vertex AI, otras VMs, OpenCode)
 * publicar y subscribirse al bus de eventos de QuantumHive.
 * 
 * Internamente usa el SDK de Convex para comunicarse con el hub central.
 * 
 * Endpoints:
 *   POST /api/publish        - Publicar evento
 *   POST /api/heartbeat      - Enviar heartbeat
 *   POST /api/register       - Registrar agente
 *   POST /api/unregister     - Dar de baja agente
 *   GET  /api/events         - Obtener eventos (polling)
 *   GET  /api/events/:agent  - Obtener eventos para un agente
 *   GET  /api/agents         - Listar agentes activos
 *   GET  /api/health         - Health check
 */

const express = require('express');
const cors = require('cors');
const { ConvexClient } = require('convex/browser');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// CONFIG
// ============================================================
const PORT = process.env.PORT || 8080;
const CONVEX_URL = process.env.CONVEX_URL; // e.g. https://xxx.convex.cloud

if (!CONVEX_URL) {
  console.error('ERROR: CONVEX_URL environment variable is required');
  console.error('Set it to your Convex deployment URL, e.g.:');
  console.error('  CONVEX_URL=https://your-project.convex.cloud');
  process.exit(1);
}

const convex = new ConvexClient(CONVEX_URL);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'quantumhive-bus-proxy',
    convexUrl: CONVEX_URL,
    timestamp: Date.now(),
  });
});

// ============================================================
// PUBLICAR EVENTO
// ============================================================
app.post('/api/publish', async (req, res) => {
  try {
    const { agentId, agentName, eventType, payload, source, target } = req.body;

    if (!agentId || !agentName || !eventType) {
      return res.status(400).json({
        error: 'Missing required fields: agentId, agentName, eventType',
      });
    }

    const validTypes = [
      'status_update', 'task_complete', 'task_started',
      'message', 'alert', 'heartbeat', 'error',
      'conversation_request', 'conversation_response',
    ];

    if (!validTypes.includes(eventType)) {
      return res.status(400).json({
        error: `Invalid eventType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const eventId = await convex.mutation('bus:publishEvent', {
      agentId,
      agentName,
      eventType,
      payload: payload || {},
      source: source || 'unknown',
      target,
    });

    res.json({ ok: true, eventId });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// HEARTBEAT
// ============================================================
app.post('/api/heartbeat', async (req, res) => {
  try {
    const { agentId, agentName, source, status, metadata } = req.body;

    if (!agentId || !agentName) {
      return res.status(400).json({
        error: 'Missing required fields: agentId, agentName',
      });
    }

    await convex.mutation('bus:heartbeat', {
      agentId,
      agentName,
      source: source || 'unknown',
      status: status || 'online',
      metadata,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// REGISTRAR AGENTE
// ============================================================
app.post('/api/register', async (req, res) => {
  try {
    const { agentId, agentName, role, source, capabilities, metadata } = req.body;

    if (!agentId || !agentName || !role) {
      return res.status(400).json({
        error: 'Missing required fields: agentId, agentName, role',
      });
    }

    const id = await convex.mutation('bus:registerAgent', {
      agentId,
      agentName,
      role,
      source: source || 'unknown',
      capabilities,
      metadata,
    });

    res.json({ ok: true, id });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DAR DE BAJA AGENTE
// ============================================================
app.post('/api/unregister', async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'Missing required field: agentId' });
    }

    await convex.mutation('bus:unregisterAgent', { agentId });
    res.json({ ok: true });
  } catch (error) {
    console.error('Unregister error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// OBTENER EVENTOS (polling)
// ============================================================
app.get('/api/events', async (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;
    const events = await convex.query('bus:getEventsSince', { since });
    res.json({ ok: true, events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// OBTENER EVENTOS PARA UN AGENTE
// ============================================================
app.get('/api/events/:agentId', async (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;
    const events = await convex.query('bus:getEventsForAgent', {
      agentId: req.params.agentId,
      since,
    });
    res.json({ ok: true, events });
  } catch (error) {
    console.error('Get agent events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LISTAR AGENTES ACTIVOS
// ============================================================
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await convex.query('bus:getActiveAgents');
    res.json({ ok: true, agents });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LIMPIAR EVENTOS VIEJOS
// ============================================================
app.post('/api/cleanup', async (req, res) => {
  try {
    const deleted = await convex.mutation('bus:cleanupOldEvents');
    res.json({ ok: true, deleted });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// START
// ============================================================
app.listen(PORT, () => {
  console.log(`QuantumHive Bus Proxy running on port ${PORT}`);
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
