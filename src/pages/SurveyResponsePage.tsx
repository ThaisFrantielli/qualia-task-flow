// src/pages/SurveyResponsePage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Survey } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// --- SUB-COMPONENTES PARA AS PERGUNTAS ---

interface CSATRatingProps {
  score: number | null;
  onSelect: (score: number) => void;
  readOnly?: boolean;
}
const CSATRating: React.FC<CSATRatingProps> = ({ score, onSelect, readOnly = false }) => (
  <div className="flex justify-center gap-1 text-3xl text-gray-300">
    {[1, 2, 3, 4, 5].map(star => (
      <span
        key={star}
        className={`cursor-pointer transition-colors ${score && star <= score ? 'text-yellow-400' : ''} ${readOnly ? 'cursor-default' : 'hover:text-yellow-300'}`}
        onClick={() => !readOnly && onSelect(star)}
      >
        ★
      </span>
    ))}
  </div>
);

interface NPSScaleProps {
  score: number | null;
  onSelect: (score: number) => void;
  readOnly?: boolean;
}
const NPSScale: React.FC<NPSScaleProps> = ({ score, onSelect, readOnly = false }) => (
  <div className="flex flex-wrap justify-center gap-2">
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
      <button
        key={num}
        type="button"
        className={`w-9 h-9 rounded-full flex items-center justify-center border text-sm font-semibold transition-all
          ${score !== null && num === score ? 'bg-primary text-primary-foreground border-primary scale-110' : 'bg-background text-foreground border-border hover:bg-muted'}
          ${readOnly ? 'cursor-default' : ''}`}
        onClick={() => !readOnly && onSelect(num)}
        disabled={readOnly}
      >
        {num}
      </button>
    ))}
  </div>
);

interface MultipleChoiceProps {
  label: string;
  options: string[];
  selected: string[];
  otherText: string;
  onSelect: (value: string) => void;
  onOtherChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
}
const MultipleChoice: React.FC<MultipleChoiceProps> = ({ label, options, selected, otherText, onSelect, onOtherChange, readOnly = false }) => (
  <div className="space-y-3">
    <p className="font-semibold text-center md:text-left">{label}</p>
    <div className="space-y-2">
      {options.map(option => (
        <div key={option} className="flex items-center gap-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            id={option}
            checked={selected.includes(option)}
            onChange={() => !readOnly && onSelect(option)}
            disabled={readOnly}
            className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
          />
          <Label htmlFor={option} className="flex-1 cursor-pointer">{option}</Label>
        </div>
      ))}
      <div className="flex items-center gap-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
        <input
          type="checkbox"
          id="other"
          checked={selected.includes('Outro')}
          onChange={() => !readOnly && onSelect('Outro')}
          disabled={readOnly}
          className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
        />
        <Label htmlFor="other" className="cursor-pointer">Outro:</Label>
        <Input
          value={otherText}
          onChange={onOtherChange}
          placeholder="Especifique"
          disabled={readOnly || !selected.includes('Outro')}
          className="flex-1 h-8"
        />
      </div>
    </div>
  </div>
);

