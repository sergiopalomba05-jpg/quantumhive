ALTER TABLE agents
ADD COLUMN macro_division TEXT DEFAULT 'General',
ADD COLUMN status TEXT DEFAULT 'active';
