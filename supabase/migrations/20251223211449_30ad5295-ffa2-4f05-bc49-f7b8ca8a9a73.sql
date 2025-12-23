-- =========================================
-- MÓDULO COMERCIAL: Modelos, Propostas e Precificação
-- =========================================

-- 1. Tabela de Montadoras (catálogo)
CREATE TABLE IF NOT EXISTS public.montadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  pais_origem TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Modelos de Veículos
CREATE TABLE IF NOT EXISTS public.modelos_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  montadora TEXT NOT NULL,
  categoria TEXT,
  
  -- Ano
  ano_modelo INTEGER NOT NULL,
  ano_fabricacao INTEGER,
  
  -- Valores
  preco_publico DECIMAL(12,2) NOT NULL,
  percentual_desconto DECIMAL(5,4) DEFAULT 0,
  valor_final DECIMAL(12,2),
  
  -- Especificações técnicas
  motor TEXT,
  potencia TEXT,
  transmissao TEXT,
  combustivel TEXT,
  consumo_urbano DECIMAL(4,1),
  consumo_rodoviario DECIMAL(4,1),
  
  -- Metadados
  ativo BOOLEAN DEFAULT TRUE,
  imagem_url TEXT,
  observacoes TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Cores por Modelo
CREATE TABLE IF NOT EXISTS public.modelo_cores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID REFERENCES public.modelos_veiculos(id) ON DELETE CASCADE,
  
  nome_cor TEXT NOT NULL,
  codigo_cor TEXT,
  tipo_cor TEXT DEFAULT 'sólida',
  valor_adicional DECIMAL(10,2) DEFAULT 0,
  
  is_padrao BOOLEAN DEFAULT FALSE,
  hex_color TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Itens Adicionais por Modelo
CREATE TABLE IF NOT EXISTS public.modelo_itens_adicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID REFERENCES public.modelos_veiculos(id) ON DELETE CASCADE,
  
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  
  obrigatorio BOOLEAN DEFAULT FALSE,
  incluso_padrao BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Parâmetros de Precificação
