// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Task } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma string de data para o padrão pt-BR.
 * Ex: '2024-07-25T10:00:00.000Z' -> '25/07/2024'
 */
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'Não definida';
  // Adiciona timeZone 'UTC' para evitar problemas de fuso horário que mudam o dia.
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

/**
 * Retorna o rótulo legível para uma prioridade.
 * Ex: 'high' -> 'Alta'
 */
export const getPriorityLabel = (priority?: string | null): string =>
  ({ high: 'Alta', medium: 'Média', low: 'Baixa' }[priority || ''] || 'N/D');

/**
 * Retorna o rótulo legível para um status.
 * Ex: 'progress' -> 'Em Progresso'
 */
export const getStatusLabel = (status?: string | null): string =>
  ({ todo: 'A Fazer', progress: 'Em Progresso', done: 'Concluído', late: 'Atrasado' }[status || ''] || 'N/D');

/**
 * Retorna as classes Tailwind CSS para a cor de uma prioridade.
 */
export const getPriorityColor = (priority?: string | null): string => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50 text-red-700';
      case 'medium': return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      case 'low': return 'border-green-500 bg-green-50 text-green-700';
      default: return 'border-gray-300 bg-gray-50 text-gray-600';
    }
};

/**
 * Retorna as classes Tailwind CSS para a cor de um status.
 */
export const getStatusColor = (status?: string | null): string => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'progress': return 'bg-blue-100 text-blue-800';
      case 'late': return 'bg-red-100 text-red-800';
      case 'todo':
      default: return 'bg-gray-100 text-gray-800';
    }
};

/**
 * Verifica se uma tarefa está atrasada.
 */
export const isOverdue = (task: Pick<Task, 'due_date' | 'status'>): boolean => {
    if (!task.due_date || task.status === 'done') {
        return false;
    }
    const dueDate = new Date(task.due_date);
    const today = new Date();
    // Zera as horas para comparar apenas as datas
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
};

/**
 * Retorna as iniciais de um nome. Ex: "José Maria" -> "JM"
 * @param name - O nome completo.
 * @returns As iniciais em maiúsculas ou '?' se o nome for inválido.
 */
export const getInitials = (name?: string | null): string => {
  if (!name) return '?';
  
  // Pega a primeira letra de cada uma das duas primeiras palavras
  const initials = name
    .trim()
    .split(' ')
    .slice(0, 2) 
    .map(n => n[0])
    .join('');
    
  return initials.toUpperCase();
};