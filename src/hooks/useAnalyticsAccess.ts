// Hook para verificar acesso a páginas e abas do Analytics
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsPage {
  id: string;
  page_key: string;
  page_name: string;
  page_route: string;
  hub_category: string;
  icon: string;
  display_order: number;
}

export interface AnalyticsTab {
  id: string;
  tab_key: string;
  tab_name: string;
  display_order: number;
}

export const useAnalyticsPageAccess = (pageKey: string) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('has_analytics_page_access', {
          _user_id: user.id,
          _page_key: pageKey
        });

        if (error) {
          console.error('Erro ao verificar acesso à página:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data || false);
        }
      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, pageKey]);

  return { hasAccess, loading };
};

export const useAnalyticsTabAccess = (pageKey: string, tabKey: string) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('has_analytics_tab_access', {
          _user_id: user.id,
          _page_key: pageKey,
          _tab_key: tabKey
        });

        if (error) {
          console.error('Erro ao verificar acesso à aba:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data || false);
        }
      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, pageKey, tabKey]);

  return { hasAccess, loading };
};

export const useUserAnalyticsPages = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-analytics-pages', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_analytics_pages', {
        _user_id: user.id
      });

      if (error) {
        console.error('Erro ao buscar páginas do Analytics:', error);
        throw error;
      }

      return (data || []) as AnalyticsPage[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserAnalyticsTabs = (pageKey: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-analytics-tabs', user?.id, pageKey],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_analytics_tabs', {
        _user_id: user.id,
        _page_key: pageKey
      });

      if (error) {
        console.error('Erro ao buscar abas do Analytics:', error);
        throw error;
      }

      return (data || []) as AnalyticsTab[];
    },
    enabled: !!user && !!pageKey,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook para buscar todas as páginas (admin)
export const useAllAnalyticsPages = () => {
  return useQuery({
    queryKey: ['all-analytics-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_pages')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
  });
};

// Hook para buscar todas as abas de uma página (admin)
export const useAllAnalyticsTabs = (pageId: string | null) => {
  return useQuery({
    queryKey: ['all-analytics-tabs', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const { data, error } = await supabase
        .from('analytics_page_tabs')
        .select('*')
        .eq('page_id', pageId)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!pageId,
  });
};

// Hook para buscar permissões de grupo
export const useGroupAnalyticsPermissions = (groupId: string | null) => {
  return useQuery({
    queryKey: ['group-analytics-permissions', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_analytics_permissions')
        .select('page_id, tab_id')
        .eq('group_id', groupId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });
};

// Hook para buscar permissões de usuário
export const useUserAnalyticsPermissions = (userId: string | null) => {
  return useQuery({
    queryKey: ['user-analytics-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_analytics_permissions')
        .select('page_id, tab_id')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};
