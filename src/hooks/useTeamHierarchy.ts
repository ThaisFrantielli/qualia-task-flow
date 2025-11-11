// src/hooks/useTeamHierarchy.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Tipos
export interface TeamMember {
  id: string;
  user_id: string;
  supervisor_id: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    nivelAcesso: string | null;
    funcao: string | null;
  };
}

export interface TeamHierarchyNode {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  nivelAcesso: string | null;
  funcao: string | null;
  subordinates: string[];
}

// Hook para obter membros da equipe (subordinados)
export const useTeamMembers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Buscar hierarquia
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .from('user_hierarchy')
        .select('*')
        .eq('supervisor_id', user.id);
      
      if (hierarchyError) throw hierarchyError;
      if (!hierarchyData || hierarchyData.length === 0) return [];
      
      // Buscar perfis dos usuários
      const userIds = hierarchyData.map(h => h.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, nivelAcesso, funcao')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combinar dados
      return hierarchyData.map(hierarchy => ({
        id: hierarchy.id,
        user_id: hierarchy.user_id,
        supervisor_id: hierarchy.supervisor_id,
        created_at: hierarchy.created_at,
        updated_at: hierarchy.updated_at,
        user: profilesData?.find(p => p.id === hierarchy.user_id) || null
      })) as TeamMember[];
    },
    enabled: !!user?.id,
  });
};

// Hook para obter toda a hierarquia da equipe (recursivo)
export const useTeamHierarchyFull = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['team-hierarchy-full', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .rpc('get_user_team_hierarchy', { user_uuid: user.id });
      
      if (error) throw error;
      
      // Buscar detalhes dos membros
      if (!data || data.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, nivelAcesso, funcao')
        .in('id', data.map((item: any) => item.team_member_id));
      
      if (profilesError) throw profilesError;
      return profiles;
    },
    enabled: !!user?.id,
  });
};

// Hook para obter contagem da equipe
export const useTeamCount = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['team-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase
        .rpc('get_team_count', { user_uuid: user.id });
      
      if (error) throw error;
      return data as number;
    },
    enabled: !!user?.id,
  });
};

// Hook para obter supervisor direto
export const useDirectSupervisor = (userId?: string) => {
  return useQuery({
    queryKey: ['direct-supervisor', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .rpc('get_direct_supervisor', { user_uuid: userId });
      
      if (error) throw error;
      
      if (!data) return null;
      
      // Buscar detalhes do supervisor
      const { data: supervisor, error: supervisorError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, nivelAcesso, funcao')
        .eq('id', data)
        .single();
      
      if (supervisorError) throw supervisorError;
      return supervisor;
    },
    enabled: !!userId,
  });
};

// Hook para adicionar membro à equipe
export const useAddTeamMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('user_hierarchy')
        .insert({
          user_id: userId,
          supervisor_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy-full'] });
      queryClient.invalidateQueries({ queryKey: ['team-count'] });
      toast.success('Membro adicionado à equipe com sucesso!');
    },
    onError: (error: any) => {
      if (error.message.includes('duplicate')) {
        toast.error('Este usuário já está na sua equipe');
      } else if (error.message.includes('ciclo')) {
        toast.error('Não é possível adicionar: criaria um ciclo na hierarquia');
      } else {
        toast.error('Erro ao adicionar membro à equipe', {
          description: error.message,
        });
      }
    },
  });
};

// Hook para remover membro da equipe
export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (hierarchyId: string) => {
      const { error } = await supabase
        .from('user_hierarchy')
        .delete()
        .eq('id', hierarchyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy-full'] });
      queryClient.invalidateQueries({ queryKey: ['team-count'] });
      toast.success('Membro removido da equipe com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover membro da equipe', {
        description: error.message,
      });
    },
  });
};

// Hook para atualizar supervisor de um membro
export const useUpdateTeamMemberSupervisor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ hierarchyId, newSupervisorId }: { hierarchyId: string; newSupervisorId: string }) => {
      const { data, error } = await supabase
        .from('user_hierarchy')
        .update({ supervisor_id: newSupervisorId })
        .eq('id', hierarchyId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy-full'] });
      toast.success('Supervisor atualizado com sucesso!');
    },
    onError: (error: any) => {
      if (error.message.includes('ciclo')) {
        toast.error('Não é possível atualizar: criaria um ciclo na hierarquia');
      } else {
        toast.error('Erro ao atualizar supervisor', {
          description: error.message,
        });
      }
    },
  });
};
