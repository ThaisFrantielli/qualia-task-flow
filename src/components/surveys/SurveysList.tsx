import { useSurveys } from '@/hooks/useSurveys';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check, Send, Trash2, Star, Eye } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';
import { surveyTypeLabels } from '@/types/surveys';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { normalizePhoneForWhatsApp } from '@/utils/phone';

interface SurveysListProps {
  isAdmin?: boolean;
}

export const SurveysList = ({ isAdmin }: SurveysListProps) => {
  const { surveys, loading, deleteSurvey } = useSurveys();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);

  const handleCopyLink = (surveyId: string) => {
    const link = `${window.location.origin}/pesquisa/${surveyId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(surveyId);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const handleSendWhatsApp = (survey: any) => {
    if (!survey.client_phone) {
      toast.error("Número de WhatsApp não cadastrado.");
      return;
    }

    const normalizedPhone = normalizePhoneForWhatsApp(survey.client_phone);
    if (!normalizedPhone) {
      toast.error('Telefone inválido para WhatsApp.', {
        description: 'Informe DDD + número (ex: (11) 91234-5678).',
      });
      return;
    }

    const link = `${window.location.origin}/pesquisa/${survey.id}`;
    const message = `Olá, ${survey.client_name}! Gostaríamos de ouvir sua opinião: ${link}`;
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDelete = async (surveyId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta pesquisa?")) {
      return;
    }
    await deleteSurvey(surveyId);
  };

  const selectedSurveyData = surveys.find(s => s.id === selectedSurvey);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Avaliação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surveys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Nenhuma pesquisa encontrada
              </TableCell>
            </TableRow>
          ) : (
            surveys.map(survey => (
              <TableRow key={survey.id}>
                <TableCell className="font-medium">
                  {survey.client_name}
                  {survey.cliente?.nome_fantasia && (
                    <span className="text-xs text-muted-foreground block">
                      {survey.cliente.nome_fantasia}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {surveyTypeLabels[survey.type]}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateSafe(survey.created_at, 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  {survey.responded_at ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Respondida
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Pendente
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {survey.response ? (
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
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {survey.response && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setSelectedSurvey(survey.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleCopyLink(survey.id)}
                  >
                    {copiedLink === survey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleSendWhatsApp(survey)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => handleDelete(survey.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Response Detail Dialog */}
      <Dialog open={!!selectedSurvey} onOpenChange={() => setSelectedSurvey(null)}>
        <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Resposta</DialogTitle>
          </DialogHeader>
          {selectedSurveyData?.response && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CSAT</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-5 w-5",
                        selectedSurveyData.response?.csat_score && star <= selectedSurveyData.response.csat_score
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>

              {selectedSurveyData.response.nps_score !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">NPS</span>
                  <span className={cn(
                    "text-lg font-bold",
                    selectedSurveyData.response.nps_score >= 9 ? "text-green-600" :
                    selectedSurveyData.response.nps_score <= 6 ? "text-red-600" : "text-yellow-600"
                  )}>
                    {selectedSurveyData.response.nps_score}
                  </span>
                </div>
              )}

              {selectedSurveyData.response.influencing_factors && selectedSurveyData.response.influencing_factors.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Fatores</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedSurveyData.response.influencing_factors.map((factor, i) => (
                      <Badge key={i} variant="secondary">{factor}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedSurveyData.response.feedback_comment && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Comentário</span>
                  <p className="bg-muted p-3 rounded-md text-sm">
                    "{selectedSurveyData.response.feedback_comment}"
                  </p>
                </div>
              )}

              {selectedSurveyData.response.open_feedback && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Sugestões</span>
                  <p className="bg-muted p-3 rounded-md text-sm">
                    "{selectedSurveyData.response.open_feedback}"
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                <span>Respondida em</span>
                <span>{formatDateSafe(selectedSurveyData.responded_at, 'dd/MM/yyyy HH:mm')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
