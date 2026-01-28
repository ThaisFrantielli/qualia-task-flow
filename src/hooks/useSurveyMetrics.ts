import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SurveyMetrics, CSATMetrics, NPSMetrics, SurveyType } from '@/types/surveys';
import { startOfMonth, endOfMonth, format, eachDayOfInterval, subDays, differenceInCalendarDays } from 'date-fns';

interface DateRange {
  start: Date;
  end: Date;
}

export const useSurveyMetrics = (dateRange?: DateRange) => {
  const [metrics, setMetrics] = useState<SurveyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<Map<string, { metrics: SurveyMetrics; ts: number }>>(new Map());

  const defaultRange: DateRange = dateRange || {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  };

  const calculateMetrics = useCallback(async () => {
    const cacheKey = `${defaultRange.start.toISOString()}__${defaultRange.end.toISOString()}`;
    const cached = cacheRef.current.get(cacheKey);
    const cacheTtlMs = 30_000;
    if (cached && Date.now() - cached.ts < cacheTtlMs) {
      setMetrics(cached.metrics);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const fetchSurveysAndResponses = async (range: DateRange) => {
        const { data: surveys, error: surveysError } = await supabase
          .from('surveys')
          .select('*')
          .gte('created_at', range.start.toISOString())
          .lte('created_at', range.end.toISOString());

        if (surveysError) throw surveysError;

        const surveyIds = surveys?.map(s => s.id) || [];
        const { data: responses, error: responsesError } = await supabase
          .from('survey_responses')
          .select('*')
          .in('survey_id', surveyIds.length > 0 ? surveyIds : ['none']);

        if (responsesError) throw responsesError;

        return {
          surveys: surveys || [],
          responses: responses || [],
        };
      };

      const getCSATPercentage = (responses: any[]) => {
        const csatResponses = responses.filter(r => r.csat_score !== null);
        const satisfied = csatResponses.filter(r => r.csat_score && r.csat_score >= 4).length;
        const percentage = csatResponses.length > 0 ? (satisfied / csatResponses.length) * 100 : 0;
        return Math.round(percentage * 10) / 10;
      };

      const getNPSScore = (responses: any[]) => {
        const npsResponses = responses.filter(r => r.nps_score !== null);
        const promoters = npsResponses.filter(r => r.nps_score && r.nps_score >= 9).length;
        const detractors = npsResponses.filter(r => r.nps_score && r.nps_score <= 6).length;
        const score = npsResponses.length > 0
          ? ((promoters / npsResponses.length) - (detractors / npsResponses.length)) * 100
          : 0;
        return Math.round(score);
      };

      const { surveys, responses } = await fetchSurveysAndResponses(defaultRange);

      const rangeDays = Math.max(1, differenceInCalendarDays(defaultRange.end, defaultRange.start) + 1);
      const previousRange: DateRange = {
        start: subDays(defaultRange.start, rangeDays),
        end: subDays(defaultRange.start, 1),
      };
      const { responses: previousResponses } = await fetchSurveysAndResponses(previousRange);

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
        trend: Math.round(((Math.round(csatPercentage * 10) / 10) - getCSATPercentage(previousResponses)) * 10) / 10,
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
        trend: Math.round(npsScore) - getNPSScore(previousResponses),
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
      const detractorSurveyIds = new Set(
        (responses || [])
          .filter(r => r.csat_score !== null && r.csat_score <= 2)
          .map(r => r.survey_id)
      );

      const detractorsPending = (surveys || []).filter(s =>
        detractorSurveyIds.has(s.id) && s.follow_up_status !== 'completed'
      ).length;

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

      // By period (for the requested defaultRange)
      const daysInRange = eachDayOfInterval({ start: defaultRange.start, end: defaultRange.end });

      const byPeriod = daysInRange.map(date => {
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

      const nextMetrics: SurveyMetrics = {
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
      };

      cacheRef.current.set(cacheKey, { metrics: nextMetrics, ts: Date.now() });
      setMetrics(nextMetrics);
    } catch (error: any) {
      console.error('Error calculating metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [defaultRange.start, defaultRange.end]);

  useEffect(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  const refresh = useCallback(async () => {
    const cacheKey = `${defaultRange.start.toISOString()}__${defaultRange.end.toISOString()}`;
    cacheRef.current.delete(cacheKey);
    await calculateMetrics();
  }, [calculateMetrics, defaultRange.end, defaultRange.start]);

  return { metrics, loading, refresh };
};
