import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { agentTables } from './agent/schema';
import { aiTownTables } from './aiTown/schema';
import { conversationId, playerId } from './aiTown/ids';
import { engineTables } from './engine/schema';

export default defineSchema({
  music: defineTable({
    storageId: v.string(),
    type: v.union(v.literal('background'), v.literal('player')),
  }),

  messages: defineTable({
    conversationId,
    messageUuid: v.string(),
    author: playerId,
    text: v.string(),
    worldId: v.optional(v.id('worlds')),
  })
    .index('conversationId', ['worldId', 'conversationId'])
    .index('messageUuid', ['conversationId', 'messageUuid']),

  agentBus: defineTable({
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
    timestamp: v.number(),
    source: v.string(),
    target: v.optional(v.string()),
  })
    .index('by_agent', ['agentId'])
    .index('by_timestamp', ['timestamp'])
    .index('by_target', ['target'])
    .index('by_eventType', ['eventType']),

  agentRegistry: defineTable({
    agentId: v.string(),
    agentName: v.string(),
    role: v.string(),
    source: v.string(),
    status: v.union(v.literal('online'), v.literal('offline'), v.literal('busy')),
    lastHeartbeat: v.number(),
    capabilities: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  })
    .index('by_agentId', ['agentId'])
    .index('by_status', ['status']),

  ...agentTables,
  ...aiTownTables,
  ...engineTables,
});