CREATE TABLE IF NOT EXISTS public.pricing_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Taxas financeiras
  taxa_financiamento DECIMAL(5,4) DEFAULT 0.0117,
  taxa_sinistro DECIMAL(5,4) DEFAULT 0.01,
  taxa_impostos DECIMAL(5,4) DEFAULT 0.06,
  taxa_custo_administrativo DECIMAL(5,4) DEFAULT 0.08,
  taxa_comissao_comercial DECIMAL(5,4) DEFAULT 0.005,
  taxa_depreciacao_anual DECIMAL(5,4) DEFAULT 0.10,
  taxa_ipva_anual DECIMAL(5,4) DEFAULT 0.01,
  
  -- Custos operacionais
  custo_manutencao_por_km DECIMAL(10,2) DEFAULT 0.12,
  preco_combustivel_litro DECIMAL(10,2) DEFAULT 6.01,
  consumo_medio_km_litro DECIMAL(5,2) DEFAULT 12.3,
  km_mensal_padrao INTEGER DEFAULT 3000,
  custo_lavagem_mensal DECIMAL(10,2) DEFAULT 200.00,
  custo_telemetria_mensal DECIMAL(10,2) DEFAULT 47.50,
  
  -- Implantação
  custo_emplacamento DECIMAL(10,2) DEFAULT 160.00,
  custo_licenciamento DECIMAL(10,2) DEFAULT 80.00,
  
  -- Multas rescisão
  multa_0_12_meses DECIMAL(5,4) DEFAULT 0.40,
  multa_13_24_meses DECIMAL(5,4) DEFAULT 0.25,
  multa_25_36_meses DECIMAL(5,4) DEFAULT 0.20,
  multa_37_48_meses DECIMAL(5,4) DEFAULT 0.15,
  
  -- Proteções
  participacao_perda_parcial DECIMAL(5,4) DEFAULT 0.10,
  participacao_perda_total DECIMAL(5,4) DEFAULT 0.20,
  
  -- Metadados
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 6. Tabela de Propostas Comerciais
CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_proposta SERIAL,
  numero_contrato TEXT,
  
  -- Cliente
  cliente_id UUID REFERENCES public.clientes(id),
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  cliente_endereco TEXT,
  
  -- Responsável
  vendedor_id UUID REFERENCES auth.users(id),
  vendedor_nome TEXT,
  
  -- Oportunidade vinculada (opcional)
  oportunidade_id BIGINT REFERENCES public.oportunidades(id),
  
  -- Status e datas
  status TEXT DEFAULT 'rascunho',
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  data_envio TIMESTAMPTZ,
  data_validade TIMESTAMPTZ,
  data_aprovacao TIMESTAMPTZ,
  
  -- Condições gerais
  prazo_contrato_meses INTEGER DEFAULT 12,
  vencimento_mensalidade INTEGER DEFAULT 10,
  indice_reajuste TEXT DEFAULT 'IPCA',
  local_entrega TEXT,
  local_devolucao TEXT,
  
  -- Veículos substitutos
  veiculos_provisorios INTEGER DEFAULT 0,
  limite_substituicao_sinistro INTEGER DEFAULT 7,
  limite_substituicao_manutencao INTEGER DEFAULT 7,
  prazo_substituicao_sinistro_horas INTEGER DEFAULT 48,
  prazo_substituicao_manutencao_horas INTEGER DEFAULT 24,
  
  -- Proteções
  protecao_roubo BOOLEAN DEFAULT TRUE,
  protecao_furto BOOLEAN DEFAULT TRUE,
  protecao_colisao BOOLEAN DEFAULT TRUE,
  protecao_incendio BOOLEAN DEFAULT TRUE,
  limite_danos_materiais DECIMAL(12,2) DEFAULT 100000,
  limite_danos_morais DECIMAL(12,2) DEFAULT 100000,
  limite_danos_pessoais DECIMAL(12,2) DEFAULT 100000,
  limite_app_passageiro DECIMAL(12,2) DEFAULT 10000,
  
  -- Taxas adicionais
  taxa_administracao_multas DECIMAL(5,4) DEFAULT 0.10,
  taxa_reembolsaveis DECIMAL(5,4) DEFAULT 0.10,
  custo_remocao_forcada DECIMAL(10,2) DEFAULT 2000.00,
  custo_lavagem_simples DECIMAL(10,2) DEFAULT 50.00,
  custo_higienizacao DECIMAL(10,2) DEFAULT 300.00,
  
  -- Totais calculados
  valor_mensal_total DECIMAL(12,2) DEFAULT 0,
  valor_anual_total DECIMAL(12,2) DEFAULT 0,
  quantidade_veiculos INTEGER DEFAULT 0,
  
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Veículos da Proposta
CREATE TABLE IF NOT EXISTS public.proposta_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE CASCADE,
  
  -- Veículo
  modelo_id UUID REFERENCES public.modelos_veiculos(id),
  modelo_nome TEXT NOT NULL,
  montadora TEXT,
  ano_modelo INTEGER,
  placa TEXT,
  
  -- Cor selecionada
  cor_id UUID REFERENCES public.modelo_cores(id),
  cor_nome TEXT,
  cor_valor_adicional DECIMAL(10,2) DEFAULT 0,
  
  -- Aquisição
  valor_aquisicao DECIMAL(12,2) NOT NULL,
  valor_revenda_estimado DECIMAL(12,2),
  custo_acessorios DECIMAL(10,2) DEFAULT 0,
  custo_emplacamento DECIMAL(10,2) DEFAULT 160,
  custo_licenciamento DECIMAL(10,2) DEFAULT 80,
  
  -- Locação
  aluguel_unitario DECIMAL(12,2) NOT NULL,
  franquia_km INTEGER DEFAULT 3000,
  valor_km_excedente DECIMAL(10,2) DEFAULT 0.35,
  
  -- Custos operacionais calculados
  custo_manutencao_mensal DECIMAL(10,2),
  custo_combustivel_mensal DECIMAL(10,2),
  custo_ipva_mensal DECIMAL(10,2),
  custo_lavagem_mensal DECIMAL(10,2),
  custo_telemetria_mensal DECIMAL(10,2),
  
  -- Prazos
  prazo_entrega DATE,
  data_entrega_efetiva DATE,
  
  quantidade INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Itens Adicionais da Proposta (acessórios selecionados)
