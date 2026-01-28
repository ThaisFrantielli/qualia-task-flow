import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  PropostaTemplate, 
  PropostaTemplateFAQ, 
  PropostaTemplateBeneficio,
  PropostaTemplateWithDetails,
  PropostaArquivoGerado
} from '@/types/proposta-template';
import { toast } from 'sonner';

// =========================================
// Fetch Templates
// =========================================
export function usePropostaTemplates() {
  return useQuery({
    queryKey: ['proposta-templates'],
    queryFn: async (): Promise<PropostaTemplate[]> => {
      const { data, error } = await supabase
        .from('proposta_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_padrao', { ascending: false })
        .order('nome');
      
      if (error) throw error;
      return data || [];
    }
  });
}

// =========================================
// Fetch Template com detalhes
// =========================================
export function usePropostaTemplateDetails(templateId: string | null) {
  return useQuery({
    queryKey: ['proposta-template', templateId],
    queryFn: async (): Promise<PropostaTemplateWithDetails | null> => {
      if (!templateId) return null;
      
      const [templateResult, beneficiosResult, faqsResult] = await Promise.all([
        supabase
          .from('proposta_templates')
          .select('*')
          .eq('id', templateId)
          .single(),
        supabase
          .from('proposta_template_beneficios')
          .select('*')
          .eq('template_id', templateId)
          .eq('is_active', true)
          .order('ordem'),
        supabase
          .from('proposta_template_faq')
          .select('*')
          .eq('template_id', templateId)
          .eq('is_active', true)
          .order('ordem')
      ]);
      
      if (templateResult.error) throw templateResult.error;
      
      return {
        ...templateResult.data,
        beneficios: beneficiosResult.data || [],
        faqs: faqsResult.data || []
      };
    },
    enabled: !!templateId
  });
}

// =========================================
// Template padrão
// =========================================
export function useDefaultTemplate() {
  return useQuery({
    queryKey: ['proposta-template-default'],
    queryFn: async (): Promise<PropostaTemplateWithDetails | null> => {
      const { data: template, error } = await supabase
        .from('proposta_templates')
        .select('*')
        .eq('is_padrao', true)
        .eq('is_active', true)
        .single();
      
      if (error || !template) return null;
      
      const [beneficiosResult, faqsResult] = await Promise.all([
        supabase
          .from('proposta_template_beneficios')
          .select('*')
          .eq('template_id', template.id)
          .eq('is_active', true)
          .order('ordem'),
        supabase
          .from('proposta_template_faq')
          .select('*')
          .eq('template_id', template.id)
          .eq('is_active', true)
          .order('ordem')
      ]);
      
      return {
        ...template,
        beneficios: beneficiosResult.data || [],
        faqs: faqsResult.data || []
      };
    }
  });
}

// =========================================
// Mutations
// =========================================
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Partial<PropostaTemplate>) => {
      const { data, error } = await supabase
        .from('proposta_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposta-templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar template: ' + error.message);
    }
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<PropostaTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('proposta_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposta-templates'] });
      queryClient.invalidateQueries({ queryKey: ['proposta-template', data.id] });
      toast.success('Template atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar template: ' + error.message);
    }
  });
}

// =========================================
// Benefícios
// =========================================
export function useUpdateBeneficio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...beneficio }: Partial<PropostaTemplateBeneficio> & { id: string }) => {
      const { data, error } = await supabase
        .from('proposta_template_beneficios')
        .update(beneficio)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposta-template', data.template_id] });
    }
  });
}

export function useCreateBeneficio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (beneficio: Partial<PropostaTemplateBeneficio>) => {
      const { data, error } = await supabase
        .from('proposta_template_beneficios')
        .insert(beneficio)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposta-template', data.template_id] });
    }
  });
}

// =========================================
// FAQs
// =========================================
export function useUpdateFAQ() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...faq }: Partial<PropostaTemplateFAQ> & { id: string }) => {
      const { data, error } = await supabase
        .from('proposta_template_faq')
        .update(faq)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposta-template', data.template_id] });
    }
  });
}

export function useCreateFAQ() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (faq: Partial<PropostaTemplateFAQ>) => {
      const { data, error } = await supabase
        .from('proposta_template_faq')
        .insert(faq)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposta-template', data.template_id] });
    }
  });
}

// =========================================
// Arquivos Gerados
// =========================================
export function usePropostaArquivos(propostaId: string | null) {
  return useQuery({
    queryKey: ['proposta-arquivos', propostaId],
    queryFn: async (): Promise<PropostaArquivoGerado[]> => {
      if (!propostaId) return [];
      
      const { data, error } = await supabase
        .from('proposta_arquivos_gerados')
        .select('*')
        .eq('proposta_id', propostaId)
        .order('versao', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!propostaId
  });
}

export function useSavePropostaArquivo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (arquivo: Partial<PropostaArquivoGerado>) => {
      const { data, error } = await supabase
        .from('proposta_arquivos_gerados')
        .insert(arquivo)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposta-arquivos', data.proposta_id] });
      toast.success('Proposta salva com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar proposta: ' + error.message);
    }
  });
}

// =========================================
// Upload de arquivos
// =========================================
export async function uploadPropostaPDF(
  file: Blob,
  fileName: string,
  folder: string = 'gerados'
): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const path = `${folder}/${year}/${month}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('propostas-pdf')
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('propostas-pdf')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

export async function uploadMinuta(
  file: File,
  tipo: 'padrao' | 'especifica' = 'especifica'
): Promise<{ url: string; nome: string }> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `minutas/${tipo}/${timestamp}_${safeName}`;
  
  const { data, error } = await supabase.storage
    .from('propostas-pdf')
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('propostas-pdf')
    .getPublicUrl(data.path);
  
  return {
    url: urlData.publicUrl,
    nome: file.name
  };
}
