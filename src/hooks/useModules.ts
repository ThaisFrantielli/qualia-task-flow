// Hook para gerenciar módulos do sistema
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Module {
  id: string;
  name: string;
  key: string;
  description: string | null;
  icon: string;
  route: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useModules = () => {
  const queryClient = useQueryClient();

  // Buscar todos os módulos
  const { data: modules, isLoading, error } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Module[];
    },
  });

  // Criar módulo
  // Novo: criar módulo e vincular páginas
  const createModule = useMutation({
    mutationFn: async (moduleData: Omit<Module, 'id' | 'created_at' | 'updated_at'> & { pages?: string[] }) => {
      // Cria o módulo
      const { data: module, error } = await supabase
        .from('modules')
        .insert(moduleData)
        .select()
        .single();
      if (error) throw error;

      // Se houver páginas selecionadas, vincula na tabela module_pages
      if (moduleData.pages && module && module.id) {
        const pageRows = moduleData.pages.map(page_key => ({ module_id: module.id, page_key }));
        const { error: pageError } = await supabase
          .from('module_pages')
          .insert(pageRows);
        if (pageError) throw pageError;
      }
      return module;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Módulo criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar módulo', {
        description: error.message,
      });
    },
  });

  // Atualizar módulo
  const updateModule = useMutation({
    mutationFn: async ({ id, ...moduleData }: Partial<Module> & { id: string }) => {
      const { data, error } = await supabase
        .from('modules')
        .update({ ...moduleData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Módulo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar módulo', {
        description: error.message,
      });
    },
  });

  // Deletar módulo
  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Módulo excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir módulo', {
        description: error.message,
      });
    },
  });

  // Toggle ativo/inativo
  const toggleModuleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('modules')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Status do módulo atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status', {
        description: error.message,
      });
    },
  });

  return {
    modules: modules || [],
    isLoading,
    error,
    createModule: createModule.mutate,
    updateModule: updateModule.mutate,
    deleteModule: deleteModule.mutate,
    toggleModuleActive: toggleModuleActive.mutate,
  };
};
