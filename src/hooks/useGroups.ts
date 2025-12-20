// Hook para gerenciar grupos de usuários
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { dateToLocalISO } from '@/lib/dateUtils';
import { toast } from 'sonner';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupWithMembers extends Group {
  user_count?: number;
  module_count?: number;
}

export const useGroups = () => {
  const queryClient = useQueryClient();

  // Grupos do usuário atual (usado em telas de edição de usuário)
  const useUserGroupsQuery = (userId: string | null) => {
    return useQuery({
      queryKey: ['user-groups', userId],
      queryFn: async () => {
        if (!userId) return [] as string[];

        const { data, error } = await supabase
          .from('user_groups')
          .select('group_id')
          .eq('user_id', userId);

        if (error) throw error;
        return (data || []).map((row) => row.group_id as string);
      },
      enabled: !!userId,
    });
  };

  // Buscar todos os grupos
  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Group[];
    },
  });

  // Criar grupo
  const createGroup = useMutation({
    mutationFn: async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('groups')
        .insert(groupData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar grupo', {
        description: error.message,
      });
    },
  });

  // Atualizar grupo
  const updateGroup = useMutation({
    mutationFn: async ({ id, ...groupData }: Partial<Group> & { id: string }) => {
      const { data, error } = await supabase
        .from('groups')
        .update({ ...groupData, updated_at: dateToLocalISO(new Date()) })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Grupo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar grupo', {
        description: error.message,
      });
    },
  });

  // Deletar grupo
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Grupo excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir grupo', {
        description: error.message,
      });
    },
  });

  // Adicionar usuário ao grupo
  const addUserToGroup = useMutation({
    mutationFn: async ({ userId, groupId }: { userId: string; groupId: string }) => {
      const { error } = await supabase
        .from('user_groups')
        .insert({ user_id: userId, group_id: groupId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Usuário adicionado ao grupo!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar usuário', {
        description: error.message,
      });
    },
  });

  // Remover usuário do grupo
  const removeUserFromGroup = useMutation({
    mutationFn: async ({ userId, groupId }: { userId: string; groupId: string }) => {
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules'] });
      toast.success('Usuário removido do grupo!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover usuário', {
        description: error.message,
      });
    },
  });

  return {
    groups: groups || [],
    isLoading,
    error,
    createGroup: createGroup.mutate,
    updateGroup: updateGroup.mutate,
    deleteGroup: deleteGroup.mutate,
    addUserToGroup: addUserToGroup.mutate,
    removeUserFromGroup: removeUserFromGroup.mutate,
    useUserGroupsQuery,
  };
};
