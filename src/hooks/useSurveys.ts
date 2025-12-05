import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Survey, SurveyWithResponse, SurveyType } from '@/types/surveys';
import { toast } from 'sonner';

interface UseSurveysOptions {
  type?: SurveyType;
  clienteId?: string;
  status?: 'all' | 'pending' | 'responded' | 'expired';
  limit?: number;
}

export const useSurveys = (options?: UseSurveysOptions) => {
  const [surveys, setSurveys] = useState<SurveyWithResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('surveys')
      .select(`
        *,
        cliente:clientes(id, nome_fantasia, razao_social)
      `)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.clienteId) {
      query = query.eq('cliente_id', options.clienteId);
    }

    if (options?.status === 'pending') {
      query = query.is('responded_at', null);
    } else if (options?.status === 'responded') {
      query = query.not('responded_at', 'is', null);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: surveysData, error: surveysError } = await query;

    if (surveysError) {
      toast.error('Erro ao carregar pesquisas', { description: surveysError.message });
      setLoading(false);
      return;
    }

    // Fetch responses for these surveys
    const surveyIds = surveysData?.map(s => s.id) || [];
    const { data: responsesData } = await supabase
      .from('survey_responses')
      .select('*')
      .in('survey_id', surveyIds.length > 0 ? surveyIds : ['none']);

    const surveysWithResponses: SurveyWithResponse[] = (surveysData || []).map(survey => ({
      ...survey,
      sent_via: survey.sent_via as Survey['sent_via'],
      follow_up_status: survey.follow_up_status as Survey['follow_up_status'],
      response: responsesData?.find(r => r.survey_id === survey.id) as any,
    }));

    setSurveys(surveysWithResponses);
    setLoading(false);
  }, [options?.type, options?.clienteId, options?.status, options?.limit]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('surveys-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => {
        fetchSurveys();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_responses' }, () => {
        fetchSurveys();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSurveys]);

  const createSurvey = async (survey: Partial<Survey>) => {
    const { data, error } = await supabase
      .from('surveys')
      .insert(survey as any)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar pesquisa', { description: error.message });
      return null;
    }

    toast.success('Pesquisa criada com sucesso!');
    return data;
  };

  const updateSurvey = async (id: string, updates: Partial<Survey>) => {
    const { error } = await supabase
      .from('surveys')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar pesquisa', { description: error.message });
      return false;
    }

    return true;
  };

  const deleteSurvey = async (id: string) => {
    const { error } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir pesquisa', { description: error.message });
      return false;
    }

    toast.success('Pesquisa excluída com sucesso!');
    return true;
  };

  const markAsFollowUp = async (id: string, status: Survey['follow_up_status'], notes?: string) => {
    const { error } = await supabase
      .from('surveys')
      .update({
        follow_up_status: status,
        follow_up_notes: notes,
        follow_up_at: status !== 'none' ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar follow-up', { description: error.message });
      return false;
    }

    toast.success('Follow-up atualizado!');
    fetchSurveys();
    return true;
  };

  return {
    surveys,
    loading,
    fetchSurveys,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    markAsFollowUp,
  };
};
