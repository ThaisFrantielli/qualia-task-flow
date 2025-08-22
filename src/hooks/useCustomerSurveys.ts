import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerSurvey {
  id: number;
  client_name: string;
  type: string;
  created_at: string;
  responded_at: string | null;
  nps_score: number | null;
  csat_score: number | null;
  feedback_comment: string | null;
}

export function useCustomerSurveys(email: string | null) {
  const [surveys, setSurveys] = useState<CustomerSurvey[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    (async () => {
      // Buscar todos os surveys do cliente
      const { data: surveyList } = await supabase
        .from('surveys')
        .select('id')
        .eq('client_email', email);
      const surveyIds = (surveyList || []).map((s) => s.id);
      if (surveyIds.length === 0) {
        setSurveys([]);
        setLoading(false);
        return;
      }
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('id, created_at, csat_score, feedback_comment, nps_score, survey_id')
        .in('survey_id', surveyIds);
      // Buscar surveys para pegar client_name, type e responded_at
      const { data: surveysData } = await supabase
        .from('surveys')
        .select('id, client_name, type, responded_at')
        .in('id', surveyIds);
      const surveysMap = new Map((surveysData || []).map(s => [s.id, s]));
      const result: CustomerSurvey[] = (responses || []).map((r) => {
        const survey = surveysMap.get(r.survey_id) as {
          client_name?: string;
          type?: string;
          responded_at?: string | null;
        } | undefined;
        return {
          id: r.id,
          client_name: survey?.client_name ?? '',
          type: survey?.type ?? '',
          created_at: r.created_at,
          responded_at: survey?.responded_at ?? null,
          nps_score: r.nps_score,
          csat_score: r.csat_score,
          feedback_comment: r.feedback_comment,
        };
      });
      setSurveys(result);
      setLoading(false);
    })();
  }, [email]);

  return { surveys, loading };
}
