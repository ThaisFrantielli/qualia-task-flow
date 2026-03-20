-- Tabela para vincular páginas aos módulos
CREATE TABLE IF NOT EXISTS module_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, page_key)
);
-- Seed: vincular páginas aos módulos padrão
INSERT INTO module_pages (module_id, page_key)
SELECT m.id, 'dashboard' FROM modules m WHERE m.key = 'dashboard' ON CONFLICT DO NOTHING;
INSERT INTO module_pages (module_id, page_key)
SELECT m.id, 'tasks' FROM modules m WHERE m.key = 'tasks' ON CONFLICT DO NOTHING;
INSERT INTO module_pages (module_id, page_key)
SELECT m.id, 'crm' FROM modules m WHERE m.key = 'crm' ON CONFLICT DO NOTHING;
INSERT INTO module_pages (module_id, page_key)
SELECT m.id, 'team' FROM modules m WHERE m.key = 'team' ON CONFLICT DO NOTHING;
INSERT INTO module_pages (module_id, page_key)
SELECT m.id, 'settings' FROM modules m WHERE m.key = 'settings' ON CONFLICT DO NOTHING;
COMMENT ON TABLE module_pages IS 'Vincula páginas individuais aos módulos do sistema';
COMMENT ON COLUMN module_pages.page_key IS 'Chave única da página (ex: dashboard, tasks, crm)';
COMMENT ON COLUMN module_pages.module_id IS 'ID do módulo ao qual a página pertence';
