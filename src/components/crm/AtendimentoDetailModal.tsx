// src/components/crm/AtendimentoDetailModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import type { Database } from '@/types/supabase';
type Atendimento = Database['public']['Tables']['atendimentos']['Row'];
import type { Task, UserProfile } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Users, CheckCircle, MessageSquare, Loader2 } from 'lucide-react';
import DelegationForm from './DelegationForm';
import AtendimentoTimeline from './AtendimentoTimeline';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AtendimentoComments from './AtendimentoComments';
import AtendimentoAttachments from './AtendimentoAttachments';

type TaskWithAssigneeProfile = Task & {
  assignee: Pick<UserProfile, 'full_name' | 'avatar_url'> | null;
};

interface StepIndicatorProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}
const StepIndicator: React.FC<StepIndicatorProps> = ({ icon: Icon, label, isActive, isCompleted, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
    {isCompleted ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /> : <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'} flex-shrink-0`} />}
    <span className={`font-medium ${isActive ? 'text-primary' : ''}`}>{label}</span>
  </button>
);

interface AtendimentoDetailModalProps {
  atendimento: Atendimento | null;
  onClose: () => void;
  onUpdate: () => void;
}

// NOVO: Adicionada a lista de tipos de atendimento.
const tiposAtendimento = ['Elogio', 'Dúvida', 'Atendimento Comercial', 'Reclamação', 'Outros'];
const departamentos: Atendimento['department'][] = [
  'Manutenção',
  'Central de Atendimento',
  'Documentação',
  'Operação',
  'Comercial',
  'Financeiro',
  'Departamento Pessoal',
  'Aberto Erroneamente',
  'Dúvida',
  'Operação - Filial SP',
];
const analisesFinais: Atendimento['final_analysis'][] = [
  'Procedente',
  'Improcedente',
  'Dúvida',
];
const motivosReclamacao: Atendimento['reason'][] = [
  'Contestação de Cobrança',
  'Demora na Aprovação do Orçamento',
  'Agendamento Errôneo',
  'Má Qualidade de Serviço',
  'Problemas Com Fornecedor',
  'Demora em atendimento',
  'Atendimento Ineficaz',
  'Multas e Notificações',
  'Problemas na Entrega',
  'Problemas Com Veículo Reserva',
  'Atendimento Comercial',
  'Oportunidade Aberta Erroneamente',
  'Cobrança Indevida',
  'Dúvida',
  'Erro de processo interno',
  'Troca definitiva de veículo',
  'Problema recorrente',
  'Solicitação de Reembolso',
  'Problemas com Terceiro',
];

const AtendimentoDetailModal: React.FC<AtendimentoDetailModalProps> = ({ atendimento, onClose, onUpdate }) => {
  const [delegatedTasks, setDelegatedTasks] = useState<TaskWithAssigneeProfile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeStep, setActiveStep] = useState('analysis');
  
  // reason deve ser do tipo enum ou string vazia
  const [editableData, setEditableData] = useState({
    tipo_atendimento: '',
    department: null as Atendimento['department'] | null,
    reason: '' as Atendimento['reason'] | '',
    final_analysis: null as Atendimento['final_analysis'] | null,
    resolution_details: '',
  });

  const fetchDelegatedTasks = useCallback(async (atendimentoId: number) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!assignee_id(full_name, avatar_url)')
      .eq('atendimento_id', atendimentoId);
    
    if (error) {
      toast.error("Erro ao buscar tarefas delegadas.", { description: error.message });
    } else {
      setDelegatedTasks(data || []);
    }
  }, []);

  useEffect(() => {
    if (atendimento) {
      setEditableData({
        tipo_atendimento: atendimento.tipo_atendimento || '',
        department: atendimento.department ?? null,
        reason: atendimento.reason ?? '',
        final_analysis: atendimento.final_analysis ?? null,
        resolution_details: atendimento.resolution_details || '',
      });
      setActiveStep('analysis');
      fetchDelegatedTasks(atendimento.id);
    }
  }, [atendimento, fetchDelegatedTasks]);

  const handleSaveChanges = async () => {
    if (!atendimento) return;
    setIsSaving(true);
    // reason: se string vazia, envie undefined
    const updateData = {
      ...editableData,
      reason: editableData.reason === '' ? undefined : editableData.reason,
    };
    const { error } = await supabase
      .from('atendimentos')
      .update(updateData)
      .eq('id', atendimento.id);
    setIsSaving(false);
    if (error) {
      toast.error("Falha ao salvar. Tente novamente.", { description: error.message });
    } else {
      toast.success("Atendimento atualizado com sucesso!");
      onUpdate();
      onClose();
    }
  };

  // Permitir string | null para campos enum
  // Corrigir para reason aceitar string vazia, department/final_analysis null
  const handleChange = (field: keyof typeof editableData, value: string | null) => {
    if (field === 'department' || field === 'final_analysis') {
      setEditableData(prev => ({ ...prev, [field]: value === '' ? null : value }));
    } else if (field === 'reason') {
      setEditableData(prev => ({ ...prev, [field]: value as Atendimento['reason'] | '' }));
    } else {
      setEditableData(prev => ({ ...prev, [field]: value ?? '' }));
    }
  };
  
  if (!atendimento) return null;

  const isAnalysisComplete = !!editableData.department;
  const isResolutionComplete = !!editableData.final_analysis && !!editableData.resolution_details;
  const steps = [
    { id: 'analysis', label: 'Análise Inicial', icon: FileText, isCompleted: isAnalysisComplete },
    { id: 'delegations', label: 'Delegações', icon: Users, isCompleted: delegatedTasks.length > 0 },
    { id: 'resolution', label: 'Resolução', icon: MessageSquare, isCompleted: isResolutionComplete },
  ];

  // Exemplo de eventos mockados para a timeline (substitua por fetch real depois)
  const timelineEvents = [
    { type: 'status' as const, date: atendimento.created_at, status: atendimento.status, user: atendimento.contact_person },
    // ...adicione eventos reais de comentários, anexos, etc
  ];

  return (
    <Dialog open={!!atendimento} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* HEADER: Título, status, stepper, ações principais */}
        <div className="flex items-center justify-between px-8 py-5 border-b bg-white">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              Atendimento #{atendimento.id} - {atendimento.client_name}
            </div>
            <div className="flex items-center gap-4 mt-2">
              {/* Stepper visual de status */}
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
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            {/* Outras ações futuras */}
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
              <DelegationForm atendimentoId={atendimento.id} atendimentoTitle={atendimento.client_name || ''} onTaskCreated={() => fetchDelegatedTasks(atendimento.id)} />
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
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Resolução do Atendimento</h2>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="final_analysis">Análise Final</Label>
                      <Select
                        value={editableData.final_analysis ?? ''}
                        onValueChange={(value) => handleChange('final_analysis', value)}
                      >
                        <SelectTrigger id="final_analysis">
                          <SelectValue placeholder="Selecione a análise final" />
                        </SelectTrigger>
                        <SelectContent>
                          {analisesFinais.filter(Boolean).map(analise => (
                            <SelectItem key={analise as string} value={analise as string}>{analise}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution_details">Detalhes da Resolução</Label>
                      <Textarea rows={5} id="resolution_details" value={editableData.resolution_details} onChange={(e) => handleChange('resolution_details', e.target.value)} placeholder="Descreva como o atendimento foi resolvido..."/>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          {/* COLUNA DIREITA: Ações contextuais e edição (análise inicial, etc) */}
          <div className="w-1/4 min-w-[260px] max-w-xs bg-white border-l p-6 flex flex-col gap-6 overflow-y-auto">
            {/* Exibe análise inicial se status for Solicitação ou Em Análise */}
            {(atendimento.status === 'Solicitação' || atendimento.status === 'Em Análise') && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Análise Inicial</h2>
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_atendimento">Tipo de Atendimento</Label>
                    <Select value={editableData.tipo_atendimento} onValueChange={(value) => handleChange('tipo_atendimento', value)}>
                      <SelectTrigger id="tipo_atendimento">
                        <SelectValue placeholder="Selecione o tipo de atendimento" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposAtendimento.map(tipo => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento Responsável</Label>
                    <Select
                      value={editableData.department ?? ''}
                      onValueChange={(value) => handleChange('department', value)}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Selecione um departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.filter(Boolean).map(dep => (
                          <SelectItem key={dep as string} value={dep as string}>{dep}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo do Contato</Label>
                    <Select
                      value={editableData.reason ?? ''}
                      onValueChange={(value) => handleChange('reason', value)}
                    >
                      <SelectTrigger id="reason">
                        <SelectValue placeholder="Selecione o motivo do contato" />
                      </SelectTrigger>
                      <SelectContent>
                        {motivosReclamacao.map(motivo => (
                          <SelectItem key={motivo as string} value={motivo as string}>{motivo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AtendimentoDetailModal;