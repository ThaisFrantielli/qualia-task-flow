import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/supabase';
import { Loader2 } from 'lucide-react';
import DelegationForm from '@/components/crm/DelegationForm';
import AtendimentoTimeline from '@/components/crm/AtendimentoTimeline';
import AtendimentoComments from '@/components/crm/AtendimentoComments';
import AtendimentoAttachments from '@/components/crm/AtendimentoAttachments';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Types

type Atendimento = Database['public']['Tables']['atendimentos']['Row'];

const AtendimentoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAtendimento = useCallback(async () => {
    setLoading(true);
    setError(null);
    const atendimentoId = id ? Number(id) : undefined;
    if (!atendimentoId) {
      setError('ID inválido');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('atendimentos')
      .select('*')
      .eq('id', atendimentoId)
      .single();
    if (error) setError(error.message);
    else setAtendimento(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAtendimento();
  }, [fetchAtendimento]);

  if (loading) return <div className="p-8 flex items-center gap-2 text-lg"><Loader2 className="animate-spin" /> Carregando atendimento...</div>;
  if (error || !atendimento) return <div className="p-8 text-red-600">Erro ao carregar atendimento: {error || 'Não encontrado.'}</div>;

  // Timeline mock (substitua por fetch real se necessário)
  const timelineEvents = [
    { type: 'status' as const, date: atendimento.created_at, status: atendimento.status, user: atendimento.contact_person },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between px-8 py-5 border-b bg-white">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            Atendimento #{atendimento.id} - {atendimento.client_name}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${atendimento.status === 'Solicitação' ? 'text-primary' : 'text-gray-400'}`}>Solicitação</span>
              <span className="w-8 h-1 rounded bg-gray-200" />
              <span className={`font-semibold ${atendimento.status === 'Em Análise' ? 'text-primary' : 'text-gray-400'}`}>Em Análise</span>
              <span className="w-8 h-1 rounded bg-gray-200" />
              <span className={`font-semibold ${atendimento.status === 'Resolvido' ? 'text-primary' : 'text-gray-400'}`}>Resolvido</span>
            </div>
            <Badge variant="outline" className="capitalize ml-4">{atendimento.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </div>
      {/* LAYOUT 3 COLUNAS */}
      <div className="flex flex-1 min-h-0 bg-gray-50">
        {/* COLUNA ESQUERDA: Dados principais */}
        <div className="w-1/4 min-w-[260px] max-w-xs bg-white border-r p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="space-y-2">
            <div className="font-semibold text-gray-700">Dados do Cliente</div>
            <div className="text-sm text-gray-900"><b>Cliente:</b> {atendimento.client_name}</div>
            <div className="text-sm text-gray-900"><b>Contato:</b> {atendimento.contact_person} {atendimento.client_phone && `(${atendimento.client_phone})`}</div>
            <div className="text-sm text-gray-900"><b>Status:</b> {atendimento.status}</div>
            <div className="text-sm text-gray-900"><b>Motivo:</b> {atendimento.reason}</div>
            <div className="text-sm text-gray-900"><b>Departamento:</b> {atendimento.department}</div>
            <div className="text-sm text-gray-900"><b>Responsável:</b> {atendimento.assignee_id}</div>
            <div className="text-sm text-gray-900"><b>Criado em:</b> {new Date(atendimento.created_at).toLocaleString('pt-BR')}</div>
            <div className="text-sm text-gray-900"><b>Atualizado em:</b> {new Date(atendimento.updated_at).toLocaleString('pt-BR')}</div>
            <div className="text-sm text-gray-900"><b>Origem:</b> {atendimento.lead_source}</div>
            <div className="text-sm text-gray-900"><b>Resumo:</b> {atendimento.summary}</div>
          </div>
          <div className="mt-6">
            <DelegationForm atendimentoId={atendimento.id} atendimentoTitle={atendimento.client_name || ''} onTaskCreated={fetchAtendimento} />
          </div>
        </div>
        {/* COLUNA CENTRAL: Feed de atividades, abas, comentários, anexos */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs defaultValue="historico" className="w-full h-full flex flex-col">
            <TabsList className="flex gap-2 px-6 pt-4 pb-2 bg-transparent">
              <TabsTrigger value="historico">Histórico & Comentários</TabsTrigger>
              <TabsTrigger value="anexos">Anexos</TabsTrigger>
              <TabsTrigger value="resolucao">Resolução</TabsTrigger>
            </TabsList>
            <TabsContent value="historico" className="flex-1 overflow-y-auto px-6 pb-6">
              <AtendimentoTimeline events={timelineEvents.map(e => ({ ...e, user: e.user ?? undefined }))} />
              <div className="mt-6">
                <AtendimentoComments atendimentoId={String(atendimento.id)} />
              </div>
            </TabsContent>
            <TabsContent value="anexos" className="flex-1 overflow-y-auto px-6 pb-6">
              <AtendimentoAttachments atendimentoId={String(atendimento.id)} />
            </TabsContent>
            <TabsContent value="resolucao" className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="text-sm text-gray-700 font-medium mb-2">Resolução</div>
              <div className="text-xs text-gray-500 mb-2">{atendimento.resolution_details || 'Sem detalhes de resolução.'}</div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AtendimentoDetailPage;
