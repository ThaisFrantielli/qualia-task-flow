-- Script 7: Criar tabela de anexos de tickets

CREATE TABLE IF NOT EXISTS ticket_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    url_arquivo TEXT NOT NULL,
    tipo_arquivo VARCHAR(50), -- image, document, video, other
    tamanho_bytes BIGINT,
    uploaded_by UUID REFERENCES profiles(id),
    descricao TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_ticket_anexos_ticket ON ticket_anexos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_anexos_tipo ON ticket_anexos(tipo_arquivo);
CREATE INDEX IF NOT EXISTS idx_ticket_anexos_uploaded_by ON ticket_anexos(uploaded_by);

-- Comentários
COMMENT ON TABLE ticket_anexos IS 'Anexos (arquivos, imagens, documentos) vinculados a tickets';
COMMENT ON COLUMN ticket_anexos.tipo_arquivo IS 'Tipo do arquivo: image, document, video, other';
COMMENT ON COLUMN ticket_anexos.url_arquivo IS 'URL do arquivo no storage (Supabase Storage)';
