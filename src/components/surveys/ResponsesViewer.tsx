import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRating } from "@/components/surveys/StarRating";
import { NPSRating } from "@/components/surveys/NPSRating";
import { useToast } from "@/hooks/use-toast";

interface SurveyResponse {
  id: string;
  survey_type: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  vehicle_plate?: string;
  responses: any;
  created_at: string;
}

export const ResponsesViewer = () => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching responses:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar respostas.",
          variant: "destructive"
        });
        return;
      }

      setResponses(data?.map(response => ({
        ...response,
        id: response.id.toString(),
        customer_name: 'N/A',
        responses: {}
      })) as SurveyResponse[] || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar respostas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredResponses = selectedType === "all" 
    ? responses 
    : responses.filter(response => response.survey_type === selectedType);

  const getSurveyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contract: "Contratação",
      delivery: "Entrega",
      maintenance: "Manutenção", 
      return: "Devolução"
    };
    return labels[type] || type;
  };

  const renderResponse = (response: any, questionText: string) => {
    if (typeof response === 'number') {
      if (questionText.toLowerCase().includes('nps') || questionText.toLowerCase().includes('recomenda')) {
        return <NPSRating value={response} onChange={() => {}} />;
      } else {
        return <StarRating value={response} onChange={() => {}} />;
      }
    }
    return <span className="text-sm">{response}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-heading font-bold">Respostas das Pesquisas</h2>
        <Badge variant="secondary">
          {filteredResponses.length} resposta{filteredResponses.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="contract">Contratação</TabsTrigger>
          <TabsTrigger value="delivery">Entrega</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          <TabsTrigger value="return">Devolução</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="space-y-4">
          {filteredResponses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Nenhuma resposta encontrada.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredResponses.map((response) => (
              <Card key={response.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{response.customer_name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge>{getSurveyTypeLabel(response.survey_type)}</Badge>
                        {response.vehicle_plate && (
                          <Badge variant="outline">{response.vehicle_plate}</Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(response.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {response.customer_email && (
                      <p className="text-sm">
                        <strong>Email:</strong> {response.customer_email}
                      </p>
                    )}
                    {response.customer_phone && (
                      <p className="text-sm">
                        <strong>Telefone:</strong> {response.customer_phone}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold">Respostas:</h4>
                      {Object.entries(response.responses).map(([questionId, answer]) => (
                        <div key={questionId} className="border-l-2 border-gray-200 pl-4">
                          <p className="text-sm font-medium mb-1">
                            {questionId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </p>
                          {renderResponse(answer, questionId)}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};