-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. IDENTIDAD Y CONTEXTO
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY, -- Mapped to auth.users if needed
    organization_id UUID REFERENCES organizations(id),
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    provider_policy TEXT DEFAULT 'balanced',
    preferred_model TEXT DEFAULT 'gemini-3.5-flash',
    system_instruction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agent_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_agent_id UUID REFERENCES agents(id),
    child_agent_id UUID REFERENCES agents(id),
    delegation_policy TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MEMORIA Y CONTEXTO
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    project_id UUID REFERENCES projects(id),
    agent_id UUID REFERENCES agents(id),
    scope TEXT NOT NULL, -- 'global', 'project', 'agent', 'conversation'
    content TEXT NOT NULL,
    embedding vector(768), -- Asumiendo 768 dim para embeddings generales
    metadata JSONB DEFAULT '{}'::jsonb,
    visibility TEXT DEFAULT 'private',
    importance INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE context_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id),
    name TEXT NOT NULL,
    contents JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id),
    task_id UUID, -- Se referenciará luego
    context JSONB,
    decision TEXT NOT NULL,
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    agent_id UUID REFERENCES agents(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CONVERSACIÓN
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    agent_id UUID REFERENCES agents(id),
    title TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id),
    agent_id UUID REFERENCES agents(id),
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. EJECUCIÓN Y ORQUESTACIÓN (EVENT BUS)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    creator_agent_id UUID REFERENCES agents(id),
    assignee_agent_id UUID REFERENCES agents(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foreign key recursiva para decisions
ALTER TABLE decisions ADD CONSTRAINT fk_task FOREIGN KEY (task_id) REFERENCES tasks(id);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id),
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, claimed, running, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id),
    worker_id TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL,
    result JSONB,
    error TEXT
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    project_id UUID REFERENCES projects(id),
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    actor_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id),
    requester_agent_id UUID REFERENCES agents(id),
    approver_user_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    request_details TEXT,
    response_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. HERRAMIENTAS Y NUBE
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    schema JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    schema JSONB,
    risk_level TEXT DEFAULT 'low',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE mcp_servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    capabilities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE provider_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    provider TEXT NOT NULL, -- 'vertex', 'azure', 'aws', 'gemini'
    config JSONB NOT NULL, -- Configuración en texto (debería cifrarse a nivel app)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE worker_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capabilities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE repo_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    provider TEXT DEFAULT 'github',
    repo_full_name TEXT NOT NULL,
    branch TEXT DEFAULT 'main',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AUDITORÍA
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    actor_id UUID,
    actor_type TEXT, -- 'user', 'agent', 'system'
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuración de Row Level Security (RLS)
-- Para MVP, habilitamos RLS pero dejamos una política abierta a autenticados
-- En el futuro se puede restringir por organization_id

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas por defecto (Lectura/Escritura abierta para desarrollo)
-- ESTO DEBE CAMBIARSE ANTES DE IR A PRODUCCIÓN REAL
CREATE POLICY "Permitir todo temporalmente" ON organizations FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON users FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON projects FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON agents FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON agent_bindings FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON memories FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON context_packs FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON decisions FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON artifacts FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON conversations FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON messages FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON tasks FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON jobs FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON executions FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON events FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON approvals FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON skills FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON tools FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON mcp_servers FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON provider_configs FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON worker_definitions FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON repo_connections FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON audit_logs FOR ALL USING (true);
