// src/components/crm/AtendimentoDetailModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import type { Atendimento, Task, UserProfile } from '@/types';
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
const departamentos = ['Manutenção', 'Central de Atendimento', 'Documentação', 'Operação', 'Comercial', 'Financeiro', 'Departamento Pessoal'];
const analisesFinais = ['Procedente', 'Improcedente', 'Dúvida'];

const AtendimentoDetailModal: React.FC<AtendimentoDetailModalProps> = ({ atendimento, onClose, onUpdate }) => {
  const [delegatedTasks, setDelegatedTasks] = useState<TaskWithAssigneeProfile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeStep, setActiveStep] = useState('analysis');
  
  const [editableData, setEditableData] = useState({
    // ALTERADO: Adicionado o novo campo ao estado.
    tipo_atendimento: '',
    department: '',
    reason: '',
    final_analysis: '',
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
        // ALTERADO: Populando o estado com o novo campo.
        tipo_atendimento: atendimento.tipo_atendimento || '',
        department: atendimento.department || '',
        reason: atendimento.reason || '',
        final_analysis: atendimento.final_analysis || '',
        resolution_details: atendimento.resolution_details || '',
      });
      setActiveStep('analysis');
      fetchDelegatedTasks(atendimento.id);
    }
  }, [atendimento, fetchDelegatedTasks]);

  const handleSaveChanges = async () => {
    if (!atendimento) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('atendimentos')
      .update(editableData)
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

  const handleChange = (field: keyof typeof editableData, value: string) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };
  
  if (!atendimento) return null;

  const isAnalysisComplete = !!editableData.department;
  const isResolutionComplete = !!editableData.final_analysis && !!editableData.resolution_details;
  const steps = [
    { id: 'analysis', label: 'Análise Inicial', icon: FileText, isCompleted: isAnalysisComplete },
    { id: 'delegations', label: 'Delegações', icon: Users, isCompleted: delegatedTasks.length > 0 },
    { id: 'resolution', label: 'Resolução', icon: MessageSquare, isCompleted: isResolutionComplete },
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
                    <Select value={editableData.department} onValueChange={(value) => handleChange('department', value)}>
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Selecione um departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo do Contato</Label>
                    <Textarea rows={5} id="reason" value={editableData.reason} onChange={(e) => handleChange('reason', e.target.value)} placeholder="Descreva o motivo do contato do cliente..."/>
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
        npm run             <Select value={editableData.final_analysis} onValueChange={(value) => handleChange('final_analysis', value)}>
                      <SelectTrigger id="final_analysis">
                        <SelectValue placeholder="Selecione a análise final" />
                      </SelectTrigger>
                      <SelectContent>
                        {analisesFinais.map(analise => <SelectItem key={analise} value={analise}>{analise}</SelectItem>)}
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
          <div className="pt-6 border-t mt-auto flex justify-end">
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AtendimentoDetailModal;