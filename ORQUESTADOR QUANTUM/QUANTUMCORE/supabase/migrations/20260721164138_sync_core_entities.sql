-- 1. Create ideas table
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    macro_division TEXT DEFAULT 'General',
    type TEXT DEFAULT 'MVP',
    priority TEXT DEFAULT 'parking lot',
    status TEXT DEFAULT 'inbox',
    dependencies TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo temporalmente" ON ideas FOR ALL USING (true);

-- 2. Modify projects
ALTER TABLE projects
ADD COLUMN macro_division TEXT DEFAULT 'General',
ADD COLUMN status TEXT DEFAULT 'planned',
ADD COLUMN repo TEXT,
ADD COLUMN ceo_agent_id UUID REFERENCES agents(id),
ADD COLUMN goal TEXT,
ADD COLUMN next_action TEXT,
ADD COLUMN risks TEXT,
ADD COLUMN last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Modify tasks
ALTER TABLE tasks
ADD COLUMN deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN acceptance_criteria TEXT,
ADD COLUMN notes TEXT,
ALTER COLUMN priority TYPE TEXT USING (
  CASE
    WHEN priority = 0 THEN 'low'
    WHEN priority = 1 THEN 'medium'
    WHEN priority = 2 THEN 'high'
    WHEN priority = 3 THEN 'critical'
    ELSE 'low'
  END
);
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'low';

-- 4. Modify memories
ALTER TABLE memories
ADD COLUMN title TEXT,
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN type TEXT DEFAULT 'Contexto',
ALTER COLUMN importance TYPE TEXT USING (
  CASE
    WHEN importance = 0 THEN 'baja'
    WHEN importance = 1 THEN 'media'
    WHEN importance = 2 THEN 'alta'
    WHEN importance = 3 THEN 'crítica'
    ELSE 'baja'
  END
);
ALTER TABLE memories ALTER COLUMN importance SET DEFAULT 'baja';
