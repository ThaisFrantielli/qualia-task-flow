import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SurveyCampaign, SurveyType } from '@/types/surveys';
import { toast } from 'sonner';

export const useSurveyCampaigns = () => {
  const [campaigns, setCampaigns] = useState<SurveyCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('survey_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar campanhas', { description: error.message });
    } else if (data) {
      setCampaigns(data.map(c => ({
        ...c,
        influencing_factors: Array.isArray(c.influencing_factors) 
          ? c.influencing_factors as string[]
          : []
      })) as SurveyCampaign[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const getCampaignByType = useCallback((type: SurveyType) => {
    return campaigns.find(c => c.type === type && c.is_active);
  }, [campaigns]);

  const createCampaign = async (campaign: Partial<SurveyCampaign>) => {
    const { data, error } = await supabase
      .from('survey_campaigns')
      .insert(campaign as any)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar campanha', { description: error.message });
      return null;
    }
    
    toast.success('Campanha criada com sucesso!');
    fetchCampaigns();
    return data;
  };

  const updateCampaign = async (id: string, updates: Partial<SurveyCampaign>) => {
    const { error } = await supabase
      .from('survey_campaigns')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar campanha', { description: error.message });
      return false;
    }
    
    toast.success('Campanha atualizada com sucesso!');
    fetchCampaigns();
    return true;
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase
      .from('survey_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir campanha', { description: error.message });
      return false;
    }
    
    toast.success('Campanha excluída com sucesso!');
    fetchCampaigns();
    return true;
  };

  return {
    campaigns,
    loading,
    fetchCampaigns,
    getCampaignByType,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
};
