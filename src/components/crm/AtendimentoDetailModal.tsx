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
      <DialogContent className="sm:max-w-5xl h-[80vh] flex p-0">
        <div className="w-1/4 bg-muted/50 p-4 border-r flex flex-col gap-2">
          <DialogHeader className="mb-4 px-2">
            <DialogTitle>Detalhes do Atendimento</DialogTitle>
            <DialogDescription>#{atendimento.id} - {atendimento.client_name}</DialogDescription>
          </DialogHeader>
          {steps.map(step => (
            <StepIndicator key={step.id} icon={step.icon} label={step.label} isActive={activeStep === step.id} isCompleted={step.isCompleted} onClick={() => setActiveStep(step.id)} />
          ))}
          {/* Tabs para histórico, anexos, comentários */}
          <Tabs defaultValue="dados" className="mt-8">
            <TabsList className="w-full">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="anexos">Anexos</TabsTrigger>
              <TabsTrigger value="comentarios">Comentários</TabsTrigger>
            </TabsList>
            <TabsContent value="dados">
              <div className="text-xs text-muted-foreground space-y-1">
                <div><b>Cliente:</b> {atendimento.client_name}</div>
                <div><b>Contato:</b> {atendimento.contact_person} {atendimento.client_phone && `(${atendimento.client_phone})`}</div>
                <div><b>Status:</b> {atendimento.status}</div>
                <div><b>Motivo:</b> {atendimento.reason}</div>
                <div><b>Departamento:</b> {atendimento.department}</div>
                <div><b>Responsável:</b> {atendimento.assignee_id}</div>
                <div><b>Criado em:</b> {new Date(atendimento.created_at).toLocaleString('pt-BR')}</div>
                <div><b>Atualizado em:</b> {new Date(atendimento.updated_at).toLocaleString('pt-BR')}</div>
                <div><b>Origem:</b> {atendimento.lead_source}</div>
                <div><b>Resumo:</b> {atendimento.summary}</div>
              </div>
            </TabsContent>
            <TabsContent value="historico">
              <AtendimentoTimeline events={timelineEvents.map(e => ({ ...e, user: e.user ?? undefined }))} />
            </TabsContent>
            <TabsContent value="anexos">
              <AtendimentoAttachments atendimentoId={String(atendimento.id)} />
            </TabsContent>
            <TabsContent value="comentarios">
              <AtendimentoComments atendimentoId={String(atendimento.id)} />
            </TabsContent>
          </Tabs>
        </div>
        <div className="w-3/4 p-6 flex flex-col">
          <div className="flex-grow overflow-y-auto pr-4">
            {activeStep === 'analysis' && (
              <div className="space-y-6 animate-in fade-in">
                <h2 className="text-2xl font-semibold">Análise Inicial</h2>
                <div className="grid gap-6">
                  {/* NOVO: Campo de seleção para Tipo de Atendimento. */}
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
            {activeStep === 'delegations' && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-2xl font-semibold">Delegações</h2>
                <DelegationForm atendimentoId={atendimento.id} atendimentoTitle={atendimento.client_name || ''} onTaskCreated={() => fetchDelegatedTasks(atendimento.id)} />
                <div className="space-y-2 mt-4">
                  <h3 className="font-semibold">Tarefas Delegadas ({delegatedTasks.length})</h3>
                  {delegatedTasks.length > 0 ? (
                    <ul className="border rounded-md divide-y">
                      {delegatedTasks.map(task => (
                        <li key={task.id} className="p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">Para: {task.assignee?.full_name || 'Não atribuído'}</p>
                          </div>
                          <Badge variant="outline" className="text-sm capitalize">{task.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (<p className="text-muted-foreground text-sm mt-2">Nenhuma tarefa delegada para este atendimento.</p>)}
                </div>
              </div>
            )}
            {activeStep === 'resolution' && (
               <div className="space-y-6 animate-in fade-in">
                <h2 className="text-2xl font-semibold">Resolução do Atendimento</h2>
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
            )}
          </div>
          <div className="pt-6 border-t mt-auto flex justify-end gap-2">
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            {/* Ações rápidas: comentar, anexar, delegar */}
            <Button variant="outline" onClick={() => setActiveStep('delegations')}>Delegar</Button>
            <Button variant="outline" onClick={() => document.querySelector('[data-state="active"][value="anexos"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>Anexar</Button>
            <Button variant="outline" onClick={() => document.querySelector('[data-state="active"][value="comentarios"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>Comentar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AtendimentoDetailModal;