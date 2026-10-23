-- Additive migration: legacy services retain a NULL workflow until staff assign one.
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'selected'
    CHECK (audience IN ('selected', 'all'));
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS workflow_template_id TEXT
    CHECK (workflow_template_id IN ('tep', 'mtpe', 'localization', 'documentary', 'subtitling'));
CREATE TABLE IF NOT EXISTS service_workflows (
    service_id TEXT PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL CHECK (template_id IN ('tep', 'mtpe', 'localization', 'documentary', 'subtitling')),
    definition JSONB NOT NULL,
    stages JSONB NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    assigned_by TEXT NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