CREATE TABLE IF NOT EXISTS public.proposta_veiculo_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_veiculo_id UUID REFERENCES public.proposta_veiculos(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.modelo_itens_adicionais(id),
  
  nome TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela de Cenários da Proposta
CREATE TABLE IF NOT EXISTS public.proposta_cenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE CASCADE,
  
  -- Parâmetros do cenário
  prazo_meses INTEGER NOT NULL,
  modalidade TEXT NOT NULL,
  
  -- Valores calculados
  valor_mensal_por_veiculo DECIMAL(12,2),
  valor_mensal_total DECIMAL(12,2),
  valor_anual DECIMAL(12,2),
  valor_contrato_total DECIMAL(12,2),
  
  -- Análise financeira
  investimento_inicial DECIMAL(12,2),
  receita_bruta_contrato DECIMAL(12,2),
  custos_operacionais DECIMAL(12,2),
  custos_financeiros DECIMAL(12,2),
  margem_liquida DECIMAL(12,2),
  roi_anual DECIMAL(5,4),
  percentual_locacao_investimento DECIMAL(5,4),
  payback_meses INTEGER,
  
  -- Fluxo de caixa
  fluxo_caixa JSONB,
  
  is_selecionado BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela de Histórico/Timeline da Proposta
CREATE TABLE IF NOT EXISTS public.proposta_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE CASCADE,
  
  tipo_evento TEXT NOT NULL,
  descricao TEXT,
  detalhes JSONB,
  
  user_id UUID REFERENCES auth.users(id),
  user_nome TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- ÍNDICES
-- =========================================
CREATE INDEX IF NOT EXISTS idx_modelos_veiculos_montadora ON public.modelos_veiculos(montadora);
CREATE INDEX IF NOT EXISTS idx_modelos_veiculos_ativo ON public.modelos_veiculos(ativo);
CREATE INDEX IF NOT EXISTS idx_modelo_cores_modelo ON public.modelo_cores(modelo_id);
CREATE INDEX IF NOT EXISTS idx_modelo_itens_modelo ON public.modelo_itens_adicionais(modelo_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON public.propostas(status);
CREATE INDEX IF NOT EXISTS idx_propostas_cliente ON public.propostas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_propostas_vendedor ON public.propostas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_proposta_veiculos_proposta ON public.proposta_veiculos(proposta_id);
CREATE INDEX IF NOT EXISTS idx_proposta_cenarios_proposta ON public.proposta_cenarios(proposta_id);
CREATE INDEX IF NOT EXISTS idx_proposta_historico_proposta ON public.proposta_historico(proposta_id);

-- =========================================
-- RLS POLICIES
-- =========================================

-- Montadoras
ALTER TABLE public.montadoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view montadoras" ON public.montadoras FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage montadoras" ON public.montadoras FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

-- Modelos de Veículos
ALTER TABLE public.modelos_veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view modelos" ON public.modelos_veiculos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage modelos" ON public.modelos_veiculos FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

-- Cores de Modelos
ALTER TABLE public.modelo_cores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view cores" ON public.modelo_cores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage cores" ON public.modelo_cores FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

-- Itens Adicionais
ALTER TABLE public.modelo_itens_adicionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view itens" ON public.modelo_itens_adicionais FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage itens" ON public.modelo_itens_adicionais FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

-- Pricing Parameters
ALTER TABLE public.pricing_parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view pricing parameters" ON public.pricing_parameters FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage pricing parameters" ON public.pricing_parameters FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

-- Propostas
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view propostas" ON public.propostas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create propostas" ON public.propostas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own propostas" ON public.propostas FOR UPDATE USING (vendedor_id = auth.uid() OR is_user_admin());
CREATE POLICY "Admins can delete propostas" ON public.propostas FOR DELETE USING (is_user_admin());

-- Proposta Veículos
ALTER TABLE public.proposta_veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view proposta_veiculos" ON public.proposta_veiculos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage proposta_veiculos" ON public.proposta_veiculos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Proposta Veículo Itens
ALTER TABLE public.proposta_veiculo_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view proposta_veiculo_itens" ON public.proposta_veiculo_itens FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage proposta_veiculo_itens" ON public.proposta_veiculo_itens FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Proposta Cenários
ALTER TABLE public.proposta_cenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view proposta_cenarios" ON public.proposta_cenarios FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage proposta_cenarios" ON public.proposta_cenarios FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Proposta Histórico
ALTER TABLE public.proposta_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view proposta_historico" ON public.proposta_historico FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create proposta_historico" ON public.proposta_historico FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =========================================
-- TRIGGER para updated_at
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_modelos_veiculos_updated_at BEFORE UPDATE ON public.modelos_veiculos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_parameters_updated_at BEFORE UPDATE ON public.pricing_parameters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON public.propostas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- Inserir parâmetros padrão de precificação
-- =========================================
INSERT INTO public.pricing_parameters (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;