// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Task } from "@/types"; // Importa nosso tipo Task

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- NOSSAS FUNÇÕES UTILITÁRIAS ---

export const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Não definida';
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export const getPriorityLabel = (priority?: string | null) => 
  ({ high: 'Alta', medium: 'Média', low: 'Baixa' }[priority || ''] || 'N/D');

export const getStatusLabel = (status?: string | null) => 
  ({ todo: 'A Fazer', progress: 'Em Progresso', done: 'Concluído', late: 'Atrasado' }[status || ''] || 'N/D');

export const getPriorityColor = (priority?: string | null) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50 text-red-700';
      case 'medium': return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      case 'low': return 'border-green-500 bg-green-50 text-green-700';
      default: return 'border-gray-300 bg-gray-50 text-gray-600';
    }
};

export const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'late': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

export const isOverdue = (task: Pick<Task, 'due_date' | 'status'>) => {
    if (!task.due_date || task.status === 'done') {
        return false;
    }
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
};