// src/pages/SurveyResponsePage.tsx - Refactored with campaign-based questions

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { dateToLocalISO } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CSATRating } from '@/components/surveys/CSATRating';
import { NPSScale } from '@/components/surveys/NPSScale';
import { MultipleChoiceFactors } from '@/components/surveys/MultipleChoiceFactors';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface Survey {
  id: string;
  type: 'comercial' | 'entrega' | 'manutencao' | 'devolucao';
  client_name: string;
  responded_at: string | null;
  expires_at: string | null;
  campaign_id: string | null;
}

interface SurveyCampaign {
  id: string;
  csat_question: string;
  factors_label: string | null;
  influencing_factors: string[] | null;
  include_nps: boolean | null;
  nps_question: string | null;
  include_open_feedback: boolean | null;
  open_feedback_question: string | null;
  welcome_message: string | null;
}

interface SurveyQuestions {
  welcomeMessage: string;
  csatQuestion: string;
  factorsLabel: string;
  factorsOptions: string[];
  showNPS: boolean;
  npsQuestion: string;
  showOpenFeedback: boolean;
  openFeedbackQuestion: string;
}

const defaultQuestionsByType: Record<string, SurveyQuestions> = {
  comercial: {
    welcomeMessage: "Seja muito bem-vindo(a) à Quality Frotas! Agradecemos por nos escolher para cuidar da sua mobilidade.",
    csatQuestion: "Em uma escala de 1 a 5, qual o seu nível de satisfação com o processo de negociação e contratação com a Quality Frotas?",
    factorsLabel: "O que mais influenciou sua nota?",
    factorsOptions: ["Agilidade do consultor(a)", "Clareza da proposta", "Flexibilidade na negociação", "Facilidade do contrato"],
    showNPS: false,
    npsQuestion: "",
    showOpenFeedback: true,
    openFeedbackQuestion: "Gostaria de compartilhar mais detalhes sobre sua experiência?"
  },
  entrega: {
    welcomeMessage: "Esperamos que sua jornada com o novo veículo seja excelente!",
    csatQuestion: "Em uma escala de 1 a 5, qual seu nível de satisfação com a entrega do seu veículo?",
    factorsLabel: "O que mais se destacou (positivo ou negativo)?",
    factorsOptions: ["Agilidade no atendimento", "Limpeza e condição do veículo", "Clareza das informações passadas", "Cordialidade da equipe"],
    showNPS: false,
    npsQuestion: "",
    showOpenFeedback: true,
    openFeedbackQuestion: "Gostaria de compartilhar mais detalhes sobre sua experiência?"
  },
  manutencao: {
    welcomeMessage: "Vimos que a manutenção do seu veículo foi concluída. Sua opinião é essencial para a qualidade dos nossos parceiros e processos.",
    csatQuestion: "Qual seu nível de satisfação com o serviço de manutenção realizado?",
    factorsLabel: "O que mais influenciou sua nota?",
    factorsOptions: ["Qualidade do reparo executado", "Cumprimento do prazo combinado", "Comunicação sobre andamento do serviço, orçamento e serviços realizados", "Atendimento e cordialidade da equipe (oficina)"],
    showNPS: false,
    npsQuestion: "",
    showOpenFeedback: true,
    openFeedbackQuestion: "Gostaria de compartilhar mais detalhes sobre sua experiência?"
  },
  devolucao: {
    welcomeMessage: "Agradecemos pela parceria e confiança na Quality Frotas durante todo este período!",
    csatQuestion: "Avaliando o processo de devolução do veículo, qual seu nível de satisfação?",
    factorsLabel: "O que mais influenciou sua nota sobre o processo de devolução?",
    factorsOptions: ["Agilidade e rapidez no atendimento", "Facilidade e simplicidade do processo", "Transparência na vistoria e encerramento do contrato", "Atendimento e cordialidade da equipe"],
    showNPS: true,
    npsQuestion: "Em uma escala de 0 a 10, o quão provável você é de recomendar a Quality Frotas a um amigo ou colega?",
    showOpenFeedback: true,
    openFeedbackQuestion: "Existe algo que poderíamos ter feito melhor em sua jornada conosco?"
  }
};

