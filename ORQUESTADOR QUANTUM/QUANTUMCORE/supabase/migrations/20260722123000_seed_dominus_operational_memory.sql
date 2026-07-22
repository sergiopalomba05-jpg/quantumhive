UPDATE agents
SET provider_policy = 'required_for_sensitive_actions'
WHERE id = '11111111-1111-4111-8111-111111111111';

INSERT INTO memories (
  agent_id,
  scope,
  title,
  content,
  tags,
  type,
  importance,
  metadata,
  visibility
)
SELECT
  '11111111-1111-4111-8111-111111111111',
  'agent',
  'Dominus Prime memoria operativa inicial',
  'Dominus Prime es el orquestador general de QuantumCore: usa GCP/Vertex primero, coordina agentes, arma context packs, escribe memoria, crea tareas y requiere aprobacion humana para acciones sensibles.',
  ARRAY['dominus', 'quantumcore', 'memoria', 'orquestacion'],
  'Contexto',
  'crítica',
  jsonb_build_object(
    'seed_key', 'dominus_operational_memory_v1',
    'constitution_doc_path', 'docs/DOMINUS_PRIME_CONSTITUTION.md',
    'system_core_doc_path', 'docs/DOMINUS_PRIME_SYSTEM_CORE.md'
  ),
  'private'
WHERE NOT EXISTS (
  SELECT 1
  FROM memories
  WHERE agent_id = '11111111-1111-4111-8111-111111111111'
    AND metadata->>'seed_key' = 'dominus_operational_memory_v1'
);
