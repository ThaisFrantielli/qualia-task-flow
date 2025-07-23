import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  MessageCircle, 
  Paperclip, 
  CheckCircle2, 
  MoreHorizontal, 
  Archive, 
  Trash2, 
  Loader2, 
  Edit, 
  AlertTriangle, // Ícone para atraso
  Clock, // Ícone para prazo
  Circle // Ícone genérico para progresso/status sem subtarefas
} from 'lucide-react'; // Importe os ícones necessários
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Importe os componentes de Tooltip

import type { Database, Task } from '@/types';

interface TaskTableRowProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  isLoading: boolean; // Adicionado prop isLoading
}

const TaskTableRow: React.FC<TaskTableRowProps> = ({
  task,
  onTaskClick,
  onStatusChange,
  onArchiveTask,
  onDeleteTask,
  isLoading, // Recebido prop isLoading
}) => {
  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'todo': return 'text-gray-500'; // Cores de texto para ícones
      case 'progress': return 'text-blue-500';
      case 'done': return 'text-green-500';
      case 'late': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'todo': return 'A Fazer';
      case 'progress': return 'Em Andamento';
      case 'done': return 'Concluído';
      case 'late': return 'Atrasado';
      default: return status || 'Desconhecido';
    }
  };

  const getPriorityLabel = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority || 'Desconhecida';
    }
  };

  // Assumindo que subtasks, comments e attachments são carregados na tarefa
  const subtasksCompleted = task.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;
  const subtaskProgress = subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0; // Calcula o progresso das subtarefas

  // Lógica para verificar se a tarefa está atrasada
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  // Lógica para verificar se a tarefa foi concluída recentemente (últimos 7 dias) - Ajuste conforme necessário
  const isRecentlyCompleted = task.status === 'done' && task.updated_at && new Date(task.updated_at) > new Date(new Date().setDate(new Date().getDate() - 7));

  // Função para formatar a data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sem data';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (e) {
      console.error("Erro ao formatar data:", dateString, e);
      return 'Data inválida';
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    const newStatus = checked ? 'done' : 'todo'; // Assume 'todo' se desmarcar
    onStatusChange(task.id, newStatus);
  };

  return (
    <TooltipProvider>{/* Envolve com TooltipProvider */}
      <Tooltip>{/* Componente Tooltip */}
        <TooltipTrigger asChild>{/* O TooltipTriger é a linha da tabela */}
          <TableRow
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => onTaskClick(task)} // Mantém o onClick na linha para abrir detalhes
          >
            <TableCell className="w-[300px]">
              <div className="flex items-center space-x-3"> {/* Adiciona flexbox para alinhar checkbox, texto e ícones */}
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={handleCheckboxChange}
                  onClick={(e) => e.stopPropagation()} // Impede que o clique no checkbox propague para a linha
                />
                <div className="flex-1"> {/* Permite que o texto ocupe o espaço restante */}
                  <div className="font-medium text-gray-900 mb-1">{task.title}</div>
                  {task.description && (
                    <div className="text-sm text-gray-500 line-clamp-2">
                      {task.description}
                    </div>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    {/* Ícones de Status/Notificação */}

                    {/* Indicador de atraso */}
                    {isOverdue && (
                      <AlertTriangle className="w-3 h-3 text-red-500" title="Atrasada" />
                    )}

                     {/* Indicador de Concluído Recentemente */}
                     {isRecentlyCompleted && (
                       <CheckCircle2 className="w-3 h-3 text-green-500" title="Concluída Recentemente" />
                     )}

                    {/* Ícone de comentários */}
                    {task.comments && task.comments.length > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <MessageCircle className="w-3 h-3" title={`Comentários: ${task.comments.length}`} />
                        <span>{task.comments.length}</span>
                      </div>
                    )}
                    {/* Ícone de anexos */}
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Paperclip className="w-3 h-3" title={`Anexos: ${task.attachments.length}`} />
                        <span>{task.attachments.length}</span>
                      </div>
                    )}
                     {/* Ícone de Prazo (se não atrasada e tiver prazo) */}
                     {!isOverdue && task.due_date && (
                       <Clock className="w-3 h-3 text-gray-500" title={`Prazo: ${formatDate(task.due_date)}`} />
                     )}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>{/* Célula de Status */}
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Atualizando...</span>
                </div>
              ) : (
                // Mantém o Select para mudança de status para outros estados além de concluído/a fazer
                <Select
                  value={task.status ?? ''}
                  onValueChange={(value) => {
                    onStatusChange(task.id, value);
                  }}
                  disabled={isLoading || task.status === 'done' || task.status === 'late'} // Desabilita se concluída ou atrasada (checkbox e lógica de atraso gerenciam)
                >
                  <SelectTrigger className="w-32 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="progress">Em Andamento</SelectItem>
                    {/* Removido 'done' e 'late' para serem gerenciados pelo checkbox e indicador de atraso */}
                    {/* <SelectItem value="done">Concluído</SelectItem> */}
                    {/* <SelectItem value="late">Atrasado</SelectItem> */}
                  </SelectContent>
                </Select>
              )}
            </TableCell>
            <TableCell>{/* Célula de Prioridade */}
              <Badge className={getPriorityColor(task.priority)}>
                {getPriorityLabel(task.priority)}
              </Badge>
            </TableCell>
            <TableCell>{/* Célula de Responsável */}
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={task.assignee_avatar ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {task.assignee_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA'} {/* Adicionado toUpperCase */}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700">
                  {task.assignee_name || 'Não atribuído'}
                </span>
              </div>
            </TableCell>
            <TableCell>{/* Célula de Projeto */}
              <span className="text-sm text-gray-700">
                {task.project?.name || 'Sem projeto'}
              </span>
            </TableCell>
            <TableCell>{/* Célula de Prazo */}
               {/* Conteúdo de prazo movido para a célula da tarefa como um ícone */}
               {/* {task.due_date ? ( */}
               {/*   <div className="flex items-center space-x-1 text-sm text-gray-700"> */}
               {/*      <Calendar className="w-3 h-3" /> */}
               {/*      <span>{formatDate(task.due_date)}</span> */}
               {/*    </div> */}
               {/*  ) : ( */}
               {/*    <span className="text-sm text-gray-400">Sem prazo</span> */}
               {/*  )} */}
            </TableCell>
            <TableCell>{/* Célula de Progresso */}
              {subtasksTotal > 0 ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-gray-600">
                      {subtasksCompleted}/{subtasksTotal}
                    </span>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                 /* Indicador de progresso simples para tarefas sem subtarefas */
                <div className={`flex items-center space-x-1 text-xs ${getStatusColor(task.status)}`}>
                   <Circle className="w-3 h-3 fill-current" /> {/* Use fill-current para herdar a cor */}
                   <span>{getStatusLabel(task.status)}</span>
                 </div>
              )}
            </TableCell>
            <TableCell className="flex items-center space-x-2"> {/* Adiciona flexbox para alinhar os ícones */}
              {/* Ícone de Editar */}
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation(); // Impede que o clique propague para a linha
                onTaskClick(task); // Chama a função de clique na tarefa para abrir detalhes/edição
              }}>
                <Edit className="w-4 h-4" />
              </Button>

              {/* Ícone de Deletar */}
              {onDeleteTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Impede que o clique propague para a linha
                    onDeleteTask(task.id);
                  }}
                  className="text-red-600 hover:bg-red-100" // Adiciona hover visual
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              {/* DropdownMenu para Arquivar e outras futuras ações */}
              {(onArchiveTask) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {onArchiveTask && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        console.log("Botão Arquivar clicado em TaskTableRow para a tarefa: ", task.id);
                        onArchiveTask(task.id);
                      }}>
                        <Archive className="w-4 h-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                    )}
                     {/* Outras ações podem ser adicionadas aqui no futuro */}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </TableCell>
          </TableRow>
        </TooltipTrigger>
        <TooltipContent>{/* Conteúdo do Tooltip */}
           <div className="p-2 text-sm">
             <p className="font-medium mb-1">{task.title}</p>
             {task.description && <p className="text-gray-600 mb-1">{task.description}</p>}
             <p className="text-gray-500 text-xs">Criada em: {formatDate(task.created_at)}</p>
             {task.due_date && <p className="text-gray-500 text-xs">Prazo: {formatDate(task.due_date)}</p>}
             {task.delegated_by && <p className="text-gray-500 text-xs">Delegada por: {task.delegated_by}</p>}
             {task.project?.name && <p className="text-gray-500 text-xs">Projeto: {task.project.name}</p>}
             {task.comments && task.comments.length > 0 && <p className="text-gray-500 text-xs">Comentários: {task.comments.length}</p>}
             {task.attachments && task.attachments.length > 0 && <p className="text-gray-500 text-xs">Anexos: {task.attachments.length}</p>}
           </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TaskTableRow;