const SurveyResponsePage = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const startTimeRef = useRef<number>(Date.now());
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [formState, setFormState] = useState({
    csatScore: null as number | null,
    npsScore: null as number | null,
    influencingFactors: [] as string[],
    otherFactorText: '',
    feedbackComment: '',
    openFeedback: ''
  });

  const localStorageKey = `survey_progress_${surveyId}`;

  const updateFormState = (updates: Partial<typeof formState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };


  // Get questions from campaign or defaults
  const getQuestions = useCallback((): SurveyQuestions => {
    if (campaign) {
      const factors = campaign.influencing_factors as string[] | null;
      return {
        welcomeMessage: campaign.welcome_message || defaultQuestionsByType[survey?.type || 'comercial']?.welcomeMessage || '',
        csatQuestion: campaign.csat_question,
        factorsLabel: campaign.factors_label || 'O que mais influenciou sua nota?',
        factorsOptions: factors || defaultQuestionsByType[survey?.type || 'comercial']?.factorsOptions || [],
        showNPS: campaign.include_nps || false,
        npsQuestion: campaign.nps_question || '',
        showOpenFeedback: campaign.include_open_feedback || false,
        openFeedbackQuestion: campaign.open_feedback_question || 'Gostaria de compartilhar mais detalhes?'
      };
    }
    return defaultQuestionsByType[survey?.type || 'comercial'] || defaultQuestionsByType.comercial;
  }, [campaign, survey?.type]);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!surveyId) {
        setError("ID da pesquisa não fornecido.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('surveys')
        .select('*, campaign:survey_campaigns(*)')
        .eq('id', surveyId)
        .single();

      if (fetchError || !data) {
        setError("Pesquisa não encontrada ou link inválido.");
      } else {
        setSurvey(data);
        if ((data as any).campaign) {
          setCampaign((data as any).campaign);
        }
        
        if (data.responded_at) {
          setError("Esta pesquisa já foi respondida. Obrigado!");
        } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError("Esta pesquisa expirou.");
        } else {
          const savedProgress = localStorage.getItem(localStorageKey);
          if (savedProgress) {
            try {
              setFormState(JSON.parse(savedProgress));
            } catch {
              // ignore parse errors
            }
          }
        }
      }
      setLoading(false);
    };
    
    fetchSurvey();
  }, [surveyId, localStorageKey]);

  // Auto-save progress
  useEffect(() => {
    if (!loading && survey && !survey.responded_at) {
      localStorage.setItem(localStorageKey, JSON.stringify(formState));
    }
  }, [formState, loading, survey, localStorageKey]);

  const questions = getQuestions();
  const totalSteps = questions.showNPS ? 4 : 3;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!survey || formState.csatScore === null) {
      toast.error("Por favor, avalie sua experiência.");
      return;
    }
    
    if (questions.showNPS && formState.npsScore === null) {
      toast.error("Por favor, responda à pergunta de recomendação.");
      return;
    }

    setIsSubmitting(true);
    const responseTimeSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const { error: insertError } = await supabase.from('survey_responses').insert({
        survey_id: survey.id,
        survey_type: survey.type,
        csat_score: formState.csatScore,
        nps_score: formState.npsScore,
        influencing_factors: formState.influencingFactors,
        other_factor_text: formState.otherFactorText,
        feedback_comment: formState.feedbackComment,
        open_feedback: formState.openFeedback,
        response_time_seconds: responseTimeSeconds
      });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('surveys')
        .update({ responded_at: dateToLocalISO(new Date()) })
        .eq('id', survey.id);

      if (updateError) throw updateError;

      localStorage.removeItem(localStorageKey);
      toast.success("Obrigado pela sua avaliação!");
      navigate('/obrigado');
    } catch (err: any) {
      toast.error("Erro ao enviar sua resposta.", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando pesquisa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">{error}</h2>
            <p className="text-muted-foreground">Obrigado pelo seu interesse.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <img src="/logo-quality.png" alt="Quality Frotas" className="h-12 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Pesquisa de Satisfação</h1>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Passo {currentStep + 1} de {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center border-b bg-muted/30">
            <CardTitle className="text-xl">Olá, {survey?.client_name}!</CardTitle>
            <CardDescription className="text-base">
              {questions.welcomeMessage}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 0: CSAT */}
              {currentStep === 0 && (
                <div className="space-y-6 animate-in fade-in-50">
                  <div className="text-center space-y-4">
                    <Label className="text-lg font-medium block">
                      {questions.csatQuestion}
                    </Label>
                    <CSATRating
                      value={formState.csatScore}
                      onChange={(score) => updateFormState({ csatScore: score })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      disabled={formState.csatScore === null}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 1: Factors */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in-50">
                  <MultipleChoiceFactors
                    label={questions.factorsLabel}
                    options={questions.factorsOptions}
                    selected={formState.influencingFactors}
                    otherText={formState.otherFactorText}
                    onChange={(selected) => updateFormState({ influencingFactors: selected })}
                    onOtherTextChange={(text: string) => updateFormState({ otherFactorText: text })}
                  />
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(0)}>
                      Voltar
                    </Button>
                    <Button type="button" onClick={() => setCurrentStep(2)}>
                      Próximo
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: NPS (if applicable) or Feedback */}
              {currentStep === 2 && questions.showNPS && (
                <div className="space-y-6 animate-in fade-in-50">
                  <div className="text-center space-y-4">
                    <Label className="text-lg font-medium block">
                      {questions.npsQuestion}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      0 = Nada provável | 10 = Extremamente provável
                    </p>
                    <NPSScale
                      value={formState.npsScore}
                      onChange={(score) => updateFormState({ npsScore: score })}
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={formState.npsScore === null}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}

              {/* Final Step: Open Feedback */}
              {currentStep === (questions.showNPS ? 3 : 2) && (
                <div className="space-y-6 animate-in fade-in-50">
                  <div className="space-y-4">
                    <Label htmlFor="open-feedback" className="text-lg font-medium block text-center">
                      {questions.openFeedbackQuestion}
                    </Label>
                    <Textarea
                      id="open-feedback"
                      value={formState.openFeedback}
                      onChange={(e) => updateFormState({ openFeedback: e.target.value })}
                      rows={4}
                      placeholder="Seu feedback é muito valioso para nós..."
                      className="resize-none"
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(questions.showNPS ? 2 : 1)}
                    >
                      Voltar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar Avaliação'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Suas respostas são confidenciais e nos ajudam a melhorar nossos serviços.
        </p>
      </div>
    </div>
  );
};

export default SurveyResponsePage;
