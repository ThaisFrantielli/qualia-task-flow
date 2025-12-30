-- Migration: KM Packages and Residual Value Fields
-- Created: 2025-12-30
-- Description: Add km_packages table and residual value fields to propostas

-- =========================================
-- 1. Create km_packages table
-- =========================================
CREATE TABLE IF NOT EXISTS km_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  km_mensal INTEGER NOT NULL,
  is_ilimitado BOOLEAN DEFAULT FALSE,
  valor_km_adicional DECIMAL(10,2) NOT NULL DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for active packages ordering
CREATE INDEX idx_km_packages_ativo_ordem ON km_packages(ativo, ordem);

-- Add RLS policies
ALTER TABLE km_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "km_packages_select_policy" ON km_packages
  FOR SELECT USING (ativo = TRUE OR auth.role() = 'authenticated');

CREATE POLICY "km_packages_insert_policy" ON km_packages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "km_packages_update_policy" ON km_packages
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "km_packages_delete_policy" ON km_packages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Insert default packages
INSERT INTO km_packages (nome, descricao, km_mensal, is_ilimitado, valor_km_adicional, ordem) VALUES
  ('3.000 KM/mês', 'Pacote econômico para uso urbano', 3000, FALSE, 0.80, 1),
  ('5.000 KM/mês', 'Pacote padrão para uso misto', 5000, FALSE, 0.70, 2),
  ('8.000 KM/mês', 'Pacote para uso intensivo', 8000, FALSE, 0.60, 3),
  ('10.000 KM/mês', 'Pacote para uso profissional', 10000, FALSE, 0.50, 4),
  ('Ilimitado', 'Quilometragem livre sem restrições', 0, TRUE, 0, 5)
ON CONFLICT (nome) DO NOTHING;

-- =========================================
-- 2. Add km_package_id to proposta_veiculos
-- =========================================
ALTER TABLE proposta_veiculos 
  ADD COLUMN IF NOT EXISTS km_package_id UUID REFERENCES km_packages(id) ON DELETE SET NULL;

-- Add index for FK
CREATE INDEX IF NOT EXISTS idx_proposta_veiculos_km_package_id ON proposta_veiculos(km_package_id);

-- =========================================
-- 3. Add residual value fields to propostas
-- =========================================
ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS valor_residual_percentual DECIMAL(5,4) DEFAULT 0.30,
  ADD COLUMN IF NOT EXISTS fator_depreciacao_mensal DECIMAL(5,4) DEFAULT 0.0083;

-- Add comments
COMMENT ON COLUMN propostas.valor_residual_percentual IS 'Percentual do valor residual ao fim do contrato (ex: 0.30 = 30%)';
COMMENT ON COLUMN propostas.fator_depreciacao_mensal IS 'Fator de depreciação mensal customizado (ex: 0.0083 = ~10% ao ano)';

-- =========================================
-- 4. Add fuel policy to propostas
-- =========================================
ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS fuel_policy TEXT DEFAULT 'full_to_full' CHECK (fuel_policy IN ('full_to_full', 'prepaid', 'reimbursement', 'included'));

COMMENT ON COLUMN propostas.fuel_policy IS 'Política de combustível: full_to_full (devolução com tanque cheio), prepaid (pré-pago), reimbursement (reembolso), included (incluído no aluguel)';

-- =========================================
-- 5. Update trigger for km_packages
-- =========================================
CREATE OR REPLACE FUNCTION update_km_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER km_packages_updated_at_trigger
  BEFORE UPDATE ON km_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_km_packages_updated_at();

-- =========================================
-- 6. Add seasonal factor to propostas
-- =========================================
ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS seasonal_factor DECIMAL(5,4) DEFAULT 1.0000;

COMMENT ON COLUMN propostas.seasonal_factor IS 'Fator de sazonalidade para ajuste de preço (1.0 = normal, 1.2 = alta temporada +20%, 0.9 = baixa temporada -10%)';
