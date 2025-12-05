import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CSATRating } from './CSATRating';
import { NPSScale } from './NPSScale';
import { MultipleChoiceFactors } from './MultipleChoiceFactors';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { SurveyCampaign, Survey, surveyTypeLabels } from '@/types/surveys';

export const SurveyResponseForm = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const [startTime] = useState(Date.now());

  // Form state
  const [csatScore, setCsatScore] = useState<number | null>(null);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [otherFactorText, setOtherFactorText] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [openFeedback, setOpenFeedback] = useState('');

  // Current step for multi-step form
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = campaign?.include_nps ? (campaign?.include_open_feedback ? 4 : 3) : 2;

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!surveyId) return;

      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (surveyError || !surveyData) {
        toast.error('Pesquisa não encontrada');
        setLoading(false);
        return;
      }

      if (surveyData.responded_at) {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      setSurvey(surveyData as Survey);

      // Fetch campaign if exists, otherwise use default questions
      if (surveyData.campaign_id) {
        const { data: campaignData } = await supabase
          .from('survey_campaigns')
          .select('*')
          .eq('id', surveyData.campaign_id)
          .single();

        if (campaignData) {
          setCampaign({
            ...campaignData,
            influencing_factors: Array.isArray(campaignData.influencing_factors)
              ? campaignData.influencing_factors as string[]
              : []
          } as SurveyCampaign);
        }
      } else {
        // Get default campaign for this type
        const { data: defaultCampaign } = await supabase
          .from('survey_campaigns')
          .select('*')
          .eq('type', surveyData.type)
          .eq('is_active', true)
          .single();

        if (defaultCampaign) {
          setCampaign({
            ...defaultCampaign,
            influencing_factors: Array.isArray(defaultCampaign.influencing_factors)
              ? defaultCampaign.influencing_factors as string[]
              : []
          } as SurveyCampaign);
        }
      }

      setLoading(false);
    };

    fetchSurvey();
  }, [surveyId]);

  const handleSubmit = async () => {
    if (!survey || !csatScore) {
      toast.error('Por favor, selecione uma avaliação');
      return;
    }

    if (campaign?.include_nps && npsScore === null) {
      toast.error('Por favor, responda à pergunta de recomendação');
      return;
    }

    setSubmitting(true);

    try {
      const responseTime = Math.floor((Date.now() - startTime) / 1000);

      // Insert response
      const { error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: survey.id,
          survey_type: survey.type,
          csat_score: csatScore,
          nps_score: npsScore,
          influencing_factors: selectedFactors.length > 0 ? selectedFactors : null,
          other_factor_text: otherFactorText || null,
          feedback_comment: feedbackComment || null,
          open_feedback: openFeedback || null,
          response_time_seconds: responseTime,
        });

      if (responseError) throw responseError;

      // Update survey as responded
      const { error: updateError } = await supabase
        .from('surveys')
        .update({
          responded_at: new Date().toISOString(),
          follow_up_status: csatScore <= 2 ? 'pending' : 'none',
        })
        .eq('id', survey.id);

      if (updateError) throw updateError;

      setSubmitted(true);
      toast.success('Obrigado pelo seu feedback!');
    } catch (error: any) {
      toast.error('Erro ao enviar resposta', { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !csatScore) {
      toast.error('Por favor, selecione uma avaliação');
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8 space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Obrigado!</h2>
              <p className="text-muted-foreground mt-2">
                Sua opinião é muito importante para nós. Agradecemos por dedicar seu tempo para nos ajudar a melhorar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-foreground">Pesquisa não encontrada</h2>
            <p className="text-muted-foreground mt-2">
              O link pode estar expirado ou inválido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const defaultFactors = {
    comercial: ['Agilidade do consultor(a)', 'Clareza da proposta', 'Flexibilidade na negociação', 'Facilidade do contrato'],
    entrega: ['Agilidade no atendimento', 'Limpeza e condição do veículo', 'Clareza das informações passadas', 'Cordialidade da equipe'],
    manutencao: ['Qualidade do reparo executado', 'Cumprimento do prazo combinado', 'Comunicação sobre andamento do serviço', 'Atendimento e cordialidade da equipe'],
    devolucao: ['Agilidade e rapidez no atendimento', 'Facilidade e simplicidade do processo', 'Transparência na vistoria', 'Atendimento e cordialidade da equipe'],
  };

  const factors = campaign?.influencing_factors?.length 
    ? campaign.influencing_factors 
    : defaultFactors[survey.type] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mb-4">
            <img 
              src="/lovable-uploads/2d1e44c7-e224-45d8-bb3e-eb7ace3001a6.png" 
              alt="Quality Frotas" 
              className="h-12 mx-auto"
            />
          </div>
          <CardTitle className="text-xl">
            Pesquisa de Satisfação
          </CardTitle>
          <CardDescription>
            {campaign?.welcome_message || `Olá, ${survey.client_name}! Gostaríamos de ouvir sua opinião.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Etapa {currentStep} de {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} />
          </div>

          {/* Step 1: CSAT */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <p className="text-center font-medium">
                {campaign?.csat_question || `Em uma escala de 1 a 5, qual o seu nível de satisfação com o serviço de ${surveyTypeLabels[survey.type].toLowerCase()}?`}
              </p>
              <CSATRating value={csatScore} onChange={setCsatScore} />
            </div>
          )}

          {/* Step 2: Factors */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <MultipleChoiceFactors
                options={factors}
                selected={selectedFactors}
                onChange={setSelectedFactors}
                otherText={otherFactorText}
                onOtherTextChange={setOtherFactorText}
                label={campaign?.factors_label || 'O que mais influenciou sua nota?'}
              />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Gostaria de compartilhar mais detalhes? (opcional)
                </label>
                <Textarea
                  placeholder="Conte-nos mais sobre sua experiência..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: NPS (if enabled) */}
          {currentStep === 3 && campaign?.include_nps && (
            <div className="space-y-6 animate-fade-in">
              <p className="text-center font-medium">
                {campaign.nps_question || 'Em uma escala de 0 a 10, o quão provável você é de recomendar a Quality Frotas a um amigo ou colega?'}
              </p>
              <NPSScale value={npsScore} onChange={setNpsScore} />
            </div>
          )}

          {/* Step 4: Open feedback (if enabled) */}
          {currentStep === (campaign?.include_nps ? 4 : 3) && campaign?.include_open_feedback && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-center font-medium">
                {campaign.open_feedback_question || 'Existe algo que poderíamos ter feito melhor em sua jornada conosco?'}
              </p>
              <Textarea
                placeholder="Compartilhe suas sugestões..."
                value={openFeedback}
                onChange={(e) => setOpenFeedback(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Voltar
            </Button>
            <Button
              onClick={nextStep}
              disabled={submitting}
            >
              {currentStep === totalSteps ? (submitting ? 'Enviando...' : 'Enviar') : 'Próximo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
