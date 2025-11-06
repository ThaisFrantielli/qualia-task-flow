// Hook para gerenciar permissões de módulos
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Buscar módulos de um grupo
export const useGroupModules = (groupId: string | null) => {
  return useQuery({
    queryKey: ['group-modules', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_modules')
        .select('module_id')
        .eq('group_id', groupId);
      
      if (error) throw error;
      return data.map(item => item.module_id);
    },
    enabled: !!groupId,
  });
};

// Buscar módulos de um usuário (permissões individuais)
export const useUserModulesPermissions = (userId: string | null) => {
  return useQuery({
    queryKey: ['user-modules-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_modules')
        .select('module_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data.map(item => item.module_id);
    },
    enabled: !!userId,
  });
};

// Hook para gerenciar permissões
export const useModulePermissions = () => {
  const queryClient = useQueryClient();

  // Atribuir módulo a grupo
  const assignModuleToGroup = useMutation({
    mutationFn: async ({ groupId, moduleId }: { groupId: string; moduleId: string }) => {
      const { error } = await supabase
        .from('group_modules')
        .insert({ group_id: groupId, module_id: moduleId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-modules'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Permissão concedida ao grupo!');
    },
    onError: (error: any) => {
      toast.error('Erro ao conceder permissão', {
        description: error.message,
      });
    },
  });

  // Remover módulo de grupo
  const removeModuleFromGroup = useMutation({
    mutationFn: async ({ groupId, moduleId }: { groupId: string; moduleId: string }) => {
      const { error } = await supabase
        .from('group_modules')
        .delete()
        .eq('group_id', groupId)
        .eq('module_id', moduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-modules'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Permissão removida do grupo!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover permissão', {
        description: error.message,
      });
    },
  });

  // Atribuir módulo a usuário
  const assignModuleToUser = useMutation({
    mutationFn: async ({ userId, moduleId }: { userId: string; moduleId: string }) => {
      const { error } = await supabase
        .from('user_modules')
        .insert({ user_id: userId, module_id: moduleId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-modules-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Permissão individual concedida!');
    },
    onError: (error: any) => {
      toast.error('Erro ao conceder permissão', {
        description: error.message,
      });
    },
  });

  // Remover módulo de usuário
  const removeModuleFromUser = useMutation({
    mutationFn: async ({ userId, moduleId }: { userId: string; moduleId: string }) => {
      const { error } = await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', userId)
        .eq('module_id', moduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-modules-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Permissão individual removida!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover permissão', {
        description: error.message,
      });
    },
  });

  // Atribuir múltiplos módulos a um grupo
  const assignMultipleModulesToGroup = useMutation({
    mutationFn: async ({ groupId, moduleIds }: { groupId: string; moduleIds: string[] }) => {
      // Primeiro remove todos os módulos existentes
      await supabase
        .from('group_modules')
        .delete()
        .eq('group_id', groupId);

      // Depois insere os novos
      if (moduleIds.length > 0) {
        const { error } = await supabase
          .from('group_modules')
          .insert(moduleIds.map(moduleId => ({ group_id: groupId, module_id: moduleId })));
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-modules'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Permissões do grupo atualizadas!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar permissões', {
        description: error.message,
      });
    },
  });

  return {
    assignModuleToGroup: assignModuleToGroup.mutate,
    removeModuleFromGroup: removeModuleFromGroup.mutate,
    assignModuleToUser: assignModuleToUser.mutate,
    removeModuleFromUser: removeModuleFromUser.mutate,
    assignMultipleModulesToGroup: assignMultipleModulesToGroup.mutate,
  };
};
