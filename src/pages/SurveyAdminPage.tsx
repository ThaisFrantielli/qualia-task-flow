// src/pages/SurveyAdminPage.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Survey } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, BarChart2, Copy, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import SurveyGeneratorForm from '@/components/surveys/SurveyGeneratorForm';

const SurveyAdminPage = () => {
  const [activeTab, setActiveTab] = useState('generator');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Função para buscar a lista de pesquisas geradas
  const fetchSurveys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false }); // Mais recentes primeiro

    if (error) {
      toast.error("Erro ao carregar pesquisas", { description: error.message });
    } else {
      setSurveys(data);
    }
    setLoading(false);
  };

  // Executa a busca de pesquisas quando a página carrega
  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleCopyLink = (surveyId: string) => {
    const link = `${window.location.origin}/pesquisa/${surveyId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(surveyId);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSendWhatsApp = (survey: Survey) => {
    if (!survey.client_phone) {
      toast.error("Número de WhatsApp não cadastrado para esta pesquisa.");
      return;
    }
    const link = `${window.location.origin}/pesquisa/${survey.id}`;
    const message = `Olá, ${survey.client_name}! Agradecemos por ter escolhido a Quality Frotas. Gostaríamos de ouvir sua opinião sobre sua experiência conosco. Por favor, acesse o link: ${link}`;
    const whatsappUrl = `https://wa.me/${survey.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const surveyTypeLabels: { [key in Survey['type']]: string } = {
    comercial: 'Pós-Contrato',
    entrega: 'Entrega de Veículo',
    manutencao: 'Manutenção',
    devolucao: 'Devolução',
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <header className="text-center space-y-2">
        <img src="/logo-quality.png" alt="Quality Frotas Logo" className="mx-auto h-16" />
        <h1 className="text-4xl font-bold font-comfortaa text-[#37255d]">Sistema de Satisfação</h1>
        <p className="text-lg text-gray-600">Gere links de pesquisa e acompanhe as respostas dos clientes.</p>
      </header>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator"><Plus className="mr-2 h-4 w-4" /> Gerar Link</TabsTrigger>
          <TabsTrigger value="responses"><Users className="mr-2 h-4 w-4" /> Respostas</TabsTrigger>
          <TabsTrigger value="reports"><BarChart2 className="mr-2 h-4 w-4" /> Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="generator">
          <SurveyGeneratorForm onSuccess={fetchSurveys} />
        </TabsContent>

        <TabsContent value="responses">
          <Card>
            <CardHeader>
              <CardTitle>Links de Pesquisa Gerados</CardTitle>
              <CardDescription>Acompanhe o status de todas as pesquisas enviadas.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center p-8 text-gray-500">Carregando respostas...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data de Geração</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveys.length > 0 ? (
                      surveys.map(survey => (
                        <TableRow key={survey.id}>
                          <TableCell className="font-medium">{survey.client_name}</TableCell>
                          <TableCell>{surveyTypeLabels[survey.type]}</TableCell>
                          <TableCell>{new Date(survey.created_at).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            {survey.responded_at ? (
                              <span className="flex items-center text-green-600 font-semibold">
                                <Check className="h-4 w-4 mr-1" /> Respondida
                              </span>
                            ) : (
                              <span className="text-yellow-600 font-semibold">Pendente</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="icon" title="Copiar Link" onClick={() => handleCopyLink(survey.id)}>
                              {copiedLink === survey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="icon" title="Enviar por WhatsApp" onClick={() => handleSendWhatsApp(survey)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-gray-500">Nenhum link de pesquisa foi gerado ainda.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports">
           <Card>
            <CardHeader><CardTitle>Relatórios de Satisfação</CardTitle></CardHeader>
            <CardContent className="text-center p-8 text-gray-500">
              <p>Dashboard de relatórios em construção.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SurveyAdminPage;