ALTER TABLE agents
ADD COLUMN IF NOT EXISTS brain_provider_id TEXT,
ADD COLUMN IF NOT EXISTS default_model_id TEXT,
ADD COLUMN IF NOT EXISTS worker_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS repo_connection_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS memory_scope TEXT,
ADD COLUMN IF NOT EXISTS memory_policy JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS skill_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mcp_server_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS communication_channel_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cost_limit_daily TEXT,
ADD COLUMN IF NOT EXISTS constitution_doc_path TEXT,
ADD COLUMN IF NOT EXISTS system_core_doc_path TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

UPDATE agents
SET
  brain_provider_id = COALESCE(brain_provider_id, 'vertex'),
  default_model_id = COALESCE(default_model_id, 'gemini'),
  memory_scope = COALESCE(memory_scope, 'global,projects,decisions,tasks,technical,operational'),
  memory_policy = COALESCE(memory_policy, '{}'::jsonb) || jsonb_build_object(
    'mode', 'hybrid_graph_context_pack',
    'writes', ARRAY['decisions', 'tasks', 'technical_context', 'operational_state'],
    'sensitive_actions_require_approval', true
  ),
  permissions = CASE
    WHEN permissions IS NULL OR permissions = '{}' THEN ARRAY['read_context', 'create_tasks', 'propose_actions', 'request_approval', 'coordinate_agents', 'write_memory']
    ELSE permissions
  END,
  provider_policy = COALESCE(provider_policy, 'required_for_sensitive_actions'),
  constitution_doc_path = COALESCE(constitution_doc_path, 'docs/DOMINUS_PRIME_CONSTITUTION.md'),
  system_core_doc_path = COALESCE(system_core_doc_path, 'docs/DOMINUS_PRIME_SYSTEM_CORE.md'),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'is_primary_orchestrator', true,
    'operating_model', 'private_quantumcore_mothership'
  )
WHERE id = '11111111-1111-4111-8111-111111111111';
