import { useState } from 'react';
import { useSurveys } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, Send, Clock, CheckCircle2, AlertTriangle, Plus, ExternalLink } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';
import { surveyTypeLabels, getCSATLevel, getCSATLevelColor } from '@/types/surveys';
import { cn } from '@/lib/utils';
import SurveyGeneratorForm from './SurveyGeneratorForm';

interface CustomerSurveysTabProps {
  clienteId: string;
  clienteName: string;
  clientePhone?: string | null;
  clienteEmail?: string | null;
}

export const CustomerSurveysTab = ({ clienteId, clienteName, clientePhone, clienteEmail }: CustomerSurveysTabProps) => {
  const { surveys, loading } = useSurveys({ clienteId });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Calculate metrics
  const respondedSurveys = surveys.filter(s => s.responded_at);
  const csatScores = respondedSurveys
    .filter(s => s.response?.csat_score)
    .map(s => s.response!.csat_score!);
  
  const avgCSAT = csatScores.length > 0
    ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
    : null;

  const npsScores = respondedSurveys
    .filter(s => s.response?.nps_score !== null && s.response?.nps_score !== undefined)
    .map(s => s.response!.nps_score!);
  
  const lastNPS = npsScores.length > 0 ? npsScores[0] : null;

  const csatLevel = avgCSAT ? getCSATLevel((avgCSAT / 5) * 100) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">CSAT Médio</span>
            </div>
            <p className={cn("text-2xl font-bold mt-1", csatLevel && getCSATLevelColor(csatLevel))}>
              {avgCSAT ? `${avgCSAT.toFixed(1)} / 5` : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Último NPS</span>
            </div>
            <p className={cn(
              "text-2xl font-bold mt-1",
              lastNPS !== null && (lastNPS >= 9 ? "text-green-600" : lastNPS <= 6 ? "text-red-600" : "text-yellow-600")
            )}>
              {lastNPS !== null ? lastNPS : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Respondidas</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {respondedSurveys.length} / {surveys.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Pesquisa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Enviar Pesquisa para {clienteName}</DialogTitle>
                </DialogHeader>
                <SurveyGeneratorForm 
                  onSuccess={() => setShowCreateDialog(false)}
                  prefillData={{
                    clienteId,
                    clientName: clienteName,
                    clientPhone: clientePhone || '',
                    clientEmail: clienteEmail || '',
                  }}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Survey History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Pesquisas</CardTitle>
        </CardHeader>
        <CardContent>
          {surveys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma pesquisa enviada ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey) => (
                <div 
                  key={survey.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      survey.responded_at 
                        ? survey.response?.csat_score && survey.response.csat_score <= 2 
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                        : "bg-yellow-100 text-yellow-600"
                    )}>
                      {survey.responded_at ? (
                        survey.response?.csat_score && survey.response.csat_score <= 2 ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5" />
                        )
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{surveyTypeLabels[survey.type]}</span>
                        <Badge variant={survey.responded_at ? "default" : "secondary"}>
                          {survey.responded_at ? 'Respondida' : 'Pendente'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enviada em {formatDateSafe(survey.created_at, 'dd/MM/yyyy HH:mm')}
                        {survey.responded_at && (
                          <> • Respondida em {formatDateSafe(survey.responded_at, 'dd/MM/yyyy HH:mm')}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {survey.response && (
                      <div className="text-right">
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
                        {survey.response.nps_score !== null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            NPS: {survey.response.nps_score}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/pesquisa/${survey.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