// --- PÁGINA PRINCIPAL DE RESPOSTA DA PESQUISA ---
const SurveyResponsePage = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formState, setFormState] = useState({
    csatScore: null as number | null,
    npsScore: null as number | null,
    influencingFactors: [] as string[],
    otherFactorText: '',
    feedbackComment: '',
  });

  const localStorageKey = `survey_progress_${surveyId}`;

  const updateFormState = (updates: Partial<typeof formState>) => {
    setFormState(prevState => ({ ...prevState, ...updates }));
  };

  const handleSelectFactor = useCallback((factor: string) => {
    updateFormState({
      influencingFactors: formState.influencingFactors.includes(factor)
        ? formState.influencingFactors.filter(f => f !== factor)
        : [...formState.influencingFactors, factor]
    });
  }, [formState.influencingFactors]);

  const getSurveyQuestions = useCallback((surveyType: Survey['type']) => {
    // Sua lógica de perguntas (simplificada para o exemplo, use a sua completa)
    switch (surveyType) {
        case 'comercial': return { csatQuestion: "Qual sua satisfação com a negociação?", factorsLabel: "O que mais influenciou?", factorsOptions: ["Atendimento", "Proposta", "Flexibilidade", "Contrato"], showNPS: false };
        case 'entrega': return { csatQuestion: "Qual sua satisfação com a entrega?", factorsLabel: "O que mais influenciou?", factorsOptions: ["Agilidade", "Condição do veículo", "Informações", "Cordialidade"], showNPS: false };
        case 'manutencao': return { csatQuestion: "Qual sua satisfação com a manutenção?", factorsLabel: "O que mais influenciou?", factorsOptions: ["Qualidade", "Prazo", "Comunicação", "Atendimento", "Orçamento"], showNPS: false };
        case 'devolucao': return { csatQuestion: "Qual sua satisfação com a devolução?", factorsLabel: "O que mais influenciou?", factorsOptions: ["Agilidade", "Vistoria", "Atendimento", "Orientações"], showNPS: true, npsQuestion: "Qual a probabilidade de você nos recomendar?" };
        default: return { csatQuestion: "", factorsLabel: "", factorsOptions: [], showNPS: false, npsQuestion: "" };
    }
  }, []);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!surveyId) {
        setError("ID da pesquisa não fornecido.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (fetchError || !data) {
        setError("Pesquisa não encontrada, link inválido ou já respondida.");
      } else {
        setSurvey(data);
        if (data.responded_at) {
          setError("Esta pesquisa já foi respondida.");
        } else {
          // Carregar progresso salvo apenas se a pesquisa não foi respondida
          const savedProgress = localStorage.getItem(localStorageKey);
          if (savedProgress) {
            try {
              setFormState(JSON.parse(savedProgress));
            } catch (e) {
              localStorage.removeItem(localStorageKey);
            }
          }
        }
      }
      setLoading(false);
    };
    fetchSurvey();
  }, [surveyId, localStorageKey]);

  useEffect(() => {
    if (!loading && survey && !survey.responded_at) {
      localStorage.setItem(localStorageKey, JSON.stringify(formState));
    }
  }, [formState, loading, survey, localStorageKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;
    if (formState.csatScore === null || (survey.type === 'devolucao' && formState.npsScore === null)) {
      toast.error("Por favor, preencha todas as avaliações.");
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase.from('survey_responses').insert({
        survey_id: survey.id,
        csat_score: formState.csatScore,
        nps_score: formState.npsScore,
        influencing_factors: formState.influencingFactors,
        other_factor_text: formState.otherFactorText,
        feedback_comment: formState.feedbackComment,
      });

      await supabase.from('surveys').update({ responded_at: new Date().toISOString() }).eq('id', survey.id);
      
      localStorage.removeItem(localStorageKey);
      toast.success("Obrigado pela sua avaliação!");
      navigate('/pesquisa/agradecimento');

    } catch (err: any) {
      toast.error("Erro ao enviar sua resposta.", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Card className="w-full max-w-lg text-center"><CardHeader><CardTitle className="text-destructive">Atenção</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{error}</p></CardContent></Card></div>;
  }

  const questions = survey ? getSurveyQuestions(survey.type) : null;
  if (!questions) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-8 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold mb-2">Avalie sua Experiência</CardTitle>
          <CardDescription className="text-lg">Olá, {survey?.client_name || 'Cliente'}! Sua opinião é muito importante para nós.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4 text-center">
              <Label className="text-base font-semibold">{questions.csatQuestion}</Label>
              <CSATRating score={formState.csatScore} onSelect={(score) => updateFormState({ csatScore: score })} />
            </div>
            <MultipleChoice
              label={questions.factorsLabel}
              options={questions.factorsOptions}
              selected={formState.influencingFactors}
              otherText={formState.otherFactorText}
              onSelect={handleSelectFactor}
              onOtherChange={(e) => updateFormState({ otherFactorText: e.target.value })}
            />
            {questions.showNPS && (
              <div className="space-y-4 text-center border-t pt-8">
                <Label className="text-base font-semibold">{questions.npsQuestion}</Label>
                <NPSScale score={formState.npsScore} onSelect={(score) => updateFormState({ npsScore: score })} />
              </div>
            )}
            <div className="space-y-2 border-t pt-8">
              <Label htmlFor="feedback-comment" className="text-base font-semibold text-center md:text-left block">Gostaria de compartilhar mais detalhes?</Label>
              <Textarea id="feedback-comment" value={formState.feedbackComment} onChange={(e) => updateFormState({ feedbackComment: e.target.value })} rows={4} placeholder="Seu feedback é muito valioso..."/>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SurveyResponsePage;