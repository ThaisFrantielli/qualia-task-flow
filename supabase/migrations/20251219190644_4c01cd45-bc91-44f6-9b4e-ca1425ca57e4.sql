
-- ============================================
-- ANALYTICS: Tabelas, RLS, Funções e Dados
-- ============================================

-- Tabela de páginas do Analytics
CREATE TABLE public.analytics_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  route text NOT NULL,
  hub_category text,
  icon text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabela de abas dentro de cada página
CREATE TABLE public.analytics_page_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES public.analytics_pages(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(page_id, key)
);

-- Permissões de grupo para páginas/abas
CREATE TABLE public.group_analytics_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  page_id uuid REFERENCES public.analytics_pages(id) ON DELETE CASCADE NOT NULL,
  tab_id uuid REFERENCES public.analytics_page_tabs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_group_analytics_perm_with_tab 
ON public.group_analytics_permissions(group_id, page_id, tab_id) 
WHERE tab_id IS NOT NULL;

CREATE UNIQUE INDEX idx_group_analytics_perm_without_tab 
ON public.group_analytics_permissions(group_id, page_id) 
WHERE tab_id IS NULL;

-- Permissões individuais de usuário
CREATE TABLE public.user_analytics_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_id uuid REFERENCES public.analytics_pages(id) ON DELETE CASCADE NOT NULL,
  tab_id uuid REFERENCES public.analytics_page_tabs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_analytics_perm_with_tab 
ON public.user_analytics_permissions(user_id, page_id, tab_id) 
WHERE tab_id IS NOT NULL;

CREATE UNIQUE INDEX idx_user_analytics_perm_without_tab 
ON public.user_analytics_permissions(user_id, page_id) 
WHERE tab_id IS NULL;

-- RLS
ALTER TABLE public.analytics_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_analytics_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view analytics pages" ON public.analytics_pages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage analytics pages" ON public.analytics_pages FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

CREATE POLICY "Authenticated can view analytics tabs" ON public.analytics_page_tabs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage analytics tabs" ON public.analytics_page_tabs FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

CREATE POLICY "Authenticated can view group analytics permissions" ON public.group_analytics_permissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage group analytics permissions" ON public.group_analytics_permissions FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

CREATE POLICY "Users can view own analytics permissions" ON public.user_analytics_permissions FOR SELECT USING (auth.uid() = user_id OR is_user_admin());
CREATE POLICY "Admins can manage user analytics permissions" ON public.user_analytics_permissions FOR ALL USING (is_user_admin()) WITH CHECK (is_user_admin());

-- Funções RPC
CREATE OR REPLACE FUNCTION public.has_analytics_page_access(_user_id uuid, _page_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _page_id uuid; _is_admin boolean;
BEGIN
  SELECT COALESCE((permissoes->>'is_admin')::boolean, false) INTO _is_admin FROM profiles WHERE id = _user_id;
  IF _is_admin THEN RETURN true; END IF;
  SELECT id INTO _page_id FROM analytics_pages WHERE key = _page_key AND is_active = true;
  IF _page_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM user_analytics_permissions WHERE user_id = _user_id AND page_id = _page_id) THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM group_analytics_permissions gap JOIN user_groups ug ON gap.group_id = ug.group_id WHERE ug.user_id = _user_id AND gap.page_id = _page_id) THEN RETURN true; END IF;
  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.has_analytics_tab_access(_user_id uuid, _page_key text, _tab_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _page_id uuid; _tab_id uuid; _is_admin boolean;
BEGIN
  SELECT COALESCE((permissoes->>'is_admin')::boolean, false) INTO _is_admin FROM profiles WHERE id = _user_id;
  IF _is_admin THEN RETURN true; END IF;
  SELECT id INTO _page_id FROM analytics_pages WHERE key = _page_key AND is_active = true;
  IF _page_id IS NULL THEN RETURN false; END IF;
  SELECT id INTO _tab_id FROM analytics_page_tabs WHERE page_id = _page_id AND key = _tab_key AND is_active = true;
  IF _tab_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM user_analytics_permissions WHERE user_id = _user_id AND page_id = _page_id AND (tab_id = _tab_id OR tab_id IS NULL)) THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM group_analytics_permissions gap JOIN user_groups ug ON gap.group_id = ug.group_id WHERE ug.user_id = _user_id AND gap.page_id = _page_id AND (gap.tab_id = _tab_id OR gap.tab_id IS NULL)) THEN RETURN true; END IF;
  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_analytics_pages(_user_id uuid)
