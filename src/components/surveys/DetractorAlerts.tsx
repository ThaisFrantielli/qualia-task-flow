import { useSurveys } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Phone, Mail, Star, MessageSquare, CheckCircle2 } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';
import { surveyTypeLabels } from '@/types/surveys';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { normalizePhoneForWhatsApp } from '@/utils/phone';

export const DetractorAlerts = () => {
  const { surveys, markAsFollowUp, loading } = useSurveys({ status: 'responded' });
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState('');

  const detractors = surveys.filter(s => 
    s.response?.csat_score && s.response.csat_score <= 2 &&
    s.follow_up_status !== 'completed'
  );

  const handleFollowUp = async (surveyId: string, status: 'in_progress' | 'completed') => {
    await markAsFollowUp(surveyId, status, followUpNotes || undefined);
    setSelectedSurvey(null);
    setFollowUpNotes('');
  };

  if (loading) {
    return null;
  }

  if (detractors.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Detratores Aguardando Follow-up
          </CardTitle>
          <Badge variant="destructive">
            {detractors.length} pendente{detractors.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {detractors.slice(0, 5).map((survey) => (
          <div 
            key={survey.id}
            className="bg-white p-4 rounded-lg border border-red-100 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{survey.client_name}</p>
                <p className="text-sm text-muted-foreground">
                  {surveyTypeLabels[survey.type]} • {formatDateSafe(survey.responded_at, 'dd/MM/yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      survey.response?.csat_score && star <= survey.response.csat_score
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                ))}
              </div>
            </div>

            {survey.response?.feedback_comment && (
              <div className="bg-red-50 p-3 rounded-md">
                <p className="text-sm italic">"{survey.response.feedback_comment}"</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              {survey.client_phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const normalizedPhone = normalizePhoneForWhatsApp(survey.client_phone);
                    if (!normalizedPhone) {
                      toast.error('Telefone inválido para WhatsApp.', {
                        description: 'Informe DDD + número (ex: (11) 91234-5678).',
                      });
                      return;
                    }
                    window.open(`https://wa.me/${normalizedPhone}`, '_blank');
                  }}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              )}
              {survey.client_email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${survey.client_email}`, '_blank')}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  E-mail
                </Button>
              )}
              
              <Dialog open={selectedSurvey === survey.id} onOpenChange={(open) => !open && setSelectedSurvey(null)}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setSelectedSurvey(survey.id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Registrar Follow-up
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Follow-up</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="bg-muted p-3 rounded-md">
                      <p className="font-medium">{survey.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Nota CSAT: {survey.response?.csat_score}/5
                      </p>
                    </div>
                    <Textarea
                      placeholder="Descreva o contato realizado e as ações tomadas..."
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => handleFollowUp(survey.id, 'in_progress')}
                    >
                      Em Andamento
                    </Button>
                    <Button
                      onClick={() => handleFollowUp(survey.id, 'completed')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Concluir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}

        {detractors.length > 5 && (
          <p className="text-sm text-center text-muted-foreground">
            E mais {detractors.length - 5} detratores...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
