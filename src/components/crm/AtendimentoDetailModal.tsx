// src/components/crm/AtendimentoDetailModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import type { Atendimento, Task } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Users, CheckCircle, MessageSquare } from 'lucide-react';
import DelegationForm from './DelegationForm';

// --- COMPONENTE INTERNO PARA O INDICADOR DE ETAPA (STEPPER) ---
interface StepIndicatorProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ icon: Icon, label, isActive, isCompleted, onClick }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
    }`}
  >
    {isCompleted ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /> : <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'} flex-shrink-0`} />}
    <span className={`font-medium ${isActive ? 'text-primary' : ''}`}>{label}</span>
  </button>
);


// --- MODAL PRINCIPAL ---
interface AtendimentoDetailModalProps {
  atendimento: Atendimento | null;
  onClose: () => void;
  onUpdate: () => void;
}

// Valores baseados no seu arquivo de dados
const departamentos = ['Manutenção', 'Central de Atendimento', 'Documentação', 'Operação', 'Comercial', 'Financeiro', 'Departamento Pessoal'];
const analisesFinais = ['Procedente', 'Improcedente', 'Dúvida'];

const AtendimentoDetailModal: React.FC<AtendimentoDetailModalProps> = ({ atendimento, onClose, onUpdate }) => {
  const [delegatedTasks, setDelegatedTasks] = useState<Task[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeStep, setActiveStep] = useState('analysis');
  
  // Estado para todos os campos editáveis, inicializado com os dados do atendimento
  const [editableData, setEditableData] = useState({
    license_plate: '',
    department: '',
    reason: '',
    final_analysis: '',
    resolution_details: '',
  });

  const fetchDelegatedTasks = useCallback(async () => {
    if (!atendimento) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignee:profiles(full_name)')
      .eq('atendimento_id', atendimento.id);
    
    if (error) {
      toast.error("Erro ao buscar tarefas delegadas", { description: error.message });
    } else {
      // @ts-ignore
      const formattedTasks = data.map(t => ({ ...t, assignee_name: t.assignee?.full_name }))
      setDelegatedTasks(formattedTasks);
    }
  }, [atendimento]);

  useEffect(() => {
    if (atendimento) {
      setEditableData({
        license_plate: atendimento.license_plate || '',
        department: atendimento.department || '',
        reason: atendimento.reason || '',
        final_analysis: atendimento.final_analysis || '',
        resolution_details: atendimento.resolution_details || '',
      });
      setActiveStep('analysis'); // Sempre começa na primeira aba ao abrir
      fetchDelegatedTasks();
    }
  }, [atendimento, fetchDelegatedTasks]);

  const handleSaveChanges = async () => {
    if (!atendimento) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
          .from('atendimentos')
          .update(editableData)
          .eq('id', atendimento.id);
      
      if (error) throw error;
      
      toast.success('Atendimento atualizado com sucesso!');
      onUpdate(); // Atualiza a lista no Kanban
      onClose(); // Fecha o modal
    } catch (error: any) {
      toast.error('Erro ao salvar alterações', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!atendimento) return null;

  // Lógica para marcar etapas como concluídas
  const isAnalysisComplete = !!editableData.department;
  const isResolutionComplete = !!editableData.final_analysis && !!editableData.resolution_details;

  return (
    <Dialog open={!!atendimento} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl h-[80vh] flex p-0">
        {/* Coluna Esquerda: Stepper e Informações Fixas */}
        <div className="w-1/4 bg-muted/50 p-4 border-r flex flex-col gap-2">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">Atendimento #{atendimento.id}</DialogTitle>
            <DialogDescription>{atendimento.client_name}</DialogDescription>
          </DialogHeader>
          <StepIndicator icon={FileText} label="Detalhes e Análise" isActive={activeStep === 'analysis'} isCompleted={isAnalysisComplete} onClick={() => setActiveStep('analysis')} />
          <StepIndicator icon={Users} label="Delegações" isActive={activeStep === 'delegations'} isCompleted={delegatedTasks.length > 0} onClick={() => setActiveStep('delegations')} />
          <StepIndicator icon={CheckCircle} label="Resolução Final" isActive={activeStep === 'resolution'} isCompleted={isResolutionComplete} onClick={() => setActiveStep('resolution')} />
          <StepIndicator icon={MessageSquare} label="Histórico" isActive={activeStep === 'history'} isCompleted={false} onClick={() => setActiveStep('history')} />
        </div>

        {/* Coluna Direita: Conteúdo Dinâmico das Etapas */}
        <div className="w-3/4 p-6 flex flex-col overflow-y-auto">
          {/* Aba de Análise */}
          {activeStep === 'analysis' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Detalhes e Análise</h2>
              <div className="grid grid-cols-2 gap-4 text-sm p-4 border rounded-lg bg-background">
                  <div><Label>Cliente:</Label><p className="font-medium">{atendimento.client_name}</p></div>
                  <div><Label>Contato:</Label><p className="font-medium">{atendimento.contact_person}</p></div>
                  <div className="col-span-2"><Label>Resumo Inicial:</Label><p className="p-2 bg-muted rounded-md">{atendimento.summary}</p></div>
                  
                  {/* Campos Editáveis */}
                  <div><Label>Placa:</Label><Input value={editableData.license_plate} onChange={(e) => setEditableData(p => ({...p, license_plate: e.target.value}))} /></div>
                  <div><Label>Motivo:</Label><Input value={editableData.reason} onChange={(e) => setEditableData(p => ({...p, reason: e.target.value}))} placeholder="Ex: Contestação de Cobrança" /></div>
                  <div>
                    <Label>Departamento:</Label>
                    <Select value={editableData.department} onValueChange={(v) => setEditableData(p => ({...p, department: v}))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{departamentos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
              </div>
            </div>
          )}

          {/* Aba de Delegações */}
          {activeStep === 'delegations' && (
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Delegações</h2>
                <p className="text-muted-foreground">Crie tarefas para outros departamentos ou usuários analisarem este atendimento.</p>
                <DelegationForm atendimentoId={atendimento.id} atendimentoTitle={atendimento.client_name || 'Atendimento'} onTaskCreated={fetchDelegatedTasks} />
                <div className="space-y-2 mt-4">
                  <h3 className="font-semibold">Tarefas Delegadas ({delegatedTasks.length})</h3>
                  {delegatedTasks.length > 0 ? (
                    <ul className="border rounded-md divide-y">
                      {delegatedTasks.map(task => (<li key={task.id} className="p-3 flex justify-between items-center"><div><p className="font-medium">{task.title}</p><p className="text-sm text-muted-foreground">Para: {task.assignee_name || 'N/A'}</p></div><Badge variant="outline" className="text-sm capitalize">{task.status}</Badge></li>))}
                    </ul>
                  ) : (<p className="text-center p-4 text-sm text-muted-foreground">Nenhuma tarefa delegada.</p>)}
                </div>
            </div>
          )}

          {/* Aba de Resolução */}
          {activeStep === 'resolution' && (
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Resolução Final</h2>
                <div className="space-y-4 p-4 border rounded-lg bg-background">
                  <div>
                    <Label>Análise Final:</Label>
                    <Select value={editableData.final_analysis} onValueChange={(v) => setEditableData(p => ({...p, final_analysis: v}))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{analisesFinais.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Texto da Resolução:</Label>
                    <Textarea value={editableData.resolution_details} onChange={(e) => setEditableData(p => ({...p, resolution_details: e.target.value}))} rows={5} placeholder="Descreva a solução aplicada e a comunicação com o cliente."/>
                  </div>
                </div>
            </div>
          )}
          
          {/* Aba de Histórico */}
          {activeStep === 'history' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Histórico de Comunicação</h2>
              <p className="text-center p-4 text-sm text-muted-foreground">Em construção.</p>
            </div>
          )}
          
          {/* Botão de Salvar sempre visível */}
          <div className="mt-auto pt-6 text-right">
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AtendimentoDetailModal;