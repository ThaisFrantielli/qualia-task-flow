// src/pages/SurveyAdminPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/types/supabase';
type Survey = Database['public']['Tables']['surveys']['Row'];

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, BarChart2, Copy, Check, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SurveyGeneratorForm from '@/components/surveys/SurveyGeneratorForm';

interface AppUserWithPermissions {
  permissoes?: {
    is_admin?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

const SurveyAdminPage = () => {
  const { user } = useAuth() as { user: AppUserWithPermissions | null };
  const [activeTab, setActiveTab] = useState('responses');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar pesquisas", { description: error.message });
    } else if (data) {
      setSurveys(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  useEffect(() => {
    const channel = supabase
      .channel('surveys-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' },
        (payload) => {
          console.log('Mudança na tabela de pesquisas recebida!', payload);
          fetchSurveys();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSurveys]);

  const handleDelete = async (surveyId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta pesquisa?")) {
      return;
    }
    try {
      const { error } = await supabase.from('surveys').delete().eq('id', surveyId);
      if (error) throw error;
      toast.success("Pesquisa excluída com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao excluir pesquisa", { description: err.message });
    }
  };

  const handleCopyLink = (surveyId: string) => {
    const link = `${window.location.origin}/pesquisa/${surveyId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(surveyId);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };
  
  const handleSendWhatsApp = (survey: Survey) => {
    if (!survey.client_phone) {
      toast.error("Número de WhatsApp não cadastrado.");
      return;
    }
    const link = `${window.location.origin}/pesquisa/${survey.id}`;
    const message = `Olá, ${survey.client_name}! Gostaríamos de ouvir sua opinião: ${link}`;
    const whatsappUrl = `https://wa.me/${survey.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const surveyTypeLabels: { [key in NonNullable<Survey['type']>]: string } = {
    comercial: 'Pós-Contrato',
    entrega: 'Entrega de Veículo',
    manutencao: 'Manutenção',
    devolucao: 'Devolução',
  };

  const isAdmin = user?.permissoes?.is_admin === true;

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <header className="text-center space-y-2">
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
              <CardDescription>Acompanhe o status das pesquisas enviadas. A lista é atualizada em tempo real.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <p>Carregando...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveys.map(survey => (
                      <TableRow key={survey.id}>
                        <TableCell className="font-medium">{survey.client_name}</TableCell>
                        <TableCell>{survey.type ? surveyTypeLabels[survey.type] : 'N/A'}</TableCell>
                        <TableCell>{new Date(survey.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          {survey.responded_at ? <span className="text-green-600">Respondida</span> : <span className="text-yellow-600">Pendente</span>}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleCopyLink(survey.id)}>
                            {copiedLink === survey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleSendWhatsApp(survey)}>
                            <Send className="h-4 w-4" />
                          </Button>
                          
                          {/* --- CONDIÇÃO CORRIGIDA AQUI --- */}
                          {isAdmin && (
                            <Button variant="destructive" size="icon" onClick={() => handleDelete(survey.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports">
          {/* Conteúdo dos relatórios */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SurveyAdminPage;