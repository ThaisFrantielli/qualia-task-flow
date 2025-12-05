import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SurveyMetrics, CSATMetrics, NPSMetrics, SurveyType } from '@/types/surveys';
import { startOfMonth, endOfMonth, format, eachDayOfInterval, subDays } from 'date-fns';

interface DateRange {
  start: Date;
  end: Date;
}

export const useSurveyMetrics = (dateRange?: DateRange) => {
  const [metrics, setMetrics] = useState<SurveyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultRange: DateRange = dateRange || {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  };

  const calculateMetrics = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch surveys in date range
      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select('*')
        .gte('created_at', defaultRange.start.toISOString())
        .lte('created_at', defaultRange.end.toISOString());

      if (surveysError) throw surveysError;

      // Fetch responses
      const surveyIds = surveys?.map(s => s.id) || [];
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .in('survey_id', surveyIds.length > 0 ? surveyIds : ['none']);

      if (responsesError) throw responsesError;

      // Calculate CSAT metrics
      const csatResponses = responses?.filter(r => r.csat_score !== null) || [];
      const satisfied = csatResponses.filter(r => r.csat_score && r.csat_score >= 4).length;
      const neutral = csatResponses.filter(r => r.csat_score === 3).length;
      const dissatisfied = csatResponses.filter(r => r.csat_score && r.csat_score <= 2).length;
      
      const csatPercentage = csatResponses.length > 0 
        ? (satisfied / csatResponses.length) * 100 
        : 0;

      const csat: CSATMetrics = {
        total: csatResponses.length,
        satisfied,
        neutral,
        dissatisfied,
        percentage: Math.round(csatPercentage * 10) / 10,
        trend: 0, // TODO: calculate trend from previous period
      };

      // Calculate NPS metrics
      const npsResponses = responses?.filter(r => r.nps_score !== null) || [];
      const promoters = npsResponses.filter(r => r.nps_score && r.nps_score >= 9).length;
      const passives = npsResponses.filter(r => r.nps_score && r.nps_score >= 7 && r.nps_score <= 8).length;
      const detractors = npsResponses.filter(r => r.nps_score && r.nps_score <= 6).length;
      
      const npsScore = npsResponses.length > 0
        ? ((promoters / npsResponses.length) - (detractors / npsResponses.length)) * 100
        : 0;

      const nps: NPSMetrics = {
        total: npsResponses.length,
        promoters,
        passives,
        detractors,
        score: Math.round(npsScore),
        trend: 0,
      };

      // Response rate
      const totalSent = surveys?.length || 0;
      const totalResponded = surveys?.filter(s => s.responded_at).length || 0;
      const responseRate = totalSent > 0 ? (totalResponded / totalSent) * 100 : 0;

      // Average response time (in hours)
      const responseTimes = surveys
        ?.filter(s => s.responded_at && s.sent_at)
        .map(s => {
          const sent = new Date(s.sent_at!);
          const responded = new Date(s.responded_at!);
          return (responded.getTime() - sent.getTime()) / (1000 * 60 * 60);
        }) || [];
      
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Detractors pending follow-up
      const detractorsPending = surveys?.filter(s => 
        s.follow_up_status === 'pending' || s.follow_up_status === 'in_progress'
      ).length || 0;

      // By type
      const types: SurveyType[] = ['comercial', 'entrega', 'manutencao', 'devolucao'];
      const byType = types.map(type => {
        const typeResponses = responses?.filter(r => r.survey_type === type && r.csat_score !== null) || [];
        const typeSatisfied = typeResponses.filter(r => r.csat_score && r.csat_score >= 4).length;
        return {
          type,
          csat: typeResponses.length > 0 ? Math.round((typeSatisfied / typeResponses.length) * 100) : 0,
          count: typeResponses.length,
        };
      });

      // By period (last 30 days)
      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      });

      const byPeriod = last30Days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayResponses = responses?.filter(r => 
          format(new Date(r.created_at), 'yyyy-MM-dd') === dateStr
        ) || [];
        
        const daySatisfied = dayResponses.filter(r => r.csat_score && r.csat_score >= 4).length;
        const dayPromoters = dayResponses.filter(r => r.nps_score && r.nps_score >= 9).length;
        const dayDetractors = dayResponses.filter(r => r.nps_score && r.nps_score <= 6).length;
        
        return {
          date: dateStr,
          csat: dayResponses.length > 0 ? Math.round((daySatisfied / dayResponses.length) * 100) : 0,
          nps: dayResponses.length > 0 
            ? Math.round(((dayPromoters - dayDetractors) / dayResponses.length) * 100) 
            : 0,
          count: dayResponses.length,
        };
      });

      // Top influencing factors
      const allFactors = responses?.flatMap(r => r.influencing_factors || []) || [];
      const factorCounts: Record<string, number> = {};
      allFactors.forEach(factor => {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      });

      const topFactors = Object.entries(factorCounts)
        .map(([factor, count]) => ({
          factor,
          count,
          percentage: allFactors.length > 0 ? Math.round((count / allFactors.length) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setMetrics({
        csat,
        nps,
        responseRate: Math.round(responseRate * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        totalSent,
        totalResponded,
        totalPending: totalSent - totalResponded,
        detractorsPending,
        byType,
        byPeriod,
        topFactors,
      });
    } catch (error: any) {
      console.error('Error calculating metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [defaultRange.start, defaultRange.end]);

  useEffect(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  return { metrics, loading, refresh: calculateMetrics };
};
