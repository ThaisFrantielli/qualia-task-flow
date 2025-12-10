-- Função para incrementar contador de uso do template
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.whatsapp_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute para usuários autenticados
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated;
