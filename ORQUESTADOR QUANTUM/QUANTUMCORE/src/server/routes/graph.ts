import { Router } from 'express';
import fs from 'fs';
import path from 'path';

export const graphRouter = Router();

interface GraphifyNode {
  id: string;
  label: string;
  file_type?: string;
  source_file?: string;
  source_location?: string;
  community?: number;
  importance?: number;
  summary?: string;
  tags?: string[];
  type?: string;
  norm_label?: string;
  [key: string]: unknown;
}

interface GraphifyEdge {
  id?: string;
  source: string;
  target: string;
  relation?: string;
  [key: string]: unknown;
}

interface GraphifyGraph {
  directed?: boolean;
  multigraph?: boolean;
  graph?: Record<string, unknown>;
  nodes?: GraphifyNode[];
  edges?: GraphifyEdge[];
}

interface CachedGraph {
  data: GraphifyGraph;
  stats: GraphStats;
  loadedAt: number;
}

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  communities: number;
  nodeTypes: Record<string, number>;
  topCommunities: Array<{ id: number; count: number }>;
}

let cache: CachedGraph | null = null;

function getGraphPath(): string {
  const envPath = process.env.GRAPHIFY_PATH;
  if (envPath) return envPath;
  return path.resolve(process.cwd(), '..', '..', 'graphify-out', 'graph.json');
}

function loadGraph(): GraphifyGraph {
  const filePath = getGraphPath();
  if (!fs.existsSync(filePath)) {
    return { nodes: [], edges: [], graph: {} };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { nodes: [], edges: [], graph: {} };
    }
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      graph: parsed.graph || {},
    };
  } catch {
    return { nodes: [], edges: [], graph: {} };
  }
}

function computeStats(graph: GraphifyGraph): GraphStats {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const communityMap = new Map<number, number>();
  const typeMap = new Map<string, number>();

  for (const node of nodes) {
    if (node.community !== undefined) {
      communityMap.set(node.community, (communityMap.get(node.community) || 0) + 1);
    }
    const t = node.file_type || node.type || 'unknown';
    typeMap.set(t, (typeMap.get(t) || 0) + 1);
  }

  const topCommunities = [...communityMap.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    communities: communityMap.size,
    nodeTypes: Object.fromEntries(typeMap),
    topCommunities,
  };
}

function ensureCache(): CachedGraph {
  if (cache) return cache;
  const data = loadGraph();
  const stats = computeStats(data);
  cache = { data, stats, loadedAt: Date.now() };
  return cache;
}

graphRouter.get('/graph/stats', (_req, res) => {
  try {
    const cached = ensureCache();
    res.json({
      totalNodes: cached.stats.totalNodes,
      totalEdges: cached.stats.totalEdges,
      communities: cached.stats.communities,
      nodeTypes: cached.stats.nodeTypes,
      topCommunities: cached.stats.topCommunities,
      loadedAt: cached.loadedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load graph stats' });
  }
});

graphRouter.get('/graph', (req, res) => {
  try {
    const cached = ensureCache();
    const community = req.query.community ? Number(req.query.community) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 2000;

    let nodes = cached.data.nodes || [];
    let edges = cached.data.edges || [];

    if (community !== undefined && !isNaN(community)) {
      const nodeIds = new Set<string>();
      nodes = nodes.filter(n => {
        if (n.community === community) {
          nodeIds.add(n.id);
          return true;
        }
        return false;
      });
      edges = edges.filter(e => nodeIds.has(e.source) || nodeIds.has(e.target));
    }

    if (nodes.length > limit) {
      const sorted = [...nodes].sort((a, b) => (b.importance || 0) - (a.importance || 0));
      const topIds = new Set(sorted.slice(0, limit).map(n => n.id));
      nodes = nodes.filter(n => topIds.has(n.id));
      edges = edges.filter(e => topIds.has(e.source) || topIds.has(e.target));
    }

    const mappedNodes = nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.file_type || n.type || 'file',
      summary: n.summary || '',
      importance: n.importance || 0.5,
      tags: n.tags || [],
      sourceLocation: n.source_location || '',
      community: n.community,
      sourceFile: n.source_file || '',
    }));

    const mappedEdges = edges.map((e, i) => ({
      id: e.id || `edge-${i}`,
      source: e.source,
      target: e.target,
      relation: e.relation || 'related',
      confidence: 1,
    }));

    res.json({ nodes: mappedNodes, edges: mappedEdges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load graph data' });
  }
});

graphRouter.post('/graph/reload', (_req, res) => {
  try {
    cache = null;
    const cached = ensureCache();
    res.json({ reloaded: true, totalNodes: cached.stats.totalNodes, totalEdges: cached.stats.totalEdges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reload graph' });
  }
});
