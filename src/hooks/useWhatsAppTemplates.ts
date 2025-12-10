import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'saudacao' | 'faq' | 'encerramento' | 'followup' | 'confirmacao' | 'outro';
  content: string;
  variables: Array<{
    name: string;
    description: string;
    example: string;
  }>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface TemplateVariable {
  name: string;
  value: string;
}

// Buscar templates
export function useWhatsAppTemplates(category?: string) {
  return useQuery({
    queryKey: ['whatsapp-templates', category],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
  });
}

// Criar template
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert({
          ...template,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar template: ' + error.message);
    },
  });
}

// Atualizar template
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WhatsAppTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

// Deletar template
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template removido!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

// Incrementar contador de uso
export async function incrementTemplateUsage(templateId: string) {
  const { error } = await supabase.rpc('increment_template_usage', {
    template_id: templateId
  });

  if (error) console.error('Error incrementing template usage:', error);
}

// Função utilitária para substituir variáveis
export function replaceTemplateVariables(
  content: string,
  variables: TemplateVariable[]
): string {
  let result = content;
  
  variables.forEach(({ name, value }) => {
    const regex = new RegExp(`{{\\s*${name}\\s*}}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

// Extrair variáveis do conteúdo
export function extractTemplateVariables(content: string): string[] {
  const regex = /{{\\s*([^}]+)\\s*}}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1].trim())) {
      variables.push(match[1].trim());
    }
  }

  return variables;
}
