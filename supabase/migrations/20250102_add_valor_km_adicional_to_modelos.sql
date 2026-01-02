-- Migration: Add valor_km_adicional to modelos_veiculos
-- Created: 2025-01-02
-- Description: Move campo valor_km_adicional de km_packages para modelos_veiculos

-- =========================================
-- 1. Add valor_km_adicional field to modelos_veiculos
-- =========================================
ALTER TABLE modelos_veiculos 
  ADD COLUMN IF NOT EXISTS valor_km_adicional DECIMAL(10,2) DEFAULT 0.80;

-- Add comment
COMMENT ON COLUMN modelos_veiculos.valor_km_adicional IS 'Valor cobrado por KM excedente para este modelo (R$/km)';

-- =========================================
-- 2. Add unique index for codigo field
-- =========================================
-- Create unique index for codigo to prevent duplicate modelo IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_modelos_veiculos_codigo_unico 
  ON modelos_veiculos(codigo) 
  WHERE codigo IS NOT NULL;

-- Add index for active models
CREATE INDEX IF NOT EXISTS idx_modelos_veiculos_ativo 
  ON modelos_veiculos(ativo) 
  WHERE ativo = TRUE;

-- =========================================
-- 3. Update existing models with default valor_km_adicional
-- =========================================
-- Set default valor_km_adicional based on category
UPDATE modelos_veiculos 
SET valor_km_adicional = CASE
  WHEN categoria IN ('Hatch', 'Compacto') THEN 0.80
  WHEN categoria IN ('Sedan', 'SUV') THEN 0.70
  WHEN categoria IN ('Pickup', 'Van', 'Utilitário') THEN 0.60
  WHEN categoria = 'Executivo' THEN 0.50
  ELSE 0.75
END
WHERE valor_km_adicional IS NULL OR valor_km_adicional = 0;