RETURNS TABLE (id uuid, page_key text, page_name text, page_route text, hub_category text, icon text, display_order integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _is_admin boolean;
BEGIN
  SELECT COALESCE((permissoes->>'is_admin')::boolean, false) INTO _is_admin FROM profiles WHERE id = _user_id;
  IF _is_admin THEN
    RETURN QUERY SELECT ap.id, ap.key, ap.name, ap.route, ap.hub_category, ap.icon, ap.display_order FROM analytics_pages ap WHERE ap.is_active = true ORDER BY ap.display_order;
  ELSE
    RETURN QUERY SELECT DISTINCT ap.id, ap.key, ap.name, ap.route, ap.hub_category, ap.icon, ap.display_order FROM analytics_pages ap WHERE ap.is_active = true AND (EXISTS (SELECT 1 FROM user_analytics_permissions uap WHERE uap.user_id = _user_id AND uap.page_id = ap.id) OR EXISTS (SELECT 1 FROM group_analytics_permissions gap JOIN user_groups ug ON gap.group_id = ug.group_id WHERE ug.user_id = _user_id AND gap.page_id = ap.id)) ORDER BY ap.display_order;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_analytics_tabs(_user_id uuid, _page_key text)
RETURNS TABLE (id uuid, tab_key text, tab_name text, display_order integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _page_id uuid; _is_admin boolean;
BEGIN
  SELECT COALESCE((permissoes->>'is_admin')::boolean, false) INTO _is_admin FROM profiles WHERE id = _user_id;
  SELECT ap.id INTO _page_id FROM analytics_pages ap WHERE ap.key = _page_key AND ap.is_active = true;
  IF _page_id IS NULL THEN RETURN; END IF;
  IF _is_admin THEN
    RETURN QUERY SELECT apt.id, apt.key, apt.name, apt.display_order FROM analytics_page_tabs apt WHERE apt.page_id = _page_id AND apt.is_active = true ORDER BY apt.display_order;
  ELSE
    IF EXISTS (SELECT 1 FROM user_analytics_permissions uap WHERE uap.user_id = _user_id AND uap.page_id = _page_id AND uap.tab_id IS NULL) OR EXISTS (SELECT 1 FROM group_analytics_permissions gap JOIN user_groups ug ON gap.group_id = ug.group_id WHERE ug.user_id = _user_id AND gap.page_id = _page_id AND gap.tab_id IS NULL) THEN
      RETURN QUERY SELECT apt.id, apt.key, apt.name, apt.display_order FROM analytics_page_tabs apt WHERE apt.page_id = _page_id AND apt.is_active = true ORDER BY apt.display_order;
    ELSE
      RETURN QUERY SELECT DISTINCT apt.id, apt.key, apt.name, apt.display_order FROM analytics_page_tabs apt WHERE apt.page_id = _page_id AND apt.is_active = true AND (EXISTS (SELECT 1 FROM user_analytics_permissions uap WHERE uap.user_id = _user_id AND uap.tab_id = apt.id) OR EXISTS (SELECT 1 FROM group_analytics_permissions gap JOIN user_groups ug ON gap.group_id = ug.group_id WHERE ug.user_id = _user_id AND gap.tab_id = apt.id)) ORDER BY apt.display_order;
    END IF;
  END IF;
END; $$;

-- Dados iniciais
INSERT INTO public.analytics_pages (key, name, description, route, hub_category, icon, display_order) VALUES
('frota', 'Frota Ativa', 'Gestão de Frota, Disponibilidade e Valorização', '/analytics/frota', 'ativos', 'Car', 1),
('compras', 'Compras', 'Aquisição, Funding e Auditoria de Compras', '/analytics/compras', 'ativos', 'ShoppingCart', 2),
('vendas', 'Desmobilização', 'Vendas, Margem e Giro de Ativos', '/analytics/vendas', 'ativos', 'TrendingUp', 3),
('financeiro', 'Faturamento', 'Receita, Fluxo de Caixa e Auditoria', '/analytics/financeiro', 'financeiro', 'BarChart3', 4),
('contratos', 'Gestão de Contratos', 'Carteira, Vencimentos e Churn', '/analytics/contratos', 'financeiro', 'FileText', 5),
('resultado', 'DRE Gerencial', 'Resultado, Margem e Análise de Custos', '/analytics/resultado', 'financeiro', 'DollarSign', 6),
('manutencao', 'Manutenção', 'OS, CPK, Downtime e Oficinas', '/analytics/manutencao', 'operacional', 'Wrench', 7),
('multas', 'Multas', 'Infrações, Reembolsos e Infratores', '/analytics/multas', 'operacional', 'AlertTriangle', 8),
('sinistros', 'Sinistros', 'Culpabilidade, Tipos de Dano e Recuperação', '/analytics/sinistros', 'operacional', 'ShieldX', 9),
('auditoria', 'Auditoria de Dados', 'Inconsistências e Qualidade de Dados', '/analytics/auditoria', 'auditoria', 'AlertOctagon', 10),
('churn', 'Churn e Retenção', 'Análise de Perda de Clientes', '/analytics/churn', 'auditoria', 'Users', 11),
('comercial', 'Pipeline de Vendas', 'Propostas, Conversão e Vendedores', '/analytics/comercial', 'comercial', 'TrendingUp', 12),
('clientes', 'Dashboard de Clientes', 'Carteira, Rentabilidade e Curva ABC', '/analytics/clientes', 'clientes', 'Users', 13),
('executive', 'Executive Summary', 'Visão consolidada para diretoria', '/analytics/executive', 'executive', 'LayoutDashboard', 14),
('funding', 'Funding', 'Análise de Funding e Financiamento', '/analytics/funding', 'financeiro', 'Wallet', 15);

-- Abas do Contratos
INSERT INTO public.analytics_page_tabs (page_id, key, name, display_order) SELECT id, 'overview', 'Visão Geral', 1 FROM public.analytics_pages WHERE key = 'contratos';
INSERT INTO public.analytics_page_tabs (page_id, key, name, display_order) SELECT id, 'performance', 'Performance', 2 FROM public.analytics_pages WHERE key = 'contratos';
INSERT INTO public.analytics_page_tabs (page_id, key, name, display_order) SELECT id, 'carteira', 'Carteira', 3 FROM public.analytics_pages WHERE key = 'contratos';
INSERT INTO public.analytics_page_tabs (page_id, key, name, display_order) SELECT id, 'rentabilidade', 'Rentabilidade', 4 FROM public.analytics_pages WHERE key = 'contratos';

-- Abas do Financeiro
INSERT INTO public.analytics_page_tabs (page_id, key, name, display_order) SELECT id, 'receita', 'Receita', 1 FROM public.analytics_pages WHERE key = 'financeiro';
INSERT INTO public.analytics_page_tabs (page_id, key, name, display_order) SELECT id, 'fluxo', 'Fluxo de Caixa', 2 FROM public.analytics_pages WHERE key = 'financeiro';
INSERT INTO public.analytics_page_tabs (page_id, key, name, display_order) SELECT id, 'auditoria', 'Auditoria', 3 FROM public.analytics_pages WHERE key = 'financeiro';
