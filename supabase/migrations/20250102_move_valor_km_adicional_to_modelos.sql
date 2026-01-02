-- Migration: Move valor_km_adicional from km_packages to modelos_veiculos
-- Created: 2025-01-02
-- Description: Add valor_km_adicional column to modelos_veiculos table and remove from km_packages

-- =========================================
-- 1. Add valor_km_adicional to modelos_veiculos
-- =========================================
ALTER TABLE public.modelos_veiculos 
ADD COLUMN IF NOT EXISTS valor_km_adicional DECIMAL(10,2) DEFAULT 0.70 
COMMENT ON COLUMN public.modelos_veiculos.valor_km_adicional IS 'Valor por KM excedente (R$/km) - específico para cada modelo';

-- =========================================
-- 2. Remove valor_km_adicional from km_packages
-- =========================================
ALTER TABLE public.km_packages 
DROP COLUMN IF EXISTS valor_km_adicional;

-- =========================================
-- 3. Update existing models with default valor_km_adicional
-- =========================================
UPDATE public.modelos_veiculos 
SET valor_km_adicional = 0.70 
WHERE valor_km_adicional IS NULL OR valor_km_adicional = 0;

-- =========================================
-- 4. Comments for clarity
-- =========================================
COMMENT ON TABLE public.modelos_veiculos IS 'Catálogo de modelos de veículos com precificação e valor KM adicional';
COMMENT ON TABLE public.km_packages IS 'Pacotes de quilometragem mensal (sem valor KM adicional)';
