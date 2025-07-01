
import React from 'react';
import KanbanColumn from '../components/KanbanColumn';

const Kanban = () => {
  // Mock data for Kanban
  const mockTasks = {
    todo: [
      {
        id: '1',
        title: 'Implementar autenticação Google',
        description: 'Integrar sistema de login com Google OAuth',
        status: 'todo' as const,
        priority: 'high' as const,
        assignee: { name: 'João Silva' },
        dueDate: '05/07',
        subtasks: { completed: 0, total: 3 },
        comments: 2,
        attachments: 1
      },
      {
        id: '2',
        title: 'Criar documentação API',
        status: 'todo' as const,
        priority: 'medium' as const,
        assignee: { name: 'Maria Santos' },
        dueDate: '08/07',
        comments: 0,
        attachments: 0
      }
    ],
    progress: [
      {
        id: '3',
        title: 'Desenvolvimento do Dashboard',
        description: 'Criar interface principal com estatísticas',
        status: 'progress' as const,
        priority: 'high' as const,
        assignee: { name: 'Pedro Costa' },
        dueDate: '06/07',
        subtasks: { completed: 2, total: 5 },
        comments: 5,
        attachments: 2
      }
    ],
    done: [
      {
        id: '4',
        title: 'Setup inicial do projeto',
        description: 'Configuração do ambiente e dependências',
        status: 'done' as const,
        priority: 'medium' as const,
        assignee: { name: 'Ana Costa' },
        dueDate: '01/07',
        subtasks: { completed: 4, total: 4 },
        comments: 1,
        attachments: 0
      },
      {
        id: '5',
        title: 'Design system',
        status: 'done' as const,
        priority: 'low' as const,
        assignee: { name: 'Carlos Lima' },
        dueDate: '02/07',
        comments: 3,
        attachments: 5
      }
    ],
    late: [
      {
        id: '6',
        title: 'Correção de bugs críticos',
        description: 'Resolver problemas de performance',
        status: 'late' as const,
        priority: 'high' as const,
        assignee: { name: 'Roberto Silva' },
        dueDate: '03/07',
        subtasks: { completed: 1, total: 3 },
        comments: 8,
        attachments: 1
      }
    ]
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kanban Board</h1>
        <p className="text-gray-600">Visualize e gerencie suas tarefas</p>
      </div>

      {/* Kanban Board */}
      <div className="flex space-x-6 overflow-x-auto pb-6">
        <KanbanColumn
          title="A Fazer"
          status="todo"
          tasks={mockTasks.todo}
          color="bg-gray-400"
        />
        <KanbanColumn
          title="Em Andamento"
          status="progress"
          tasks={mockTasks.progress}
          color="bg-blue-500"
        />
        <KanbanColumn
          title="Concluído"
          status="done"
          tasks={mockTasks.done}
          color="bg-green-500"
        />
        <KanbanColumn
          title="Atrasado"
          status="late"
          tasks={mockTasks.late}
          color="bg-red-500"
        />
      </div>
    </div>
  );
};

export default Kanban;
