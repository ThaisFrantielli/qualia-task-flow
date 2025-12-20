// src/hooks/useTeamHierarchy.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Interface para subordinados diretos com informação de equipe
export interface DirectReportWithTeam {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  nivel_acesso: string | null;
  has_subordinates: boolean;
  subordinates_count: number;
}

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
// Agora aceita supervisorId opcional, para poder selecionar o "gerente" base na UI
export const useTeamMembers = (supervisorId?: string | null) => {
  const { user } = useAuth();
  const effectiveSupervisorId = supervisorId || user?.id;
  
  return useQuery({
    queryKey: ['team-members', effectiveSupervisorId],
    queryFn: async () => {
      if (!effectiveSupervisorId) return [];
      
      // Buscar hierarquia
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .from('user_hierarchy')
        .select('*')
        .eq('supervisor_id', effectiveSupervisorId);

      if (hierarchyError) throw hierarchyError;
      if (!hierarchyData || hierarchyData.length === 0) return [];

      // Deduplicate user IDs (um usuário pode aparecer com múltiplos registros)
      const uniqueUserIds = Array.from(new Set(hierarchyData.map((h: any) => h.user_id)));

      // Buscar perfis dos usuários
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, nivelAcesso, funcao')
        .in('id', uniqueUserIds);

      if (profilesError) throw profilesError;

      // Mapear por user_id (usar primeiro registro de hierarquia para metadados quando necessário)
      const firstHierarchyByUser: Record<string, any> = {};
      for (const h of hierarchyData as any[]) {
        if (!firstHierarchyByUser[h.user_id]) firstHierarchyByUser[h.user_id] = h;
      }

      return uniqueUserIds.map(uid => {
        const h = firstHierarchyByUser[uid];
        return {
          id: h?.id || uid,
          user_id: uid,
          supervisor_id: h?.supervisor_id || effectiveSupervisorId,
          created_at: h?.created_at || null,
          updated_at: h?.updated_at || null,
          user: (profilesData || []).find((p: any) => p.id === uid) || null,
        } as TeamMember;
      });
    },
    enabled: !!effectiveSupervisorId,
  });
};

// Hook para obter subordinados diretos COM informação de quem tem equipe própria
export const useDirectReportsWithTeams = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['direct-reports-with-teams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_direct_reports', { 
        supervisor_uuid: user.id 
      });
      
      if (error) throw error;
      return (data || []) as DirectReportWithTeam[];
    },
    enabled: !!user?.id,
  });
};

// Hook para obter toda a hierarquia da equipe (recursivo)
// Aceita managerId opcional para buscar subordinados de um gerente específico
export const useTeamHierarchyFull = (managerId?: string | null) => {
  const { user } = useAuth();
  const targetId = managerId || user?.id;
  
  return useQuery({
    queryKey: ['team-hierarchy-full', targetId, managerId],
    queryFn: async () => {
      if (!targetId) return [];
      
      let ids: string[] = [];
      
      // Se managerId foi passado, usa a RPC específica para buscar subordinados dele
      if (managerId && managerId !== 'direct') {
        const { data, error } = await supabase.rpc('get_subordinates_of_manager', { 
          manager_id: managerId 
        });
        if (error) throw error;
        ids = (data || []).map((id: any) => String(id));
      } else if (managerId === 'direct') {
        // Apenas subordinados diretos do usuário logado
        const { data, error } = await supabase
          .from('user_hierarchy')
          .select('user_id')
          .eq('supervisor_id', user?.id || '');
        if (error) throw error;
        ids = (data || []).map((d: any) => d.user_id);
      } else {
        // Comportamento padrão: todos os subordinados do usuário logado
        const { data, error } = await supabase.rpc('get_my_subordinates_ids');
        if (error) throw error;
        ids = Array.isArray(data) 
          ? data.map((it: any) => (typeof it === 'string' ? it : (it?.id || it?.team_member_id || String(it))))
          : [];
      }
      
      if (!ids || ids.length === 0) return [];
      
      const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, nivelAcesso, funcao')
        .in('id', uniqueIds);

      if (profilesError) throw profilesError;
      return profiles;
    },
    enabled: !!targetId,
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
      // First fetch the existing record to know the user_id
      const { data: existing, error: fetchErr } = await supabase
        .from('user_hierarchy')
        .select('id, user_id, supervisor_id')
        .eq('id', hierarchyId)
        .single();
      if (fetchErr) throw fetchErr;

      const userId = existing.user_id;

      // Check if a record with the target pair already exists (to avoid unique constraint violation)
      const { data: conflict, error: conflictErr } = await supabase
        .from('user_hierarchy')
        .select('id')
        .eq('user_id', userId)
        .eq('supervisor_id', newSupervisorId)
        .limit(1)
        .maybeSingle();

      if (conflictErr) throw conflictErr;

      // If a conflict record exists (another row already links user -> newSupervisor),
      // simply delete the current record to avoid duplicate pairs (merge behavior).
      if (conflict && conflict.id && conflict.id !== hierarchyId) {
        const { error: delErr } = await supabase.from('user_hierarchy').delete().eq('id', hierarchyId);
        if (delErr) throw delErr;
        return { id: conflict.id };
      }

      // Otherwise perform the update
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

// Alias para compatibilidade
export const useUpdateTeamMember = useUpdateTeamMemberSupervisor;
