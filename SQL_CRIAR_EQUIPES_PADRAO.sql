-- ============================================
-- 🏢 CRIAR EQUIPES PADRÃO (OPCIONAL)
-- ============================================
-- Execute este SQL para criar equipes iniciais
-- Você pode modificar ou adicionar mais equipes conforme necessário
-- ============================================

-- Verificar se a tabela teams existe e está vazia
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
    -- Inserir equipes padrão apenas se a tabela estiver vazia
    IF NOT EXISTS (SELECT 1 FROM teams LIMIT 1) THEN
      INSERT INTO public.teams (name, description, owner_id, created_at)
      VALUES 
        (
          'Geral', 
          'Equipe padrão para projetos gerais', 
          (SELECT id FROM profiles WHERE "nivelAcesso" = 'Admin' LIMIT 1),
          NOW()
        ),
        (
          'Desenvolvimento', 
          'Equipe de desenvolvimento e tecnologia', 
          (SELECT id FROM profiles WHERE "nivelAcesso" = 'Admin' LIMIT 1),
          NOW()
        ),
        (
          'Marketing', 
          'Equipe de marketing e comunicação', 
          (SELECT id FROM profiles WHERE "nivelAcesso" = 'Admin' LIMIT 1),
          NOW()
        ),
        (
          'Vendas', 
          'Equipe comercial e vendas', 
          (SELECT id FROM profiles WHERE "nivelAcesso" = 'Admin' LIMIT 1),
          NOW()
        ),
        (
          'Suporte', 
          'Equipe de suporte e atendimento ao cliente', 
          (SELECT id FROM profiles WHERE "nivelAcesso" = 'Admin' LIMIT 1),
          NOW()
        );
      
      RAISE NOTICE 'Equipes padrão criadas com sucesso!';
    ELSE
      RAISE NOTICE 'A tabela teams já possui dados. Nenhuma equipe foi adicionada.';
    END IF;
  ELSE
    RAISE NOTICE 'Tabela teams não encontrada. Certifique-se de que a tabela existe.';
  END IF;
END $$;

-- Ver equipes criadas
SELECT id, name, description, created_at FROM teams ORDER BY name;

-- ============================================
-- NOTA: Se você não quiser equipes padrão,
-- o formulário agora funciona SEM selecionar equipe!
-- ============================================
