import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * QuantumHive Agent Bus
 * Permite que agentes de diferentes VMs/entornos se comuniquen en tiempo real.
 * Convex actúa como hub central con DB + real-time subscriptions.
 */

// ============================================================
// PUBLICAR EVENTO
// ============================================================
export const publishEvent = mutation({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    eventType: v.union(
      v.literal('status_update'),
      v.literal('task_complete'),
      v.literal('task_started'),
      v.literal('message'),
      v.literal('alert'),
      v.literal('heartbeat'),
      v.literal('error'),
      v.literal('conversation_request'),
      v.literal('conversation_response'),
    ),
    payload: v.any(),
    source: v.string(),
    target: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert('agentBus', {
      ...args,
      timestamp: Date.now(),
    });

    // Actualizar registry del agente
    const existing = await ctx.db
      .query('agentRegistry')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastHeartbeat: Date.now(),
        status: 'online',
      });
    } else {
      await ctx.db.insert('agentRegistry', {
        agentId: args.agentId,
        agentName: args.agentName,
        role: args.payload?.role || 'worker',
        source: args.source,
        status: 'online',
        lastHeartbeat: Date.now(),
        capabilities: args.payload?.capabilities,
      });
    }

    return eventId;
  },
});

// ============================================================
// HEARTBEAT — keep-alive cada 30s
// ============================================================
export const heartbeat = mutation({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    source: v.string(),
    status: v.union(v.literal('online'), v.literal('offline'), v.literal('busy')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentRegistry')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastHeartbeat: Date.now(),
        status: args.status,
        metadata: args.metadata,
      });
    } else {
      await ctx.db.insert('agentRegistry', {
        agentId: args.agentId,
        agentName: args.agentName,
        role: args.metadata?.role || 'worker',
        source: args.source,
        status: args.status,
        lastHeartbeat: Date.now(),
        metadata: args.metadata,
      });
    }
  },
});

// ============================================================
// SUSCRIBIRSE A EVENTOS (polling)
// ============================================================
export const getEventsSince = query({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentBus')
      .withIndex('by_timestamp', (q) => q.gt('timestamp', args.since))
      .order('asc')
      .take(100);
  },
});

// ============================================================
// SUSCRIBIRSE A EVENTOS PARA UN AGENTE
// ============================================================
export const getEventsForAgent = query({
  args: {
    agentId: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    // Eventos dirigidos a este agente O broadcast (sin target)
    const targeted = await ctx.db
      .query('agentBus')
      .withIndex('by_target', (q) => q.eq('target', args.agentId))
      .filter((q) => q.gt(q.field('timestamp'), args.since))
      .order('asc')
      .take(50);

    const broadcast = await ctx.db
      .query('agentBus')
      .withIndex('by_target', (q) => q.eq('target', undefined))
      .filter((q) => q.gt(q.field('timestamp'), args.since))
      .order('asc')
      .take(50);

    // Merge y deduplicate
    const all = [...targeted, ...broadcast];
    const unique = all.filter(
      (event, index, self) =>
        index === self.findIndex((e) => e._id === event._id),
    );
    return unique.sort((a, b) => a.timestamp - b.timestamp).slice(0, 100);
  },
});

// ============================================================
// OBTENER AGENTES ACTIVOS
// ============================================================
export const getActiveAgents = query({
  handler: async (ctx) => {
    const all = await ctx.db.query('agentRegistry').collect();
    const now = Date.now();
    return all.map((agent) => ({
      ...agent,
      isAlive: now - agent.lastHeartbeat < 60_000, // 60s timeout
    }));
  },
});

// ============================================================
// REGISTRAR AGENTE
// ============================================================
export const registerAgent = mutation({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    role: v.string(),
    source: v.string(),
    capabilities: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentRegistry')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'online',
        lastHeartbeat: Date.now(),
        capabilities: args.capabilities,
        metadata: args.metadata,
      });
      return existing._id;
    }

    return await ctx.db.insert('agentRegistry', {
      ...args,
      status: 'online',
      lastHeartbeat: Date.now(),
    });
  },
});

// ============================================================
// MARCAR AGENTE OFFLINE
// ============================================================
export const unregisterAgent = mutation({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentRegistry')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status: 'offline' });
    }
  },
});

// ============================================================
// LIMPIAR EVENTOS VIEJOS (> 24hs)
// ============================================================
export const cleanupOldEvents = mutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const old = await ctx.db
      .query('agentBus')
      .withIndex('by_timestamp', (q) => q.lt('timestamp', cutoff))
      .take(100);

    for (const event of old) {
      await ctx.db.delete(event._id);
    }
    return old.length;
  },
});
